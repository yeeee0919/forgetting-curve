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
    
    // 找出所有連續的英文字母/拉丁字母單字
    const words = etymologyText.match(/[a-zA-Z\u00C0-\u017F]+/g)
    if (!words) return []

    const frontLower = (card.front || '').toLowerCase()
    const roots = []

    for (const w of words) {
        const root = w.toLowerCase()
        // 只保留長度大於等於 2 的有效字根，且確實是該單字的子字串
        if (root.length >= 2 && frontLower.includes(root)) {
            if (!roots.includes(root)) {
                roots.push(root)
            }
        }
    }

    // 3. 若仍未取得根字，或仍有未解析的部分，嘗試以常見荷蘭語前綴與後綴做切割 (備援)
    const prefixes = ['onder', 'om', 'te', 'ge', 'be', 'ver', 'her', 'ont', 'mis', 'voor', 'naar', 'kenteken', 'tegen', 'op', 'opge'];
    const suffixes = ['kundige', 'lijk', 'baar', 'ig', 'isch', 'heid', 'ing', 'schap', 'igheid', 'plaat', 'duiker', 'schakelen', 'liggers'];
    let remaining = (card.front || '').toLowerCase();
    // 移除已找出的根字，避免重複
    for (const r of roots) {
        const idx = remaining.indexOf(r);
        if (idx !== -1) {
            remaining = remaining.slice(0, idx) + remaining.slice(idx + r.length);
        }
    }
    // 前綴檢查 (允許多個連續前綴)
    while (true) {
        let matched = false;
        for (const pre of prefixes) {
            if (remaining.startsWith(pre) && !roots.includes(pre)) {
                roots.push(pre);
                remaining = remaining.slice(pre.length);
                matched = true;
                break;
            }
        }
        if (!matched) break;
    }
    // 後綴檢查
    for (const suf of suffixes) {
        if (remaining.endsWith(suf) && !roots.includes(suf) && remaining.length > suf.length) {
            roots.push(suf);
            remaining = remaining.slice(0, -suf.length);
            break;
        }
    }
    // 若仍有剩餘且未被列為根字，加入最後的根字
    if (remaining && remaining.length > 0 && !roots.includes(remaining)) {
        roots.push(remaining);
    }
    // 最終返回根字清單
    return roots

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

    // 4. 開始重組分段，並為每個字根指派獨立的 rootIndex（用於多色顯示）
    const result = []
    let lastIndex = 0
    let rootCounter = 0
    for (const match of activeMatches) {
        // 匹配前方的非字根文字
        if (match.start > lastIndex) {
            result.push({ text: word.slice(lastIndex, match.start), isRoot: false, rootIndex: -1 })
        }
        // 字根部分，每個字根有獨立的 rootIndex 供 UI 選色
        result.push({ text: word.slice(match.start, match.end), isRoot: true, rootIndex: rootCounter })
        rootCounter++
        lastIndex = match.end
    }

    // 剩餘後方的文字
    if (lastIndex < word.length) {
        result.push({ text: word.slice(lastIndex), isRoot: false, rootIndex: -1 })
    }

    return result
}
export function generateRoots(card) {
    // Alias for getCardRoots to maintain backward compatibility
    return getCardRoots(card);
}
