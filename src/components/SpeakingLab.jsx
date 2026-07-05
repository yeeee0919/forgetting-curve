import { useState, useEffect, useRef, useCallback } from 'react'
import { qaQuestions, photoQuestions, comparisonQuestions, storyQuestions } from '../data/speakingQuestions'
import { speakDutch, stopTTS, preloadDutch } from '../services/tts'
import './SpeakingLab.css'

// ─── Sub-components ──────────────────────────────────────────────

function PlayButton({ text }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handlePlay = async (e) => {
    e.stopPropagation()
    if (isPlaying) {
        stopTTS()
        setIsPlaying(false)
        return
    }
    
    setIsLoading(true)
    try {
      // 預先抓取並轉換好音訊（如果有快取就會直接回傳）
      try {
        await preloadDutch(text)
      } catch (err) {
        // 若預載失敗（例如被限速 429），不中斷流程，交給 speakDutch 啟動內建語音備用方案
        console.warn('Preload skipped or failed:', err.message)
      }
      setIsLoading(false)
      setIsPlaying(true)
      // 開始播放
      await speakDutch(text)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
      setIsPlaying(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) stopTTS()
    }
  }, [isPlaying])

  return (
    <div className="sl-play-btn-wrap">
      <button 
        className={`sl-play-btn ${isPlaying ? 'playing' : ''} ${isLoading ? 'loading' : ''}`} 
        onClick={handlePlay}
        title="播放荷蘭文"
        disabled={isLoading}
      >
        {isLoading ? (
          <svg className="sl-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isPlaying ? "currentColor" : "currentColor"} stroke="none">
            {isPlaying ? (
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        )}
      </button>
      <div className="sl-play-rate">0.75x</div>
    </div>
  )
}

function TypeBadge({ type }) {
  const labels = {
    TYPE1_QA: '問答題',
    TYPE2_PHOTO: '描述圖片',
    TYPE3_COMPARISON: '對比選擇',
    TYPE4_STORY: '看圖講故事',
  }
  return <span className={`sl-type-badge sl-badge-${type}`}>{labels[type]}</span>
}

function AnswerReveal({ answerZh, answerNl }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sl-answer-wrap">
      <button className="sl-answer-btn" onClick={() => setOpen(v => !v)}>
        <span className="sl-answer-icon">{open ? '▲' : '▼'}</span>
        {open ? '收起參考答案' : '查看參考答案'}
      </button>
      {open && (
        <div className="sl-answer-body">
          <div className="sl-answer-zh">{answerZh}</div>
          <div className="sl-answer-nl-wrap">
            <div className="sl-answer-nl">{answerNl}</div>
            <PlayButton text={answerNl} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── TYPE 1: Q&A Card ───────────────────────────────────────────

function QACard({ q }) {
  // 合併例句 + 問題，讓用戶一次點擊就能連續聽到兩句
  const combinedText = `${q.exampleSentenceNl} ${q.promptNl}`

  return (
    <div className="sl-card sl-card-qa">
      <TypeBadge type="TYPE1_QA" />

      <div className="sl-example-box">
        <div className="sl-example-icon">$</div>
        <div className="sl-example-text" style={{ flex: 1 }}>
          <div className="sl-example-zh">{q.exampleSentenceZh}</div>
          <div className="sl-example-nl">{q.exampleSentenceNl}</div>
        </div>
      </div>

      <div className="sl-prompt sl-prompt-row">
        <div className="sl-prompt-text" style={{ flex: 1 }}>
          <div className="sl-prompt-zh">{q.promptZh}</div>
          <div className="sl-prompt-nl">{q.promptNl}</div>
        </div>
        <PlayButton text={combinedText} />
      </div>

      <AnswerReveal answerZh={q.answerZh} answerNl={q.answerNl} />
    </div>
  )
}

// ─── TYPE 2: Photo Description Card ────────────────────────────

function PhotoCard({ q }) {
  return (
    <div className="sl-card sl-card-photo">
      <TypeBadge type="TYPE2_PHOTO" />

      <div className="sl-photo-wrap">
        <img
          src={q.imageUrl}
          alt={q.imageAlt}
          className="sl-photo-img"
          loading="lazy"
        />
        <span className="sl-photo-badge">AI 生成圖片</span>
      </div>

      <div className="sl-prompt sl-prompt-row">
        <div className="sl-prompt-text" style={{ flex: 1 }}>
          <div className="sl-prompt-zh">{q.promptZh}</div>
          <div className="sl-prompt-nl">{q.promptNl}</div>
        </div>
        <PlayButton text={q.promptNl} />
      </div>

      <AnswerReveal answerZh={q.answerZh} answerNl={q.answerNl} />
    </div>
  )
}

// ─── TYPE 3: Comparison Card ────────────────────────────────────

function ComparisonCard({ q }) {
  return (
    <div className="sl-card sl-card-comparison">
      <TypeBadge type="TYPE3_COMPARISON" />

      <div className="sl-comparison-photos">
        <div className="sl-comparison-photo-wrap">
          <img src={q.imageLeftUrl} alt={q.imageLeftAlt} className="sl-comparison-img" loading="lazy" />
          <span className="sl-photo-badge">AI 生成圖片</span>
        </div>
        <div className="sl-comparison-photo-wrap">
          <img src={q.imageRightUrl} alt={q.imageRightAlt} className="sl-comparison-img" loading="lazy" />
          <span className="sl-photo-badge">AI 生成圖片</span>
        </div>
      </div>

      <div className="sl-prompt sl-prompt-row">
        <div className="sl-prompt-text" style={{ flex: 1 }}>
          <div className="sl-prompt-zh">{q.promptZh}</div>
          <div className="sl-prompt-nl">{q.promptNl}</div>
        </div>
        <PlayButton text={q.promptNl} />
      </div>

      <AnswerReveal answerZh={q.answerZh} answerNl={q.answerNl} />
    </div>
  )
}

// ─── TYPE 4: Story Card ─────────────────────────────────────────

function StoryCard({ q }) {
  return (
    <div className="sl-card sl-card-story">
      <TypeBadge type="TYPE4_STORY" />

      <div className="sl-story-photos">
        {q.images.map((img, idx) => (
          <div key={idx} className="sl-story-photo-wrap">
            <img src={img.url} alt={img.alt} className="sl-story-img" loading="lazy" />
            <span className="sl-photo-badge">AI 生成圖片</span>
          </div>
        ))}
      </div>

      <div className="sl-prompt sl-prompt-row">
        <div className="sl-prompt-text" style={{ flex: 1 }}>
          <div className="sl-prompt-zh">{q.promptZh}</div>
          <div className="sl-prompt-nl">{q.promptNl}</div>
        </div>
        <PlayButton text={q.promptNl} />
      </div>

      <AnswerReveal answerZh={q.answerZh} answerNl={q.answerNl} />
    </div>
  )
}

// ─── Play All Bar ────────────────────────────────────────────────

function PlayAllBar({ questions }) {
  const [status, setStatus] = useState('idle') // idle | loading | playing | paused
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('question') // question | waiting | answer
  const stopFlag = useRef(false)
  const total = questions.length

  const sleep = (ms) => new Promise((res) => {
    const id = setTimeout(res, ms)
    stopFlag._timerId = id
  })

  const handlePlayAll = useCallback(async () => {
    if (status === 'playing' || status === 'loading') {
      stopFlag.current = true
      stopTTS()
      setStatus('idle')
      setCurrentIndex(0)
      setPhase('question')
      return
    }

    stopFlag.current = false
    setStatus('loading')
    setCurrentIndex(0)
    setPhase('question')

    // Pre-load first question to reduce initial latency
    try {
      await preloadDutch(questions[0].promptNl)
    } catch (_) {}

    setStatus('playing')

    for (let i = 0; i < questions.length; i++) {
      if (stopFlag.current) break

      const q = questions[i]
      setCurrentIndex(i)

      // --- 播題目 ---
      setPhase('question')
      await speakDutch(q.promptNl)
      if (stopFlag.current) break

      // --- 等待 5 秒（讓用戶思考）---
      setPhase('waiting')
      await sleep(5000)
      if (stopFlag.current) break

      // --- 播參考答案 ---
      setPhase('answer')
      await speakDutch(q.answerNl)
      if (stopFlag.current) break

      // --- 題目間短暫停頓 1.5 秒 ---
      if (i < questions.length - 1) {
        setPhase('waiting')
        await sleep(1500)
      }
      if (stopFlag.current) break
    }

    if (!stopFlag.current) {
      setStatus('idle')
      setCurrentIndex(0)
      setPhase('question')
    }
  }, [questions, status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFlag.current = true
      stopTTS()
    }
  }, [])

  const isActive = status === 'playing' || status === 'loading'

  const phaseLabel = {
    question: '🎯 唸題目',
    waiting:  '⏳ 思考中…',
    answer:   '💡 參考答案',
  }[phase]

  return (
    <div className={`sl-play-all-bar ${isActive ? 'active' : ''}`}>
      <button
        className={`sl-play-all-btn ${isActive ? 'stop' : 'start'} ${status === 'loading' ? 'loading' : ''}`}
        onClick={handlePlayAll}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? (
          <svg className="sl-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : isActive ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span>{status === 'loading' ? '載入中…' : isActive ? '停止播放' : '播放全部題目'}</span>
      </button>

      {isActive && (
        <div className="sl-play-all-progress">
          <div className="sl-play-all-track">
            <div
              className="sl-play-all-fill"
              style={{ width: `${((currentIndex + (phase === 'answer' ? 0.8 : phase === 'waiting' ? 0.4 : 0.1)) / total) * 100}%` }}
            />
          </div>
          <span className="sl-play-all-label">
            第 {currentIndex + 1} / {total} 題 &nbsp;·&nbsp; {phaseLabel}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const TABS = [
  { id: 'qa',         label: '1. 問答題',     icon: '💬' },
  { id: 'photo',      label: '2. 描述圖片',   icon: '🖼️' },
  { id: 'comparison', label: '3. 對比選擇',   icon: '⚖️' },
  { id: 'story',      label: '4. 看圖講故事', icon: '📖' },
]

export default function SpeakingLab() {
  const [activeTab, setActiveTab] = useState('qa')

  const currentQuestions = {
    qa: qaQuestions,
    photo: photoQuestions,
    comparison: comparisonQuestions,
    story: storyQuestions,
  }[activeTab]

  const renderCards = () => {
    switch (activeTab) {
      case 'qa':
        return (
          <div className="sl-grid sl-grid-2">
            {qaQuestions.map(q => <QACard key={q.id} q={q} />)}
          </div>
        )
      case 'photo':
        return (
          <div className="sl-grid sl-grid-2">
            {photoQuestions.map(q => <PhotoCard key={q.id} q={q} />)}
          </div>
        )
      case 'comparison':
        return (
          <div className="sl-grid sl-grid-1">
            {comparisonQuestions.map(q => <ComparisonCard key={q.id} q={q} />)}
          </div>
        )
      case 'story':
        return (
          <div className="sl-grid sl-grid-1">
            {storyQuestions.map(q => <StoryCard key={q.id} q={q} />)}
          </div>
        )
      default:
        return null
    }
  }

  const countMap = {
    qa: qaQuestions.length,
    photo: photoQuestions.length,
    comparison: comparisonQuestions.length,
    story: storyQuestions.length,
  }

  return (
    <div className="sl-root">
      {/* Page Header */}
      <div className="sl-header">
        <div className="sl-header-inner">
          <h1 className="sl-title">
            <span className="sl-title-icon">🎙️</span>
            口語練習
          </h1>
          <p className="sl-subtitle">荷蘭語 A2 等級口說訓練 · 自主練習</p>
        </div>

        {/* Play All Bar */}
        <div className="sl-play-all-bar-wrap">
          <PlayAllBar key={activeTab} questions={currentQuestions} />
        </div>

        {/* Tab Bar */}
        <div className="sl-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`sl-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sl-tab-icon">{tab.icon}</span>
              <span className="sl-tab-label">{tab.label}</span>
              <span className="sl-tab-count">{countMap[tab.id]} 題</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="sl-content">
        <div className="sl-section-info">
          {activeTab === 'qa' && (
            <div className="sl-section-desc">
              <strong>練習方式：</strong>先看例句，然後用荷蘭文回答問題。回答後可查看參考答案對照。
            </div>
          )}
          {activeTab === 'photo' && (
            <div className="sl-section-desc">
              <strong>練習方式：</strong>仔細觀察圖片，用荷蘭文描述你看到的人物、場景和動作。
            </div>
          )}
          {activeTab === 'comparison' && (
            <div className="sl-section-desc">
              <strong>練習方式：</strong>比較兩張圖片，用荷蘭文說明你的偏好及原因，盡量說 3-5 句話。
            </div>
          )}
          {activeTab === 'story' && (
            <div className="sl-section-desc">
              <strong>練習方式：</strong>按照圖片順序，用荷蘭文講述一個完整的故事，注意使用過去式。
            </div>
          )}
        </div>

        {renderCards()}
      </div>
    </div>
  )
}
