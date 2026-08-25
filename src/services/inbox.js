const INBOX_KEY = 'memoflip_inbox'

const WORD_MAX = 80
const CONTEXT_MAX = 500
const TRANSLATION_MAX = 200
const URL_MAX = 500

export function isTrustedInboxEvent(event, expectedOrigin) {
    if (!event || !expectedOrigin) return false
    if (typeof window !== 'undefined' && event.source !== window) return false
    if (event.origin !== expectedOrigin) return false
    const data = event.data
    return data?.source === 'toocheep-word-catcher' && data?.type === 'inbox-flush'
}

export function sanitizeSourceUrl(url) {
    const raw = String(url || '').trim()
    if (!raw) return null
    try {
        const parsed = new URL(raw)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
        return parsed.href.slice(0, URL_MAX)
    } catch {
        return null
    }
}

export function sanitizeInboxItem(item) {
    if (!item || typeof item !== 'object') return null
    const word = String(item.word || '').trim().slice(0, WORD_MAX)
    if (!word) return null
    return {
        ...item,
        word,
        context_sentence: String(item.context_sentence || item.word || '').slice(0, CONTEXT_MAX),
        translation: String(item.translation || '').slice(0, TRANSLATION_MAX),
        source_url: sanitizeSourceUrl(item.source_url),
    }
}

export function getLocalInbox() {
    try {
        const raw = localStorage.getItem(INBOX_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export function saveLocalInbox(items) {
    try {
        localStorage.setItem(INBOX_KEY, JSON.stringify(items || []))
    } catch (e) {
        console.error('Failed to save inbox:', e)
    }
}

export function clearLocalInbox() {
    try {
        localStorage.removeItem(INBOX_KEY)
    } catch {
        /* ignore */
    }
}

export function mergeInboxItems(existing = [], incoming = []) {
    const map = new Map()
    for (const item of existing) {
        if (item?.id) map.set(item.id, item)
    }
    for (const raw of incoming) {
        const item = sanitizeInboxItem(raw)
        if (!item) continue
        const id = item.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        if (!map.has(id)) map.set(id, { ...item, id })
    }
    return Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime()
        const tb = new Date(b.created_at || 0).getTime()
        return tb - ta
    })
}
