import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ttfjdxnasklhealmxgoz.supabase.co'
const supabaseKey = 'sb_publishable_MTX2iPYA2Z52_0Bbt1JZrw_hTFNZODw'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getInboxWords() {
    const { data, error } = await supabase
        .from('temp_inbox')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getInboxWords error:', error)
        return []
    }
    return data
}

export async function deleteInboxWord(id) {
    const { error } = await supabase
        .from('temp_inbox')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function clearInbox(ids) {
    const { error } = await supabase
        .from('temp_inbox')
        .delete()
        .in('id', ids)

    if (error) throw error
}

/** 
 * 同步功能：取得雲端卡片 (支援超過 1000 筆的分頁抓取)
 */
export async function getCloudCards(syncId) {
    if (!syncId) return []
    
    let allData = []
    let from = 0
    let step = 1000
    
    while (true) {
        const { data, error } = await supabase
            .from('user_cards')
            .select('data')
            .eq('user_id', syncId)
            .range(from, from + step - 1)

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('not found')) {
                console.warn('Table user_cards not found. Please create it in Supabase.')
                return allData.length > 0 ? allData.map(item => item.data) : []
            }
            console.error('getCloudCards error:', error)
            break
        }
        
        if (!data || data.length === 0) {
            break
        }
        
        allData = allData.concat(data)
        
        if (data.length < step) {
            break
        }
        from += step
    }
    
    return allData.map(item => item.data)
}

/**
 * 同步功能：上傳/更新雲端卡片 (批次上傳避免 Payload 過大)
 */
export async function upsertCloudCards(syncId, cards) {
    if (!syncId || !cards.length) return
    
    const items = cards.map(card => ({
        id: `${syncId}_${card.id}`,
        user_id: syncId,
        card_id: card.id,
        data: card,
        updated_at: new Date().toISOString()
    }))

    const chunkSize = 500
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)
        const { error } = await supabase
            .from('user_cards')
            .upsert(chunk.map(it => ({
                id: it.id,
                user_id: it.user_id,
                data: it.data
            })), { onConflict: 'id' })

        if (error) {
            console.error('upsertCloudCards error:', error)
            throw error
        }
    }
}

/**
 * 同步功能：刪除雲端卡片
 */
export async function deleteCloudCard(syncId, cardId) {
    if (!syncId) return
    const { error } = await supabase
        .from('user_cards')
        .delete()
        .eq('id', `${syncId}_${cardId}`)

    if (error) console.error('deleteCloudCard error:', error)
}

