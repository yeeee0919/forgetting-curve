import { useState, useEffect, useCallback } from 'react'
import { getCards, saveCards, getSettings, saveSettings, generateId, getSessionState, saveSessionState } from './services/storage'
import { initCard, scheduleCard, buildSessionSequence, migrateCards, getStatusLabel } from './services/srs'
import { parseTextToCards, parseTextToCardsGemini } from './services/ai'
import { mergeIncomingCards, toCardContent } from './services/cardFields'
import { getInboxWords, deleteInboxWord, clearInbox, getCloudCards, upsertCloudCards, deleteCloudCard } from './services/supabase'

import ReviewCard from './components/ReviewCard'
import CardList from './components/CardList'
import GrammarView from './components/GrammarView'
import ListeningLab from './components/ListeningLab'
import SpeakingLab from './components/SpeakingLab'
import ImportModal from './components/ImportModal'
import SettingsModal from './components/SettingsModal'
import Icon from './components/Icons'
import { ExtensionDownloadCard, ExtensionGuideModal } from './components/WordCatcherPromo'
import { useExtensionInstalled } from './hooks/useExtensionInstalled'
import { HIDE_EXT_CARD_KEY } from './config/extension'
import './App.css'

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return '早安'
    if (h < 18) return '午安'
    return '晚安'
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 650)
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 650)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])
    return isMobile
}

