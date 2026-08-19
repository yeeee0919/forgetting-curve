/**
 * MemoFlip SRS 演算法
 * 四段漏斗：總量池 → 緩衝區 → 已熟練 → 成熟
 * 參考 Anki SM-2，加入 Fuzz Factor 避免易度地獄
 *
 * 單字不離開系統。成熟卡到期仍會回來，只是較少。
 */

import { getCardRoots } from './wordUtils.js'

export const RATING = {
    AGAIN: 1, // 完全忘了
    HARD: 2, // 有點模糊
    GOOD: 3, // 記得了！
    EASY: 4, // 完全記得
}

export const STATUS = {
    NEW: 'new',           // 總量池：尚未開始學習的新字
    LEARNING: 'learning',   // 緩衝區：新卡，或尚未滿 3 天的日級複習
    REVIEW: 'review',     // 已離開緩衝區（已熟練或成熟）
    RELEARNING: 'relearning', // 緩衝區：複習時忘記，重學
}

const MIN = 60 * 1000
const DAY = 24 * 60 * MIN

/** 離開緩衝區、進入已熟練的間隔門檻（「記得了」路徑） */
export const GRADUATE_INTERVAL = 3 * DAY
/** 從已熟練升成成熟、從日常磨字淡出的間隔門檻 */
export const MATURE_INTERVAL = 21 * DAY

// 學習階梯：新卡要依序通過這些關卡才開始以「天」複習
const LEARNING_STEPS = [1 * MIN, 10 * MIN]
// 重學階梯：背過但忘記的卡，要通過這個關卡才回到日級複習
const RELEARNING_STEPS = [10 * MIN]

/**
 * 在計算出的間隔上加入 ±10% 隨機偏移
 * 目的：避免大量卡片擠在同一天到期（Fuzz Factor）
 */
function fuzz(ms) {
    const jitter = ms * 0.1
    return Math.round(ms + (Math.random() * 2 - 1) * jitter)
}

function bufferOrReview(interval) {
    return interval >= GRADUATE_INTERVAL ? STATUS.REVIEW : STATUS.LEARNING
}

export function isMature(card) {
    return card?.status === STATUS.REVIEW && (card.interval || 0) >= MATURE_INTERVAL
}

export function getStage(card) {
    if (!card) return 'learning'
    if (card.status === STATUS.NEW) return 'new'
    if (card.status === STATUS.RELEARNING) return 'relearning'
    if (card.status === STATUS.REVIEW) return isMature(card) ? 'mature' : 'review'
    return 'learning'
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
        step: 0,         // 目前在哪一個學習/重學階梯
        lastReviewInterval: 0, // 進重學前的最後 REVIEW 間隔（用於重學後正確折損）
    }
}

/**
 * SM-2 日級調度。
 * stayReview: 已離開緩衝區的卡，Hard 使間隔暫低於 3 天也不退回緩衝區（祖父條款）。
 */
function applySm2(card, rating, now, { stayReview }) {
    const { interval, easeFactor, repetitions } = card

    if (rating === RATING.AGAIN) {
        const newEF = Math.max(1.3, easeFactor - 0.2)
        return {
            ..._make(RELEARNING_STEPS[0], newEF, 0, now, STATUS.RELEARNING, 0),
            lastReviewInterval: interval,
        }
    }

    let i
    let newEF = easeFactor
    if (rating === RATING.HARD) {
        newEF = Math.max(1.3, easeFactor - 0.15)
        i = fuzz(Math.max(1 * DAY, Math.max(interval + DAY, Math.round(interval * 1.2))))
    } else if (rating === RATING.GOOD) {
        i = fuzz(Math.max(1 * DAY, Math.round(interval * easeFactor)))
    } else {
        newEF = Math.min(4.0, easeFactor + 0.15)
        i = fuzz(Math.max(1 * DAY, Math.round(interval * newEF * 1.3)))
    }

    const status = stayReview ? STATUS.REVIEW : bufferOrReview(i)
    return _make(i, newEF, repetitions + 1, now, status, 0)
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
    if (interval === undefined) interval = 0

    const working = { ...card, interval, easeFactor, repetitions, status, step }

    // ─────────────────────────────
    // 📖 學習階段：新卡，或尚未滿 3 天、仍佔緩衝區名額
    // ─────────────────────────────
    if (status === STATUS.LEARNING || status === STATUS.NEW) {
        const onMinuteSteps = interval < DAY

        if (onMinuteSteps) {
            if (rating === RATING.AGAIN) {
                return _make(LEARNING_STEPS[0], easeFactor, 0, now, STATUS.LEARNING, 0)
            }
            if (rating === RATING.HARD) {
                const t = LEARNING_STEPS[step] * 1.5
                return _make(t, easeFactor, repetitions, now, STATUS.LEARNING, step)
            }
            if (rating === RATING.GOOD) {
                const next = step + 1
                if (next >= LEARNING_STEPS.length) {
                    // 通過分鐘階梯，開始以天複習，但仍留在緩衝區（1 天 < 3 天）
                    return _make(1 * DAY, easeFactor, 1, now, STATUS.LEARNING, next)
                }
                return _make(LEARNING_STEPS[next], easeFactor, repetitions, now, STATUS.LEARNING, next)
            }
            if (rating === RATING.EASY) {
                // 學習中按完全記得：4 天，當天出緩衝區
                return _make(4 * DAY, Math.min(4.0, easeFactor + 0.15), 1, now, STATUS.REVIEW, 0)
            }
        }

        // 日級、仍在緩衝區：用 SM-2，滿 3 天才出站
        return applySm2(working, rating, now, { stayReview: false })
    }

    // ─────────────────────────────
    // 📈 複習階段：已離開緩衝區（已熟練 / 成熟）
    // ─────────────────────────────
    if (status === STATUS.REVIEW) {
        return applySm2(working, rating, now, { stayReview: true })
    }

    // ─────────────────────────────
    // 🔄 重學階段：背過但忘記
    // ─────────────────────────────
    if (status === STATUS.RELEARNING) {
        if (rating === RATING.AGAIN || rating === RATING.HARD) {
            return {
                ..._make(RELEARNING_STEPS[0], easeFactor, 0, now, STATUS.RELEARNING, 0),
                lastReviewInterval: card.lastReviewInterval || 0,
            }
        }
        // Good / Easy：重學成功。間隔仍 < 3 天則回到緩衝區。
        const baseInterval = card.lastReviewInterval || 1 * DAY
        const i = fuzz(Math.max(1 * DAY, Math.round(baseInterval * 0.5)))
        const newEF = rating === RATING.EASY ? Math.min(4.0, easeFactor + 0.1) : easeFactor
        return _make(i, newEF, repetitions + 1, now, bufferOrReview(i), 0)
    }

    // fallback
    return _make(DAY, easeFactor, repetitions + 1, now, STATUS.REVIEW, 0)
}

