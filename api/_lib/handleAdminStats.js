import { createClient } from '@supabase/supabase-js'

export const AI_QUOTA_LIMIT = 50
export const ACTIVE_DAYS = 7
const PAGE = 1000

function notFound() {
    const err = new Error('Not found')
    err.status = 404
    throw err
}

function supabaseUrl() {
    return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ttfjdxnasklhealmxgoz.supabase.co'
}

function supabaseAnonKey() {
    return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MTX2iPYA2Z52_0Bbt1JZrw_hTFNZODw'
}

function parseAdminEmails() {
    return String(process.env.ADMIN_EMAILS || '')
        .split(/[,;\s]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
}

function uid(value) {
    return String(value || '').trim().toLowerCase()
}

async function requireAdmin(accessToken) {
    if (!accessToken) notFound()
    const allow = parseAdminEmails()
    if (!allow.length) notFound()

    const client = createClient(supabaseUrl(), supabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
    const { data, error } = await client.auth.getUser(accessToken)
    const email = String(data?.user?.email || '').trim().toLowerCase()
    if (error || !data?.user || !allow.includes(email)) notFound()
    return data.user
}

function serviceClient() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
        const err = new Error('伺服器尚未設定 SUPABASE_SERVICE_ROLE_KEY')
        err.status = 500
        throw err
    }
    return createClient(supabaseUrl(), key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

async function fetchAll(client, table, columns) {
    const out = []
    let from = 0
    for (;;) {
        const { data, error } = await client
            .from(table)
            .select(columns)
            .range(from, from + PAGE - 1)
        if (error) throw new Error(error.message)
        if (!data?.length) break
        out.push(...data)
        if (data.length < PAGE) break
        from += PAGE
    }
    return out
}

async function listAllUsers(client) {
    const users = []
    let page = 1
    for (;;) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE })
        if (error) throw new Error(error.message)
        const batch = data?.users || []
        users.push(...batch)
        if (batch.length < PAGE) break
        page += 1
        if (page > 50) break
    }
    return users
}

export function assembleStats({
    users,
    cardRows,
    inboxRows,
    usageRows,
    now = Date.now(),
    aiLimit = AI_QUOTA_LIMIT,
    activeDays = ACTIVE_DAYS,
}) {
    const cutoff = now - activeDays * 24 * 60 * 60 * 1000
    const cardsByUser = new Map()
    for (const row of cardRows || []) {
        const id = uid(row.user_id)
        if (!id) continue
        const prev = cardsByUser.get(id) || { cardCount: 0, lastCardSyncAt: null }
        prev.cardCount += 1
        const ts = row.updated_at ? Date.parse(row.updated_at) : NaN
        if (Number.isFinite(ts) && (!prev.lastCardSyncAt || ts > Date.parse(prev.lastCardSyncAt))) {
            prev.lastCardSyncAt = row.updated_at
        }
        cardsByUser.set(id, prev)
    }

    const inboxByUser = new Map()
    for (const row of inboxRows || []) {
        const id = uid(row.user_id)
        if (!id) continue
        inboxByUser.set(id, (inboxByUser.get(id) || 0) + 1)
    }

    const usageByUser = new Map()
    for (const row of usageRows || []) {
        const id = uid(row.user_id)
        if (!id) continue
        usageByUser.set(id, Number(row.cards_created) || 0)
    }

    const list = (users || []).map(user => {
        const id = uid(user.id)
        const cards = cardsByUser.get(id) || { cardCount: 0, lastCardSyncAt: null }
        return {
            id,
            email: user.email || '',
            createdAt: user.created_at || null,
            lastSignInAt: user.last_sign_in_at || null,
            cardCount: cards.cardCount,
            lastCardSyncAt: cards.lastCardSyncAt,
            inboxCount: inboxByUser.get(id) || 0,
            aiUsed: usageByUser.get(id) || 0,
            aiLimit,
        }
    })

    list.sort((a, b) => {
        const ta = a.lastCardSyncAt ? Date.parse(a.lastCardSyncAt) : 0
        const tb = b.lastCardSyncAt ? Date.parse(b.lastCardSyncAt) : 0
        if (tb !== ta) return tb - ta
        return String(a.email).localeCompare(String(b.email))
    })

    return {
        summary: {
            registered: list.length,
            activated: list.filter(u => u.cardCount >= 1).length,
            active7d: list.filter(u => u.lastCardSyncAt && Date.parse(u.lastCardSyncAt) >= cutoff).length,
            quotaExhausted: list.filter(u => u.aiUsed >= aiLimit).length,
        },
        users: list,
    }
}

export async function handleAdminStats(accessToken) {
    await requireAdmin(accessToken)
    const service = serviceClient()
    const [users, cardRows, inboxRows, usageRows] = await Promise.all([
        listAllUsers(service),
        fetchAll(service, 'user_cards', 'user_id, updated_at'),
        fetchAll(service, 'temp_inbox', 'user_id'),
        fetchAll(service, 'ai_usage', 'user_id, cards_created'),
    ])
    return assembleStats({ users, cardRows, inboxRows, usageRows })
}
