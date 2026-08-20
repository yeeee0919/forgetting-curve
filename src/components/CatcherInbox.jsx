import React, { useState, useEffect } from 'react'
import { parseInboxItemWithSession } from '../services/ai'
import { generateId } from '../services/storage'
import { initCard } from '../services/srs'
import { toCardContent } from '../services/cardFields'
import { getCloudInbox, deleteCloudInboxItem } from '../services/supabase'
import './CatcherInbox.css'

export default function CatcherInbox({ accessToken, userId, onLogin, onImportDirect, items, onItemsChange }) {
    const [inboxItems, setInboxItems] = useState(items || [])
    const [loading, setLoading] = useState(!items)
    const [processingId, setProcessingId] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (items) setInboxItems(items)
    }, [items])

    const fetchInbox = async () => {
        if (!userId) {
            setInboxItems(items || [])
            setLoading(false)
            return
        }
        setLoading(true)
        const data = await getCloudInbox(userId)
        setInboxItems(data || [])
        onItemsChange?.(data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (!items) fetchInbox()
    }, [userId])

    const removeLocal = (id) => {
        const next = inboxItems.filter(i => i.id !== id)
        setInboxItems(next)
        onItemsChange?.(next)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('確定要刪除這筆捕捉紀錄嗎？')) return
        removeLocal(id)
        if (userId) await deleteCloudInboxItem(userId, id)
    }

    const transformItem = async (item) => {
        if (!accessToken) {
            onLogin?.()
            return
        }
        setProcessingId(item.id)
        setError('')
        try {
            const data = await parseInboxItemWithSession(item.word, item.context_sentence, accessToken, item.translation)
            const parsed = data.card
            const newCard = {
                id: generateId(),
                ...toCardContent({ ...parsed, front: parsed.front || item.word }),
                createdAt: Date.now(),
                ...initCard(),
            }
            onImportDirect([newCard])
            if (userId) await deleteCloudInboxItem(userId, item.id)
            removeLocal(item.id)
        } catch (err) {
            setError(`[${item.word}] 轉化失敗: ${err.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    const directImportItem = async (item) => {
        setProcessingId(`direct_${item.id}`)
        setError('')
        try {
            const newCard = {
                id: generateId(),
                ...toCardContent({
                    front: item.word,
                    back: item.translation || '',
                    example_1: item.context_sentence || '',
                    tips: '來自擴充功能 (無 AI 鍊金)',
                }),
                createdAt: Date.now(),
                ...initCard(),
            }
            onImportDirect([newCard])
            if (userId) await deleteCloudInboxItem(userId, item.id)
            removeLocal(item.id)
        } catch (err) {
            setError(`[${item.word}] 直接收錄失敗: ${err.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="inbox-view">
            <div className="inbox-header">
                <h2>捕捉剪貼簿 (Inbox)</h2>
                <button className="icon-btn" onClick={fetchInbox} disabled={loading} title="重新整理">↻</button>
            </div>
            {error && <div className="inbox-error">{error}</div>}
            {loading ? (
                <div className="inbox-empty">載入中...</div>
            ) : inboxItems.length === 0 ? (
                <div className="inbox-empty">
                    <p>Inbox 是空的</p>
                    <span>使用 Chrome 擴充功能在網頁上捕捉單字，就會出現在這裡</span>
                </div>
            ) : (
                <div className="inbox-list">
                    {inboxItems.map(item => (
                        <div key={item.id} className="inbox-item">
                            <div className="inbox-content">
                                <div className="inbox-word">{item.word}</div>
                                {item.translation && <div className="inbox-translation">👉 {item.translation}</div>}
                                {item.context_sentence && <div className="inbox-context">"{item.context_sentence}"</div>}
                            </div>
                            <div className="inbox-actions">
                                <button className="inbox-transform-btn" onClick={() => directImportItem(item)} disabled={processingId !== null}>
                                    快速收錄
                                </button>
                                <button className="inbox-transform-btn ai-btn" onClick={() => transformItem(item)} disabled={processingId !== null}>
                                    AI 解析
                                </button>
                                <button className="inbox-delete-btn" onClick={() => handleDelete(item.id)} disabled={processingId !== null}>
                                    拋棄
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
