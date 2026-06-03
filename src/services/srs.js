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
        step: 0,         // 目前在哪一個學習/重學階梯
        lastReviewInterval: 0, // 進重學前的最後 REVIEW 間隔（用於重學後正確折損）
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
            // 記住這次的 REVIEW 間隔，重學成功後用來做折損計算
            const newEF = Math.max(1.3, easeFactor - 0.2)
            return { ..._make(RELEARNING_STEPS[0], newEF, 0, now, STATUS.RELEARNING, 0), lastReviewInterval: interval }
        }
        if (rating === RATING.HARD) {
            // 困難：間隔 × 1.2，降低易度係數，且至少推進 1 天
            const newEF = Math.max(1.3, easeFactor - 0.15)
            const i = fuzz(Math.max(1 * DAY, Math.max(interval + DAY, Math.round(interval * 1.2))))
            return _make(i, newEF, repetitions + 1, now, STATUS.REVIEW, 0)
        }
        if (rating === RATING.GOOD) {
            // 良好：間隔 × 易度係數（SM-2 核心），且至少 1 天
            const i = fuzz(Math.max(1 * DAY, Math.round(interval * easeFactor)))
            return _make(i, easeFactor, repetitions + 1, now, STATUS.REVIEW, 0)
        }
        if (rating === RATING.EASY) {
            // 輕鬆：間隔 × 易度係數 × 1.3，提升易度，且至少 1 天
            const newEF = Math.min(4.0, easeFactor + 0.15)
            const i = fuzz(Math.max(1 * DAY, Math.round(interval * newEF * 1.3)))
            return _make(i, newEF, repetitions + 1, now, STATUS.REVIEW, 0)
        }
    }

    // ─────────────────────────────
    // 🔄 重學階段：背過但忘記
    // ─────────────────────────────
    if (status === STATUS.RELEARNING) {
        if (rating === RATING.AGAIN || rating === RATING.HARD) {
            // 再次失敗：重回重學起點（保留 lastReviewInterval）
            return { ..._make(RELEARNING_STEPS[0], easeFactor, 0, now, STATUS.RELEARNING, 0), lastReviewInterval: card.lastReviewInterval || 0 }
        }
        // Good / Easy：重學成功，回到複習
        // 正確折損：拿進重學前的 REVIEW 間隔乘以 0.5（而非重學步驟的 10 分鐘）
        // 最少 1 天，且不超過原本間隔（防止錯誤暴增）
        const baseInterval = card.lastReviewInterval || 1 * DAY
        const i = fuzz(Math.max(1 * DAY, Math.round(baseInterval * 0.5)))
        const newEF = rating === RATING.EASY ? Math.min(4.0, easeFactor + 0.1) : easeFactor
        return _make(i, newEF, repetitions + 1, now, STATUS.REVIEW, 0)
    }

    // fallback
    return _make(DAY, easeFactor, repetitions + 1, now, STATUS.REVIEW, 0)
}

function _make(interval, easeFactor, repetitions, now, status, step) {
    // 演算法階段維護：只要順利畢業，就在 REVIEW 階段接受 SM-2 算式的複利成長
    // 取消強制的 RELEARNING 降級，否則會導致「間隔被砍半」的無限平移 Bug
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

        // 【字根修復 (Root Healing)】：
        // 情況一：若發現有字根等於單字本身（舊 Bug 遺留），將 roots 清空
        // 情況二：若 tips 能解析出字根，且與快取 roots 不同，也清空快取讓 getCardRoots 重新從 tips 計算
        let newRoots = c.roots;
        if (newRoots && Array.isArray(newRoots)) {
            const frontLower = (c.front || '').toLowerCase();
            // 情況一：字根等於整個單字
            const hasFullWordRoot = newRoots.some(r => r.toLowerCase() === frontLower);
            // 情況二：tips 有字源分析，且解析出的字根與快取不一致
            let tipsDisagrees = false;
            if (!hasFullWordRoot && c.tips && typeof c.tips === 'string') {
                const match = c.tips.match(/【字源分析】[:：]\s*([^\n\r→。]+)/);
                if (match) {
                    const tipsWords = (match[1].match(/[a-zA-Z\u00C0-\u017F]+/g) || [])
                        .map(w => w.toLowerCase())
                        .filter(w => w.length >= 2 && w !== frontLower && frontLower.includes(w));
                    if (tipsWords.length > 0) {
                        const tipsSet = new Set(tipsWords);
                        const cachedSet = new Set(newRoots.map(r => r.toLowerCase()));
                        // 若 tips 解析的字根與快取不同，清除快取
                        const different = tipsWords.some(w => !cachedSet.has(w)) ||
                            newRoots.some(r => !tipsSet.has(r.toLowerCase()));
                        if (different) tipsDisagrees = true;
                    }
                }
            }
            if (hasFullWordRoot || tipsDisagrees) {
                newRoots = null;
                updated = true;
            }
        }

        if (c.status !== newStatus) updated = true;
        return { ...c, status: newStatus, roots: newRoots === null ? undefined : newRoots };
    });

    // 自動修剪緩衝區 (Buffer Pruning) - 嚴格執行 50 個名額制
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

/**
 * 【漏斗控制：Session 排序】
 * 用遺忘曲線的緊迫度，嚴格填滿 30 個位置。
 */
export function buildSessionSequence(cards, learningCapacity = 50, sessionSize = 30) {
    const now = Date.now();
    const validStatuses = [STATUS.NEW, STATUS.LEARNING, STATUS.REVIEW, STATUS.RELEARNING];

    // 狀態異常的卡片（undefined / null / 非法值）統一視為 NEW，確保 pool+buffer+mastered = cards.length
    const pool = cards.filter(c => c.status === STATUS.NEW || !validStatuses.includes(c.status));
    const buffer = cards.filter(c => c.status === STATUS.LEARNING || c.status === STATUS.RELEARNING);
    const learningBuffer = cards.filter(c => c.status === STATUS.LEARNING);
    const relearningBuffer = cards.filter(c => c.status === STATUS.RELEARNING);
    const mastered = cards.filter(c => c.status === STATUS.REVIEW);

    const bufferCount = buffer.length;
    const availableSlots = Math.max(0, learningCapacity - bufferCount);

    // P0: 熟練區到期 (防止遺忘)
    const p0 = mastered.filter(c => c.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);
    
    // P1: 背誦區急迫 (短期記憶鞏固)
    const p1 = relearningBuffer.filter(c => c.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);
    
    // P2: 背誦區常規 (推進學習)
    const p2 = learningBuffer.filter(c => c.dueDate <= now).sort((a, b) => a.dueDate - b.dueDate);

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
            pool: pool.length, // 顯示目前的總量池數量
            buffer: bufferCount, // 顯示目前緩衝區的水位
            learning: learningBuffer.length,
            learningDue: p2.length,        // 新詞中今天到期的數量
            relearning: relearningBuffer.length,
            relearningDue: p1.length,      // 記憶修復中今天到期的數量
            mastered: mastered.length,
            masteredDue: p0.length,        // 已熟練但今天需複習的數量
            dueCount: p0.length + p1.length + p2.length // 真的該複習的總量
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
