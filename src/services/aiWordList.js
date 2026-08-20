/**
 * AI 匯入准入：只接受純單字列表（前後端共用）
 */

export const AI_WORD_LIST_MAX = 40

const BILINGUAL_SPLIT = /\s*\/\s*|\s*=\s*|\t/
const LIST_SEP = /[,，、;；|]+/

function looksLikeProseLine(line) {
    const head = String(line).split(BILINGUAL_SPLIT)[0].trim()
    if (!head) return false
    if (LIST_SEP.test(head)) return false
    const tokens = head.split(/\s+/).filter(Boolean)
    if (tokens.length >= 8) return true
    if (/[.!?。！？]/.test(head) && tokens.length >= 5) return true
    if (head.length >= 90 && tokens.length >= 6) return true
    return false
}

function isMostlyLatinWord(word) {
    const s = String(word || '').replace(/[''′`\-·]/g, '').trim()
    if (!s || s.length > 48) return false
    const letters = (s.match(/[A-Za-zÀ-ÿ]/g) || []).length
    const cjk = (s.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length
    if (cjk > 0 && letters === 0) return false
    return letters / s.length >= 0.65
}

/**
 * 從輸入抽出單字條目（front）
 * - 一行一字
 * - NL / 中文（取左側）
 * - 逗號分隔短詞
 * - 同一行 4 個以上空白分隔 → 視為多個短詞；2–3 個則當一個片語
 */
export function extractAiWordEntries(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const words = []
    for (const line of lines) {
        if (BILINGUAL_SPLIT.test(line) && !LIST_SEP.test(line.split(BILINGUAL_SPLIT)[0])) {
            const front = line.split(BILINGUAL_SPLIT)[0].trim()
            if (front) words.push(front)
            continue
        }
        const commaParts = line.split(LIST_SEP).map(p => p.trim()).filter(Boolean)
        if (commaParts.length > 1) {
            for (const part of commaParts) {
                const toks = part.split(/\s+/).filter(Boolean)
                if (toks.length > 4) {
                    return { words, prose: true }
                }
                words.push(part)
            }
            continue
        }
        const tokens = line.split(/\s+/).filter(Boolean)
        if (tokens.length <= 3) {
            words.push(line)
        } else if (tokens.length < 8) {
            for (const t of tokens) words.push(t)
        } else {
            return { words, prose: true }
        }
    }
    return { words, prose: false }
}

/**
 * @param {string} text
 * @param {{ remainingQuota?: number }} [opts]
 * @returns {{ ok: boolean, reason?: string, words: string[], count: number, maxAllowed: number }}
 */
export function validateAiWordList(text, opts = {}) {
    const raw = String(text || '').trim()
    const remainingQuota = Number(opts.remainingQuota)
    const quotaLeft = Number.isFinite(remainingQuota) ? remainingQuota : AI_WORD_LIST_MAX
    const maxAllowed = Math.min(AI_WORD_LIST_MAX, Math.max(0, quotaLeft))

    if (!raw) {
        return { ok: false, reason: '請先貼上要匯入的單字列表', words: [], count: 0, maxAllowed }
    }
    if (raw.startsWith('{') || raw.startsWith('[')) {
        return {
            ok: false,
            reason: 'JSON 請改到「手動 / JSON」分頁匯入',
            words: [],
            count: 0,
            maxAllowed,
        }
    }

    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
        if (looksLikeProseLine(line)) {
            return {
                ok: false,
                reason: '這看起來像文章或句子。AI 分頁只接受單字列表；長文請用「手動」頁的 ChatGPT／Gemini。',
                words: [],
                count: 0,
                maxAllowed,
            }
        }
    }

    const extracted = extractAiWordEntries(raw)
    if (extracted.prose) {
        return {
            ok: false,
            reason: '這看起來像文章或句子。AI 分頁只接受單字列表；長文請用「手動」頁的 ChatGPT／Gemini。',
            words: extracted.words,
            count: extracted.words.length,
            maxAllowed,
        }
    }

    const words = extracted.words.filter(Boolean)
    if (words.length < 1) {
        return { ok: false, reason: '請先貼上要匯入的單字列表', words: [], count: 0, maxAllowed }
    }

    const latinHits = words.filter(isMostlyLatinWord).length
    if (latinHits / words.length < 0.6) {
        return {
            ok: false,
            reason: '請貼荷蘭文（拉丁字母）單字列表，不要貼整段中文或其他語言文章。',
            words,
            count: words.length,
            maxAllowed,
        }
    }

    if (maxAllowed < 1) {
        return {
            ok: false,
            reason: 'AI 額度已用完。請改用「手動」頁，每行「原文 / 譯文」。',
            words,
            count: words.length,
            maxAllowed,
        }
    }

    if (words.length > maxAllowed) {
        return {
            ok: false,
            reason: `一次最多 ${maxAllowed} 個單字（上限 ${AI_WORD_LIST_MAX}／剩餘額度）。請拆成較小批次再匯入。`,
            words,
            count: words.length,
            maxAllowed,
        }
    }

    return { ok: true, words, count: words.length, maxAllowed }
}
