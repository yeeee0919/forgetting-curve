/**
 * localStorage 資料管理
 */

const CARDS_KEY = 'memoflip_cards'
const SETTINGS_KEY = 'memoflip_settings'

export function getCards() {
    try {
        const raw = localStorage.getItem(CARDS_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

let cardsTimeout = null
let settingsTimeout = null

export function saveCards(cards) {
    // 移至下一個 Event Loop 執行，並加入 Debounce 防抖，
    // 避免短時間內連按造成多個大型陣列的 closure 堆積與 CPU 瞬間負載過高，進而引發 Compositor Crash。
    if (cardsTimeout) clearTimeout(cardsTimeout)

    cardsTimeout = setTimeout(() => {
        try {
            localStorage.setItem(CARDS_KEY, JSON.stringify(cards))
        } catch (e) {
            console.error('Failed to save cards:', e)
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
