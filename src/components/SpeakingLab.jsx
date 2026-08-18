import { useState, useEffect, useRef } from 'react'
import { qaQuestions, photoQuestions, comparisonQuestions, storyQuestions } from '../data/speakingQuestions'
import { speakDutch, stopTTS, preloadDutch } from '../services/tts'
import { hasSprite, getSprite, generateSprite, createSpriteAudio, getCurrentInfo } from '../services/audioSprite'
import Icon from './Icons'
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
          <Icon name="clock" size={16} className="sl-spinner" />
        ) : (
          <Icon name={isPlaying ? 'pause' : 'play'} size={16} />
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

// ─── Play All Bar (Sprite 版本) ──────────────────────────────────
//
// 狀態機：
//   idle       → 無音檔，首次點擊開始生成
//   generating → 生成中，可取消
//   ready      → 音檔已存在 IndexedDB，點擊即可立刻播放
//   playing    → 播放中，點擊停止
// ─────────────────────────────────────────────────────────────────

function PlayAllBar({ questions, tabId }) {
  // 'idle' | 'generating' | 'ready' | 'playing'
  const [status,    setStatus]    = useState('idle')
  const [genDone,   setGenDone]   = useState(0)
  const [genTotal,  setGenTotal]  = useState(0)
  const [playTime,  setPlayTime]  = useState(0)
  const [totalDur,  setTotalDur]  = useState(0)
  const [tsRef,     setTsRef]     = useState([])
  const [genError,  setGenError]  = useState('')

  const cancelRef  = useRef(false)
  const audioRef   = useRef(null)
  const blobUrlRef = useRef(null)

  // 掛載時檢查 IndexedDB 是否已有音檔
  useEffect(() => {
    setGenError('')
    hasSprite(tabId).then(exists => setStatus(exists ? 'ready' : 'idle'))
    return () => {
      cancelRef.current = true
      cleanup()
    }
  }, [tabId])

  function cleanup() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.ontimeupdate = null
      audioRef.current.onended      = null
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  function startPlayingEntry(entry) {
    cleanup()
    const { audio, url, timestamps, totalDuration } = createSpriteAudio(entry)
    blobUrlRef.current = url
    audioRef.current   = audio
    setTsRef(timestamps)
    setTotalDur(totalDuration)
    setPlayTime(0)

    audio.ontimeupdate = () => setPlayTime(audio.currentTime)
    audio.onended = () => {
      setStatus('ready')
      setPlayTime(0)
      cleanup()
    }
    audio.play()
    setStatus('playing')
  }

  async function handleClick() {
    // 播放中 → 停止
    if (status === 'playing') {
      cleanup()
      setStatus('ready')
      return
    }

    // 生成中 → 取消
    if (status === 'generating') {
      cancelRef.current = true
      setStatus('idle')
      return
    }

    // 已有音檔 → 立刻播放
    if (status === 'ready') {
      const entry = await getSprite(tabId)
      if (entry) { startPlayingEntry(entry); return }
      setStatus('idle')  // 意外遺失，重新生成
    }

    // idle → 開始生成
    cancelRef.current = false
    const total = questions.length * 2
    setGenDone(0)
    setGenTotal(total)
    setGenError('')
    setStatus('generating')

    const entry = await generateSprite(
      tabId,
      questions,
      (done, t) => { setGenDone(done); setGenTotal(t) },
      cancelRef
    )

    if (cancelRef.current) return  // 被取消

    if (entry) {
      setGenError('')
      startPlayingEntry(entry)
    } else {
      setStatus('idle')
      setGenError('音檔生成失敗（可能是 API 限速），請稍後再試')
    }
  }

  // 計算目前播到哪一題、什麼階段
  const curInfo = getCurrentInfo(playTime, tsRef)
  const phaseLabel = curInfo ? {
    question: '🎯 唸題目',
    waiting:  '⏳ 思考中…',
    answer:   '💡 參考答案',
  }[curInfo.phase] : ''

  const isGenerating = status === 'generating'
  const isPlaying    = status === 'playing'
  const isReady      = status === 'ready'
  const isBusy       = isGenerating || isPlaying

  return (
    <div className={`sl-play-all-bar ${isBusy ? 'active' : ''}`}>

      {/* ── 主按鈕 ── */}
      <button
        className={`sl-play-all-btn ${
          isPlaying    ? 'stop'
          : isGenerating ? 'cancel'
          : 'start'
        }`}
        onClick={handleClick}
        disabled={status === 'idle' && false}  // always enabled
      >
        {isGenerating ? (
          <svg className="sl-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span>
          {isGenerating ? '取消生成'
          : isPlaying   ? '停止播放'
          : isReady     ? '▶ 播放全部題目（已快取）'
          :               '▶ 播放全部題目'}
        </span>
      </button>

      {/* ── 生成進度條 ── */}
      {isGenerating && (
        <div className="sl-play-all-progress">
          <div className="sl-play-all-track">
            <div className="sl-play-all-fill sl-play-all-fill-gen"
              style={{ width: `${genTotal > 0 ? (genDone / genTotal) * 100 : 0}%` }} />
          </div>
          <span className="sl-play-all-label">
            正在生成音檔… {genDone} / {genTotal} 段
          </span>
        </div>
      )}

      {genError && !isGenerating && (
        <span className="sl-play-all-label" style={{ color: 'var(--again, #e74c3c)' }}>
          {genError}
        </span>
      )}

      {/* ── 播放進度條 ── */}
      {isPlaying && (
        <div className="sl-play-all-progress">
          <div className="sl-play-all-track">
            <div className="sl-play-all-fill"
              style={{ width: `${totalDur > 0 ? (playTime / totalDur) * 100 : 0}%` }} />
          </div>
          <span className="sl-play-all-label">
            {curInfo
              ? `第 ${curInfo.index + 1} / ${questions.length} 題 · ${phaseLabel}`
              : '播放中…'}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const TABS = [
  { id: 'qa',         label: '1. 問答題',     icon: 'message' },
  { id: 'photo',      label: '2. 描述圖片',   icon: 'image' },
  { id: 'comparison', label: '3. 對比選擇',   icon: 'scale' },
  { id: 'story',      label: '4. 看圖講故事', icon: 'book' },
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
            <Icon name="mic" size={22} />
            口語練習
          </h1>
          <p className="sl-subtitle">荷蘭語 A2 等級口說訓練 · 自主練習</p>
        </div>

        {/* Play All Bar */}
        <div className="sl-play-all-bar-wrap">
          <PlayAllBar key={activeTab} tabId={activeTab} questions={currentQuestions} />
        </div>

        {/* Tab Bar */}
        <div className="sl-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`sl-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sl-tab-icon"><Icon name={tab.icon} size={16} /></span>
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
