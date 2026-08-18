import { useState, useEffect } from 'react'
import { getInboxWords, deleteInboxWord, clearInbox } from '../services/supabase'
import { generateId } from '../services/storage'
import { initCard } from '../services/srs'
import { EXTERNAL_JSON_PROMPT } from '../services/cardPrompt'
import { parseCardsJsonStrict, countCardsInJson } from '../services/jsonImport'
import { toCardContent } from '../services/cardFields'
import Icon from './Icons'

export default function ImportModal({ onImport, onClose, importing, error, hasApiKey, onNeedKey, onImportDirect }) {
    const [tab, setTab] = useState('ai')
    const [provider, setProvider] = useState('openai')
    const [text, setText] = useState('')
    const [jsonText, setJsonText] = useState('')
    const [result, setResult] = useState(null)
    const [jsonError, setJsonError] = useState('')
    const [inboxWords, setInboxWords] = useState([])
    const [loadingInbox, setLoadingInbox] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [copiedTarget, setCopiedTarget] = useState(null)

    useEffect(() => {
        fetchInbox()
    }, [])

    const fetchInbox = async () => {
        setLoadingInbox(true)
        try {
            const data = await getInboxWords()
            setInboxWords(data || [])
        } catch (e) {
            console.error('Failed to fetch inbox:', e)
        } finally {
            setLoadingInbox(false)
        }
    }

    const handlePasteInbox = () => {
        if (inboxWords.length === 0) return
        const wordsString = inboxWords.map(w => w.word).join('\n')
        setText(prev => (prev ? prev + '\n' + wordsString : wordsString))
    }

    const handleAiSubmit = async () => {
        try {
            setResult(null)
            const inboxText = inboxWords.map(w => w.word).join('\n')
            const isInboxImport = text.trim() === inboxText.trim()

            const successCallback = isInboxImport ? async () => {
                const ids = inboxWords.map(w => w.id)
                await clearInbox(ids)
                setInboxWords([])
            } : null

            const res = await onImport(text, provider, successCallback)
            setResult(res)
            setText('')
        } catch (e) {
            console.error(e)
        }
    }

    const handleJsonSubmit = () => {
        setJsonError('')
        setResult(null)
        try {
            const arr = parseCardsJsonStrict(jsonText)
            const cards = arr.map(p => ({
                id: generateId(),
                ...toCardContent(p),
                createdAt: Date.now(),
                ...initCard(),
            }))
            const res = onImportDirect(cards)
            setResult(res)
            setJsonText('')
        } catch (e) {
            setJsonError('JSON 格式錯誤：' + e.message)
        }
    }

    const detectedCount = countCardsInJson(jsonText)

    const getPromptForExternal = () => {
        const content = text.trim()
        if (!content) return EXTERNAL_JSON_PROMPT
        return EXTERNAL_JSON_PROMPT.replace('（←在這裡貼上你的單字，然後送出）', content)
    }

    const openChatGPT = () => {
        const prompt = getPromptForExternal()
        navigator.clipboard.writeText(prompt).catch(() => { })
        setCopiedTarget('chatgpt')
        setTimeout(() => setCopiedTarget(null), 2000)
        const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`
        window.open(url, '_blank')
    }

    const openGemini = () => {
        const prompt = getPromptForExternal()
        navigator.clipboard.writeText(prompt).catch(() => { })
        setCopiedTarget('gemini')
        setTimeout(() => setCopiedTarget(null), 2000)
        window.open('https://gemini.google.com/', '_blank')
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal im-modal-v5" onClick={e => e.stopPropagation()}>
                {/* Header with Dual Tabs - Compressed for space */}
                <div className="im-header">
                    <div className="im-header-main">
                        <h2 className="im-title">匯入單字</h2>
                        <div className="im-tabs-horizontal">
                            <button className={`im-tab-h ${tab === 'ai' ? 'active' : ''}`} onClick={() => setTab('ai')}>
                                AI 自動解析
                            </button>
                            <button className={`im-tab-h ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
                                手動 / JSON
                            </button>
                        </div>
                    </div>
                    <div className="im-header-actions">
                        <div className="im-settings-wrapper">
                            <button className={`im-icon-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)} title="設定">
                                <Icon name="settings" size={16} />
                            </button>
                            {showSettings && (
                                <div className="im-settings-dropdown">
                                    <div className="im-settings-item">
                                        <label>AI 引擎</label>
                                        <select value={provider} onChange={e => setProvider(e.target.value)}>
                                            <option value="openai">OpenAI (推薦)</option>
                                            <option value="gemini">Google Gemini 1.5</option>
                                        </select>
                                    </div>
                                    <button className="im-settings-link" onClick={onNeedKey}>
                                        填寫 API Keys
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="im-close-v4" onClick={onClose}><Icon name="x" size={16} /></button>
                    </div>
                </div>

                {/* Content Body - Set to flex:1 to maximize textarea height */}
                <div className="im-body">
                    {tab === 'ai' && (
                        <div className="im-ai-container">
                            <div className="im-textarea-wrapper">
                                <textarea
                                    className="im-textarea-v4"
                                    placeholder="直接貼上網頁內容、文章或單字列表，AI 將自動為您提取單字、音標、例句並生成聯想記憶法..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                                {inboxWords.length > 0 && (
                                    <button className="im-paste-inbox-btn" onClick={handlePasteInbox}>
                                        📥 貼上已收集的 {inboxWords.length} 個單字
                                    </button>
                                )}
                            </div>
                            <div className="im-field-hint">
                                💡 支援格式：網頁文字、PDF 文本、混亂的單字列表
                            </div>
                        </div>
                    )}

                    {tab === 'manual' && (
                        <div className="im-manual-container">
                            <div className="im-field-hint" style={{ marginBottom: '12px', marginTop: 0, display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.5' }}>
                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.8rem' }}>💡 外部 AI 處理步驟：</div>
                                <div style={{ display: 'flex', gap: '6px' }}><span>1️⃣</span><span>點擊下方按鈕「複製提示並前往 AI」。</span></div>
                                <div style={{ display: 'flex', gap: '6px' }}><span>2️⃣</span><span>在 ChatGPT 或 Gemini 對話框中直接貼上，讓 AI 自動解析單字。</span></div>
                                <div style={{ display: 'flex', gap: '6px' }}><span>3️⃣</span><span>把 AI 的整段回覆貼回下方（連說明或程式碼框都可以，匯入框會自己挖 JSON）。</span></div>
                            </div>
                            <textarea
                                className="im-textarea-v4 im-code-editor"
                                placeholder='可直接貼上 ChatGPT / Gemini 的整段回覆'
                                value={jsonText}
                                onChange={e => setJsonText(e.target.value)}
                            />
                            {detectedCount > 0 && (
                                <div className="im-field-hint" style={{ marginTop: '8px', color: 'var(--good)' }}>
                                    辨識到 {detectedCount} 張卡
                                </div>
                            )}
                            {jsonError && <div className="im-error-v4">{jsonError}</div>}
                        </div>
                    )}
                </div>

                {/* Redesigned Footer (V5.2 Max space) */}
                <div className="im-footer-v5">
                    <div className="im-footer-left">
                        {tab === 'manual' && (
                            <div className="im-external-ai-group">
                                <button className={`im-footer-link-btn ${copiedTarget === 'chatgpt' ? 'success' : ''}`} onClick={openChatGPT}>
                                    {copiedTarget === 'chatgpt' ? <><Icon name="check" size={14} /> 已複製提示詞</> : <>複製提示並開啟 ChatGPT <Icon name="arrowUpRight" size={14} /></>}
                                </button>
                                <button className={`im-footer-link-btn ${copiedTarget === 'gemini' ? 'success' : ''}`} onClick={openGemini}>
                                    {copiedTarget === 'gemini' ? <><Icon name="check" size={14} /> 已複製提示詞</> : <>複製提示並開啟 Gemini <Icon name="arrowUpRight" size={14} /></>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="im-footer-right">
                        <button className="btn-secondary im-btn-v5" onClick={onClose}>取消</button>
                        <button
                            className="btn-primary im-btn-v5"
                            onClick={tab === 'manual' ? handleJsonSubmit : handleAiSubmit}
                            disabled={importing || (tab === 'manual' ? !jsonText.trim() : !text.trim())}
                        >
                            {importing ? '解析中…' : '匯入'}
                        </button>
                    </div>
                </div>

                {/* Progress Status Bar */}
                {(error || result) && (
                    <div className="im-status-bar">
                        {error && <div className="im-error-v4">{error}</div>}
                        {result && <div className="im-success-v4">成功匯入 {result.added} 張{result.updated > 0 ? `（更新 ${result.updated} 張` : ''}{result.relearned > 0 ? `，${result.relearned} 張進入重學` : ''}{result.updated > 0 ? '）' : ''}</div>}
                    </div>
                )}

                <style>{`
                    .im-modal-v5 {
                        width: 820px;
                        max-width: 95vw;
                        height: 650px; /* Increased to 650px as requested (Max space) */
                        max-height: 90vh;
                        background: var(--bg-surface);
                        border-radius: var(--radius-xl);
                        box-shadow: var(--elevation-3);
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                        position: relative;
                        animation: modalShow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    @keyframes modalShow { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                    
                    .im-header {
                        padding: var(--space-md) var(--space-lg) 0; /* Reduced padding to save vertical space */
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 1px solid var(--border-default);
                        background: var(--bg-surface);
                        flex-shrink: 0;
                    }
                    .im-title { margin: 0 0 var(--space-sm); font-size: 1.2rem; font-weight: 800; color: var(--text-primary); }
                    .im-tabs-horizontal { display: flex; gap: var(--space-xs); }
                    .im-tab-h {
                        padding: var(--space-sm) var(--space-lg);
                        background: none; border: none; border-bottom: 3px solid transparent;
                        color: var(--text-secondary); font-weight: 700; font-size: 0.9rem;
                        cursor: pointer; transition: all 0.2s;
                    }
                    .im-tab-h.active { color: var(--brand-accent); border-bottom-color: var(--brand-accent); }
                    .im-tab-h:hover:not(.active) { color: var(--text-primary); background: var(--bg-canvas); border-radius: var(--radius-sm) var(--radius-sm) 0 0; }

                    .im-header-actions { display: flex; align-items: center; gap: var(--space-sm); margin-top: 0; }
                    .im-icon-btn {
                        background: var(--bg-surface); border: 1px solid var(--border-default); width: 36px; height: 36px;
                        border-radius: 9999px; display: flex; align-items: center; justify-content: center;
                        cursor: pointer; color: var(--text-primary); transition: background 0.15s, border-color 0.15s;
                    }
                    .im-icon-btn:hover, .im-icon-btn.active { border-color: var(--border-default); color: var(--text-primary); background: var(--bg-tint); }
                    .im-close-v4 { background: var(--bg-surface); border: 1px solid var(--border-default); width: 36px; height: 36px; border-radius: 9999px; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
                    .im-close-v4:hover { background: var(--bg-tint); color: var(--text-primary); }

                    .im-body { flex: 1; padding: var(--space-lg) var(--space-lg); display: flex; flex-direction: column; background: var(--bg-surface); overflow: hidden; }
                    
                    .im-ai-container, .im-manual-container { flex: 1; display: flex; flex-direction: column; min-height: 0; }
                    .im-textarea-wrapper { position: relative; flex: 1; display: flex; flex-direction: column; min-height: 0; }
                    
                    .im-textarea-v4 {
                        flex: 1; width: 100%; border: 2px solid var(--border-default); border-radius: var(--radius-md); padding: var(--space-lg);
                        font-size: 1.05rem; color: var(--text-primary); background: var(--bg-canvas); resize: none; line-height: 1.7;
                        transition: border-color 0.2s; height: 100%; /* FORCE 100% HEIGHT */
                    }
                    .im-textarea-v4:focus { outline: none; border-color: rgba(241, 90, 41, 0.55); box-shadow: 0 0 0 4px rgba(241, 90, 41, 0.08); }
                    
                    .im-paste-inbox-btn {
                        position: absolute; bottom: var(--space-md); right: var(--space-md);
                        background: var(--brand-accent); color: white; border: none; border-radius: var(--radius-sm);
                        padding: var(--space-sm) var(--space-lg); font-weight: 800; font-size: 0.9rem; cursor: pointer;
                        box-shadow: 0 6px 16px rgba(241, 90, 41, 0.4); transition: all 0.2s;
                        white-space: nowrap; z-index: 10;
                    }
                    .im-paste-inbox-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 8px 20px rgba(241, 90, 41, 0.5); }
                    
                    .im-field-hint { margin-top: var(--space-sm); font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; flex-shrink: 0; }

                    .im-footer-v5 {
                        padding: var(--space-sm) var(--space-lg); border-top: 1px solid var(--border-default);
                        display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface);
                        min-height: 64px; flex-shrink: 0;
                    }
                    .im-footer-left { display: flex; align-items: center; }
                    .im-footer-right { display: flex; gap: var(--space-sm); flex-shrink: 0; }
                    
                    .im-external-ai-group { display: flex; gap: var(--space-sm); }
                    .im-footer-link-btn {
                        background: var(--bg-canvas); border: 1px solid var(--border-default); color: var(--text-secondary); 
                        font-weight: 700; font-size: 0.8rem; cursor: pointer;
                        padding: 6px var(--space-sm); border-radius: var(--radius-sm); transition: all 0.2s;
                        white-space: nowrap; display: flex; align-items: center; gap: 6px;
                    }
                    .im-footer-link-btn:hover { color: var(--brand-accent); border-color: rgba(241, 90, 41, 0.55); background: rgba(241, 90, 41, 0.08); }
                    .im-footer-link-btn.success { color: var(--good); border-color: var(--good); background: var(--good-bg); }

                    .im-btn-v5 {
                        height: 40px; padding: 0 var(--space-lg) !important; font-size: 0.95rem !important; border-radius: var(--radius-sm) !important; 
                        font-weight: 800 !important; cursor: pointer; transition: all 0.2s var(--spring-bounce); white-space: nowrap;
                    }
                    .im-btn-v5:active {
                        transform: scale(0.96);
                    }
                    .btn-primary.im-btn-v5 {
                        background: var(--brand-primary);
                        border: none;
                        color: white;
                    }
                    .btn-secondary.im-btn-v5 { border: 2px solid var(--border-default); background: var(--bg-canvas); color: var(--text-primary); }

                    .im-status-bar { padding: 4px 24px; display: flex; gap: 12px; position: absolute; bottom: 68px; width: 100%; pointer-events: none; z-index: 100; }
                    .im-success-v4 { font-size: 0.82rem; font-weight: 700; color: var(--good); background: var(--good-bg); padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    .im-error-v4 { font-size: 0.82rem; font-weight: 700; color: var(--again); background: var(--again-bg); padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

                    .im-code-editor { font-family: 'JetBrains Mono', monospace; background: #1a1a1a; color: #e0e0e0; }

                    @media (max-width: 600px) {
                        .im-header {
                            padding: var(--space-sm) var(--space-md) 0;
                        }
                        .im-tabs-horizontal {
                            width: 100%;
                        }
                        .im-tab-h {
                            padding: var(--space-sm) var(--space-md);
                            font-size: 0.8rem;
                        }
                        .im-footer-v5 {
                            flex-direction: column;
                            gap: var(--space-sm);
                            padding: var(--space-md);
                            height: auto;
                        }
                        .im-footer-left, .im-footer-right {
                            width: 100%;
                            justify-content: center;
                        }
                        .im-external-ai-group {
                            flex-direction: column;
                            width: 100%;
                        }
                        .im-footer-link-btn {
                            width: 100%;
                            justify-content: center;
                        }
                        .im-btn-v5 {
                            flex: 1;
                        }
                        .im-textarea-v4 {
                            font-size: 0.95rem;
                            padding: var(--space-md);
                        }
                    }

                `}</style>
            </div>
        </div>
    )
}
