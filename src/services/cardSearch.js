export function matchesSearch(card, q) {
    const needle = String(q || '').trim().toLowerCase()
    if (!needle) return true
    return String(card.front || '').toLowerCase().includes(needle)
        || String(card.back || '').toLowerCase().includes(needle)
}
