/**
 * MemoFlip SRS 演算法
 * 三階段設計：學習階段 → 複習階段 → 重學階段
 * 參考 Anki SM-2，加入 Fuzz Factor 避免易度地獄
 */

export const RATING = {
    AGAIN: 1, // 完全忘了
    HARD: 2, // 有點模糊
    GOOD: 3, // 記得了！
    EASY: 4, // 完全記得
}

export const STATUS = {
    LEARNING: 'learning',   // 新卡，正在建立印象
    REVIEW: 'review',     // 已畢業，進入間隔擴展
    RELEARNING: 'relearning', // 複習時忘記，重學
}

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

// 學習階梯：新卡要依序通過這些關卡才算「畢業」
const LEARNING_STEPS = [1 * MIN, 10 * MIN]
// 重學階梯：背過但忘記的卡，要通過這個關卡才回到複習
const RELEARNING_STEPS = [10 * MIN]

/**
 * 在計算出的間隔上加入 ±10% 隨機偏移
 * 目的：避免大量卡片擠在同一天到期（Fuzz Factor）
 */
function fuzz(ms) {
    const jitter = ms * 0.1
    return Math.round(ms + (Math.random() * 2 - 1) * jitter)
}

/**
 * 初始化新卡片的 SRS 資料
 */
export function initCard() {
    return {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        dueDate: Date.now(),
        status: STATUS.LEARNING,
        step: 0,   // 目前在哪一個學習/重學階梯
    }
}

/**
 * 三階段調度：根據卡片目前狀態與用戶評分，計算下次複習時間
 */
export function scheduleCard(card, rating) {
    const now = Date.now()
    let { interval, easeFactor, repetitions, status, step } = card

    // 相容舊資料（沒有 status 欄位的卡片）
    if (!status) status = repetitions >= 2 ? STATUS.REVIEW : STATUS.LEARNING
    if (step === undefined) step = 0

    // ─────────────────────────────
    // 📖 學習階段：新卡畢業前
    // ─────────────────────────────
    if (status === STATUS.LEARNING) {
        if (rating === RATING.AGAIN) {
            // 重來：退回第一步
            return _make(LEARNING_STEPS[0], easeFactor, 0, now, STATUS.LEARNING, 0)
        }
        if (rating === RATING.HARD) {
            // 困難：停在目前階梯，但稍微延長
            const t = LEARNING_STEPS[step] * 1.5
            return _make(t, easeFactor, repetitions, now, STATUS.LEARNING, step)
        }
        if (rating === RATING.GOOD) {
            const next = step + 1
            if (next >= LEARNING_STEPS.length) {
                // 畢業！進入複習階段，第一次間隔 1 天
                return _make(1 * DAY, easeFactor, 1, now, STATUS.REVIEW, 0)
            }
            return _make(LEARNING_STEPS[next], easeFactor, repetitions, now, STATUS.LEARNING, next)
        }
        if (rating === RATING.EASY) {
            // 跳過所有階梯，直接畢業，間隔 4 天
            return _make(4 * DAY, Math.min(4.0, easeFactor + 0.15), 1, now, STATUS.REVIEW, 0)
        }
    }

    // ─────────────────────────────
    // 📈 複習階段：正式 SM-2 計算
    // ─────────────────────────────
    if (status === STATUS.REVIEW) {
        if (rating === RATING.AGAIN) {
            // 忘記：進入重學，降低易度係數
            const newEF = Math.max(1.3, easeFactor - 0.2)
            return _make(RELEARNING_STEPS[0], newEF, 0, now, STATUS.RELEARNING, 0)
        }
        if (rating === RATING.HARD) {
            // 困難：間隔 × 1.2，降低易度係數
            const newEF = Math.max(1.3, easeFactor - 0.15)
            const i = fuzz(Math.max(interval + DAY, Math.round(interval * 1.2)))
            return _make(i, newEF, repetitions + 1, now, STATUS.REVIEW, 0)
        }
        if (rating === RATING.GOOD) {
            // 良好：間隔 × 易度係數（SM-2 核心）
            const i = fuzz(Math.round(interval * easeFactor))
            return _make(i, easeFactor, repetitions + 1, now, STATUS.REVIEW, 0)
        }
        if (rating === RATING.EASY) {
            // 輕鬆：間隔 × 易度係數 × 1.3，提升易度
            const newEF = Math.min(4.0, easeFactor + 0.15)
            const i = fuzz(Math.round(interval * newEF * 1.3))
            return _make(i, newEF, repetitions + 1, now, STATUS.REVIEW, 0)
        }
    }

    // ─────────────────────────────
    // 🔄 重學階段：背過但忘記
    // ─────────────────────────────
    if (status === STATUS.RELEARNING) {
        if (rating === RATING.AGAIN || rating === RATING.HARD) {
            // 再次失敗：重回重學起點
            return _make(RELEARNING_STEPS[0], easeFactor, 0, now, STATUS.RELEARNING, 0)
        }
        // Good / Easy：重學成功，回到複習，間隔至少 1 天
        const i = fuzz(Math.max(1 * DAY, Math.round(card.interval * 0.5)))
        const newEF = rating === RATING.EASY ? Math.min(4.0, easeFactor + 0.1) : easeFactor
        return _make(i, newEF, 1, now, STATUS.REVIEW, 0)
    }

    // fallback
    return _make(DAY, easeFactor, repetitions + 1, now, STATUS.REVIEW, 0)
}

