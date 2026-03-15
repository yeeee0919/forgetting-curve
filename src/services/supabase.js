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
