import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ttfjdxnasklhealmxgoz.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MTX2iPYA2Z52_0Bbt1JZrw_hTFNZODw'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
})

export function mergeCardsByUpdatedAt(localCards = [], remoteCards = []) {
    const localMap = new Map(localCards.map(c => [c.id, c]))
    const remoteMap = new Map(remoteCards.map(c => [c.id, c]))
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])
    return Array.from(allIds).map(cid => {
        const local = localMap.get(cid)
        const remote = remoteMap.get(cid)
        if (!local) return remote
        if (!remote) return local
        return (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local
    })
}

export async function getCloudCards(userId) {
    if (!userId) return []

    let allData = []
    let from = 0
    const step = 1000

    while (true) {
        const { data, error } = await supabase
            .from('user_cards')
            .select('data')
            .eq('user_id', userId)
            .range(from, from + step - 1)

        if (error) {
            console.error('getCloudCards error:', error)
            break
        }
        if (!data || data.length === 0) break
        allData = allData.concat(data)
        if (data.length < step) break
        from += step
    }

    return allData.map(item => item.data).filter(Boolean)
}

export async function upsertCloudCards(userId, cards) {
    if (!userId || !cards.length) return

    const items = cards.map(card => ({
        id: `${userId}_${card.id}`,
        user_id: userId,
        data: card,
        updated_at: new Date().toISOString(),
    }))

    const chunkSize = 500
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)
        const { error } = await supabase
            .from('user_cards')
            .upsert(chunk, { onConflict: 'id' })
        if (error) {
            console.error('upsertCloudCards error:', error)
            throw error
        }
    }
}

export async function deleteCloudCard(userId, cardId) {
    if (!userId) return
    const { error } = await supabase
        .from('user_cards')
        .delete()
        .eq('id', `${userId}_${cardId}`)
    if (error) console.error('deleteCloudCard error:', error)
}

export async function deleteAllCloudCards(userId) {
    if (!userId) return
    const { error } = await supabase
        .from('user_cards')
        .delete()
        .eq('user_id', userId)
    if (error) {
        console.error('deleteAllCloudCards error:', error)
        throw error
    }
}

export async function getCloudInbox(userId) {
    if (!userId) return []
    const { data, error } = await supabase
        .from('temp_inbox')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) {
        console.error('getCloudInbox error:', error)
        return []
    }
    return data || []
}

export async function upsertCloudInbox(userId, items) {
    if (!userId || !items?.length) return []
    const withId = []
    const withoutId = []
    for (const item of items) {
        const row = {
            user_id: userId,
            word: item.word,
            context_sentence: item.context_sentence || item.word,
            source_url: item.source_url || null,
            translation: item.translation || '',
        }
        if (isUuid(item.id)) withId.push({ ...row, id: item.id })
        else withoutId.push(row)
    }
    const out = []
    if (withId.length) {
        const { data, error } = await supabase.from('temp_inbox').upsert(withId, { onConflict: 'id' }).select()
        if (error) throw error
        if (data) out.push(...data)
    }
    if (withoutId.length) {
        const { data, error } = await supabase.from('temp_inbox').insert(withoutId).select()
        if (error) throw error
        if (data) out.push(...data)
    }
    return out
}

export async function deleteCloudInboxItem(userId, id) {
    if (!userId || !id) return
    const { error } = await supabase.from('temp_inbox').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
}

export async function clearCloudInbox(userId, ids) {
    if (!userId || !ids?.length) return
    const { error } = await supabase.from('temp_inbox').delete().in('id', ids).eq('user_id', userId)
    if (error) throw error
}

function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

