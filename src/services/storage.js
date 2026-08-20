/**
 * localStorage 資料管理
 * 字卡依帳號隔離：訪客用 memoflip_cards，登入用 memoflip_cards:<userId>
 */

const CARDS_KEY = 'memoflip_cards'
const SETTINGS_KEY = 'memoflip_settings'

function cardsKey(userId) {
    return userId ? `${CARDS_KEY}:${userId}` : CARDS_KEY
}

export function getCards(userId = null) {
    try {
        const raw = localStorage.getItem(cardsKey(userId))
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

let cardsTimeout = null
let settingsTimeout = null
let pendingCardsKey = null

export function clearCards(userId = null) {
    if (cardsTimeout && pendingCardsKey === cardsKey(userId)) {
        clearTimeout(cardsTimeout)
        cardsTimeout = null
        pendingCardsKey = null
    }
    try {
        localStorage.removeItem(cardsKey(userId))
    } catch {
        /* ignore */
    }
}

/** 取消任何尚未寫入的字卡 debounce，避免換帳號時寫錯 key */
export function cancelPendingCardSaves() {
    if (cardsTimeout) {
        clearTimeout(cardsTimeout)
        cardsTimeout = null
        pendingCardsKey = null
    }
}

export function saveCards(cards, userId = null) {
    // 移至下一個 Event Loop 執行，並加入 Debounce 防抖，
    // 避免短時間內連按造成多個大型陣列的 closure 堆積與 CPU 瞬間負載過高，進而引發 Compositor Crash。
    const key = cardsKey(userId)
    if (cardsTimeout) clearTimeout(cardsTimeout)
    pendingCardsKey = key

    cardsTimeout = setTimeout(() => {
        try {
            localStorage.setItem(key, JSON.stringify(cards))
        } catch (e) {
            console.error('Failed to save cards:', e)
        } finally {
            cardsTimeout = null
            pendingCardsKey = null
        }
    }, 150) // 延遲時間從 10ms 拉長到 150ms 確保真的防抖
}

export function getSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY)
        return raw ? JSON.parse(raw) : { openaiKey: '', geminiKey: '' }
    } catch {
        return { openaiKey: '', geminiKey: '' }
    }
}

export function saveSettings(settings) {
    if (settingsTimeout) clearTimeout(settingsTimeout)

    settingsTimeout = setTimeout(() => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
        } catch (e) {
            console.error('Failed to save settings:', e)
        }
    }, 150)
}

export function generateId() {
    return `card_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const SESSION_KEY = 'memoflip_session_state'

export function getSessionState() {
    try {
        const raw = localStorage.getItem(SESSION_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        return {
            activeSession: parsed.activeSession || null,
            history: parsed.history || [],
            sessionSize: parsed.sessionSize || 30,
            bufferCapacity: parsed.bufferCapacity || 50
        }
    } catch {
        return { activeSession: null, history: [], sessionSize: 30, bufferCapacity: 50 }
    }
}

export function saveSessionState(state) {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(state))
    } catch (e) {
        console.error('Failed to save session state:', e)
    }
}
