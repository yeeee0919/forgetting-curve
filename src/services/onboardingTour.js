/**
 * 首次使用 Spotlight 導覽：完成狀態與步驟／示意卡（記憶體-only）
 */

import { STATUS } from './srs'

export const TOUR_DONE_KEY = 'memoflip_onboarding_tour_done'

export function hasCompletedOnboardingTour() {
    try {
        return localStorage.getItem(TOUR_DONE_KEY) === '1'
    } catch {
        return true
    }
}

export function markOnboardingTourDone() {
    try {
        localStorage.setItem(TOUR_DONE_KEY, '1')
    } catch {
        /* private mode */
    }
}

export function resetOnboardingTour() {
    try {
        localStorage.removeItem(TOUR_DONE_KEY)
    } catch {
        /* private mode */
    }
}

/** 導覽用示意卡：不寫入 storage／不上雲 */
export function createTourDemoCards() {
    const now = Date.now()
    const base = {
        language: 'nl',
        createdAt: now,
        updatedAt: now,
        easeFactor: 2.5,
        repetitions: 1,
        dueDate: now - 60_000,
        status: STATUS.LEARNING,
        step: 0,
        lastReviewInterval: 0,
        interval: 10 * 60 * 1000,
        isWeak: false,
        againCount: 0,
    }
    return [
        {
            ...base,
            id: 'tour_demo_huis',
            front: 'huis',
            back: '房子',
            part_of_speech: 'noun',
            interval: 0,
            example_1: 'Ons huis is klein maar fijn.',
            example_trans_1: '我們的房子雖小但很舒服。',
        },
        {
            ...base,
            id: 'tour_demo_fiets',
            front: 'fiets',
            back: '腳踏車',
            part_of_speech: 'noun',
            status: STATUS.REVIEW,
            interval: 4 * 24 * 60 * 60 * 1000,
            repetitions: 2,
            example_1: 'Ik ga met de fiets naar school.',
            example_trans_1: '我騎腳踏車去學校。',
        },
        {
            ...base,
            id: 'tour_demo_water',
            front: 'water',
            back: '水',
            part_of_speech: 'noun',
            status: STATUS.NEW,
            repetitions: 0,
            interval: 0,
            dueDate: now,
            example_1: 'Mag ik een glas water?',
            example_trans_1: '可以給我一杯水嗎？',
        },
        {
            ...base,
            id: 'tour_demo_stemmen',
            front: 'stemmen',
            back: '投票；調音',
            part_of_speech: 'verb',
            status: STATUS.REVIEW,
            interval: 21 * 24 * 60 * 60 * 1000,
            repetitions: 4,
            example_1: 'Voor welke partij ga jij stemmen?',
            example_trans_1: '你要投哪一黨？',
        },
    ]
}

/**
 * @param {{ isMobile: boolean }} opts
 * @returns {Array<{ id: string, title: string, body: string, selector: string, view: string, openImport?: boolean, useDemoCards?: boolean, showExtIcon?: boolean, showCatchDemo?: boolean }>}
 */
export function getOnboardingSteps({ isMobile }) {
    const importStep = {
        id: 'import',
        title: '把單字匯進來',
        body: '也可以在這裡手動或用 AI 匯入。有 Catch 的字可一鍵貼上。這步只是示範，不會真的匯入。',
        selector: '[data-tour="import-modal"]',
        view: 'home',
        openImport: true,
    }
    const reviewStep = {
        id: 'review',
        title: '用「記不記得」安排下次出現',
        body: '完全不記得／模糊會較快再出現；記得了／完全記得間隔拉長。這是示意畫面，導覽結束後示意卡會消失。',
        selector: '[data-tour="review-ratings"]',
        view: 'review',
        useDemoCards: true,
        fallbackSelector: '[data-tour="review-tab"]',
    }
    const numbersStep = {
        id: 'numbers',
        title: '數字在追蹤記憶進度',
        body: '總量池 → 緩衝區 → 已熟練 → 成熟。匯入的字會沿這條漏斗前進。',
        selector: '[data-tour="memory-stages"]',
        view: 'home',
        useDemoCards: true,
    }

    if (isMobile) {
        return [importStep, reviewStep, numbersStep]
    }

    return [
        {
            id: 'extension',
            title: '用 Catch 從網頁抓生字',
            body: '安裝 Word Catcher 後，在荷蘭文網頁劃字就能收進網站。導覽結束後，登入才會常駐看到這個入口。',
            selector: '[data-tour="ext-btn"]',
            view: 'home',
            showExtIcon: true,
            showCatchDemo: true,
        },
        importStep,
        reviewStep,
        numbersStep,
    ]
}
