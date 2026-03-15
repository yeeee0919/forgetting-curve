import { useState } from 'react'
import './CardList.css'

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
                <div style={{ fontSize: '3rem' }}>📭</div>
                <p>還沒有任何卡片</p>
                <small>點右上角 ✨ 匯入新單字</small>
            </div>
        )
    }

    const sortedCards = sortMode === 'forgetting'
        ? [...cards].sort((a, b) => (b.againCount || 0) - (a.againCount || 0))
        : cards

    const statusLabel = { learning: '學習中', review: '複習', relearning: '重學中' }
    const statusStyle = {
        learning: { background: 'var(--hard-bg)', color: 'var(--hard)' },
        review: { background: 'var(--easy-bg)', color: 'var(--easy)' },
        relearning: { background: 'var(--again-bg)', color: 'var(--again)' }
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
                        {hasCopied ? '✅ 已複製' : '📋 複製全部單字'}
                    </button>
                    <span className="cl-count">{cards.length} 張</span>
                </div>
            </div>
            <div className="cl-list">
                {sortedCards.map(card => {
                    const s = card.status || 'learning'
                    return (
                        <div key={card.id} className="cl-item">
                            <div className="cl-item-main">
                                <div className="cl-headword-row">
                                    <span className="cl-front">{card.front}</span>
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
                                <button className="cl-delete-btn" onClick={() => onDelete(card.id)} title="刪除">✕</button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
