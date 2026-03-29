import './ReviewCard.css'
import { useState, useEffect, useRef } from 'react'
import { RATING, previewLabel, getStatusLabel } from '../services/srs'

const LANG_MAP = {
  nl: 'nl-NL', en: 'en-US', ja: 'ja-JP',
  de: 'de-DE', fr: 'fr-FR', ko: 'ko-KR', es: 'es-ES',
}

let cachedVoices = []

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

// 產生安全且一致的語音
async function speak(text, lang) {
  if (!text || !window.speechSynthesis) return

  // 為了避免 Safari / iOS 卡死，如果正在發音中，先取消
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
    // Safari 遇到連續 cancel 時容易永久卡死語音引擎，給予微小冷卻時間
    await new Promise(r => setTimeout(r, 15))
  }

  return new Promise((resolve) => {
    const code = LANG_MAP[lang] || 'en-US'
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = code
    utterance.rate = 0.9  // 放慢語速讓發音更清晰

    // 尋找最高品質/最適合的語音 (跨平台支援)
    if (cachedVoices.length === 0) {
      cachedVoices = window.speechSynthesis.getVoices()
    }
    const voices = cachedVoices

    if (voices.length > 0) {
      // 尋找符合目標語言的語音，先嘗試完全符合 locale (例如 en-US)，否則退避到前綴 (例如 en)
      const exactVoices = voices.filter(v => v.lang === code || v.lang.replace('_', '-') === code)
      const prefixVoices = voices.filter(v => v.lang.startsWith(code.split('-')[0]))
      
      const targetVoices = exactVoices.length > 0 ? exactVoices : prefixVoices
      
      // 優先選擇高品質語音 (支援 iOS 的 Premium/Enhanced/Siri 或 PC 的 Google)
      const bestVoice = targetVoices.find(v => 
        v.name.includes('Premium') || 
        v.name.includes('Enhanced') || 
        v.name.includes('Google') ||
        v.name.includes('Siri')
      )

      if (bestVoice) {
        utterance.voice = bestVoice
      } else if (targetVoices.length > 0) {
        // 沒有高品質語音，就使用該語言的第一個預設語音
        utterance.voice = targetVoices[0]
      }
    }

    utterance.onend = () => resolve()
    // 如果發生錯誤（例如被 cancel 中斷），立刻 resolve 防止 Promise 卡住
    utterance.onerror = (e) => resolve(e)

    // Safari 專屬 Bug 修復：必須把 utterance 綁在全域變數上，否則極高的機率會被 Garbage Collector 提早回收，導致語音引擎崩潰
    window.__speechUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

const STATUS_STYLE = {
  learning: { label: '學習中', color: 'var(--hard)', bg: 'var(--hard-bg)' },
  review: { label: '複習', color: 'var(--easy)', bg: 'var(--easy-bg)' },
  relearning: { label: '重學中', color: 'var(--again)', bg: 'var(--again-bg)' },
}

const RATINGS = [
  {
    id: RATING.AGAIN,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>,
    label: '完全不記得', short: '不記得', color: 'var(--again)', bg: 'var(--again-bg)', border: 'transparent', main: false
  },
  {
    id: RATING.HARD,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    label: '模糊', short: '不記得', color: 'var(--hard)', bg: 'var(--hard-bg)', border: 'transparent', main: true
  },
  {
    id: RATING.GOOD,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
    label: '記得了', short: '記得', color: 'var(--good)', bg: 'var(--good-bg)', border: 'transparent', main: true
  },
  {
    id: RATING.EASY,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    label: '完全記得', short: '記得', color: 'var(--easy)', bg: 'var(--easy-bg)', border: 'transparent', main: false
  },
]

export default function ReviewCard({ dueCards, onRate, onDone, onDelete, onUpdateNote, sessionState, updateSession, isMobile }) {
  const [sessionCards, setSessionCards] = useState(() => {
    if (sessionState?.activeSession) return sessionState.activeSession.cards

    // 每次進入複習頁面時，將預計複習的卡片進行隨機打亂 (Fisher-Yates)
    const shuffled = [...dueCards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, sessionState?.sessionSize || 30)
  })
  const [index, setIndex] = useState(() => sessionState?.activeSession?.index || 0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState(() => sessionState?.activeSession?.results || [])
  const [failedCards, setFailedCards] = useState(() => sessionState?.activeSession?.failedCards || [])
  const [tipsOpen, setTipsOpen] = useState(false)


  // ── 蕃茄鐘計時器 ──
  const POMODORO_PRESETS = [5, 10, 15, 25]
  const [pomodoroMode, setPomodoroMode] = useState('idle') // 'idle' | 'running' | 'done'
  const [pomodoroTotal, setPomodoroTotal] = useState(5 * 60) // seconds
  const [pomodoroLeft, setPomodoroLeft] = useState(5 * 60)
  const pomodoroRef = useRef(null)

  // 計時器 tick
  useEffect(() => {
    if (pomodoroMode !== 'running') return
    pomodoroRef.current = setInterval(() => {
      setPomodoroLeft(prev => {
        if (prev <= 1) {
          clearInterval(pomodoroRef.current)
          setPomodoroMode('done')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(pomodoroRef.current)
  }, [pomodoroMode])

  const startPomodoro = (minutes) => {
    clearInterval(pomodoroRef.current)
    const secs = minutes * 60
    setPomodoroTotal(secs)
    setPomodoroLeft(secs)
    setPomodoroMode('running')
  }

  const resetPomodoro = () => {
    clearInterval(pomodoroRef.current)
    setPomodoroMode('idle')
    setPomodoroLeft(pomodoroTotal)
  }

  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }



  // 語音自動播放設置 (預設開啟)
  const [autoPlay, setAutoPlay] = useState(() => {
    return localStorage.getItem('memoflip_autoplay') !== 'false'
  })

  const card = sessionCards[index]

  const [localNote, setLocalNote] = useState('')

  useEffect(() => {
    if (card) {
      setLocalNote(card.user_notes || '')
    }
  }, [card?.id])

  // 發音相關 (TTS)當首次載入第一張卡片時，自動播放發音
  useEffect(() => {
    let timeoutId = null;
    if (autoPlay && sessionCards.length > 0 && index === 0) {
      // 加上 150ms 的小延遲與 cleanup，防止 React 18 Strict Mode 快速觸發兩次導致 Chrome 語音引擎死結
      timeoutId = setTimeout(() => {
        speak(sessionCards[0].front, sessionCards[0].language).catch(e => console.error("TTS Error on mount:", e))
      }, 150);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAutoPlay = () => {
    const next = !autoPlay
    setAutoPlay(next)
    localStorage.setItem('memoflip_autoplay', String(next))
    if (next && card && !flipped) {
      speak(card.front, card.language).catch(e => console.error(e))
    }
  }

  const handleDeleteCard = () => {
    if (window.confirm(`確定要把「${card.front}」從卡片庫中永久刪除嗎？`)) {
      const baseId = card.id.split('_retry_')[0]
      if (onDelete) onDelete(baseId)

      const nextIndex = index + 1
      setIndex(nextIndex)

      if (autoPlay && nextIndex < sessionCards.length) {
        const nextCard = sessionCards[nextIndex]
        speak(nextCard.front, nextCard.language).catch(err => console.error("TTS Error:", err))
      }
    }
  }

  const handleRate = (rating) => {
    // 立即通知上層狀態更新
    onRate(card.id, rating)
    const nextResults = [...results, rating]
    setResults(nextResults)
    setFlipped(false)
    setTipsOpen(false)

    let nextSessionCards = sessionCards;
    let nextFailedCards = failedCards;

    if (rating === RATING.AGAIN) {
      if (!failedCards.find(c => c.id.split('_retry_')[0] === card.id.split('_retry_')[0])) {
          nextFailedCards = [...failedCards, card]
          setFailedCards(nextFailedCards)
      }
      
      // 【防護機制】：防止無限堆疊造成沒有盡頭的感受
      // 限制同一個單字在同一輪中，最多只加入 Retry 排隊 1 次。
      // 若它已經是 Retry 階段再次錯，就放它過去（SRS演算法已更新），留給下一個 Session 去挑戰
      if (!card.id.includes('_retry_')) {
          nextSessionCards = [...sessionCards, { ...card, id: card.id + '_retry_' + sessionCards.length }]
          setSessionCards(nextSessionCards)
      }
    }

    const nextIndex = index + 1;
    setIndex(nextIndex)

    // Sync 中斷保護存檔
    if (updateSession) {
      updateSession({
        ...sessionState,
        activeSession: {
          cards: nextSessionCards,
          index: nextIndex,
          results: nextResults,
          failedCards: nextFailedCards
        }
      })
    }

    // 同步點擊觸發：完美迴避 Safari/iOS 自動播放阻擋
    if (autoPlay && nextIndex < nextSessionCards.length) {
      const nextCard = nextSessionCards[nextIndex];
      speak(nextCard.front, nextCard.language).catch(err => console.error("TTS Error:", err))
    }
  }

  // 鍵盤快捷鍵監聽
  useEffect(() => {
    // 若已結束則不監聽
    if (sessionCards.length === 0 || index >= sessionCards.length) return

    const handleKeyDown = (e) => {
      // 絕對關鍵！避免按住不放時一秒觸發 30 次渲染，導致 React 崩潰與記憶體爆炸、畫面撕裂重疊
      if (e.repeat) return;

      // 避免使用者輸入時觸發
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (!flipped) {
        // 卡片背面未顯示，按下空白鍵翻面
        if (e.code === 'Space') {
          e.preventDefault()
          setFlipped(true)
          if (!isMobile) setTipsOpen(true)
        }
      } else {
        // 卡片已翻開，按下空白鍵可翻回正面
        if (e.code === 'Space') {
          e.preventDefault()
          setFlipped(false)
          return
        }

        // 監聽 Q W E R 評分
        const key = e.key.toLowerCase()
        if (key === 'q') handleRate(RATINGS[0].id)
        if (key === 'w') handleRate(RATINGS[1].id)
        if (key === 'e') handleRate(RATINGS[2].id)
        if (key === 'r') handleRate(RATINGS[3].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipped, index, sessionCards.length, handleRate])

  // ── Done screen ──
  if (sessionCards.length === 0 || index >= sessionCards.length) {
    return (
      <div className="rc-done">
        <div className="rc-done-icon" style={{ color: 'var(--good)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2 className="rc-done-title">本輪複習完成！</h2>
        <p className="rc-done-sub">共複習了 {results.length} 張</p>
        <div className="rc-done-stats">
          {RATINGS.map(r => {
            const count = results.filter(x => x === r.id).length
            return (
              <div key={r.id} className="rc-stat" style={{ background: r.bg, borderColor: r.border }}>
                <span style={{ width: '28px', height: '28px', color: r.color }}>{r.icon}</span>
                <span style={{ color: r.color, fontSize: '0.75rem', fontWeight: 800 }}>{r.label}</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: r.color }}>{count}</span>
              </div>
            )
          })}
        </div>
        <button className="btn-primary" onClick={() => onDone(results)}>回到首頁</button>
      </div>
    )
  }

  const statusInfo = STATUS_STYLE[card.status] || STATUS_STYLE.learning


  return (
    <div className="rc-layout" style={{ position: 'relative' }}>

      {/* ── 新的左側進度與控制區 ── */}
      <div className="rc-left-sidebar">
        <div className="rc-vertical-progress">
          {(() => {
            const baseCount = sessionCards.filter(c => !c.id.includes('_retry_')).length;
            const displayIndex = index < baseCount ? index + 1 : baseCount;
            const inRetry = index >= baseCount;
            const percent = (displayIndex / baseCount) * 100;

            return (
              <>
                <div className="rc-progress-fraction">
                  <span className="rc-progress-current">{displayIndex}</span>
                  <span className="rc-progress-divider">/</span>
                  <span className="rc-progress-total">{baseCount}</span>
                </div>
                {inRetry && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--again)', fontWeight: 'bold', marginTop: '4px', textAlign: 'center' }}>
                    錯題 {index - baseCount + 1}/{sessionCards.length - baseCount}
                  </div>
                )}
                <div className="rc-progress-bar-vertical" style={{ marginTop: '8px' }}>
                  <div className="rc-progress-fill-vertical" style={{ height: `${Math.max(0, Math.min(100, percent))}%` }} />
                </div>
              </>
            );
          })()}
        </div>

        <button
          className={`rc-autoplay-btn ${autoPlay ? 'on' : ''}`}
          onClick={toggleAutoPlay}
          title={autoPlay ? '關閉自動發音' : '開啟自動發音'}
        >
          {autoPlay ? '🔊' : '🔇'}
        </button>
      </div>

      {/* ── 主要複習區 ── */}
      <div className="rc-wrap">

        {/* 卡片區域（單張卡片 DOM 重複利用） */}
        <div className="rc-single-card-wrap" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* 主卡片 */}
          <div
            className={`rc-card ${flipped ? 'rc-card-back-style' : 'rc-card-front-style'}`}
            onClick={() => {
              if (!flipped && !isMobile) setTipsOpen(true)
              setFlipped(f => !f)
            }}

          >
            {!flipped ? (
              /* ─ 正面 ─ */
              <div className="rc-face">
                <button
                  className="rc-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(); }}
                  title="從卡片庫刪除此單字"
                >
                  🗑️
                </button>
                <div className="rc-status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.label}
                </div>
                <div className="rc-main-word-area">
                  {(card.phonetic || card.part_of_speech) && (
                    <span className="rc-phonetic">
                      {card.part_of_speech && <span style={{ marginRight: '6px', fontWeight: 700, fontStyle: 'normal', color: 'var(--brand-accent)' }}>{card.part_of_speech}</span>}
                      {card.phonetic && <span>{card.phonetic}</span>}
                    </span>
                  )}
                  <div className="rc-word-row">
                    <h2 className="rc-word">{card.front}</h2>
                    <button
                      className="rc-speak-icon-btn"
                      onClick={e => { e.stopPropagation(); speak(card.front, card.language) }}
                      title="聽發音"
                    >
                      🔊
                    </button>
                  </div>
                </div>

                {(card.example_1 || card.example) && (
                  <div className="rc-front-example" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                    <span style={{ userSelect: 'text' }}>「{card.example_1 || card.example}」</span>
                    <button
                      className="rc-speak-icon-btn small"
                      onClick={e => { e.stopPropagation(); speak(card.example_1 || card.example, card.language) }}
                      title="聽例句"
                    >🔊</button>
                  </div>
                )}
                {card.example_2 && (
                  <div className="rc-front-example" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ marginTop: '4px' }}>
                    <span style={{ userSelect: 'text' }}>「{card.example_2}」</span>
                    <button
                      className="rc-speak-icon-btn small"
                      onClick={e => { e.stopPropagation(); speak(card.example_2, card.language) }}
                      title="聽例句"
                    >🔊</button>
                  </div>
                )}

                {card.tips && (
                  <div className="rc-tips-wrap" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                    <button
                      className={`rc-tips-btn ${tipsOpen ? 'open' : ''}`}
                      onClick={() => setTipsOpen(o => !o)}
                    >
                      <span>💡 記憶提示</span>
                      <span className="rc-tips-chevron">{tipsOpen ? '▲' : '▼'}</span>
                    </button>
                    {tipsOpen && <div className="rc-tips-content" style={{ userSelect: 'text' }}>{card.tips}</div>}
                  </div>
                )}

                {!tipsOpen && <span className="rc-flip-hint">點擊查看答案 (空白鍵)</span>}
              </div>
            ) : (
              /* ─ 背面 ─ */
              <div className="rc-face">
                <button
                  className="rc-delete-btn"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCard(); }}
                  title="從卡片庫刪除此單字"
                >
                  🗑️
                </button>
                <div className="rc-status-badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.label}
                </div>

                <div className="rc-back-top-row">
                  <span className="rc-back-word" style={{ marginLeft: '32px' }}>{card.front}</span>
                  {(card.part_of_speech || card.phonetic) && (
                    <span className="rc-phonetic" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                      {card.part_of_speech && <span style={{ marginRight: '6px', fontWeight: 700, fontStyle: 'normal', color: 'var(--brand-accent)' }}>{card.part_of_speech}</span>}
                      {card.phonetic && <span>{card.phonetic}</span>}
                    </span>
                  )}
                  <button
                    className="rc-speak-icon-btn small"
                    onClick={e => { e.stopPropagation(); speak(card.front, card.language) }}
                    title="聽發音"
                  >
                    🔊
                  </button>
                </div>

                <div className="rc-main-word-area">
                  <span className="rc-translation">{card.back}</span>
                </div>

                {(card.example_1 || card.example) && (
                  <div className="rc-example" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p className="rc-ex-text" style={{ margin: 0, flex: 1, userSelect: 'text' }}>「{card.example_1 || card.example}」</p>
                      <button
                        className="rc-speak-icon-btn small"
                        onClick={e => { e.stopPropagation(); speak(card.example_1 || card.example, card.language) }}
                        title="聽例句"
                      >🔊</button>
                    </div>
                    <p className="rc-ex-trans" style={{ userSelect: 'text' }}>{card.example_trans_1 || card.example_trans}</p>
                  </div>
                )}
                {card.example_2 && (
                  <div className="rc-example" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p className="rc-ex-text" style={{ margin: 0, flex: 1, userSelect: 'text' }}>「{card.example_2}」</p>
                      <button
                        className="rc-speak-icon-btn small"
                        onClick={e => { e.stopPropagation(); speak(card.example_2, card.language) }}
                        title="聽例句"
                      >🔊</button>
                    </div>
                    <p className="rc-ex-trans">{card.example_trans_2}</p>
                  </div>
                )}

                {/* 獨立或合併的提示與筆記區 */}
                <div className="rc-tips-wrap" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                  <button
                    className={`rc-tips-btn ${tipsOpen ? 'open' : ''}`}
                    onClick={() => setTipsOpen(o => !o)}
                  >
                    <span>💡 記憶提示與筆記</span>
                    <span className="rc-tips-chevron">{tipsOpen ? '▲' : '▼'}</span>
                  </button>
                {tipsOpen && (
                    <div className="rc-tips-content-wrap">
                      {card.tips && (
                        <div className="rc-tips-content" style={{ userSelect: 'text', marginBottom: '8px', maxWidth: '100%', wordBreak: 'break-word' }}>
                          {card.tips}
                        </div>
                      )}

                      <textarea
                        className="rc-user-note-input"
                        placeholder="點此新增你的專屬記憶筆記..."
                        value={localNote}
                        onChange={e => setLocalNote(e.target.value)}
                        onBlur={() => {
                          if (onUpdateNote) onUpdateNote(card.id, localNote)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>{/* end rc-stack-wrap */}

        {/* 操作按鈕與提示區段 */}
        <div className="rc-bottom-area">
          <div className={`rc-rating-wrap ${!flipped ? 'rc-rating-wrap-hidden' : ''}`}>
            {!flipped ? (
              <button className="rc-show-btn" onClick={() => { setFlipped(true); if (!isMobile) setTipsOpen(true); }}>
                顯示答案 <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: '6px' }}>[Space]</span>
              </button>
            ) : (
              <>
                <div className="rc-rating-grid" style={{ marginTop: '12px' }}>
                  {RATINGS.map((r, idx) => (
                    <div key={r.id} className="rcb-wrap">
                      <div className="rcb-tooltip">{previewLabel(card, r.id)}</div>
                      <button
                        className={`rc-rating-btn ${r.main ? 'rc-rating-main' : 'rc-rating-sub'}`}
                        style={{ '--rc': r.color, '--rbg': r.bg, '--rborder': r.border }}
                        onClick={() => handleRate(r.id)}
                      >
                        <span className="rcb-icon">{r.icon}</span>
                        <div className="rcb-text-row">
                          <span className="rcb-label">{r.label}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 弱點單字側欄 ── */}
      {!isMobile && (
        <div className="rc-sidebar">
          <div className="rc-sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            完全忘了
            {failedCards.length > 0 && (
              <span className="rc-sidebar-count">{failedCards.length}</span>
            )}
          </div>
          {failedCards.length === 0 ? (
            <p className="rc-sidebar-empty">按「完全不記得」的字<br />會剛好出現在這裡</p>
          ) : (
            failedCards.map(c => (
              <div key={c.id} className="rc-sidebar-item">
                <div className="rc-sidebar-front">{c.front}</div>
                <div className="rc-sidebar-back">{c.back}</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 蕃茄鐘計時器 (右下角浮動) ── */}
      {!isMobile && (
        <div className={`pomodoro-widget ${pomodoroMode}`}>
          {pomodoroMode === 'idle' && (
            <>
              <div className="pomodoro-label">🍅 計時</div>
              <div className="pomodoro-presets">
                {POMODORO_PRESETS.map(min => (
                  <button
                    key={min}
                    className="pomodoro-preset-btn"
                    onClick={() => startPomodoro(min)}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </>
          )}
          {(pomodoroMode === 'running' || pomodoroMode === 'done') && (
            <>
              <div className="pomodoro-ring-wrap">
                <svg className="pomodoro-ring" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" className="pomodoro-ring-bg" />
                  <circle
                    cx="24" cy="24" r="20"
                    className="pomodoro-ring-fill"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (pomodoroMode === 'done' ? 0 : pomodoroLeft / pomodoroTotal)}`}
                  />
                </svg>
                <span className="pomodoro-time">
                  {pomodoroMode === 'done' ? '✅' : formatTime(pomodoroLeft)}
                </span>
              </div>
              {pomodoroMode === 'done' && (
                <div className="pomodoro-done-msg">時間到！</div>
              )}
              <button className="pomodoro-reset-btn" onClick={resetPomodoro} title="重設">
                ↺
              </button>
            </>
          )}
        </div>
      )}

    </div>
  )
}
