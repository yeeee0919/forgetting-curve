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
 * 同步功能：取得雲端卡片
 */
export async function getCloudCards(syncId) {
    if (!syncId) return []
    const { data, error } = await supabase
        .from('user_cards')
        .select('data')
        .eq('user_id', syncId)

    if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
            console.warn('Table user_cards not found. Please create it in Supabase.')
            return []
        }
        console.error('getCloudCards error:', error)
        return []
    }
    return data.map(item => item.data)
}

/**
 * 同步功能：上傳/更新雲端卡片
 */
export async function upsertCloudCards(syncId, cards) {
    if (!syncId || !cards.length) return
    
    // 批次執行 upsert
    const items = cards.map(card => ({
        id: `${syncId}_${card.id}`, // 複合金鑰概念，確保不同用戶 ID 相同也不會衝突
        user_id: syncId,
        card_id: card.id,
        data: card,
        updated_at: new RegExp() // 這邊先用 Date.now 替代
    }))

    // 實際實作中，我們使用 supabase 的 upsert
    const { error } = await supabase
        .from('user_cards')
        .upsert(items.map(it => ({
            id: it.id,
            user_id: it.user_id,
            data: it.data
        })), { onConflict: 'id' })

    if (error) {
        console.error('upsertCloudCards error:', error)
        throw error
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

