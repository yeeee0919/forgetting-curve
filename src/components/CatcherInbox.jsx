import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { parseTempInboxItemToCardGemini } from '../services/ai'
import { generateId } from '../services/storage'
import { initCard } from '../services/srs'
import { toCardContent } from '../services/cardFields'
import './CatcherInbox.css'

export default function CatcherInbox({ settings, onNeedKey, onImportDirect }) {
    const [inboxItems, setInboxItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)
    const [error, setError] = useState('')

    const fetchInbox = async () => {
        setLoading(true)
        const { data, err } = await supabase
            .from('temp_inbox')
            .select('*')
            .order('created_at', { ascending: false })

        if (err) {
            setError(err.message)
        } else {
            // Check if user has items
            setInboxItems(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchInbox()
    }, [])

    const handleDelete = async (id) => {
        if (!window.confirm("確定要刪除這筆捕捉紀錄嗎？")) return
        setInboxItems(prev => prev.filter(i => i.id !== id))
        await supabase.from('temp_inbox').delete().eq('id', id)
    }

    const transformItem = async (item) => {
        if (!settings.geminiKey) {
            onNeedKey()
            return
        }

        setProcessingId(item.id)
        setError('')

        try {
            // 呼叫 AI 鍊金術 Prompt，把原本擴充功能抓到的多重意思傳進去當參考
            const parsed = await parseTempInboxItemToCardGemini(item.word, item.context_sentence, settings.geminiKey, item.translation)

            const newCard = {
                id: generateId(),
                ...toCardContent({ ...parsed, front: parsed.front || item.word }),
                createdAt: Date.now(),
                ...initCard(),
            }

            // 存入 Web App (App.jsx 提供的方法)
            onImportDirect([newCard])

            // 從 Supabase 的 Inbox 清除
            await supabase.from('temp_inbox').delete().eq('id', item.id)

            // 從畫面移除
            setInboxItems(prev => prev.filter(i => i.id !== item.id))

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
            await supabase.from('temp_inbox').delete().eq('id', item.id)
            setInboxItems(prev => prev.filter(i => i.id !== item.id))

        } catch (err) {
            setError(`[${item.word}] 直接收錄失敗: ${err.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="inbox-view">
            <div className="inbox-header">
                <h2>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    捕捉剪貼簿 (Inbox)
                </h2>
                <button className="icon-btn" onClick={fetchInbox} disabled={loading} title="重新整理">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                </button>
            </div>

            {error && <div className="inbox-error">{error}</div>}

            {loading ? (
                <div className="inbox-empty">載入中...</div>
            ) : inboxItems.length === 0 ? (
                <div className="inbox-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"></path><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path><path d="m19 16 3 3-3 3"></path><path d="m15 19 3-3 3 3"></path></svg>
                    <p>Inbox 是空的</p>
                    <span>使用 Chrome 擴充功能在網頁上捕捉單字，就會出現在這裡</span>
                </div>
            ) : (
                <div className="inbox-list">
                    {inboxItems.map(item => (
                        <div key={item.id} className="inbox-item">
                            <div className="inbox-content">
                                <div className="inbox-word">{item.word}</div>
                                {item.translation && (
                                    <div className="inbox-translation">👉 {item.translation}</div>
                                )}
                                {item.context_sentence && (
                                    <div className="inbox-context">"{item.context_sentence}"</div>
                                )}
                            </div>
                            <div className="inbox-actions">
                                <button
                                    className="inbox-transform-btn"
                                    onClick={() => directImportItem(item)}
                                    disabled={processingId !== null}
                                >
                                    {processingId === `direct_${item.id}` ? (
                                        <>
                                            <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                            收錄中
                                        </>
                                    ) : (
                                        <>
                                            快速收錄
                                        </>
                                    )}
                                </button>
                                <button
                                    className="inbox-transform-btn ai-btn"
                                    onClick={() => transformItem(item)}
                                    disabled={processingId !== null}
                                    title="耗費 API 進行：詞性、例句、記憶口訣生成"
                                >
                                    {processingId === item.id ? (
                                        <>
                                            <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                            鍊金中
                                        </>
                                    ) : (
                                        <>
                                            AI 解析
                                        </>
                                    )}
                                </button>
                                <button
                                    className="inbox-delete-btn"
                                    onClick={() => handleDelete(item.id)}
                                    disabled={processingId !== null}
                                >
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
