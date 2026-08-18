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
                            <ExternalAiDemo />
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
                                <button className={`im-footer-link-btn chatgpt ${copiedTarget === 'chatgpt' ? 'success' : ''}`} onClick={openChatGPT}>
                                    {copiedTarget === 'chatgpt' ? <><Icon name="check" size={16} /> 已複製提示詞</> : <>複製提示並開啟 ChatGPT <Icon name="arrowUpRight" size={16} /></>}
                                </button>
                                <button className={`im-footer-link-btn gemini ${copiedTarget === 'gemini' ? 'success' : ''}`} onClick={openGemini}>
                                    {copiedTarget === 'gemini' ? <><Icon name="check" size={16} /> 已複製提示詞</> : <>複製提示並開啟 Gemini <Icon name="arrowUpRight" size={16} /></>}
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
                        height: 700px;
                        max-height: 92vh;
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
                        background: var(--brand-accent);
                        border: 2px solid var(--brand-accent);
                        color: #fff;
                        font-weight: 800;
                        font-size: 0.82rem;
                        cursor: pointer;
                        height: 40px;
                        padding: 0 12px;
                        border-radius: var(--radius-btn);
                        transition: all 0.2s;
                        white-space: nowrap;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        box-shadow: 0 4px 12px rgba(241, 90, 41, 0.28);
                    }
                    .im-footer-link-btn.gemini {
                        background: #fff;
                        color: var(--brand-accent);
                        box-shadow: none;
                    }
                    .im-footer-link-btn:hover {
                        filter: brightness(1.06);
                        transform: translateY(-1px);
                    }
                    .im-footer-link-btn.gemini:hover {
                        background: var(--brand-accent-soft);
                        filter: none;
                    }
                    .im-footer-link-btn.success {
                        color: #fff !important;
                        border-color: var(--good) !important;
                        background: var(--good) !important;
                        box-shadow: none;
                    }

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

                    .im-flow-demo { flex-shrink: 0; margin-bottom: 10px; }
                    .im-flow-stage {
                        position: relative;
                        height: 148px;
                        border: 1px solid var(--border-subtle);
                        border-radius: 12px;
                        overflow: hidden;
                        background: var(--bg-tint);
                    }
                    .im-flow-frame {
                        position: absolute;
                        inset: 0;
                        padding: 10px 12px;
                        opacity: 0;
                        pointer-events: none;
                    }
                    .im-flow-frame.app { animation: imFlowApp 12s ease-in-out infinite; }
                    .im-flow-frame.gpt { animation: imFlowGpt 12s ease-in-out infinite; }
                    @keyframes imFlowApp {
                        0%, 14% { opacity: 1; }
                        18%, 74% { opacity: 0; }
                        78%, 92% { opacity: 1; }
                        96%, 100% { opacity: 0; }
                    }
                    @keyframes imFlowGpt {
                        0%, 15% { opacity: 0; }
                        19%, 73% { opacity: 1; }
                        77%, 100% { opacity: 0; }
                    }
                    .im-flow-app-top {
                        font-size: 0.68rem; font-weight: 800; color: var(--brand-accent); margin-bottom: 6px;
                    }
                    .im-flow-app-box {
                        position: relative;
                        height: 72px;
                        border-radius: 8px;
                        background: #1a1a1a;
                        color: #9aa4ad;
                        padding: 8px 10px;
                        font-size: 0.72rem;
                        overflow: hidden;
                    }
                    .im-flow-placeholder { animation: imFlowPlaceholder 12s ease-in-out infinite; }
                    .im-flow-pasted {
                        position: absolute; inset: 8px 10px; margin: 0;
                        font-family: ui-monospace, Menlo, monospace;
                        font-size: 0.7rem; color: #d7e0e6; white-space: pre-wrap;
                        opacity: 0; animation: imFlowPasted 12s ease-in-out infinite;
                    }
                    @keyframes imFlowPlaceholder {
                        0%, 76% { opacity: 0.7; }
                        80%, 92% { opacity: 0; }
                        96%, 100% { opacity: 0.7; }
                    }
                    @keyframes imFlowPasted {
                        0%, 77% { opacity: 0; }
                        82%, 92% { opacity: 1; }
                        96%, 100% { opacity: 0; }
                    }
                    .im-flow-app-btns { display: flex; gap: 6px; margin-top: 8px; }
                    .im-flow-chip {
                        font-size: 0.68rem; font-weight: 800; border-radius: 6px; padding: 4px 8px;
                    }
                    .im-flow-chip.gpt {
                        background: var(--brand-accent); color: #fff;
                        animation: imFlowGptPulse 12s ease-in-out infinite;
                    }
                    .im-flow-chip.gem { background: #fff; color: var(--brand-accent); border: 1px solid var(--brand-accent); }
                    @keyframes imFlowGptPulse {
                        0%, 4% { transform: scale(1); box-shadow: none; }
                        8%, 12% { transform: scale(1.06); box-shadow: 0 0 0 4px rgba(241, 90, 41, 0.25); }
                        16%, 100% { transform: scale(1); box-shadow: none; }
                    }
                    .im-flow-cursor {
                        position: absolute; left: 28px; top: 118px; width: 10px; height: 10px;
                        background: var(--brand-ink);
                        clip-path: polygon(0 0, 100% 70%, 45% 70%, 60% 100%, 40% 100%, 28% 70%, 0 78%);
                        animation: imFlowCursor 12s ease-in-out infinite;
                    }
                    @keyframes imFlowCursor {
                        0% { opacity: 0; transform: translate(40px, -24px); }
                        4%, 12% { opacity: 1; transform: translate(0, 0); }
                        16%, 100% { opacity: 0; }
                    }
                    .im-flow-gpt-bar { font-size: 0.68rem; font-weight: 800; color: var(--brand-ink); margin-bottom: 6px; }
                    .im-flow-gpt-prompt {
                        position: relative;
                        font-size: 0.72rem; color: var(--text-secondary); background: #fff;
                        border-radius: 8px; padding: 8px 10px 8px 10px; margin-bottom: 6px;
                        animation: imFlowFadeIn 12s ease-in-out infinite;
                    }
                    .im-flow-auto {
                        display: inline-block; margin-right: 6px;
                        font-size: 0.62rem; font-weight: 800; color: var(--good);
                        background: var(--good-bg); border-radius: 99px; padding: 1px 6px;
                    }
                    .im-flow-gpt-words {
                        font-family: var(--font-word, Georgia, serif);
                        font-size: 0.78rem; font-weight: 700; color: var(--brand-ink);
                        min-height: 18px;
                        animation: imFlowWords 12s ease-in-out infinite;
                    }
                    .im-flow-gpt-out {
                        position: relative; margin-top: 4px;
                        background: #1a1a1a; border-radius: 8px; padding: 6px 8px; min-height: 36px;
                    }
                    .im-flow-gpt-out pre {
                        margin: 0; font-family: ui-monospace, Menlo, monospace;
                        font-size: 0.66rem; color: #d7e0e6; opacity: 0;
                        animation: imFlowOut 12s ease-in-out infinite;
                    }
                    .im-flow-wait {
                        position: absolute; left: 8px; top: 8px;
                        font-size: 0.68rem; font-weight: 700; color: #9aa4ad;
                        animation: imFlowWait 12s ease-in-out infinite;
                    }
                    .im-flow-copied {
                        position: absolute; right: 12px; bottom: 8px;
                        font-size: 0.68rem; font-weight: 800; color: var(--good);
                        background: var(--good-bg); border-radius: 99px; padding: 2px 8px;
                        opacity: 0; animation: imFlowCopied 12s ease-in-out infinite;
                    }
                    @keyframes imFlowWords {
                        0%, 28% { opacity: 0; }
                        32%, 73% { opacity: 1; }
                        77%, 100% { opacity: 0; }
                    }
                    @keyframes imFlowWait {
                        0%, 42% { opacity: 0; }
                        46%, 56% { opacity: 1; }
                        62%, 100% { opacity: 0; }
                    }
                    @keyframes imFlowOut {
                        0%, 54% { opacity: 0; }
                        60%, 73% { opacity: 1; }
                        77%, 100% { opacity: 0; }
                    }
                    @keyframes imFlowCopied {
                        0%, 62% { opacity: 0; transform: translateY(4px); }
                        66%, 73% { opacity: 1; transform: translateY(0); }
                        77%, 100% { opacity: 0; }
                    }
                    @keyframes imFlowFadeIn {
                        0%, 18% { opacity: 0; }
                        22%, 73% { opacity: 1; }
                        77%, 100% { opacity: 0; }
                    }
                    .im-flow-caps {
                        display: flex; flex-wrap: wrap; gap: 4px 8px;
                        list-style: none; margin: 8px 0 0; padding: 0;
                    }
                    .im-flow-caps li {
                        font-size: 0.68rem; font-weight: 700; color: var(--text-tertiary);
                        padding: 2px 0;
                    }
                    .im-flow-caps li::before { font-weight: 800; margin-right: 4px; }
                    .im-flow-caps li:nth-child(1)::before { content: '1.'; }
                    .im-flow-caps li:nth-child(2)::before { content: '2.'; }
                    .im-flow-caps li:nth-child(3)::before { content: '3.'; }
                    .im-flow-caps li:nth-child(4)::before { content: '4.'; }
                    .im-flow-caps li:nth-child(5)::before { content: '5.'; }
                    .im-flow-caps li:nth-child(6)::before { content: '6.'; }
                    .im-flow-caps li:nth-child(1) { animation: imCap1 12s ease-in-out infinite; }
                    .im-flow-caps li:nth-child(2) { animation: imCap2 12s ease-in-out infinite; }
                    .im-flow-caps li:nth-child(3) { animation: imCap3 12s ease-in-out infinite; }
                    .im-flow-caps li:nth-child(4) { animation: imCap4 12s ease-in-out infinite; }
                    .im-flow-caps li:nth-child(5) { animation: imCap5 12s ease-in-out infinite; }
                    .im-flow-caps li:nth-child(6) { animation: imCap6 12s ease-in-out infinite; }
                    @keyframes imCap1 { 0%, 14% { color: var(--brand-accent); } 18%, 100% { color: var(--text-tertiary); } }
                    @keyframes imCap2 { 0%, 16% { color: var(--text-tertiary); } 19%, 28% { color: var(--brand-accent); } 32%, 100% { color: var(--text-tertiary); } }
                    @keyframes imCap3 { 0%, 30% { color: var(--text-tertiary); } 32%, 42% { color: var(--brand-accent); } 46%, 100% { color: var(--text-tertiary); } }
                    @keyframes imCap4 { 0%, 44% { color: var(--text-tertiary); } 46%, 62% { color: var(--brand-accent); } 66%, 100% { color: var(--text-tertiary); } }
                    @keyframes imCap5 { 0%, 64% { color: var(--text-tertiary); } 66%, 74% { color: var(--brand-accent); } 78%, 100% { color: var(--text-tertiary); } }
                    @keyframes imCap6 { 0%, 76% { color: var(--text-tertiary); } 78%, 92% { color: var(--brand-accent); } 96%, 100% { color: var(--text-tertiary); } }

                    @media (prefers-reduced-motion: reduce) {
                        .im-flow-frame, .im-flow-placeholder, .im-flow-pasted, .im-flow-chip.gpt,
                        .im-flow-cursor, .im-flow-gpt-prompt, .im-flow-gpt-words, .im-flow-gpt-out pre,
                        .im-flow-wait, .im-flow-copied, .im-flow-caps li { animation: none !important; }
                        .im-flow-frame.app, .im-flow-pasted, .im-flow-gpt-out pre { opacity: 1; }
                        .im-flow-frame.gpt, .im-flow-cursor, .im-flow-wait { opacity: 0; }
                        .im-flow-caps li:nth-child(6) { color: var(--brand-accent); }
                    }

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

function ExternalAiDemo() {
    return (
        <div className="im-flow-demo" aria-hidden="true">
            <div className="im-flow-stage">
                <div className="im-flow-frame app">
                    <div className="im-flow-app-top">手動 / JSON</div>
                    <div className="im-flow-app-box">
                        <span className="im-flow-placeholder">貼上 ChatGPT / Gemini 的整段回覆</span>
                        <pre className="im-flow-pasted">{`[{ "front": "kinderen", "lemma": "kind" }]`}</pre>
                    </div>
                    <div className="im-flow-app-btns">
                        <span className="im-flow-chip gpt">ChatGPT ↗</span>
                        <span className="im-flow-chip gem">Gemini ↗</span>
                    </div>
                    <span className="im-flow-cursor" />
                </div>

                <div className="im-flow-frame gpt">
                    <div className="im-flow-gpt-bar">ChatGPT</div>
                    <div className="im-flow-gpt-prompt">
                        <span className="im-flow-auto">已自動帶入提示詞</span>
                        你是荷蘭語教授…請輸出 JSON。
                    </div>
                    <div className="im-flow-gpt-words">kinderen · huiswerk · opbellen</div>
                    <div className="im-flow-gpt-out">
                        <span className="im-flow-wait">輸出中…</span>
                        <pre>{`[{ "front": "kinderen", "lemma": "kind" }]`}</pre>
                    </div>
                    <span className="im-flow-copied">已複製結果</span>
                </div>
            </div>
            <ol className="im-flow-caps">
                <li>點擊下方按鈕到外部 AI</li>
                <li>貼上提示詞（ChatGPT 會自動帶入）</li>
                <li>貼上單字</li>
                <li>等待 AI 輸出</li>
                <li>複製結果</li>
                <li>貼上結果</li>
            </ol>
        </div>
    )
}
