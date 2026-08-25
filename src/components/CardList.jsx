import { useMemo, useState } from 'react'
import './CardList.css'
import { getCardRoots, segmentWord } from '../services/wordUtils'
import { getStage } from '../services/srs'
import { parseFormEntry } from '../services/cardFields'
import { speakDutch } from '../services/tts'
import { matchesSearch } from '../services/cardSearch'
import Icon from './Icons'

const STATUS_LABEL = { learning: '學習中', review: '已熟練', mature: '成熟', relearning: '重學中', new: '未學習' }
const STATUS_STYLE = {
    learning: { background: 'var(--hard-bg)', color: 'var(--hard)' },
    review: { background: 'var(--easy-bg)', color: 'var(--easy)' },
    mature: { background: '#D7EFE9', color: '#0d9488' },
    relearning: { background: 'var(--again-bg)', color: 'var(--again)' },
    new: { background: 'var(--bg-tint)', color: 'var(--text-tertiary)' },
}

function Headword({ card }) {
    return segmentWord(card.front, getCardRoots(card)).map((seg, idx) => (
        <span key={idx} className={seg.isRoot ? `word-root-${seg.rootIndex % 3}` : ''}>
            {seg.text}
        </span>
    ))
}

function SpeakButton({ text, title, small }) {
    if (!text) return null
    return (
        <button
            type="button"
            className={`cl-speak${small ? ' is-small' : ''}`}
            title={title}
            onClick={e => {
                e.stopPropagation()
                speakDutch(text)
            }}
        >
            <Icon name="volume" size={small ? 14 : 16} />
        </button>
    )
}

function formEntries(card) {
    const front = (card.front || '').toLowerCase()
    const parsed = (card.forms || []).map(parseFormEntry).filter(f => f.value)
    if (!parsed.length) return []
    if (parsed.length === 1 && parsed[0].value.toLowerCase() === front) return []
    return parsed
}

