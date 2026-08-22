import { handleAdminStats } from './_lib/handleAdminStats.js'

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
    if (req.method !== 'GET') {
        send(res, 404, { error: 'Not found' })
        return
    }
    try {
        const result = await handleAdminStats(bearer(req))
        send(res, 200, result)
    } catch (err) {
        const status = err.status === 404 ? 404 : (err.status || 500)
        send(res, status, {
            error: status === 404 ? 'Not found' : (err.message || '伺服器錯誤'),
        })
    }
}
