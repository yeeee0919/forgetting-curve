const INBOX_KEY = 'memoflip_inbox'

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
    for (const item of incoming) {
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
