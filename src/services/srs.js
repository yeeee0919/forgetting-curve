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
    NEW: 'new',           // 總量池：尚未開始學習的新字
    LEARNING: 'learning',   // 背誦區：新卡，正在建立印象
    REVIEW: 'review',     // 熟練區：已畢業(間隔>=3天)
    RELEARNING: 'relearning', // 背誦區：複習時忘記，重學
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
        status: STATUS.NEW,
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
    // 📖 學習階段：新卡畢業前 (或者剛剛從 NEW 啟動)
    // ─────────────────────────────
    if (status === STATUS.LEARNING || status === STATUS.NEW) {
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
    // 【核心邏輯整合】：無論是誰，只要 Interval >= 3 天，一律強制畢業到「熟練區」
    if (interval >= 3 * DAY) {
        status = STATUS.REVIEW;
    } else if (status === STATUS.REVIEW && interval < 3 * DAY) {
        // 因答錯被懲罰跌破 3 天門檻，退回「背誦區」
        status = STATUS.RELEARNING;
    }
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
 * 初始化遷移舊資料，符合 3 天畢業新制與 NEW 狀態
 */
export function migrateCards(cards) {
    let updated = false;
    const migrated = cards.map(c => {
        let newStatus = c.status;
        if (!c.status) newStatus = c.repetitions > 0 ? STATUS.LEARNING : STATUS.NEW;
        
        if (newStatus === STATUS.NEW && c.repetitions > 0) newStatus = STATUS.LEARNING;

        if (c.interval >= 3 * DAY) newStatus = STATUS.REVIEW;
        else if (newStatus === STATUS.REVIEW) newStatus = STATUS.RELEARNING;

        if (c.status !== newStatus) updated = true;
        return { ...c, status: newStatus };
    });
    return { migrated, updated };
}

/**
 * 【漏斗控制：Session 排序】
 * 用遺忘曲線的緊迫度，嚴格填滿 30 個位置。
 */
export function buildSessionSequence(cards, learningCapacity = 100, sessionSize = 30) {
    const now = Date.now();
    
    const pool = cards.filter(c => c.status === STATUS.NEW); 
    const buffer = cards.filter(c => c.status === STATUS.LEARNING || c.status === STATUS.RELEARNING);
    const mastered = cards.filter(c => c.status === STATUS.REVIEW);

    const bufferCount = buffer.length;
    const availableSlots = Math.max(0, learningCapacity - bufferCount);

    // P0: 熟練區到期 (防止遺忘)
    const p0 = mastered.filter(c => c.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);
    
    // P1: 背誦區急迫 (短期記憶鞏固)
    const p1 = buffer.filter(c => c.status === STATUS.RELEARNING && c.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);
    
    // P2: 背誦區常規 (推進學習)
    const p2 = buffer.filter(c => c.status === STATUS.LEARNING && c.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);

    // 依序填滿 Session
    let session = [...p0, ...p1, ...p2];
    
    // P3: 總量池補充新字
    let newCardsToAdd = 0;
    if (session.length < sessionSize && availableSlots > 0) {
        newCardsToAdd = Math.min(sessionSize - session.length, availableSlots, pool.length);
        const p3 = pool.slice(0, newCardsToAdd);
        session = [...session, ...p3];
    }
    
    return {
        sessionCards: session.slice(0, sessionSize),
        stats: {
            pool: pool.length - newCardsToAdd, // 預估抽走後的剩餘量
            buffer: bufferCount + newCardsToAdd, // 背誦區加新字後的水位
            mastered: mastered.length,
            dueCount: p0.length + p1.length + p2.length // 今天真的該複習的舊卡量
        }
    };
}

/**
 * 取得卡片狀態標籤（用於 UI 顯示）
 */
export function getStatusLabel(card) {
    if (card.status === STATUS.NEW) return { label: '未學習', color: '#9e9e9e' }
    if (!card.status || card.status === STATUS.LEARNING) return { label: '背誦區', color: '#ffab40' }
    if (card.status === STATUS.RELEARNING) return { label: '重學中', color: '#ff5252' }
    return { label: '已熟練', color: '#40c4ff' }
}