function NoteBack({ card }) {
    const example1 = card.example_1 || card.example
    const trans1 = card.example_trans_1 || card.example_trans
    const forms = formEntries(card)
    const tips = String(card.tips || '').trim()
    const notes = String(card.user_notes || '').trim()
    const hasMeta = !!(card.phonetic || card.part_of_speech)
    const hasAnything = hasMeta || example1 || card.example_2 || forms.length || tips || notes

    if (!hasAnything) {
        return <p className="cl-note-empty">這張還沒有更多筆記</p>
    }

    return (
        <div className="cl-note">
            {hasMeta && (
                <div className="cl-note-meta">
                    {card.part_of_speech && <span className="cl-pos">{card.part_of_speech}</span>}
                    {card.phonetic && <span className="cl-phonetic">{card.phonetic}</span>}
                </div>
            )}

            {forms.length > 0 && (
                <section className="cl-note-block">
                    <h3 className="cl-note-label">詞形</h3>
                    <ul className="cl-note-forms">
                        {forms.map((f, i) => (
                            <li key={`${f.value}-${i}`}>
                                {f.label ? <span className="cl-note-form-label">{f.label}</span> : null}
                                <span className="cl-note-form-value">{f.value}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {(example1 || card.example_2) && (
                <section className="cl-note-block">
                    <h3 className="cl-note-label">例句</h3>
                    {example1 && (
                        <div className="cl-ex">
                            <div className="cl-ex-nl">
                                <p>「{example1}」</p>
                                <SpeakButton text={example1} title="聽例句" small />
                            </div>
                            {trans1 && <p className="cl-ex-zh">{trans1}</p>}
                        </div>
                    )}
                    {card.example_2 && (
                        <div className="cl-ex">
                            <div className="cl-ex-nl">
                                <p>「{card.example_2}」</p>
                                <SpeakButton text={card.example_2} title="聽例句" small />
                            </div>
                            {card.example_trans_2 && <p className="cl-ex-zh">{card.example_trans_2}</p>}
                        </div>
                    )}
                </section>
            )}

            {tips && (
                <section className="cl-note-block">
                    <h3 className="cl-note-label">記憶提示</h3>
                    <p className="cl-note-body">{tips}</p>
                </section>
            )}

            {notes && (
                <section className="cl-note-block">
                    <h3 className="cl-note-label">筆記</h3>
                    <p className="cl-note-body">{notes}</p>
                </section>
            )}
        </div>
    )
}

export default function CardList({ cards, onDelete }) {
    const [hasCopied, setHasCopied] = useState(false)
    const [sortMode, setSortMode] = useState('default')
    const [query, setQuery] = useState('')
    const [openId, setOpenId] = useState(null)

    const handleCopyAll = async () => {
        try {
            const wordsList = cards.map(c => c.front).join('\n')
            await navigator.clipboard.writeText(wordsList)
            setHasCopied(true)
            setTimeout(() => setHasCopied(false), 2000)
        } catch (err) {
            console.error('Copy failed', err)
        }
    }

    const visibleCards = useMemo(() => {
        const filtered = cards.filter(c => matchesSearch(c, query))
        if (sortMode === 'forgetting') {
            return [...filtered].sort((a, b) => (b.againCount || 0) - (a.againCount || 0))
        }
        return filtered
    }, [cards, query, sortMode])

    if (cards.length === 0) {
        return (
            <div className="cl-empty">
                <div className="cl-empty-icon"><Icon name="inbox" size={36} /></div>
                <p>還沒有任何卡片</p>
                <small>到首頁匯入新單字</small>
            </div>
        )
    }

    const toggleOpen = (id) => {
        setOpenId(current => (current === id ? null : id))
    }

    return (
        <div className="cl-wrap">
            <div className="cl-header">
                <h2 className="cl-title">卡片庫</h2>
                <div className="cl-actions">
                    <input
                        className="cl-search"
                        type="search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="搜尋荷文或中文譯文"
                        aria-label="搜尋荷文或中文譯文"
                    />
                    <select
                        value={sortMode}
                        onChange={e => setSortMode(e.target.value)}
                        className="cl-sort-select"
                        title="排序方式"
                    >
                        <option value="default">預設順序</option>
                        <option value="forgetting">最沒印象優先 🧠</option>
                    </select>
                    <button
                        className="cl-copy-btn"
                        onClick={handleCopyAll}
                        title="複製所有單字"
                    >
                        {hasCopied ? <><Icon name="check" size={14} /> 已複製</> : <><Icon name="copy" size={14} /> 複製全部單字</>}
                    </button>
                    <span className="cl-count">{visibleCards.length}{query.trim() ? ` / ${cards.length}` : ''} 張</span>
                </div>
            </div>
            {visibleCards.length === 0 ? (
                <div className="cl-empty">
                    <p>找不到符合的單字</p>
                    <small>試試荷文單字或中文譯文</small>
                </div>
            ) : (
                <div className="cl-list">
                    {visibleCards.map(card => {
                        const s = getStage(card)
                        const open = openId === card.id
                        return (
                            <div
                                key={card.id}
                                className={`cl-item${open ? ' is-open' : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-expanded={open}
                                onClick={() => toggleOpen(card.id)}
                                onKeyDown={e => {
                                    if (e.target !== e.currentTarget) return
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        toggleOpen(card.id)
                                    }
                                }}
                            >
                                <div className="cl-item-top">
                                    <div className="cl-item-main">
                                        <div className="cl-headword-row">
                                            <span className="cl-front"><Headword card={card} /></span>
                                            <SpeakButton text={card.front} title="聽發音" />
                                            <span className={`cl-chevron${open ? ' is-open' : ''}`} aria-hidden="true">
                                                <Icon name="chevronRight" size={16} />
                                            </span>
                                        </div>
                                        <div className="cl-back">{card.back}</div>
                                    </div>
                                    <div className="cl-item-right" onClick={e => e.stopPropagation()}>
                                        {(card.againCount > 0) && (
                                            <span className="cl-again-badge" title="累計按下完全沒印象的次數">
                                                😵 ×{card.againCount}
                                            </span>
                                        )}
                                        <span className="cl-status" style={STATUS_STYLE[s] || STATUS_STYLE.learning}>
                                            {STATUS_LABEL[s] || '學習中'}
                                        </span>
                                        <button className="cl-delete-btn" onClick={() => onDelete(card.id)} title="刪除">
                                            <Icon name="x" size={14} />
                                        </button>
                                    </div>
                                </div>
                                {open && (
                                    <div onClick={e => e.stopPropagation()}>
                                        <NoteBack card={card} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
