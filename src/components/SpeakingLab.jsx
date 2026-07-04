import { useState, useEffect } from 'react'
import { qaQuestions, photoQuestions, comparisonQuestions, storyQuestions } from '../data/speakingQuestions'
import { speakDutch, stopTTS } from '../services/tts'
import './SpeakingLab.css'

// ─── Sub-components ──────────────────────────────────────────────

function PlayButton({ text }) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = async (e) => {
    e.stopPropagation()
    if (isPlaying) {
        stopTTS()
        setIsPlaying(false)
        return
    }
    setIsPlaying(true)
    try {
      await speakDutch(text)
    } finally {
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
        className={`sl-play-btn ${isPlaying ? 'playing' : ''}`} 
        onClick={handlePlay}
        title="播放荷蘭文"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={isPlaying ? "currentColor" : "currentColor"} stroke="none">
          {isPlaying ? (
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          ) : (
            <path d="M8 5v14l11-7z" />
          )}
        </svg>
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
  return (
    <div className="sl-card sl-card-qa">
      <TypeBadge type="TYPE1_QA" />

      <div className="sl-example-box">
        <div className="sl-example-icon">$</div>
        <div className="sl-example-text" style={{ flex: 1 }}>
          <div className="sl-example-zh">{q.exampleSentenceZh}</div>
          <div className="sl-example-nl">{q.exampleSentenceNl}</div>
        </div>
        <PlayButton text={q.exampleSentenceNl} />
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

// ─── Main Component ─────────────────────────────────────────────

const TABS = [
  { id: 'qa',         label: '1. 問答題',     icon: '💬' },
  { id: 'photo',      label: '2. 描述圖片',   icon: '🖼️' },
  { id: 'comparison', label: '3. 對比選擇',   icon: '⚖️' },
  { id: 'story',      label: '4. 看圖講故事', icon: '📖' },
]

export default function SpeakingLab() {
  const [activeTab, setActiveTab] = useState('qa')

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
