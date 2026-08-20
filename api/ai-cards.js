import { handleAiCards, handleGetQuota } from './_lib/handleAiCards.js'

function send(res, status, payload) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
}

function bearer(req) {
    const h = req.headers.authorization || req.headers.Authorization || ''
    const m = String(h).match(/^Bearer\s+(.+)$/i)
    return m ? m[1] : ''
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
    }

    try {
        const accessToken = bearer(req)
        if (req.method === 'GET') {
            const quota = await handleGetQuota(accessToken)
            send(res, 200, { quota })
            return
        }
        if (req.method !== 'POST') {
            send(res, 405, { error: 'Method not allowed' })
            return
        }
        let body = req.body
        if (body && typeof body === 'string') body = JSON.parse(body || '{}')
        if (!body || typeof body !== 'object') body = {}
        const result = await handleAiCards({ accessToken, body })
        send(res, 200, result)
    } catch (err) {
        send(res, err.status || 500, { error: err.message || '伺服器錯誤', quota: err.quota || null })
    }
}
