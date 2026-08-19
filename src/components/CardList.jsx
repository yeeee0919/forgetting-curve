import { useState } from 'react'
import './CardList.css'
import { getCardRoots, segmentWord } from '../services/wordUtils'
import { getStage } from '../services/srs'
import Icon from './Icons'

export default function CardList({ cards, onDelete }) {
    const [hasCopied, setHasCopied] = useState(false)
    const [sortMode, setSortMode] = useState('default') // 'default' | 'forgetting'

    const handleCopyAll = async () => {
        try {
            const wordsList = cards.map(c => c.front).join('\n')
            await navigator.clipboard.writeText(wordsList)
            setHasCopied(true)
            setTimeout(() => setHasCopied(false), 2000)
        } catch (err) {
            console.error('Copy failed', err)
            // Fallback for some browsers if needed, though most modern ones support clipboard API on click
        }
    }

    if (cards.length === 0) {
        return (
            <div className="cl-empty">
                <div className="cl-empty-icon"><Icon name="inbox" size={36} /></div>
                <p>還沒有任何卡片</p>
                <small>點右上角匯入新單字</small>
            </div>
        )
    }

    const sortedCards = sortMode === 'forgetting'
        ? [...cards].sort((a, b) => (b.againCount || 0) - (a.againCount || 0))
        : cards

    const statusLabel = { learning: '學習中', review: '已熟練', mature: '成熟', relearning: '重學中', new: '未學習' }
    const statusStyle = {
        learning: { background: 'var(--hard-bg)', color: 'var(--hard)' },
        review: { background: 'var(--easy-bg)', color: 'var(--easy)' },
        mature: { background: '#D7EFE9', color: '#0d9488' },
        relearning: { background: 'var(--again-bg)', color: 'var(--again)' },
        new: { background: 'var(--bg-tint)', color: 'var(--text-tertiary)' },
    }

    return (
        <div className="cl-wrap">
            <div className="cl-header">
                <h2 className="cl-title">卡片庫</h2>
                <div className="cl-actions">
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
                    <span className="cl-count">{cards.length} 張</span>
                </div>
            </div>
            <div className="cl-list">
                {sortedCards.map(card => {
                    const s = getStage(card)
                    return (
                        <div key={card.id} className="cl-item">
                            <div className="cl-item-main">
                                <div className="cl-headword-row">
                                    <span className="cl-front">
                                        {segmentWord(card.front, getCardRoots(card)).map((seg, idx) => (
                                            <span key={idx} className={seg.isRoot ? `word-root-${seg.rootIndex % 3}` : ''}>
                                                {seg.text}
                                            </span>
                                        ))}
                                    </span>
                                    {card.phonetic && <span className="cl-phonetic">{card.phonetic}</span>}
                                    {card.part_of_speech && <span className="cl-pos">{card.part_of_speech}</span>}
                                </div>
                                <div className="cl-back">{card.back}</div>
                            </div>
                            <div className="cl-item-right">
                                {(card.againCount > 0) && (
                                    <span className="cl-again-badge" title="累計按下完全沒印象的次數">
                                        😵 ×{card.againCount}
                                    </span>
                                )}
                                <span className="cl-status" style={statusStyle[s] || statusStyle.learning}>
                                    {statusLabel[s] || '學習中'}
                                </span>
                                <button className="cl-delete-btn" onClick={() => onDelete(card.id)} title="刪除"><Icon name="x" size={14} /></button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
