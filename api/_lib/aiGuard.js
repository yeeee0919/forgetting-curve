export const AI_INPUT_LIMITS = {
    word: 80,
    context: 500,
    hint: 200,
    text: 4000,
    bodyBytes: 8192,
    ratePerMinute: 10,
}

export function payloadTooLarge(contentLength) {
    const n = Number(contentLength)
    return Number.isFinite(n) && n > AI_INPUT_LIMITS.bodyBytes
}

export function bodyTooLarge(body) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body ?? {})
    return raw.length > AI_INPUT_LIMITS.bodyBytes
}

export function readInboxInput(body) {
    const word = String(body?.word || '').trim()
    const context = String(body?.context || '').trim()
    const hint = String(body?.hint || '').trim()
    if (!word) return { ok: false, reason: '單字不能為空' }
    if (word.length > AI_INPUT_LIMITS.word) {
        return { ok: false, reason: `單字太長（最多 ${AI_INPUT_LIMITS.word} 字）` }
    }
    if (context.length > AI_INPUT_LIMITS.context) {
        return { ok: false, reason: `語境太長（最多 ${AI_INPUT_LIMITS.context} 字）` }
    }
    if (hint.length > AI_INPUT_LIMITS.hint) {
        return { ok: false, reason: `譯文提示太長（最多 ${AI_INPUT_LIMITS.hint} 字）` }
    }
    return { ok: true, word, context, hint }
}

export function readImportText(body) {
    const text = String(body?.text || '').trim()
    if (!text) return { ok: false, reason: '請先輸入要匯入的文字' }
    if (text.length > AI_INPUT_LIMITS.text) {
        return { ok: false, reason: `一次文字太長（最多 ${AI_INPUT_LIMITS.text} 字）` }
    }
    return { ok: true, text }
}

const hits = new Map()

export function resetAiRateLimit() {
    hits.clear()
}

export function allowAiRate(userId, now = Date.now(), opts = {}) {
    const limit = Number(opts.limit) || AI_INPUT_LIMITS.ratePerMinute
    const windowMs = Number(opts.windowMs) || 60_000
    const id = String(userId || '').trim()
    if (!id) return false
    const recent = (hits.get(id) || []).filter((t) => now - t < windowMs)
    if (recent.length >= limit) {
        hits.set(id, recent)
        return false
    }
    recent.push(now)
    hits.set(id, recent)
    return true
}
