import { createClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT, ALCHEMIST_SYSTEM_PROMPT } from '../../src/services/cardPrompt.js'
import { validateAiWordList } from '../../src/services/aiWordList.js'

function supabaseUrl() {
    return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ttfjdxnasklhealmxgoz.supabase.co'
}

function supabaseAnonKey() {
    return process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MTX2iPYA2Z52_0Bbt1JZrw_hTFNZODw'
}

function userClient(accessToken) {
    return createClient(supabaseUrl(), supabaseAnonKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
}

async function requireUser(accessToken) {
    if (!accessToken) {
        const err = new Error('請先用 Google 登入')
        err.status = 401
        throw err
    }
    const supabase = userClient(accessToken)
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data?.user) {
        const err = new Error('登入已過期，請再登入一次')
        err.status = 401
        throw err
    }
    return { supabase, user: data.user }
}

async function getQuota(supabase) {
    const { data, error } = await supabase.rpc('get_ai_quota')
    if (error) throw new Error(error.message)
    if (!data) return { used: 0, limit: 50, remaining: 50 }
    if (typeof data === 'string') return JSON.parse(data)
    return data
}

async function consumeQuota(supabase, requested) {
    const { data, error } = await supabase.rpc('consume_ai_quota', { requested })
    if (error) throw new Error(error.message)
    if (typeof data === 'string') return JSON.parse(data)
    return data
}

async function callOpenAi(messages, temperature = 0.3) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        const err = new Error('伺服器尚未設定 OPENAI_API_KEY')
        err.status = 500
        throw err
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature,
            response_format: { type: 'json_object' },
        }),
    })
    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        const err = new Error(errBody?.error?.message || `OpenAI 錯誤 (${response.status})`)
        err.status = 502
        throw err
    }
    const data = await response.json()
    return data.choices?.[0]?.message?.content || '{}'
}

export async function handleAiCards({ accessToken, body }) {
    const { supabase } = await requireUser(accessToken)
    const quota = await getQuota(supabase)
    const remaining = Number(quota?.remaining ?? 0)
    if (remaining <= 0) {
        const err = new Error('AI 額度已用完。仍可用「原文 / 譯文」直接加字。')
        err.status = 402
        err.quota = quota
        throw err
    }

    const mode = body?.mode || 'import'

    if (mode === 'inbox') {
        const word = String(body.word || '').trim()
        if (!word) {
            const err = new Error('單字不能為空')
            err.status = 400
            throw err
        }
        const userPrompt = `目標單字：${word}\n原始語境：${body.context || '無'}\n字典參考翻譯：${body.hint || '無'}`
        const content = await callOpenAi([
            { role: 'system', content: ALCHEMIST_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ], 0.2)
        const card = parseSingleCardJson(content)
        if (!card) {
            const err = new Error('AI 沒有產出有效字卡')
            err.status = 502
            throw err
        }
        const spent = await consumeQuota(supabase, 1)
        if (!spent?.allowed) {
            const err = new Error('AI 額度已用完。仍可用「原文 / 譯文」直接加字。')
            err.status = 402
            err.quota = spent
            throw err
        }
        return { card: { ...card, front: card.front || word }, quota: spent }
    }

    const text = String(body.text || '').trim()
    if (!text) {
        const err = new Error('請先輸入要匯入的文字')
        err.status = 400
        throw err
    }
    const listCheck = validateAiWordList(text, { remainingQuota: remaining })
    if (!listCheck.ok) {
        const err = new Error(listCheck.reason || '輸入不符合 AI 匯入格式')
        err.status = 400
        throw err
    }
    const content = await callOpenAi([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
    ])
    let cards = parseCardsJson(content)
    if (!cards.length) {
        const err = new Error('沒有解析到任何單字，請確認格式')
        err.status = 422
        throw err
    }
    cards = cards.slice(0, remaining)
    const spent = await consumeQuota(supabase, cards.length)
    const allowed = Number(spent?.allowed ?? 0)
    cards = cards.slice(0, allowed)
    if (!cards.length) {
        const err = new Error('AI 額度已用完。仍可用「原文 / 譯文」直接加字。')
        err.status = 402
        err.quota = spent
        throw err
    }
    return { cards, quota: spent }
}

export async function handleGetQuota(accessToken) {
    const { supabase } = await requireUser(accessToken)
    return getQuota(supabase)
}