function _make(interval, easeFactor, repetitions, now, status, step) {
    return { interval, easeFactor, repetitions, dueDate: now + interval, status, step }
}

/**
 * 匯入同一詞的新詞形時：熟練卡送進重學（等同複習時按「忘記」），其餘狀態不動。
 */
export function lapseToRelearning(card) {
    if (!card || card.status !== STATUS.REVIEW) return card
    const now = Date.now()
    const newEF = Math.max(1.3, (card.easeFactor || 2.5) - 0.2)
    return {
        ...card,
        interval: RELEARNING_STEPS[0],
        easeFactor: newEF,
        repetitions: 0,
        dueDate: now + RELEARNING_STEPS[0],
        status: STATUS.RELEARNING,
        step: 0,
        lastReviewInterval: card.interval || 0,
    }
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
 * 初始化遷移舊資料。
 * 不把已在 REVIEW、間隔 < 3 天的舊卡踢回緩衝區（祖父條款）。
 */
export function migrateCards(cards, bufferCapacity = 50) {
    let updated = false;
    const validStatuses = [STATUS.NEW, STATUS.LEARNING, STATUS.REVIEW, STATUS.RELEARNING];
    const migrated = cards.map(c => {
        let newStatus = c.status;

        // 【完整狀態驗證】：任何 undefined / null / 非法值都視為未知，依 repetitions 判斷
        if (!newStatus || !validStatuses.includes(newStatus)) {
            newStatus = (c.repetitions && c.repetitions > 0) ? STATUS.LEARNING : STATUS.NEW;
        }

        // 舊資料：曾學過但被誤標 NEW
        if (newStatus === STATUS.NEW && c.repetitions > 0) newStatus = STATUS.LEARNING;

        // 【自我修復 (Self-Healing)】：
        // 若卡片被標為 RELEARNING 但間隔 >= 1 天，代表這是被舊版 Bug 錯誤降級的熟練卡，
        // 大赦送回 REVIEW（正常重學剛進入時間隔只有 10 分鐘，不可能 >= 1 天）
        if (newStatus === STATUS.RELEARNING && c.interval >= 1 * DAY) {
            newStatus = STATUS.REVIEW;
        }

        // 【字根修復】：只保留確實出現在 front 裡的片段，不再清空整份 roots
        let newRoots = c.roots;
        if (newRoots && Array.isArray(newRoots)) {
            const freshRoots = getCardRoots(c);
            const freshSet = new Set(freshRoots.map(r => r.toLowerCase()));
            const cachedSet = new Set(newRoots.map(r => String(r).toLowerCase()));
            const mismatch = freshSet.size !== cachedSet.size ||
                [...freshSet].some(r => !cachedSet.has(r));
            if (mismatch) {
                newRoots = freshRoots;
                updated = true;
            }
        }

        if (c.status !== newStatus) updated = true;
        return { ...c, status: newStatus, roots: newRoots };
    });

    // 自動修剪緩衝區 (Buffer Pruning) - 嚴格執行名額制
    // 如果背誦區超載，會優先把「從未背過」的新字退回總量池；
    // 若還是超載，則把「最不急迫（到期日最遠）」的字退回總量池。
    let bufferCards = migrated.filter(c => c.status === STATUS.LEARNING || c.status === STATUS.RELEARNING);
    if (bufferCards.length > bufferCapacity) {
        let excessCount = bufferCards.length - bufferCapacity;
        
        // 第一波：針對從未練習過的 (repetitions = 0)
        const unstartedCards = bufferCards.filter(c => c.status === STATUS.LEARNING && (!c.repetitions || c.repetitions === 0));
        for (let i = unstartedCards.length - 1; i >= 0 && excessCount > 0; i--) {
            const cardToDemote = unstartedCards[i];
            const index = migrated.findIndex(c => c.id === cardToDemote.id);
            if (index !== -1) {
                migrated[index].status = STATUS.NEW;
                excessCount--;
                updated = true;
            }
        }

        // 第二波：如果名額還是超載，根據 dueDate 排序，把最晚到期的「新詞 (LEARNING)」踢出去
        // 絕對不踢除「記憶修復 (RELEARNING)」的單字，以免打斷複習節奏
        if (excessCount > 0) {
            const remainingLearning = migrated.filter(c => c.status === STATUS.LEARNING);
            const toDemote = remainingLearning.sort((a, b) => b.dueDate - a.dueDate).slice(0, excessCount);
            toDemote.forEach(card => {
                const index = migrated.findIndex(c => c.id === card.id);
                if (index !== -1) {
                    migrated[index].status = STATUS.NEW;
                    updated = true;
                }
            });
        }
    }

    return { migrated, updated };
}

function byDueDate(a, b) {
    return a.dueDate - b.dueDate
}

/**
 * 【漏斗控制：Session 排序】
 * 分鐘級緩衝區到期 → 以天計到期 → 新字（有空位且緩衝區未滿）。
 */
export function buildSessionSequence(cards, learningCapacity = 50, sessionSize = 30) {
    const now = Date.now();
    const validStatuses = [STATUS.NEW, STATUS.LEARNING, STATUS.REVIEW, STATUS.RELEARNING];

    const pool = cards.filter(c => c.status === STATUS.NEW || !validStatuses.includes(c.status));
    const buffer = cards.filter(c => c.status === STATUS.LEARNING || c.status === STATUS.RELEARNING);
    const learningBuffer = cards.filter(c => c.status === STATUS.LEARNING);
    const relearningBuffer = cards.filter(c => c.status === STATUS.RELEARNING);
    const reviewCards = cards.filter(c => c.status === STATUS.REVIEW);
    const mastered = reviewCards.filter(c => (c.interval || 0) < MATURE_INTERVAL);
    const mature = reviewCards.filter(c => (c.interval || 0) >= MATURE_INTERVAL);

    const bufferCount = buffer.length;
    const availableSlots = Math.max(0, learningCapacity - bufferCount);

    const dueBuffer = buffer.filter(c => c.dueDate <= now)
    const pMinute = dueBuffer.filter(c => (c.interval || 0) < DAY).sort(byDueDate)
    const pDayBuffer = dueBuffer.filter(c => (c.interval || 0) >= DAY).sort(byDueDate)
    const pReviewDue = reviewCards.filter(c => c.dueDate <= now).sort(byDueDate)
    const pDay = [...pDayBuffer, ...pReviewDue]

    const p1 = relearningBuffer.filter(c => c.dueDate <= now)
    const p2 = learningBuffer.filter(c => c.dueDate <= now)

    let session = [...pMinute]
    if (session.length < sessionSize) {
        session = [...session, ...pDay.slice(0, sessionSize - session.length)]
    }

    if (session.length < sessionSize && availableSlots > 0 && pool.length > 0) {
        const extraNew = Math.min(sessionSize - session.length, availableSlots, pool.length)
        session = [...session, ...pool.slice(0, extraNew)]
    }

    return {
        sessionCards: session.slice(0, sessionSize),
        stats: {
            pool: pool.length,
            buffer: bufferCount,
            learning: learningBuffer.length,
            learningDue: p2.length,
            relearning: relearningBuffer.length,
            relearningDue: p1.length,
            mastered: mastered.length,
            masteredDue: mastered.filter(c => c.dueDate <= now).length,
            mature: mature.length,
            matureDue: mature.filter(c => c.dueDate <= now).length,
            dueCount: pMinute.length + pDay.length,
        }
    };
}

/**
 * 取得卡片狀態標籤（用於 UI 顯示）
 */
export function getStatusLabel(card) {
    const stage = getStage(card)
    if (stage === 'new') return { label: '未學習', color: '#9e9e9e' }
    if (stage === 'learning') return { label: '背誦區', color: '#ffab40' }
    if (stage === 'relearning') return { label: '重學中', color: '#ff5252' }
    if (stage === 'mature') return { label: '成熟', color: '#0d9488' }
    return { label: '已熟練', color: '#40c4ff' }
}
