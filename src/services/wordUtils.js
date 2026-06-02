/**
 * 字根字首字尾工具函式
 */

/**
 * 取得卡片的字根字首清單
 * 優先讀取結構化的 roots 欄位，若無則嘗試從 tips 欄位的【字源分析】解析
 * @param {Object} card - 卡片物件
 * @returns {Array<string>} 字根清單
 */
export function getCardRoots(card) {
    if (!card) return []

    // 1. 若已有結構化 roots 欄位，直接回傳
    if (card.roots && Array.isArray(card.roots) && card.roots.length > 0) {
        return card.roots
    }

    // 2. 否則嘗試從 tips 解析字根
    if (!card.tips || typeof card.tips !== 'string') return []

    // 尋找「【字源分析】：...」或「【字源分析】:...」後方的內容
    // 擷取到第一個句號、箭頭或下一個區塊符號為止
    const match = card.tips.match(/【字源分析】[:：]\s*([^\n\r→。]+)/)
    if (!match) return []

    const etymologyText = match[1]
    // 依照 + 或 ＋ 分割不同的部分
    const parts = etymologyText.split(/[+＋]/)
    const roots = []

    for (let part of parts) {
        // 清理括號及內部說明文字，例如 "ab- (離開) " -> "ab-"
        const cleanPart = part.replace(/\([^)]*\)/g, '').trim()
        
        // 擷取英文字母或拉丁語系常用字母字串 (排除前後的橫線 -)
        const letterMatch = cleanPart.match(/[a-zA-Z\u00C0-\u017F]+/)
        if (letterMatch) {
            const root = letterMatch[0].toLowerCase()
            // 只保留長度大於等於 2 的有效字根，防範單一字母 (如 i, a 等) 誤配對
            if (root.length >= 2) {
                roots.push(root)
            }
        }
    }

    // 3. 確保解析出的字根確實是該單字的子字串
    const frontLower = (card.front || '').toLowerCase()
    return roots.filter(root => frontLower.includes(root))
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
        return (b.end - b.start) - (a.end - a.start)
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

    // 4. 開始重組分段
    const result = []
    let lastIndex = 0
    for (const match of activeMatches) {
        // 匹配前方的非字根文字
        if (match.start > lastIndex) {
            result.push({ text: word.slice(lastIndex, match.start), isRoot: false })
        }
        // 字根部分
        result.push({ text: word.slice(match.start, match.end), isRoot: true })
        lastIndex = match.end
    }

    // 剩餘後方的文字
    if (lastIndex < word.length) {
        result.push({ text: word.slice(lastIndex), isRoot: false })
    }

    return result
}