function _make(interval, easeFactor, repetitions, now, status, step) {
    return { interval, easeFactor, repetitions, dueDate: now + interval, status, step }
}

/**
 * 計算按鈕上方顯示的預覽文字
 */
export function previewLabel(card, rating) {
    const s = scheduleCard(card, rating)
    const ms = s.interval

    // 學習/重學階段顯示分鐘
    if (ms < 60 * MIN) return `${Math.round(ms / MIN)} 分鐘後再複習`
    if (ms < DAY) return `${Math.round(ms / (60 * MIN))} 小時後再複習`
    return `${Math.round(ms / DAY)} 天後再複習`
}

/**
 * 取得「今天到期」的卡片（包含學習/重學中的）
 * 並依優先級排序：重學(紅) > 學習(橘) > 複習(藍)
 */
export function getDueCards(cards) {
    const now = Date.now()
    let due = cards.filter(c => c.dueDate <= now)

    const p = { [STATUS.RELEARNING]: 1, [STATUS.LEARNING]: 2, [STATUS.REVIEW]: 3 }
    due.sort((a, b) => {
        const pa = p[a.status || STATUS.LEARNING] || 3
        const pb = p[b.status || STATUS.LEARNING] || 3
        if (pa !== pb) return pa - pb
        return a.dueDate - b.dueDate
    })

    return due
}

/**
 * 減壓模式 (Decompression Mode)
 * 當到期卡片超過上限 (例如 100 張)，將多餘的 `REVIEW` 藍色卡片
 * 的 dueDate 平滑展延至明天，降低用戶今日的認知負荷。
 */
export function decompressCards(cards, threshold = 100) {
    const due = getDueCards(cards)
    if (due.length <= threshold) return { updatedCards: cards, decompressedCount: 0 }

    // 找出多餘的、優先級最低的 REVIEW 卡片來延後
    const reviewCards = due.filter(c => c.status === STATUS.REVIEW)
    const excess = due.length - threshold

    if (excess <= 0 || reviewCards.length === 0) return { updatedCards: cards, decompressedCount: 0 }

    // 最少保留 0 張，最多延展 excess 張或全部 reviewCards
    const toDelayCount = Math.min(excess, reviewCards.length)
    // 拿最後面的來延期（通常是 dueDate 比較遠的，或是沒那麼緊急的）
    const toDelay = reviewCards.slice(-toDelayCount)
    const toDelayIds = new Set(toDelay.map(c => c.id))

    const now = Date.now()
    const DAY = 24 * 60 * 60 * 1000

    const updated = cards.map(c => {
        if (toDelayIds.has(c.id)) {
            // 平滑打散到明天 (加上 12~24 小時的隨機)
            const delay = DAY * 0.5 + Math.random() * DAY * 0.5
            return { ...c, dueDate: now + delay }
        }
        return c
    })

    return { updatedCards: updated, decompressedCount: toDelayCount }
}

/**
 * 取得卡片狀態標籤（用於 UI 顯示）
 */
export function getStatusLabel(card) {
    if (!card.status || card.status === STATUS.LEARNING) return { label: '學習中', color: '#ffab40' }
    if (card.status === STATUS.RELEARNING) return { label: '重學中', color: '#ff5252' }
    return { label: '複習', color: '#40c4ff' }
}
