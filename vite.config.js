import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAiCards, handleGetQuota } from './api/_lib/handleAiCards.js'
import { handleAdminStats } from './api/_lib/handleAdminStats.js'
import { bodyTooLarge, payloadTooLarge } from './api/_lib/aiGuard.js'

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let buf = ''
        req.on('data', chunk => { buf += chunk })
        req.on('end', () => {
            try {
                resolve(buf ? JSON.parse(buf) : {})
            } catch (e) {
                reject(e)
            }
        })
        req.on('error', reject)
    })
}

function bearer(req) {
    const h = req.headers.authorization || ''
    const m = String(h).match(/^Bearer\s+(.+)$/i)
    return m ? m[1] : ''
}

function aiDevPlugin() {
    return {
        name: 'ai-cards-dev',
        configureServer(server) {
            server.middlewares.use('/api/ai-cards', async (req, res, next) => {
                if (req.method === 'OPTIONS') {
                    res.statusCode = 204
                    res.end()
                    return
                }
                try {
                    const accessToken = bearer(req)
                    if (req.method === 'GET') {
                        const quota = await handleGetQuota(accessToken)
                        res.setHeader('Content-Type', 'application/json; charset=utf-8')
                        res.end(JSON.stringify({ quota }))
                        return
                    }
                    if (req.method !== 'POST') return next()
                    if (payloadTooLarge(req.headers['content-length'])) {
                        res.statusCode = 413
                        res.setHeader('Content-Type', 'application/json; charset=utf-8')
                        res.end(JSON.stringify({ error: '請求太大' }))
                        return
                    }
                    const body = await readJsonBody(req)
                    if (bodyTooLarge(body)) {
                        res.statusCode = 413
                        res.setHeader('Content-Type', 'application/json; charset=utf-8')
                        res.end(JSON.stringify({ error: '請求太大' }))
                        return
                    }
                    const result = await handleAiCards({ accessToken, body })
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify(result))
                } catch (err) {
                    res.statusCode = err.status || 500
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ error: err.message || '伺服器錯誤', quota: err.quota || null }))
                }
            })
            server.middlewares.use('/api/admin-stats', async (req, res, next) => {
                if (req.method === 'OPTIONS') {
                    res.statusCode = 204
                    res.end()
                    return
                }
                if (req.method !== 'GET') {
                    res.statusCode = 404
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({ error: 'Not found' }))
                    return
                }
                try {
                    const result = await handleAdminStats(bearer(req))
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify(result))
                } catch (err) {
                    const status = err.status === 404 ? 404 : (err.status || 500)
                    res.statusCode = status
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    res.end(JSON.stringify({
                        error: status === 404 ? 'Not found' : (err.message || '伺服器錯誤'),
                    }))
                }
            })
        },
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    for (const key of ['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAILS']) {
        if (env[key] && !process.env[key]) process.env[key] = env[key]
    }
    return {
        plugins: [react(), aiDevPlugin()],
        server: {
            port: 5173,
            strictPort: true,
        },
    }
})
