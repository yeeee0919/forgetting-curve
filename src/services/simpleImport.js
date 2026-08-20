/**
 * 不用 AI 的簡單匯入：每行「原文 / 譯文」或「原文 = 譯文」
 */
export function parseSimpleCards(text) {
    const lines = String(text || '').split(/\r?\n/)
    const cards = []
    for (const raw of lines) {
        const line = raw.trim()
        if (!line) continue
        let front = ''
        let back = ''
        const slash = line.split(/\s*\/\s*/)
        const eq = line.split(/\s*=\s*/)
        if (slash.length >= 2) {
            front = slash[0].trim()
            back = slash.slice(1).join(' / ').trim()
        } else if (eq.length >= 2) {
            front = eq[0].trim()
            back = eq.slice(1).join(' = ').trim()
        } else if (/\t/.test(line)) {
            const parts = line.split(/\t+/)
            front = (parts[0] || '').trim()
            back = parts.slice(1).join(' ').trim()
        } else {
            front = line
        }
        if (!front) continue
        cards.push({ front, back, language: 'nl' })
    }
    return cards
}

export function looksLikeSimpleList(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (!lines.length) return false
    const hits = lines.filter(l => /\s\/\s|\s=\s|\t/.test(l)).length
    return hits >= Math.max(1, Math.ceil(lines.length * 0.5))
}
