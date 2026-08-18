import { useState, useRef, useEffect, useCallback } from 'react'
import './ListeningLab.css'
import Icon from './Icons'

// ────────────────────────────────────────────────────────────────────────────
// Linguistic Popup Dictionary
// ────────────────────────────────────────────────────────────────────────────
const LINGUISTIC_RULES = [
    {
        key: 'liaison',
        test: (word, words, idx) => {
            const pair = [words[idx], words[idx + 1]].filter(Boolean).join(' ').toLowerCase()
            return ['is het', 'heb het', 'tot en met'].some(p => pair.startsWith(p))
        },
        label: '💡 連讀警告',
        tip: 'h 音常消失，字與字會黏在一起，聽起來像一個長音。',
    },
    {
        key: 'weak_ending',
        test: (word) => /(?:en|nd)$/i.test(word) && word.length > 3,
        label: '💡 尾音弱化',
        tip: '口語中結尾的 n 或 d 幾乎不發音，輕輕帶過。',
    },
    {
        key: 'dutch_time',
        test: (word, words, idx) => {
            const next = words[idx + 1] || ''
            return word.toLowerCase() === 'half' && /^\d|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf/i.test(next)
        },
        label: '⚠️ 魔王時間',
        tip: 'half negen 是 8:30（九點的一半），不是 9:30！',
    },
    {
        key: 'friction',
        test: (word) => /[gGcC]h|ui/i.test(word),
        label: '💡 發音細節',
        tip: '注意這個喉嚨摩擦音 / 特殊母音的震動位。',
    },
    {
        key: 'separable_verb',
        test: (word, words, idx) => {
            const PARTICLES = ['in', 'op', 'af', 'uit', 'aan', 'mee', 'terug']
            const isLast = idx >= words.length - 2
            return isLast && PARTICLES.includes(word.toLowerCase().replace(/[^a-z]/gi, ''))
        },
        label: '🔗 分離動詞',
        tip: '這與前面的動詞是一組的，要連起來理解。',
    },
]

function getLinguisticTip(word, words, idx) {
    for (const rule of LINGUISTIC_RULES) {
        if (rule.test(word, words, idx)) return { label: rule.label, tip: rule.tip }
    }
    return null
}

// ────────────────────────────────────────────────────────────────────────────
// Real lesson data
// ────────────────────────────────────────────────────────────────────────────
import DEFAULT_LESSON from '../data/lesson.json'