export default function App() {
    const isMobile = useIsMobile()

    const [cards, setCards] = useState([])
    const [settings, setSettings] = useState({ openaiKey: '' })
    const [view, setView] = useState('home')
    const [showImport, setShowImport] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [showExtGuide, setShowExtGuide] = useState(false)
    const extensionInstalled = useExtensionInstalled()
    const [importing, setImporting] = useState(false)
    const [importError, setImportError] = useState('')
    const [syncId, setSyncId] = useState(localStorage.getItem('memoflip_sync_id') || '')
    const [lastSynced, setLastSynced] = useState(null)
    const [sessionState, setSessionState] = useState(getSessionState())


    // 活動紀錄紀錄每天背了幾張卡
    const [activityLog, setActivityLog] = useState(() => {
        const saved = localStorage.getItem('memoflip_activity')
        return saved ? JSON.parse(saved) : {}
    })

    const updateActivity = useCallback(() => {
        setActivityLog(prev => {
            const dateStr = new Date().toISOString().split('T')[0]
            const next = { ...prev, [dateStr]: (prev[dateStr] || 0) + 1 }
            localStorage.setItem('memoflip_activity', JSON.stringify(next))
            return next
        })
    }, [])
    const [dismissedWeakCards, setDismissedWeakCards] = useState([])

    const [inboxWords, setInboxWords] = useState([])

    useEffect(() => {
        let loaded = getCards()
        // Data Migration for Three-Layer Architecture
        const { migrated, updated } = migrateCards(loaded, 60)
        if (updated) {
            saveCards(migrated)
            loaded = migrated
        }
        setCards(loaded)
        setSettings(getSettings())
        fetchInboxWords()
    }, [])

    // 移除舊的減壓模式，改由三層緩衝區 (Buffer) 進行流量控制

    useEffect(() => {
        if (syncId) {
            handleSync(syncId)
        }
    }, [syncId])

    const handleSync = async (id) => {
        if (!id) return
        try {
            const remoteCards = await getCloudCards(id)
            const currentLocalCards = getCards() // 修正：從 local 抓取最新，避免 closure 拿到初始的 []
            
            if (!remoteCards.length && currentLocalCards.length > 0) {
                // 初次同步：將本地推送至雲端
                await upsertCloudCards(id, currentLocalCards)
                setLastSynced(Date.now())
                return
            }

            // 合併邏輯：以 updatedAt 為準
            const localMap = new Map(currentLocalCards.map(c => [c.id, c]))
            const remoteMap = new Map(remoteCards.map(c => [c.id, c]))
            const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

            const merged = Array.from(allIds).map(cid => {
                const local = localMap.get(cid)
                const remote = remoteMap.get(cid)
                if (!local) return remote
                if (!remote) return local
                // 誰比較新就聽誰的
                return (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local
            })

            // 同步後執行狀態修復，避免雲端舊資料的非法 status
            const { migrated: migratedMerged } = migrateCards(merged, 60)
            setCards(migratedMerged)
            saveCards(migratedMerged)
            setLastSynced(Date.now())

            // 如果本地有比雲端新的，或是雲端沒有的，推送到雲端
            const toPush = merged.filter(c => {
                const remote = remoteMap.get(c.id)
                return !remote || (c.updatedAt || 0) > (remote.updatedAt || 0)
            })
            if (toPush.length > 0) {
                await upsertCloudCards(id, toPush)
            }
        } catch (e) {
            console.error('Sync failed:', e)
        }
    }


    const fetchInboxWords = async () => {
        try {
            const data = await getInboxWords()
            setInboxWords(data || [])
        } catch (e) {
            console.error('Failed to fetch inbox words:', e)
        }
    }

    const handleDeleteInboxWord = async (id) => {
        try {
            await deleteInboxWord(id)
            setInboxWords(prev => prev.filter(w => w.id !== id))
        } catch (e) {
            console.error('Failed to delete word:', e)
        }
    }

    const handleClearInbox = async () => {
        try {
            const ids = inboxWords.map(w => w.id)
            await clearInbox(ids)
            setInboxWords([])
        } catch (e) {
            console.error('Failed to clear inbox:', e)
        }
    }

    const updateCards = useCallback((newCards) => {
        setCards(prevCards => {
            const timestamped = newCards.map(c => {
                const oldCard = prevCards.find(old => old.id === c.id);
                if (oldCard === c) return c; // No change (reference equality)
                return { ...c, updatedAt: Date.now() };
            });

            saveCards(timestamped)

            if (syncId) {
                // 背景同步
                const changedCards = timestamped.filter(c => {
                    const oldCard = prevCards.find(old => old.id === c.id);
                    return oldCard !== c;
                });
                if (changedCards.length > 0) {
                    upsertCloudCards(syncId, changedCards)
                }
            }

            return timestamped;
        });
    }, [syncId])


    const dismissWeakCard = (cardId) => {
        setDismissedWeakCards(prev => [...prev, cardId])
    }

    const handleImport = async (text, aiProvider = 'openai', onSuccess = null) => {
        setImporting(true)
        setImportError('')
        try {
            let parsed = []
            if (aiProvider === 'gemini') {
                parsed = await parseTextToCardsGemini(text, settings.geminiKey)
            } else {
                parsed = await parseTextToCards(text, settings.openaiKey)
            }
            if (!parsed.length) throw new Error('沒有解析到任何單字，請確認格式')
            const incoming = parsed.map(p => ({
                id: generateId(),
                ...toCardContent(p),
                createdAt: Date.now(),
                ...initCard(),
            }))
            const { cards: next, added, updated, relearned } = mergeIncomingCards(cards, incoming)
            if (dueCards.length + added > 150) {
                alert(`【負荷預警】你目前將有超過 150 張卡片待複習，建議這批單字分 3 天分批排入，以免負擔過重而產生放棄感！\n目前將為你照常匯入，但我們強烈建議控制每日新字數量。`)
            }
            updateCards(next)
            if (onSuccess) onSuccess()
            setShowImport(false)
            return { added, updated, relearned }
        } catch (err) {
            setImportError(err.message)
            throw err
        } finally {
            setImporting(false)
        }
    }

    const handleImportDirect = (newCards) => {
        const { cards: next, added, updated, relearned } = mergeIncomingCards(cards, newCards)
        if (dueCards.length + added > 150) {
            alert(`【負荷預警】你目前將有超過 150 張卡片待複習，建議這批單字分 3 天分批排入，以免負擔過重而產生放棄感！\n目前將為你照常匯入，但我們強烈建議控制每日新字數量。`)
        }
        updateCards(next)
        return { added, updated, relearned }
    }

    const handleRate = useCallback((cardId, rating) => {
        // RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 }
        const isRatingAgain = rating === 1
        const isRatingGoodOrEasy = rating === 3 || rating === 4

        const updated = cards.map(c => {
            // 注意：要處理帶有 '_retry_' 的 cardId
            const baseId = cardId.split('_retry_')[0]
            if (c.id !== baseId) return c

            const sched = scheduleCard(c, rating)
            const isWeak = isRatingAgain ? true : isRatingGoodOrEasy ? false : c.isWeak
            // 記錄按下「完全沒印象」的累計次數
            const againCount = isRatingAgain ? (c.againCount || 0) + 1 : (c.againCount || 0)
            return { ...c, ...sched, isWeak, againCount }
        })
        updateCards(updated)
        // 紀錄今日活動
        updateActivity()
    }, [cards, updateCards, updateActivity])

    const handleDelete = useCallback((cardId) => {
        updateCards(cards.filter(c => c.id !== cardId))
        if (syncId) {
            deleteCloudCard(syncId, cardId).catch(err => console.error('Cloud delete failed:', err))
        }
    }, [cards, updateCards, syncId])

    const handleUpdateNote = useCallback((cardId, note) => {
        const updated = cards.map(c => {
            const baseId = cardId.split('_retry_')[0]
            if (c.id !== baseId) return c
            return { ...c, user_notes: note }
        })
        updateCards(updated)
    }, [cards, updateCards])

    const handleSaveSettings = (newSettings) => {
        setSettings(newSettings)
        saveSettings(newSettings)
        setShowSettings(false)
    }

    const handleExport = () => {
        const data = {
            cards,
            activityLog,
            settings,
            version: '1.0.0',
            exportDate: new Date().toISOString()
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `forgetting_curve_backup_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleRestoreBackup = (data) => {
        if (!data.cards || !Array.isArray(data.cards)) {
            alert('無效的備份檔案：缺少卡片資料')
            return
        }
        
        if (confirm(`確定要還原備份嗎？這將會覆蓋目前的 ${cards.length} 張卡片與進度。`)) {
            updateCards(data.cards)
            if (data.activityLog) {
                setActivityLog(data.activityLog)
                localStorage.setItem('memoflip_activity', JSON.stringify(data.activityLog))
            }
            if (data.settings) {
                handleSaveSettings(data.settings)
            }
            alert('還原成功！')
        }
    }

    const clearAllWeakCards = () => {
        const updated = cards.map(c => c.isWeak ? { ...c, isWeak: false } : c)
        updateCards(updated)
        // 同時清空已略過清單，確保存檔同步
        setDismissedWeakCards([])
    }

    const sequence = buildSessionSequence(cards, 60, sessionState.sessionSize)
    const dueCards = sequence.sessionCards
    const dueCount = sequence.stats.dueCount
    const stats = sequence.stats
    const weakCards = cards.filter(c => c.isWeak && !dismissedWeakCards.includes(c.id))

    // 當 ReviewCard 結束，計算正確率與判定
    const handleSessionDone = (results) => {
        // results 是 [ 1, 3, 4, 3, 2 ... ] 對應的評分
        // > 90% 表示 Good (3) 或 Easy (4) 的比例
        const total = results.length
        if (total === 0) {
            setView('home')
            return
        }

        const successCount = results.filter(r => r === 3 || r === 4).length
        const accuracy = successCount / total

        let newSize = sessionState.sessionSize
        let nextHistory = [...sessionState.history, accuracy].slice(-3) // keep last 3

        if (accuracy < 0.7 && newSize > 20) {
             alert('這批單字似乎稍微有點挑戰度 🧗‍♂️，大腦負載有點重了。\n下一輪起，系統將暫時為你調降為「一次 20 張」，保護心流不中斷！💪')
             newSize = 20
             nextHistory = []
        } else if (nextHistory.length === 3 && nextHistory.every(a => a >= 0.9)) {
             if (window.confirm('你已經連續 3 輪拿到 90% 以上的高正確率 🌟！狀態極佳！\n要挑戰進入「加速模式（一次 40 張）」嗎？解鎖更快的學習步調！')) {
                 newSize = 40
                 nextHistory = []
             }
        }

        const newState = { activeSession: null, history: nextHistory, sessionSize: newSize, bufferCapacity: 60 }
        setSessionState(newState)
        saveSessionState(newState)
        setView('home')
    }

    return (
        <div className="app">

            {/* Top Header - Redesigned for unified visual identity */}
            <header className="app-header">
                <div className="app-header-inner">
                    <div className="app-logo">
                        <span className="logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 0 0 9 9 9 9 0 0 0-9 9 9 9 0 0 0-9-9 9 9 0 0 0 9-9Z"></path></svg>
                        </span>
                        <span className="logo-text">toocheep<span className="logo-sub">fordutch</span></span>
                    </div>
                    <div className="header-actions">
                        {!isMobile && (
                            <button
                                className={`icon-btn ${extensionInstalled ? '' : 'ext-pending'}`}
                                onClick={() => setShowExtGuide(true)}
                                title="Word Catcher 擴充功能"
                            >
                                <Icon name="puzzle" size={18} />
                            </button>
                        )}
                        <button className="icon-btn primary-glow" onClick={() => setShowImport(true)} title="匯入單字">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                        </button>
                        <button className="icon-btn" onClick={() => setShowSettings(true)} title="設定">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={`app-content ${view === 'home' || view === 'grammar' || view === 'review' || view === 'speaking' ? 'wide' : ''} ${view === 'lab' ? 'lab-fullscreen' : ''} ${view === 'speaking' ? 'speaking-fullscreen' : ''}`}>
                {view === 'home' && (
                    <HomePage
                        totalCards={cards.length}
                        stats={stats}
                        bufferCapacity={60}
                        dueCount={dueCount}
                        onStartReview={() => setView('review')}
                        onImport={() => setShowImport(true)}
                        inboxWords={inboxWords}
                        onDeleteInboxWord={handleDeleteInboxWord}
                        onClearInbox={handleClearInbox}
                        weakCards={weakCards}
                        dismissWeakCard={dismissWeakCard}
                        clearAllWeakCards={clearAllWeakCards}
                        activityLog={activityLog}
                        isMobile={isMobile}
                        sessionSize={sessionState.sessionSize}
                        dueCards={dueCards}
                        hasActiveSession={!!sessionState.activeSession}
                        extensionInstalled={extensionInstalled}
                        onOpenExtGuide={() => setShowExtGuide(true)}
                    />

                )}
                {view === 'review' && (
                    <ReviewCard
                        dueCards={dueCards}
                        onRate={handleRate}
                        onDone={handleSessionDone}
                        onDelete={handleDelete}
                        onUpdateNote={handleUpdateNote}
                        sessionState={sessionState}
                        updateSession={(newState) => { 
                            setSessionState(newState)
                            saveSessionState(newState)
                        }}
                        isMobile={isMobile}
                    />

                )}
                {view === 'library' && (
                    <CardList cards={cards} onDelete={handleDelete} />
                )}
                {view === 'grammar' && (
                    <GrammarView settings={settings} />
                )}
                {view === 'lab' && (
                    <ListeningLab />
                )}
                {view === 'speaking' && (
                    <SpeakingLab />
                )}
            </main>

            {/* Side / Bottom Tab Bar */}
            <nav className="tabbar">
                <button
                    className={`tabbar-item ${view === 'home' ? 'active' : ''}`}
                    onClick={() => setView('home')}
                >
                    <span className="tabbar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    </span>
                    首頁
                </button>
                <button
                    className={`tabbar-item ${view === 'review' ? 'active' : ''}`}
                    onClick={() => setView('review')}
                >
                    <span className="tabbar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="14" rx="2" ry="2"></rect><path d="M7 4h14v14"></path></svg>
                    </span>
                    複習
                    {dueCount > 0 && <span className="tabbar-badge">{Math.min(dueCount, sessionState.sessionSize || 30)}</span>}
                </button>
                <button
                    className={`tabbar-item ${view === 'library' ? 'active' : ''}`}
                    onClick={() => setView('library')}
                >
                    <span className="tabbar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </span>
                    卡片庫
                </button>
                <button
                    className={`tabbar-item ${view === 'grammar' ? 'active' : ''}`}
                    onClick={() => setView('grammar')}
                >
                    <span className="tabbar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                    </span>
                    文法
                </button>
                <button
                    className={`tabbar-item ${view === 'lab' ? 'active' : ''}`}
                    onClick={() => setView('lab')}
                >
                    <span className="tabbar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    </span>
                    精聽
                </button>
                <button
                    className={`tabbar-item ${view === 'speaking' ? 'active' : ''}`}
                    onClick={() => setView('speaking')}
                >
                    <span className="tabbar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                    </span>
                    口說
                </button>
            </nav>


            {showImport && (
                <ImportModal
                    onImport={handleImport}
                    onClose={() => { setShowImport(false); setImportError(''); fetchInboxWords(); }}
                    importing={importing}
                    error={importError}
                    hasApiKey={!!settings.openaiKey}
                    onNeedKey={() => { setShowImport(false); setShowSettings(true) }}
                    onImportDirect={handleImportDirect}
                />
            )}
            {showSettings && (
                <SettingsModal
                    settings={settings}
                    onSave={(s) => {
                        setSettings(s)
                        saveSettings(s)
                    }}
                    onClose={() => setShowSettings(false)}
                    onExport={handleExport}
                    onRestore={handleRestoreBackup}
                    syncId={syncId}
                    onSyncIdChange={(id) => {
                        setSyncId(id)
                        localStorage.setItem('memoflip_sync_id', id)
                    }}
                    lastSynced={lastSynced}
                    onManualSync={() => handleSync(syncId)}
                />
            )}
            <ExtensionGuideModal
                open={showExtGuide}
                onClose={() => setShowExtGuide(false)}
                installed={extensionInstalled}
            />
        </div>
    )
}

function ProgressRing({ value, max }) {
    const r = 36
    const circ = 2 * Math.PI * r
    const pct = max > 0 ? Math.min(value / max, 1) : 0
    const offset = circ * (1 - pct)
    return (
        <div className="progress-ring-wrap">
            <svg className="progress-ring-svg" viewBox="0 0 96 96">
                <circle className="progress-ring-track" cx="48" cy="48" r={r} />
                <circle
                    className="progress-ring-fill"
                    cx="48" cy="48"
                    r={r}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="progress-ring-label">
                <span className="progress-ring-num">{value}</span>
                <span className="progress-ring-unit">片</span>
            </div>
        </div>
    )
}

function HomePage({
    totalCards, stats, bufferCapacity, dueCount, onStartReview, onImport,
    inboxWords, onDeleteInboxWord, onClearInbox, weakCards, dismissWeakCard,
    clearAllWeakCards, activityLog, isMobile, sessionSize, dueCards, hasActiveSession,
    extensionInstalled, onOpenExtGuide,
}) {
    const greetingText = getGreeting()
    const [hideExtCard, setHideExtCard] = useState(() => {
        try {
            return localStorage.getItem(HIDE_EXT_CARD_KEY) === '1'
        } catch {
            return false
        }
    })

    useEffect(() => {
        const onHide = () => setHideExtCard(true)
        window.addEventListener('memoflip-hide-ext-card', onHide)
        return () => window.removeEventListener('memoflip-hide-ext-card', onHide)
    }, [])

    const showExtCard = !isMobile && !extensionInstalled && !hideExtCard
    const computedTotal = stats.pool + stats.buffer + stats.mastered
    const bufferPct = bufferCapacity > 0 ? Math.min(100, (stats.buffer / bufferCapacity) * 100) : 0
    const masteredPct = computedTotal > 0 ? Math.min(100, (stats.mastered / computedTotal) * 100) : 0

    return (
        <div className="home-layout">
            <div className="home-main">
                <header className="home-hero">
                    <p className="home-kicker">記憶漏斗</p>
                    <h1 className="home-greeting">
                        {greetingText}，<span>繼續學習吧</span>
                    </h1>
                    <p className="home-lede">
                        {dueCount > 0
                            ? `今天有 ${dueCount} 張待複習，建議先完成一輪 ${dueCards.length || sessionSize || 30} 張。`
                            : computedTotal > 0
                                ? '今日任務已清空，可以把新單字推進緩衝區。'
                                : '匯入單字後，從總量池 → 緩衝區 → 已熟練一步步建立長期記憶。'}
                    </p>
                </header>

                <div className="home-actions">
                    {(dueCount > 0 || stats.pool > 0 || stats.buffer > 0 || hasActiveSession) ? (
                        <button className="btn-primary large" onClick={onStartReview}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="14" rx="2" ry="2"></rect><path d="M7 4h14v14"></path></svg>
                            {hasActiveSession ? '繼續複習' : `開始複習（${sessionSize || 30} 張）`}
                        </button>
                    ) : (
                        <div className="done-msg">
                            <span className="done-msg-icon">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </span>
                            <p>今天的複習與新單字都完成了</p>
                            <small>明天再來繼續加強</small>
                        </div>
                    )}
                    <button className="btn-secondary" onClick={onImport}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                        匯入新單字
                    </button>
                    {inboxWords.length > 0 && (
                        <button className="btn-inbox" onClick={onImport}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            解析 Catcher 收集（{inboxWords.length}）
                        </button>
                    )}

                    {showExtCard && (
                        <ExtensionDownloadCard onOpenGuide={onOpenExtGuide} />
                    )}
                </div>

                <section className="memory-board" aria-label="學習進度">
                    <div className="memory-due">
                        <span className="memory-due-label">今日待複習</span>
                        <span className={`memory-due-num ${dueCount > 0 ? 'hot' : ''}`}>{dueCount}</span>
                        <span className="memory-due-hint">
                            {stats.masteredDue > 0
                                ? `含 ${stats.masteredDue} 張熟練到期`
                                : stats.relearning > 0
                                    ? `${stats.relearning} 張重學中`
                                    : '新詞或空白'}
                        </span>
                    </div>

                    <div className="memory-mastered">
                        <ProgressRing value={stats.mastered} max={computedTotal} />
                        <div className="memory-mastered-copy">
                            <div className="memory-mastered-title">已熟練 {stats.mastered}<span> / {computedTotal}</span></div>
                            <div className="memory-mastered-bar" aria-hidden="true">
                                <div className="memory-mastered-fill" style={{ width: `${masteredPct}%` }} />
                            </div>
                            <p className="memory-mastered-sub">長期記憶中的卡片比例</p>
                        </div>
                    </div>

                    <div className="memory-stages">
                        <article className="memory-stage pool">
                            <header>
                                <h3>總量池</h3>
                                <strong>{stats.pool}</strong>
                            </header>
                            <p>尚未開始的新進度</p>
                        </article>

                        <article className="memory-stage buffer">
                            <header>
                                <h3>緩衝區</h3>
                                <strong>{stats.buffer}<span>/{bufferCapacity}</span></strong>
                            </header>
                            <div className="memory-buffer-meter">
                                <div className="memory-buffer-fill" style={{ width: `${bufferPct}%` }} />
                            </div>
                            <div className="memory-buffer-meta">
                                <span>新詞 {stats.learning}</span>
                                <span>修復 {stats.relearning}</span>
                            </div>
                        </article>

                        <article className="memory-stage mastered">
                            <header>
                                <h3>已熟練</h3>
                                <strong>{stats.mastered}</strong>
                            </header>
                            <p>
                                {stats.masteredDue > 0
                                    ? `${stats.masteredDue} 張今日到期`
                                    : '暫無到期卡片'}
                            </p>
                        </article>
                    </div>

                    <p className="memory-equation">
                        <span>{stats.pool}</span> + <span>{stats.buffer}</span> + <span>{stats.mastered}</span>
                        {' = '}
                        <strong>{computedTotal}</strong>
                        {computedTotal !== totalCards && (
                            <em className="memory-equation-warn"> 另有 {totalCards - computedTotal} 張待修復</em>
                        )}
                    </p>
                </section>
            </div>

            {!isMobile && weakCards.length > 0 && (
                <div className="home-col weak-cards">
                    <div className="sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="sticky-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"></path><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path></svg>
                            需要加強 <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 600 }}>{weakCards.length}</span>
                        </h3>
                        <button
                            onClick={clearAllWeakCards}
                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '4px', letterSpacing: '0.02em', transition: 'color 0.2s' }}
                            onMouseOver={e => e.target.style.color = 'var(--text-primary)'}
                            onMouseOut={e => e.target.style.color = 'var(--text-tertiary)'}
                        >隱藏</button>
                    </div>
                    <div className="sticky-notes-container">
                        {weakCards.slice(0, 18).map(card => (
                            <div key={card.id} className="sticky-note">
                                <button
                                    className="sticky-close"
                                    onClick={() => dismissWeakCard(card.id)}
                                    title="暫停隱藏"
                                ><Icon name="x" size={12} /></button>
                                <div className="sticky-front">{card.front}</div>
                                <div className="sticky-back">{card.back}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!isMobile && inboxWords.length > 0 && (
                <div className="home-col inbox-list">
                    <div className="sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="sticky-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                            網頁收集 <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 600 }}>{inboxWords.length}</span>
                        </h3>
                        <button
                            onClick={onClearInbox}
                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: '4px', letterSpacing: '0.02em', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onMouseOver={e => e.target.style.color = 'var(--again)'}
                            onMouseOut={e => e.target.style.color = 'var(--text-tertiary)'}
                        >清空</button>
                    </div>
                    <div className="catcher-table">
                        {inboxWords.slice(0, 18).map(word => (
                            <div key={word.id} className="catcher-table-row">
                                <span className="catcher-table-text">
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{word.word}</span>
                                    {word.translation && (
                                        <span style={{ marginLeft: '12px', fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                            {word.translation}
                                        </span>
                                    )}
                                </span>
                                <button
                                    className="catcher-table-action"
                                    onClick={() => onDeleteInboxWord(word.id)}
                                    title="刪除"
                                    style={{ opacity: 0.4, transform: 'scale(0.85)' }}
                                    onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    onMouseOut={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.transform = 'scale(0.85)'; }}
                                ><Icon name="x" size={12} /></button>
                            </div>
                        ))}
                        {inboxWords.length > 18 && (
                            <div className="catcher-table-row" style={{ justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                還有 {inboxWords.length - 18} 個單字...
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    )
}
