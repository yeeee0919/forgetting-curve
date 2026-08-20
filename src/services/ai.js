/**
 * AI 導入服務
 * 正式路徑走 /api/ai-cards（金鑰在伺服器）。以下舊函式僅供本機有自備 key 時使用。
 */

async function aiFetch(accessToken, payload, method = 'POST') {
    const res = await fetch('/api/ai-cards', {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: method === 'GET' ? undefined : JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        const err = new Error(data.error || `AI 錯誤 (${res.status})`)
        err.status = res.status
        err.quota = data.quota
        throw err
    }
    return data
}

export async function fetchAiQuota(accessToken) {
    if (!accessToken) return null
    const data = await aiFetch(accessToken, null, 'GET')
    return data.quota || data
}

export async function parseTextToCardsWithSession(text, accessToken) {
    if (!accessToken) throw new Error('請先用 Google 登入才能用 AI 匯入')
    if (!String(text || '').trim()) throw new Error('請先輸入要匯入的文字')
    const data = await aiFetch(accessToken, { mode: 'import', text })
    return data
}

export async function parseInboxItemWithSession(word, context, accessToken, hint = '') {
    if (!accessToken) throw new Error('請先用 Google 登入才能用 AI 解析')
    if (!String(word || '').trim()) throw new Error('單字不能為空')
    const data = await aiFetch(accessToken, { mode: 'inbox', word, context, hint })
    return data
}
