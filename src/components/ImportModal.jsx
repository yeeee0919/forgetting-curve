import { useState, useRef, useEffect } from 'react'
import { generateId } from '../services/storage'
import { initCard } from '../services/srs'
import { EXTERNAL_JSON_PROMPT } from '../services/cardPrompt'
import { parseCardsJson, countCardsInJson } from '../services/jsonImport'
import { parseSimpleCards } from '../services/simpleImport'
import { toCardContent } from '../services/cardFields'
import Icon from './Icons'

export default function ImportModal({ onImport, onClose, importing, error, loggedIn, quota, onLogin, onImportDirect, inboxWords: inboxFromApp, onInboxDirectAdd, onClearInbox }) {
    const [tab, setTab] = useState('ai')
    const [text, setText] = useState('')
    const [jsonText, setJsonText] = useState('')
    const [result, setResult] = useState(null)
    const [jsonError, setJsonError] = useState('')
    const [copiedTarget, setCopiedTarget] = useState(null)
    const inboxWords = inboxFromApp || []

    const handlePasteInbox = () => {
        if (inboxWords.length === 0) return
        const wordsString = inboxWords.map(w => w.word).join('\n')
        setText(prev => (prev ? prev + '\n' + wordsString : wordsString))
    }

    const handleAiSubmit = async () => {
        try {
            setResult(null)
            const inboxText = inboxWords.map(w => w.word).join('\n')
            const isInboxImport = inboxWords.length > 0 && text.trim() === inboxText.trim()
            const res = await onImport(text, 'openai', isInboxImport ? onClearInbox : null)
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
            let arr = parseCardsJson(jsonText)
            if (!arr.length) arr = parseSimpleCards(jsonText)
            if (!arr.length) throw new Error('找不到 JSON 字卡，也不是「原文 / 譯文」列表')
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
            setJsonError('格式錯誤：' + e.message)
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
                                {loggedIn
                                    ? `💡 貼上任意文字，AI 會拆成字卡。額度 ${quota?.used ?? 0}/${quota?.limit ?? 50}。用完請改「手動」頁，每行「原文 / 譯文」。`
                                    : '💡 尚未登入：請每行「原文 / 譯文」，或先 Google 登入再用 AI。'}
                            </div>
                            {!loggedIn && (
                                <button type="button" className="im-paste-inbox-btn" onClick={onLogin} style={{ position: 'relative', marginTop: 8 }}>
                                    使用 Google 登入以啟用 AI
                                </button>
                            )}
                            {inboxWords.length > 0 && onInboxDirectAdd && (
                                <button type="button" className="im-paste-inbox-btn" onClick={onInboxDirectAdd} style={{ position: 'relative', marginTop: 8 }}>
                                    捕捉區 {inboxWords.length} 個字，不用 AI 直接加入牌組
                                </button>
                            )}
                        </div>
                    )}

                    {tab === 'manual' && (
                        <div className="im-manual-container">
                            <ManualGuide />
                            <textarea
                                className="im-textarea-v4 im-code-editor"
                                placeholder={'JSON 或每行：huis / 房子'}
                                value={jsonText}
                                onChange={e => setJsonText(e.target.value)}
                            />
                            {detectedCount > 0 && (
                                <div className="im-field-hint" style={{ color: 'var(--good)', flexShrink: 0 }}>
                                    辨識到 {detectedCount} 張卡
                                </div>
                            )}
                            {jsonError && <div className="im-error-v4" style={{ flexShrink: 0 }}>{jsonError}</div>}
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
                {(error || result || jsonError) && (
                    <div className="im-status-bar">
                        {jsonError && <div className="im-error-v4">{jsonError}</div>}
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
                    
                    .im-ai-container, .im-manual-container { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }
                    .im-manual-container { gap: 12px; }
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

                    .im-manual-guide {
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) minmax(260px, 1.15fr);
                        gap: 12px 20px;
                        align-items: stretch;
                        flex-shrink: 0;
                    }
                    .im-manual-copy {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        gap: 10px;
                        min-width: 0;
                    }
                    .im-manual-lead {
                        margin: 0;
                        font-size: 0.92rem;
                        font-weight: 700;
                        color: var(--brand-ink);
                        line-height: 1.45;
                    }
                    .im-manual-container .im-textarea-v4 {
                        min-height: 240px;
                    }

                    .im-flow-demo { min-width: 0; }
                    .im-flow-window {
                        width: 100%;
                        aspect-ratio: 16 / 9;
                        max-height: 196px;
                        border: 1px solid var(--border-default);
                        border-radius: 12px;
                        overflow: hidden;
                        background: #fff;
                        box-shadow: var(--elevation-1);
                        display: flex;
                        flex-direction: column;
                    }
                    .im-browser-bar {
                        flex-shrink: 0;
                        height: 34px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 0 12px;
                        background: #F3F5F7;
                        border-bottom: 1px solid var(--border-subtle);
                    }
                    .im-browser-dots {
                        width: 42px; height: 10px; flex-shrink: 0; border-radius: 99px;
                        background: linear-gradient(90deg, #ff5f57 0 10px, #febc2e 16px 26px, #28c840 32px 42px);
                        background-repeat: no-repeat;
                    }
                    .im-browser-omni {
                        position: relative;
                        flex: 1;
                        height: 22px;
                        border-radius: 99px;
                        background: #fff;
                        border: 1px solid var(--border-subtle);
                        overflow: hidden;
                    }
                    .im-url {
                        position: absolute; inset: 0;
                        display: flex; align-items: center;
                        padding: 0 10px;
                        font-size: 0.72rem; font-weight: 600; color: var(--text-primary);
                        opacity: 0;
                    }
                    .im-flow-demo[data-step="0"] .im-url.app,
                    .im-flow-demo[data-step="5"] .im-url.app { opacity: 1; }
                    .im-flow-demo[data-step="1"] .im-url.gpt,
                    .im-flow-demo[data-step="2"] .im-url.gpt,
                    .im-flow-demo[data-step="3"] .im-url.gpt,
                    .im-flow-demo[data-step="4"] .im-url.gpt { opacity: 1; }
                    .im-browser-page { position: relative; flex: 1; min-height: 0; background: #F7F8FA; }
                    .im-view {
                        position: absolute; inset: 0;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.35s ease;
                    }
                    .im-view.chat { display: flex; flex-direction: column; }
                    .im-view.app { padding: 10px 12px; }
                    .im-flow-demo[data-step="0"] .im-view.click { opacity: 1; }
                    .im-flow-demo[data-step="1"] .im-view.chat,
                    .im-flow-demo[data-step="2"] .im-view.chat,
                    .im-flow-demo[data-step="3"] .im-view.chat,
                    .im-flow-demo[data-step="4"] .im-view.chat { opacity: 1; }
                    .im-flow-demo[data-step="5"] .im-view.app { opacity: 1; }

                    .im-click-scene {
                        height: 100%;
                        padding: 12px 14px 16px;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end;
                        gap: 10px;
                        background: linear-gradient(180deg, #F7F8FA 0%, #fff 55%);
                    }
                    .im-click-label {
                        margin: 0;
                        font-size: 0.72rem;
                        font-weight: 700;
                        color: var(--text-tertiary);
                    }
                    .im-click-btns {
                        position: relative;
                        display: flex;
                        gap: 8px;
                        flex-wrap: wrap;
                    }
                    .im-click-target {
                        position: relative;
                    }
                    .im-flow-chip {
                        font-size: 0.72rem; font-weight: 800; border-radius: 8px; padding: 8px 10px;
                        display: inline-flex; align-items: center; gap: 4px;
                    }
                    .im-flow-chip.gpt {
                        background: var(--brand-accent); color: #fff;
                        box-shadow: 0 4px 12px rgba(241, 90, 41, 0.28);
                    }
                    .im-flow-chip.gem { background: #fff; color: var(--brand-accent); border: 1px solid var(--brand-accent); }
                    .im-flow-demo[data-step="0"] .im-click-target {
                        animation: imClickBtn 1.8s ease-in-out infinite;
                    }
                    @keyframes imClickBtn {
                        0%, 38% { transform: scale(1); box-shadow: 0 4px 12px rgba(241, 90, 41, 0.28); }
                        48% { transform: scale(0.94); box-shadow: 0 1px 0 rgba(241, 90, 41, 0.2); }
                        58%, 100% { transform: scale(1.03); box-shadow: 0 0 0 5px rgba(241, 90, 41, 0.22); }
                    }
                    .im-flow-cursor {
                        position: absolute;
                        right: 18px;
                        bottom: -4px;
                        width: 14px;
                        height: 14px;
                        background: var(--brand-ink);
                        clip-path: polygon(0 0, 100% 70%, 45% 70%, 60% 100%, 40% 100%, 28% 70%, 0 78%);
                        opacity: 0;
                        z-index: 2;
                        filter: drop-shadow(0 1px 1px rgba(255,255,255,0.8));
                    }
                    .im-flow-demo[data-step="0"] .im-flow-cursor {
                        opacity: 1;
                        animation: imClickCursor 1.8s ease-in-out infinite;
                    }
                    @keyframes imClickCursor {
                        0%, 18% { transform: translate(22px, -18px); }
                        42% { transform: translate(0, 0); }
                        50% { transform: translate(0, 3px) scale(0.9); }
                        60%, 100% { transform: translate(0, 0); }
                    }

                    .im-mini-modal {
                        height: 100%;
                        background: #fff;
                        border-radius: 10px;
                        border: 1px solid var(--border-subtle);
                        padding: 8px 10px;
                        display: flex; flex-direction: column; gap: 8px;
                    }
                    .im-mini-title { font-size: 0.72rem; font-weight: 800; color: var(--brand-ink); }
                    .im-mini-box {
                        position: relative; flex: 1; min-height: 0;
                        border-radius: 8px; background: #1a1a1a; color: #9aa4ad;
                        padding: 8px 10px; font-size: 0.72rem; overflow: hidden;
                    }
                    .im-flow-placeholder { opacity: 0.7; }
                    .im-flow-pasted {
                        position: absolute; inset: 8px 10px; margin: 0;
                        font-family: ui-monospace, Menlo, monospace;
                        font-size: 0.68rem; color: #d7e0e6; white-space: pre-wrap; line-height: 1.4;
                        opacity: 0;
                    }
                    .im-flow-demo[data-step="5"] .im-flow-placeholder { opacity: 0; }
                    .im-flow-demo[data-step="5"] .im-flow-pasted { opacity: 1; }
                    .im-flow-app-btns { display: flex; gap: 6px; }
                    .im-view.app .im-flow-chip { font-size: 0.66rem; padding: 5px 8px; }

                    .im-chat-thread {
                        flex: 1; min-height: 0; overflow: hidden;
                        padding: 10px 14px 8px;
                        display: flex; flex-direction: column; gap: 8px; justify-content: flex-end;
                    }
                    .im-bubble {
                        max-width: 78%;
                        font-size: 0.74rem; line-height: 1.45; font-weight: 500;
                        padding: 8px 10px; border-radius: 14px;
                        opacity: 0;
                        transform: translateY(6px);
                        transition: opacity 0.35s ease, transform 0.35s ease;
                    }
                    .im-bubble.user {
                        align-self: flex-end;
                        background: #E8EEF4; color: var(--brand-ink);
                    }
                    .im-bubble.bot {
                        align-self: flex-start;
                        background: #fff; color: var(--brand-ink);
                        border: 1px solid var(--border-subtle);
                        max-width: 86%;
                    }
                    .im-bubble.prompt {
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    .im-flow-demo[data-step="2"] .im-bubble.prompt,
                    .im-flow-demo[data-step="3"] .im-bubble.prompt,
                    .im-flow-demo[data-step="4"] .im-bubble.prompt {
                        display: block;
                        -webkit-line-clamp: unset;
                    }
                    .im-flow-demo[data-step="2"] .im-bubble.prompt,
                    .im-flow-demo[data-step="3"] .im-bubble.prompt,
                    .im-flow-demo[data-step="4"] .im-bubble.prompt { opacity: 1; transform: none; }
                    .im-flow-demo[data-step="1"] .im-bubble.prompt {
                        animation: imPromptPasteIn 5s ease-in-out infinite;
                    }
                    .im-prompt-slot {
                        display: none;
                        margin-top: 4px;
                        padding: 3px 6px;
                        border-radius: 6px;
                        background: rgba(241, 90, 41, 0.14);
                        color: var(--brand-accent);
                        font-weight: 700;
                    }
                    .im-prompt-words {
                        display: none;
                        margin-top: 4px;
                        padding: 3px 6px;
                        border-radius: 6px;
                        background: rgba(11, 143, 140, 0.12);
                        color: var(--good);
                        font-weight: 700;
                    }
                    .im-flow-demo[data-step="2"] .im-prompt-slot {
                        display: inline-block;
                        animation: imSlotPulse 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-prompt-words {
                        display: inline-block;
                        animation: imWordsIntoPrompt 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="3"] .im-prompt-words,
                    .im-flow-demo[data-step="4"] .im-prompt-words { display: inline-block; }
                    @keyframes imPromptPasteIn {
                        0%, 48% { opacity: 0; transform: translateY(6px); }
                        58%, 100% { opacity: 1; transform: none; }
                    }
                    @keyframes imSlotPulse {
                        0%, 18% { opacity: 1; }
                        28%, 100% { opacity: 0; }
                    }
                    @keyframes imWordsIntoPrompt {
                        0%, 26% { opacity: 0; }
                        34%, 100% { opacity: 1; }
                    }
                    .im-flow-demo[data-step="3"] .im-bubble.bot,
                    .im-flow-demo[data-step="4"] .im-bubble.bot { opacity: 1; transform: none; }
                    .im-typing {
                        display: inline-flex; gap: 4px; padding: 2px 2px;
                        opacity: 0;
                    }
                    .im-typing i {
                        width: 6px; height: 6px; border-radius: 50%; background: #8B9AAB;
                        animation: imDot 1s ease-in-out infinite;
                    }
                    .im-typing i:nth-child(2) { animation-delay: 0.15s; }
                    .im-typing i:nth-child(3) { animation-delay: 0.3s; }
                    @keyframes imDot { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
                    .im-json {
                        margin: 0; font-family: ui-monospace, Menlo, monospace;
                        font-size: 0.66rem; line-height: 1.4; color: #2A241C;
                        white-space: pre-wrap; opacity: 0;
                    }
                    .im-flow-demo[data-step="3"] .im-typing { opacity: 1; }
                    .im-flow-demo[data-step="3"] .im-json { opacity: 0; }
                    .im-flow-demo[data-step="4"] .im-typing { opacity: 0; }
                    .im-flow-demo[data-step="4"] .im-json { opacity: 1; }
                    .im-composer {
                        flex-shrink: 0;
                        margin: 0 10px 8px;
                        height: 34px;
                        border-radius: 18px;
                        background: #fff;
                        border: 1px solid var(--border-default);
                        display: flex; align-items: center;
                        padding: 0 8px 0 12px;
                        position: relative;
                    }
                    .im-composer-ph, .im-composer-prompt, .im-composer-type {
                        font-size: 0.7rem; white-space: nowrap; overflow: hidden;
                    }
                    .im-composer-ph { color: var(--text-secondary); opacity: 1; }
                    .im-composer-prompt,
                    .im-composer-type {
                        position: absolute; left: 12px; right: 36px;
                        color: var(--brand-ink); font-weight: 600;
                        opacity: 0;
                    }
                    .im-flow-demo[data-step="1"] .im-composer-ph { animation: imCompPhHide 5s ease-in-out infinite; }
                    .im-flow-demo[data-step="1"] .im-composer-prompt { animation: imPasteIntoComposer 5s ease-in-out infinite; }
                    .im-flow-demo[data-step="2"] .im-composer-ph { animation: imCompPhHide 5s ease-in-out infinite; }
                    .im-flow-demo[data-step="2"] .im-composer-type { animation: imPasteIntoComposer 5s ease-in-out infinite; }
                    @keyframes imCompPhHide {
                        0%, 10% { opacity: 1; }
                        16%, 52% { opacity: 0; }
                        60%, 100% { opacity: 1; }
                    }
                    @keyframes imPasteIntoComposer {
                        0%, 12% { opacity: 0; }
                        18%, 50% { opacity: 1; }
                        58%, 100% { opacity: 0; }
                    }
                    .im-send {
                        margin-left: auto; width: 22px; height: 22px; border-radius: 50%;
                        background: #0B1F33; color: #fff; font-size: 12px; font-weight: 800;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .im-paste-flag,
                    .im-words-flag,
                    .im-copied-flag {
                        position: absolute; right: 12px; top: 10px;
                        font-size: 0.7rem; font-weight: 800;
                        border-radius: 99px; padding: 3px 8px;
                        opacity: 0;
                    }
                    .im-paste-flag, .im-words-flag {
                        color: var(--brand-accent);
                        background: rgba(241, 90, 41, 0.12);
                    }
                    .im-copied-flag {
                        color: #0B6B4F;
                        background: #D8F3E8;
                    }
                    .im-flow-demo[data-step="1"] .im-paste-flag { animation: imFlagIn 5s ease-in-out infinite; }
                    .im-flow-demo[data-step="2"] .im-words-flag { animation: imFlagIn 5s ease-in-out infinite; }
                    .im-flow-demo[data-step="4"] .im-copied-flag { opacity: 1; }
                    @keyframes imFlagIn {
                        0%, 6% { opacity: 0; transform: translateY(-6px); }
                        12%, 40% { opacity: 1; transform: none; }
                        50%, 100% { opacity: 0; }
                    }
                    .im-flow-demo[data-paused="1"] .im-click-target,
                    .im-flow-demo[data-paused="1"] .im-flow-cursor,
                    .im-flow-demo[data-paused="1"] .im-bubble.prompt,
                    .im-flow-demo[data-paused="1"] .im-prompt-slot,
                    .im-flow-demo[data-paused="1"] .im-prompt-words,
                    .im-flow-demo[data-paused="1"] .im-composer-ph,
                    .im-flow-demo[data-paused="1"] .im-composer-prompt,
                    .im-flow-demo[data-paused="1"] .im-composer-type,
                    .im-flow-demo[data-paused="1"] .im-paste-flag,
                    .im-flow-demo[data-paused="1"] .im-words-flag {
                        animation-play-state: paused;
                    }

                    .im-flow-caps {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        list-style: none;
                        margin: 0;
                        padding: 0;
                    }
                    .im-flow-caps li {
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        align-items: flex-start;
                        gap: 8px;
                        margin: 0;
                        padding: 6px 8px;
                        border-radius: 10px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        color: var(--text-secondary);
                        line-height: 1.4;
                        opacity: 0.42;
                        background: transparent;
                        cursor: pointer;
                        border: none;
                        width: 100%;
                        text-align: left;
                        font-family: inherit;
                        z-index: 0;
                    }
                    .im-step-fill {
                        position: absolute;
                        inset: 0 auto 0 0;
                        width: var(--im-progress, 0%);
                        background: rgba(241, 90, 41, 0.16);
                        pointer-events: none;
                        z-index: 0;
                    }
                    .im-flow-caps li > :not(.im-step-fill) {
                        position: relative;
                        z-index: 1;
                    }
                    .im-flow-caps li:hover {
                        opacity: 0.75;
                    }
                    .im-flow-caps li.is-active {
                        opacity: 1;
                        color: var(--brand-ink);
                        background: rgba(241, 90, 41, 0.04);
                        box-shadow: inset 0 0 0 1px rgba(241, 90, 41, 0.22);
                        font-weight: 800;
                    }
                    .im-step-n {
                        flex-shrink: 0;
                        width: 20px;
                        height: 20px;
                        margin-top: 1px;
                        border-radius: 50%;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.68rem;
                        font-weight: 800;
                        background: var(--bg-tint);
                        color: var(--text-tertiary);
                    }
                    .im-flow-caps li.is-active .im-step-n {
                        background: var(--brand-accent);
                        color: #fff;
                    }

                    .im-flow-steps {
                        margin-top: 8px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                    }
                    .im-flow-dots {
                        display: flex;
                        gap: 6px;
                    }
                    .im-flow-dots i {
                        width: 7px;
                        height: 7px;
                        border-radius: 50%;
                        background: var(--border-default);
                    }
                    .im-flow-dots i.on {
                        background: var(--brand-accent);
                        transform: scale(1.25);
                    }
                    .im-flow-now {
                        margin: 0;
                        height: 1.2em;
                        width: 100%;
                        text-align: center;
                        font-size: 0.75rem;
                        font-weight: 800;
                        color: var(--brand-ink);
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .im-view, .im-bubble, .im-click-target, .im-flow-cursor { animation: none !important; transition: none !important; }
                        .im-flow-demo[data-step="0"] .im-click-target { transform: none; box-shadow: 0 0 0 5px rgba(241, 90, 41, 0.22); }
                        .im-flow-demo[data-step="0"] .im-flow-cursor { transform: none; }
                    }

                    @media (max-width: 720px) {
                        .im-manual-guide {
                            grid-template-columns: 1fr;
                        }
                        .im-flow-window {
                            max-height: 180px;
                        }
                    }

                    @media (max-width: 600px) {
                        .im-flow-window {
                            aspect-ratio: 16 / 9;
                            width: 100%;
                            max-height: 160px;
                            margin: 0;
                            border-radius: 12px;
                            border: 1px solid var(--border-default);
                            box-shadow: var(--elevation-1);
                        }
                        .im-browser-bar {
                            height: 28px;
                            background: #F3F5F7;
                            padding: 0 8px;
                        }
                        .im-browser-dots { display: none; }
                        .im-browser-omni { height: 18px; }
                        .im-url { font-size: 0.62rem; justify-content: center; }
                        .im-bubble { font-size: 0.68rem; padding: 7px 8px; }
                        .im-json { font-size: 0.58rem; }
                        .im-flow-caps {
                            gap: 6px;
                        }
                        .im-manual-container .im-textarea-v4 {
                            min-height: 180px;
                        }
                        .im-flow-caps li {
                            font-size: 0.86rem;
                        }
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

function ManualGuide() {
    const [step, setStep] = useState(0)
    const [progress, setProgress] = useState(0)
    const [paused, setPaused] = useState(false)
    const progressRef = useRef(0)
    progressRef.current = progress

    useEffect(() => {
        if (paused) return
        let raf
        const t0 = performance.now()
        const origin = progressRef.current / 100
        const tick = (now) => {
            const p = Math.min(1, origin + (now - t0) / STEP_MS)
            progressRef.current = p * 100
            setProgress(p * 100)
            if (p >= 1) {
                progressRef.current = 0
                setProgress(0)
                setStep(s => (s + 1) % FLOW_STEPS.length)
                return
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [paused, step])

    const hoverStep = (i) => {
        setPaused(true)
        if (i !== step) {
            progressRef.current = 0
            setProgress(0)
            setStep(i)
        }
    }

    return (
        <div className="im-manual-guide">
            <div className="im-manual-copy">
                <p className="im-manual-lead">用 ChatGPT / Gemini 整理成 JSON，再貼回這裡。</p>
                <ol
                    className="im-flow-caps"
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {FLOW_STEPS.map((s, i) => (
                        <li
                            key={s.n}
                            className={step === i ? 'is-active' : ''}
                            onMouseEnter={() => hoverStep(i)}
                            style={step === i ? { '--im-progress': `${progress}%` } : undefined}
                        >
                            <span className="im-step-fill" />
                            <span className="im-step-n">{s.n}</span>
                            {s.text}
                        </li>
                    ))}
                </ol>
            </div>
            <ExternalAiDemo step={step} paused={paused} />
        </div>
    )
}

const STEP_MS = 5000

const FLOW_STEPS = [
    { n: 1, label: '步驟 1 · 點擊複製提示並開啟', text: '點擊下方「複製提示並開啟 ChatGPT」' },
    { n: 2, label: '步驟 2 · 貼上提示詞', text: '把提示詞貼進 ChatGPT 對話' },
    { n: 3, label: '步驟 3 · 加上自己的單字', text: '在提示詞裡貼上要學的單字' },
    { n: 4, label: '步驟 4 · 等待 JSON', text: '等待 AI 輸出 JSON' },
    { n: 5, label: '步驟 5 · 複製結果', text: '複製整段結果' },
    { n: 6, label: '步驟 6 · 貼回這裡匯入', text: '回到這裡，貼上結果後匯入' },
]

function ExternalAiDemo({ step, paused }) {
    return (
        <div className="im-flow-demo" data-step={step} data-paused={paused ? '1' : '0'} aria-hidden="true">
            <div className="im-flow-window">
                <div className="im-browser-bar">
                    <span className="im-browser-dots" />
                    <div className="im-browser-omni">
                        <span className="im-url app">toocheep.app/import</span>
                        <span className="im-url gpt">chatgpt.com</span>
                    </div>
                </div>
                <div className="im-browser-page">
                    <div className="im-view click">
                        <div className="im-click-scene">
                            <p className="im-click-label">匯入單字 · 手動 / JSON</p>
                            <div className="im-click-btns">
                                <span className="im-flow-chip gpt im-click-target">
                                    複製提示並開啟 ChatGPT ↗
                                    <span className="im-flow-cursor" />
                                </span>
                                <span className="im-flow-chip gem">複製提示並開啟 Gemini ↗</span>
                            </div>
                        </div>
                    </div>

                    <div className="im-view app">
                        <div className="im-mini-modal">
                            <div className="im-mini-title">匯入單字 · 手動 / JSON</div>
                            <div className="im-mini-box">
                                <span className="im-flow-placeholder">貼上 ChatGPT / Gemini 的整段回覆</span>
                                <pre className="im-flow-pasted">{`[
  { "front": "kinderen", "lemma": "kind" },
  { "front": "huiswerk", "lemma": "huiswerk" }
]`}</pre>
                            </div>
                            <div className="im-flow-app-btns">
                                <span className="im-flow-chip gpt">複製提示並開啟 ChatGPT ↗</span>
                                <span className="im-flow-chip gem">Gemini ↗</span>
                            </div>
                        </div>
                    </div>

                    <div className="im-view chat">
                        <div className="im-chat-thread">
                            <div className="im-bubble user prompt">
                                你是荷蘭語教授。請把單字整理成純 JSON 陣列，含 front、lemma、forms、例句…
                                <span className="im-prompt-slot">（←在這裡貼上你的單字）</span>
                                <span className="im-prompt-words">kinderen / huiswerk / opbellen</span>
                            </div>
                            <div className="im-bubble bot">
                                <span className="im-typing"><i /><i /><i /></span>
                                <pre className="im-json">{`[{ "front": "kinderen", "lemma": "kind", "back": "孩子們" }]`}</pre>
                            </div>
                        </div>
                        <div className="im-composer">
                            <span className="im-composer-ph">詢問任何問題</span>
                            <span className="im-composer-prompt">你是荷蘭語教授。請把單字整理成純 JSON…</span>
                            <span className="im-composer-type">kinderen / huiswerk / opbellen</span>
                            <span className="im-send">↑</span>
                        </div>
                        <span className="im-paste-flag">⌘V 貼上提示詞</span>
                        <span className="im-words-flag">貼上單字</span>
                        <span className="im-copied-flag">已複製結果</span>
                    </div>
                </div>
            </div>
            <div className="im-flow-steps">
                <div className="im-flow-dots">
                    {FLOW_STEPS.map((s, i) => (
                        <i key={s.n} className={step === i ? 'on' : ''} />
                    ))}
                </div>
                <p className="im-flow-now">{FLOW_STEPS[step].label}</p>
            </div>
        </div>
    )
}
