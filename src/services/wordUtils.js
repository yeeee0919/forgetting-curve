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

    const frontLower = (card.front || '').toLowerCase()

    // 1. 優先從 tips【字源分析】解析字根（比快取 roots 更可信）
    const tipsRoots = []
    if (card.tips && typeof card.tips === 'string') {
        // 不被「。」截斷，但避開下一個「【」區段，例如【生動聯想】
        const match = card.tips.match(/【字源分析】[:：]\s*([^\n\r→【]+)/)
        if (match) {
            const etymologyText = match[1]
            const words = etymologyText.match(/[a-zA-Z\u00C0-\u017F]+/g)
            if (words) {
                for (const w of words) {
                    const root = w.toLowerCase()
                    if (root.length < 2 || root === frontLower) continue

                    // 1.1 如果直接包含於單字中
                    if (frontLower.includes(root)) {
                        if (!tipsRoots.includes(root)) {
                            tipsRoots.push(root)
                        }
                    }
                    // 1.2 否則若是以 -en 結尾的動詞原型，嘗試尋找去 en 的詞幹 (stem)
                    // 例如: nemen -> nem (ondernemer 裡有 nem)
                    else if (root.endsWith('en') && root.length >= 4) {
                        const stem = root.slice(0, -2)
                        if (stem.length >= 2 && stem !== frontLower && frontLower.includes(stem)) {
                            if (!tipsRoots.includes(stem)) {
                                tipsRoots.push(stem)
                            }
                        }
                    }
                }
            }
        }
    }

    // 若 tips 成功解析出字根，直接使用（跳過快取 roots，避免舊資料污染）
    let roots = tipsRoots.length > 0 ? [...tipsRoots] : []

    // 2. 若 tips 無結果，才從結構化 roots 欄位讀取快取
    if (roots.length === 0 && card.roots && Array.isArray(card.roots)) {
        for (const r of card.roots) {
            const root = r.toLowerCase()
            if (root.length >= 2 && root !== frontLower && frontLower.includes(root)) {
                if (!roots.includes(root)) {
                    roots.push(root)
                }
            }
        }
    }

    // 3. 若仍未取得根字，或仍有未解析的部分，嘗試以常見荷蘭語前綴與後綴做切割 (備援)
    // 加上 'zij' 到 prefixes，'feest' 到 suffixes
    const prefixes = ['aange', 'uitge', 'onder', 'om', 'te', 'ge', 'be', 'ver', 'her', 'ont', 'mis', 'voor', 'naar', 'kenteken', 'tegen', 'opge', 'op', 'aan', 'uit', 'in', 'af', 'mee', 'toe', 'door', 'over', 'rond', 'samen', 'terug', 'thuis', 'vast', 'weg', 'binnen', 'buiten', 'neer', 'zij'];
    const suffixes = ['kundige', 'lijk', 'baar', 'ig', 'isch', 'heid', 'ing', 'schap', 'igheid', 'plaat', 'duiker', 'schakelen', 'liggers', 'en', 'feest'];
    
    if (roots.length === 0) {
        let remaining = (card.front || '').toLowerCase();
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
        // 後綴檢查：剩餘部分必須 >= 3 字母才允許切，避免對短字誤判
        for (const suf of suffixes) {
            if (remaining.endsWith(suf) && !roots.includes(suf) && remaining.length - suf.length >= 3) {
                roots.push(suf);
                remaining = remaining.slice(0, -suf.length);
                break;
            }
        }
        // 若仍有剩餘且未被列為根字，加入最後的根字
        if (remaining && remaining.length > 0 && !roots.includes(remaining)) {
            roots.push(remaining);
        }
    }

    // 4. 「能分開就分開」優化：若有大字根能被其他兩個小字根組合而成（含常見連接音），則移除大字根
    if (roots.length >= 3) {
        const sorted = [...roots].sort((a, b) => b.length - a.length);
        const toRemove = new Set();
        for (let i = 0; i < sorted.length; i++) {
            const r1 = sorted[i];
            for (let j = 0; j < sorted.length; j++) {
                if (i === j) continue;
                const r2 = sorted[j];
                if (r1.startsWith(r2)) {
                    const rest = r1.slice(r2.length);
                    for (let k = 0; k < sorted.length; k++) {
                        if (i === k || j === k) continue;
                        const r3 = sorted[k];
                        if (rest === r3 || 
                            rest === 's' + r3 || 
                            rest === 'e' + r3 || 
                            rest === 'en' + r3) {
                            toRemove.add(r1);
                            break;
                        }
                    }
                }
                if (toRemove.has(r1)) break;
            }
        }
        roots = roots.filter(r => !toRemove.has(r));
    }

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
