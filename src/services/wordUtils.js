/**
 * 字根字首字尾工具函式
 * 著色只相信卡片上的 roots，且必須是 front 裡連續出現的片段。
 */

export function sanitizeRoots(roots, front) {
    if (!Array.isArray(roots) || !front) return []
    const frontLower = String(front).toLowerCase()
    const out = []
    for (const r of roots) {
        const root = String(r || '').toLowerCase().trim()
        if (root.length < 2 || root === frontLower) continue
        if (frontLower.includes(root) && !out.includes(root)) out.push(root)
    }
    return out
}

/**
 * 取得卡片的字根清單：以 AI 給的 roots 為準，丢掉沒出現在 front 裡的片段。
 * 不再從 tips 抽字，也不再自行猜切前綴後綴。
 */
export function getCardRoots(card) {
    if (!card) return []
    return sanitizeRoots(card.roots, card.front)
}

/**
 * 將單字依照字根區間切割為多個片段，便於在 UI 中著色
 * @param {string} word - 原始單字
 * @param {Array<string>} roots - 字根清單
 * @returns {Array<{text: string, isRoot: boolean}>} 分段後的字串陣列
 */
export function segmentWord(word, roots) {
    if (!word) return []
    if (!roots || roots.length === 0) {
        return [{ text: word, isRoot: false }]
    }

    const wordLower = word.toLowerCase()
    const rootMatches = []

    // 1. 找出所有字根在單字中的所有不重複出現位置
    for (const root of roots) {
        if (!root) continue
        const rLower = root.toLowerCase()
        let pos = wordLower.indexOf(rLower)
        while (pos !== -1) {
            rootMatches.push({ root, start: pos, end: pos + root.length })
            pos = wordLower.indexOf(rLower, pos + 1)
        }
    }

    // 2. 排序：依起始索引由小到大排序；若起點相同，則長度較長的優先
    rootMatches.sort((a, b) => {
        if (a.start !== b.start) {
            return a.start - b.start
        }
        return (b.end - a.start) - (a.end - a.start)
    })

    // 3. 過濾掉重疊的匹配（只保留左邊最長的匹配項目）
    const activeMatches = []
    let lastEnd = 0
    for (const match of rootMatches) {
        if (match.start >= lastEnd) {
            activeMatches.push(match)
            lastEnd = match.end
        }
    }

    // 4. 開始重組分段，並為每個字根指派獨立的 rootIndex（用於多色顯示）
    const result = []
    let lastIndex = 0
    let rootCounter = 0
    for (const match of activeMatches) {
        if (match.start > lastIndex) {
            result.push({ text: word.slice(lastIndex, match.start), isRoot: false, rootIndex: -1 })
        }
        result.push({ text: word.slice(match.start, match.end), isRoot: true, rootIndex: rootCounter })
        rootCounter++
        lastIndex = match.end
    }

    if (lastIndex < word.length) {
        result.push({ text: word.slice(lastIndex), isRoot: false, rootIndex: -1 })
    }

    return result
}

export function generateRoots(card) {
    return getCardRoots(card)
}
