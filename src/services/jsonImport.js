/**
 * 寬容解析外部 AI 貼上的單字卡 JSON
 * 吃得下：說明文字、markdown 框、彎引號、多餘逗號、[...] 或 { cards: [...] }
 */

function tryParse(s, into) {
    try {
        into.push(JSON.parse(s))
    } catch {
        /* ignore */
    }
}

function extractBalanced(s, start) {
    const open = s[start]
    const close = open === '[' ? ']' : '}'
    let depth = 0
    let inString = false
    let escape = false
    for (let i = start; i < s.length; i++) {
        const c = s[i]
        if (inString) {
            if (escape) {
                escape = false
                continue
            }
            if (c === '\\') {
                escape = true
                continue
            }
            if (c === '"') inString = false
            continue
        }
        if (c === '"') {
            inString = true
            continue
        }
        if (c === open) depth++
        else if (c === close) {
            depth--
            if (depth === 0) return s.slice(start, i + 1)
        }
    }
    return null
}

export function sanitizeJsonText(raw) {
    let s = String(raw || '').trim()
    s = s.replace(/```(?:json|JSON)?\s*([\s\S]*?)```/g, '$1')
    s = s.replace(/```(?:json|JSON)?/g, '')
    s = s.replace(/[\u201C\u201D\u300C\u300D]/g, '"')
    s = s.replace(/[\u2018\u2019]/g, "'")
    s = s.replace(/,(\s*[}\]])/g, '$1')
    return s.trim()
}

function asCardArray(value) {
    if (!value) return []
    const arr = Array.isArray(value) ? value : (value.cards || value.items)
    if (!Array.isArray(arr)) return []
    return arr.filter(x => x && typeof x === 'object' && String(x.front || '').trim())
}

/**
 * 從任意貼上文字挖出最長、且物件帶 front 的卡片陣列。
 * 找不到則回傳 []。
 */
export function parseCardsJson(raw) {
    const cleaned = sanitizeJsonText(raw)
    if (!cleaned) return []

    const values = []
    tryParse(cleaned, values)

    const first = cleaned.search(/[\[{]/)
    const last = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
    if (first !== -1 && last > first) {
        tryParse(cleaned.slice(first, last + 1), values)
    }

    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] !== '[' && cleaned[i] !== '{') continue
        const slice = extractBalanced(cleaned, i)
        if (!slice) continue
        tryParse(slice, values)
        i += slice.length - 1
    }

    const arrays = values.map(asCardArray).filter(a => a.length > 0)
    if (!arrays.length) return []
    arrays.sort((a, b) => b.length - a.length)
    return arrays[0]
}

export function parseCardsJsonStrict(raw) {
    const cards = parseCardsJson(raw)
    if (!cards.length) {
        throw new Error('找不到有效的單字卡 JSON（需要帶 front 的物件陣列）')
    }
    return cards
}

export function countCardsInJson(raw) {
    try {
        return parseCardsJson(raw).length
    } catch {
        return 0
    }
}

/**
 * 單一卡片 JSON（Inbox 鍊金術）。也接受包在陣列裡的一張卡。
 */
export function parseSingleCardJson(raw) {
    const list = parseCardsJson(raw)
    if (list.length) return list[0]
    const cleaned = sanitizeJsonText(raw)
    try {
        const parsed = JSON.parse(cleaned)
        if (parsed && typeof parsed === 'object' && String(parsed.front || '').trim()) return parsed
    } catch {
        /* ignore */
    }
    throw new Error('AI 回傳格式錯誤，請重試 (Parsing Failed)')
}