// ────────────────────────────────────────────────────────────────────────────
// YouTube IFrame API hook
// ────────────────────────────────────────────────────────────────────────────
function useYouTubePlayer(containerId, videoId, onTimeUpdate) {
    const playerRef = useRef(null)
    const rafRef    = useRef(null)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        if (!videoId) return
        setReady(false)

        const startPolling = () => {
            const tick = () => {
                if (playerRef.current?.getCurrentTime) {
                    onTimeUpdate(playerRef.current.getCurrentTime())
                }
                rafRef.current = requestAnimationFrame(tick)
            }
            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(tick)
        }

        const stopPolling = () => cancelAnimationFrame(rafRef.current)

        const initPlayer = () => {
            playerRef.current?.destroy?.()
            playerRef.current = new window.YT.Player(containerId, {
                videoId,
                playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0, enablejsapi: 1 },
                events: {
                    onReady: () => { setReady(true); startPolling() },
                    onStateChange: (e) => {
                        // 確保焦點回到主視窗，讓自訂快捷鍵 (A/D) 在點擊影片後依然有效
                        window.focus()
                        if (document.activeElement?.tagName === 'IFRAME') {
                            document.activeElement.blur()
                        }

                        if (e.data === window.YT.PlayerState.PLAYING) startPolling()
                        else stopPolling()
                    },
                },
            })
        }

        if (window.YT?.Player) {
            initPlayer()
        } else {
            window.onYouTubeIframeAPIReady = initPlayer
            if (!document.getElementById('yt-iframe-api')) {
                const tag = document.createElement('script')
                tag.id  = 'yt-iframe-api'
                tag.src = 'https://www.youtube.com/iframe_api'
                document.head.appendChild(tag)
            }
        }

        return () => { stopPolling(); playerRef.current?.destroy?.(); playerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, containerId])

    const seekTo = useCallback((seconds) => {
        if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(seconds, true)
            playerRef.current.playVideo()
        }
    }, [])

    const pauseVideo = useCallback(() => {
        playerRef.current?.pauseVideo?.()
    }, [])

    const playVideo = useCallback(() => {
        playerRef.current?.playVideo?.()
    }, [])

    const getPlayerState = useCallback(() => {
        return playerRef.current?.getPlayerState?.()
    }, [])

    return { ready, seekTo, pauseVideo, playVideo, getPlayerState }
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: randomly pick N% of indices
// ────────────────────────────────────────────────────────────────────────────
function pickRandomIndices(total, pct) {
    const count = Math.round(total * pct)
    const indices = Array.from({ length: total }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return new Set(indices.slice(0, count))
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────
export default function ListeningLab() {
    const lesson = DEFAULT_LESSON
    const videoId = DEFAULT_LESSON.youtube_id
    const [activeChapterIdx, setActiveChapterIdx] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [subtitleBlur, setSubtitleBlur] = useState(0)
    const [showOverlay, setShowOverlay]         = useState(true)
    const [popup, setPopup]             = useState(null)   // { label, tip, wordIdx }
    const [loopSentenceIdx, setLoopSentenceIdx] = useState(null)
    const [showChapterGrid, setShowChapterGrid] = useState(false)

    // Cloze Test
    const CLOZE_LEVELS = { low: 0.15, mid: 0.40, high: 0.75 }
    const [clozeLevel, setClozeLevel]       = useState('off')   // 'off' | 'low' | 'mid' | 'high'
    const [hiddenIndices, setHiddenIndices] = useState(new Set())
    const [wasPlaying, setWasPlaying]       = useState(false)

    const subtitleContainerRef = useRef(null)
    const wordRefs = useRef([])
    const sentenceRefs = useRef([])

    const activeChapter = lesson.chapters[activeChapterIdx] ?? lesson.chapters[0]
    const sentences     = activeChapter?.sentences ?? []
    const script        = sentences.flatMap(s => s.words)
    const wordStrings   = script.map(s => s.word)

    // ── YouTube player ──────────────────────────────────────────────────────
    const handleTimeUpdate = useCallback((t) => setCurrentTime(t), [])
    const { seekTo, pauseVideo, playVideo, getPlayerState } = useYouTubePlayer('yt-player-div', videoId, handleTimeUpdate)

    // ── Active sentence from playback time ────────────────────────────
    const activeSentenceIdx = sentences.findIndex(s => currentTime >= s.start && currentTime <= s.end + 0.3)
    // Precompute word offset for each sentence (so overlay can find global word idx)
    const sentenceWordOffsets = sentences.map((_, sIdx) =>
        sentences.slice(0, sIdx).reduce((a, s) => a + s.words.length, 0)
    )

    // Auto-scroll active sentence to center
    useEffect(() => {
        if (activeSentenceIdx < 0) return
        const el = sentenceRefs.current[activeSentenceIdx]
        if (!el || !subtitleContainerRef.current) return
        const container = subtitleContainerRef.current
        container.scrollTo({
            top: el.offsetTop - container.offsetHeight / 2 + el.offsetHeight / 2,
            behavior: 'smooth',
        })
    }, [activeSentenceIdx])

    // Pause video at end of chapter
    const lastPausedChapter = useRef(null)
    useEffect(() => {
        if (!activeChapter) return
        if (currentTime >= activeChapter.end_time && lastPausedChapter.current !== activeChapterIdx) {
            pauseVideo()
            lastPausedChapter.current = activeChapterIdx
        } else if (currentTime < activeChapter.end_time) {
            lastPausedChapter.current = null
        }
    }, [currentTime, activeChapter, activeChapterIdx, pauseVideo])

    // Sentence looping
    useEffect(() => {
        if (loopSentenceIdx !== null && sentences[loopSentenceIdx]) {
            const s = sentences[loopSentenceIdx]
            // allow a 0.2s padding so it finishes sounding naturally
            if (currentTime >= s.end + 0.2 || currentTime < s.start) {
                seekTo(s.start)
            }
        }
    }, [currentTime, loopSentenceIdx, sentences, seekTo])

    // Keyboard Shortcuts
    const stateRef = useRef({ activeSentenceIdx, sentences, currentTime, lastA_Time: 0, loopSentenceIdx })
    useEffect(() => {
        stateRef.current = { ...stateRef.current, activeSentenceIdx, sentences, currentTime, loopSentenceIdx }
    }, [activeSentenceIdx, sentences, currentTime, loopSentenceIdx])

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

            const { activeSentenceIdx, sentences, currentTime } = stateRef.current

            // Find current or closest preceding sentence
            let currIdx = activeSentenceIdx
            if (currIdx < 0) {
                for (let i = sentences.length - 1; i >= 0; i--) {
                    if (sentences[i].start <= currentTime) {
                        currIdx = i
                        break
                    }
                }
            }
            // If still negative (e.g. before first sentence), default to 0
            if (currIdx < 0) currIdx = 0

            if (e.code === 'Space') {
                e.preventDefault()
                if (getPlayerState() === window.YT?.PlayerState?.PLAYING) {
                    pauseVideo()
                } else {
                    playVideo()
                }
            } else if (e.key === 'a' || e.key === 'A') {
                e.preventDefault()
                setLoopSentenceIdx(null)
                const now = Date.now()
                const isDoubleTap = (now - stateRef.current.lastA_Time) < 500
                stateRef.current.lastA_Time = now

                if (sentences[currIdx]) {
                    if (isDoubleTap && currIdx > 0) {
                        seekTo(sentences[currIdx - 1].start)
                    } else {
                        seekTo(sentences[currIdx].start)
                    }
                    playVideo()
                }
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault()
                setLoopSentenceIdx(null)
                if (currIdx < sentences.length - 1 && sentences[currIdx + 1]) {
                    seekTo(sentences[currIdx + 1].start)
                    playVideo()
                }
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault()
                const { loopSentenceIdx: currLoop } = stateRef.current
                if (currLoop === currIdx) {
                    setLoopSentenceIdx(null) // Turn off
                } else {
                    setLoopSentenceIdx(currIdx) // Turn on
                    if (sentences[currIdx]) {
                        seekTo(sentences[currIdx].start)
                        playVideo()
                    }
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [getPlayerState, pauseVideo, playVideo, seekTo])

    // ── Chapter selection ───────────────────────────────────────────────────
    const selectChapter = (idx) => {
        setActiveChapterIdx(idx)
        setPopup(null)
        setHiddenIndices(new Set())
        setClozeLevel('off')
        setLoopSentenceIdx(null)
        seekTo(lesson.chapters[idx]?.start_time ?? 0)
        playVideo()
    }

    // ── Cloze mask ──────────────────────────────────────────────────────────
    const applyCloze = (level) => {
        if (level === 'off') {
            setClozeLevel('off')
            setHiddenIndices(new Set())
        } else {
            setClozeLevel(level)
            setHiddenIndices(pickRandomIndices(script.length, CLOZE_LEVELS[level]))
        }
    }

    const handleWordClick = (idx) => {
        if (hiddenIndices.has(idx)) return
        seekTo(script[idx].start)
        const tip = getLinguisticTip(script[idx].word, wordStrings, idx)
        setPopup(tip ? { ...tip, wordIdx: idx } : null)
    }

    const onWordMouseEnter = (idx) => {
        if (hiddenIndices.has(idx)) {
            const state = getPlayerState()
            setWasPlaying(state === window.YT?.PlayerState?.PLAYING)
            pauseVideo()
        }
    }

    const onWordMouseLeave = (idx) => {
        if (hiddenIndices.has(idx)) {
            if (wasPlaying) playVideo()
        }
    }

    const isHidden = (idx) => clozeLevel !== 'off' && hiddenIndices.has(idx)

    return (
        <div className="ll2-container">
            <div className="ll2-body">
                <div className="ll2-player-col">
                    <div className="ll2-player-wrap">
                        <div id="yt-player-div" className="ll2-yt-frame" />
                        
                        {/* Bottom Left Video Controls */}
                        <div className="ll2-video-controls">
                            <button className={`ll2-overlay-toggle-btn ${showOverlay?'active':''}`} onClick={() => setShowOverlay(p=>!p)} title="顯示/隱藏影片字幕">
                                {showOverlay ? '影片字幕開啟' : '影片字幕關閉'}
                            </button>
                            <div className="ll2-blur-control">
                                <label>模糊度</label>
                                <input type="range" className="ll2-blur-slider" min={0} max={15}
                                    value={subtitleBlur} onChange={e => setSubtitleBlur(Number(e.target.value))} />
                            </div>
                        </div>

                        {showOverlay && activeSentenceIdx >= 0 && (
                            <div className="ll2-overlay-bar" style={{filter: `blur(${subtitleBlur}px)`}}>
                                {sentences[activeSentenceIdx].words.map((w, wIdx) => {
                                    const gIdx = sentenceWordOffsets[activeSentenceIdx] + wIdx
                                    const hidden   = isHidden(gIdx)
                                    return (
                                        <span key={wIdx}
                                            className={['ll2-ov-word', hidden?'ll2-ov-word--hidden':''].join(' ')}
                                            onClick={() => handleWordClick(gIdx)}
                                            onMouseEnter={() => onWordMouseEnter(gIdx)}
                                            onMouseLeave={() => onWordMouseLeave(gIdx)}
                                        >
                                            {hidden ? <span className="ll2-cloze-blank">{w.word}</span> : w.word}
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: script (33%) ──────────────────────────────── */}
                <div className="ll2-right-col">

                    {/* Chapter nav bar */}
                    <div className="ll2-chapter-nav">
                        <button className="ll2-ch-arrow" onClick={() => selectChapter(Math.max(0, activeChapterIdx-1))} disabled={activeChapterIdx===0}><Icon name="chevronLeft" size={18} /></button>
                        <div className="ll2-ch-info" onClick={() => setShowChapterGrid(p=>!p)}>
                            <span className="ll2-ch-name">{activeChapter?.chapter_title?.replace(/\s*\(\d+:\d+\)/,'')}</span>
                            <span className="ll2-ch-count">{activeChapterIdx+1} / {lesson.chapters.length} ▾</span>
                        </div>
                        <button className="ll2-ch-arrow" onClick={() => selectChapter(Math.min(lesson.chapters.length-1, activeChapterIdx+1))} disabled={activeChapterIdx===lesson.chapters.length-1}><Icon name="chevronRight" size={18} /></button>
                    </div>

                    {/* Cloze test controls */}
                    <div className="ll2-cloze-header">
                        <span className="ll2-cloze-label">克漏字測驗</span>
                        <div className="ll2-cloze-group">
                            {['off','low','mid','high'].map(lvl => (
                                <button key={lvl} className={`ll2-cloze-btn ll2-cloze-${lvl} ${clozeLevel===lvl?'active':''}`} onClick={() => applyCloze(lvl)}>
                                    {lvl==='off'?'關閉':lvl==='low'?'Low':lvl==='mid'?'Mid':'High'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chapter Dropdown List */}
                    {showChapterGrid && (
                        <>
                            <div className="ll2-settings-backdrop" onClick={() => setShowChapterGrid(false)} />
                            <div className="ll2-chapter-dropdown">
                                {lesson.chapters.map((ch, idx) => {
                                    return (
                                        <button key={idx}
                                            className={`ll2-ch-list-item ${idx===activeChapterIdx?'active':''}`}
                                            onClick={() => { selectChapter(idx); setShowChapterGrid(false) }}
                                        >
                                            <div className="ll2-ch-list-item-left">
                                                <span className="ll2-ch-grid-num">{idx+1}</span>
                                                <span className="ll2-ch-grid-title">{ch.chapter_title.replace(/\s*\(\d+:\d+\)/,'')}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {/* Flowing script */}
                    <div className="ll2-script-flow" ref={subtitleContainerRef}>
                        {sentences.length === 0 ? (
                            <span className="ll2-subtitle-empty">請選擇一個章節</span>
                        ) : (
                            (() => {
                                let globalWordIdx = 0
                                return sentences.map((sentence, sIdx) => {
                                    const isActive = sIdx === activeSentenceIdx
                                    return (
                                        <div key={sIdx}
                                            ref={el => sentenceRefs.current[sIdx] = el}
                                            className={`ll2-para ${isActive ? 'll2-para--active' : ''} ${loopSentenceIdx === sIdx ? 'll2-para--looping' : ''}`}
                                        >
                                            <div className="ll2-para-bar" />
                                            <div className="ll2-para-body">
                                                <div className="ll2-para-words">
                                                    {sentence.words.map((w, wIdx) => {
                                                        const idx = globalWordIdx++
                                                        const tip = getLinguisticTip(w.word, wordStrings, idx)
                                                        const hidden = isHidden(idx)
                                                        return (
                                                            <span key={idx}
                                                                ref={el => wordRefs.current[idx] = el}
                                                                className={['ll2-word', tip&&!hidden?'ll2-word--tip':'', hidden?'ll2-word--hidden':''].join(' ')}
                                                                onClick={() => handleWordClick(idx)}
                                                                onMouseEnter={() => onWordMouseEnter(idx)}
                                                                onMouseLeave={() => onWordMouseLeave(idx)}
                                                                title={hidden?'滑鼠移入顯示':tip?tip.label:'點擊跳轉發音'}
                                                            >
                                                                {hidden ? <span className="ll2-cloze-blank">{w.word}</span> : w.word}
                                                                {tip && !hidden && <span className="ll2-tip-dot" />}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                                <div className="ll2-para-trans">
                                                    {sentence.translation}
                                                    {loopSentenceIdx === sIdx && <span className="ll2-loop-badge" title="單句循環中 (按 S 取消)">🔁 循環播放中</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            })()
                        )}

                        {/* Linguistic popup */}
                        {popup && (
                            <div className="ll2-popup" onClick={e => e.stopPropagation()}>
                                <button className="ll2-popup-close" onClick={() => setPopup(null)}><Icon name="x" size={16} /></button>
                                <div className="ll2-popup-label">{popup.label}</div>
                                <div className="ll2-popup-tip">{popup.tip}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
