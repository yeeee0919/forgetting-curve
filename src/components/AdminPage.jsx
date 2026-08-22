import { useEffect, useState } from 'react'
import { subscribeAuth } from '../services/auth'
import './AdminPage.css'

function formatDt(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function NotFound() {
    return (
        <div className="admin-404">
            <p>找不到頁面</p>
            <a href="/">回首頁</a>
        </div>
    )
}

export default function AdminPage() {
    const [authReady, setAuthReady] = useState(false)
    const [session, setSession] = useState(null)
    const [status, setStatus] = useState('loading')
    const [payload, setPayload] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const unsub = subscribeAuth((next) => {
            setSession(next)
            setAuthReady(true)
        })
        return unsub
    }, [])

    useEffect(() => {
        if (!authReady) return
        if (!session?.access_token) {
            setStatus('notfound')
            return
        }
        let cancelled = false
        setStatus('loading')
        setError('')
        fetch('/api/admin-stats', {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
            .then(async (res) => {
                if (cancelled) return
                if (res.status === 404) {
                    setStatus('notfound')
                    return
                }
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                    setError(data.error || '載入失敗')
                    setStatus('error')
                    return
                }
                setPayload(data)
                setStatus('ready')
            })
            .catch(() => {
                if (cancelled) return
                setError('載入失敗')
                setStatus('error')
            })
        return () => { cancelled = true }
    }, [authReady, session?.access_token])

    if (!authReady || status === 'loading') {
        return (
            <div className="admin-shell">
                <p className="admin-muted">載入中</p>
            </div>
        )
    }

    if (status === 'notfound') return <NotFound />

    if (status === 'error') {
        return (
            <div className="admin-shell">
                <p className="admin-muted">{error || '載入失敗'}</p>
                <a className="admin-home" href="/">回首頁</a>
            </div>
        )
    }

    const summary = payload?.summary || {}
    const users = payload?.users || []

    return (
        <div className="admin-shell">
            <header className="admin-header">
                <p className="admin-kicker">使用概況</p>
                <h1>用戶</h1>
                <a className="admin-home" href="/">回首頁</a>
            </header>

            <section className="admin-summary" aria-label="總覽">
                <article>
                    <span>註冊</span>
                    <strong>{summary.registered ?? 0}</strong>
                </article>
                <article>
                    <span>已活化</span>
                    <strong>{summary.activated ?? 0}</strong>
                </article>
                <article>
                    <span>近 7 天有同步</span>
                    <strong>{summary.active7d ?? 0}</strong>
                </article>
                <article>
                    <span>AI 額度用完</span>
                    <strong>{summary.quotaExhausted ?? 0}</strong>
                </article>
            </section>

            <div className="admin-table-wrap">
                <table className="admin-table">
                    <caption>{users.length} 位用戶</caption>
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>註冊日</th>
                            <th>最後登入</th>
                            <th>字卡</th>
                            <th>字卡最後同步</th>
                            <th>Inbox</th>
                            <th>AI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="admin-empty">還沒有註冊用戶</td>
                            </tr>
                        ) : users.map((u) => {
                            const exhausted = u.aiUsed >= (u.aiLimit || 50)
                            return (
                                <tr key={u.id || u.email || u.createdAt}>
                                    <td className="admin-email">{u.email || '—'}</td>
                                    <td className="admin-nowrap">{formatDt(u.createdAt)}</td>
                                    <td className="admin-nowrap">{formatDt(u.lastSignInAt)}</td>
                                    <td className="admin-num">{u.cardCount}</td>
                                    <td className="admin-nowrap">{formatDt(u.lastCardSyncAt)}</td>
                                    <td className="admin-num">{u.inboxCount}</td>
                                    <td className={`admin-num${exhausted ? ' is-exhausted' : ''}`}>
                                        {u.aiUsed} / {u.aiLimit || 50}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
