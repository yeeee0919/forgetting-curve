import { useState, useRef, useEffect, useMemo } from 'react'
import { generateId } from '../services/storage'
import { initCard } from '../services/srs'
import { EXTERNAL_JSON_PROMPT } from '../services/cardPrompt'
import { parseCardsJson, countCardsInJson } from '../services/jsonImport'
import { parseSimpleCards } from '../services/simpleImport'
import { validateAiWordList } from '../services/aiWordList'
import { toCardContent } from '../services/cardFields'
import { requestExtensionInboxFlush } from '../services/auth'
import Icon from './Icons'

export default function ImportModal({ onImport, onClose, importing, error, loggedIn, quota, onLogin, onImportDirect, onSuccessFeedback, initialText = '', inboxWords: inboxFromApp, onClearInbox, tourMode = false }) {
    const [tab, setTab] = useState('ai')
    const [text, setText] = useState(() => initialText || '')
    const [jsonText, setJsonText] = useState('')
    const [jsonError, setJsonError] = useState('')
    const [copiedTarget, setCopiedTarget] = useState(null)
    const [etaSeconds, setEtaSeconds] = useState(0)
    const [etaTotal, setEtaTotal] = useState(0)
    const inboxWords = inboxFromApp || []

    useEffect(() => {
        if (initialText) setText(initialText)
    }, [initialText])

    useEffect(() => {
        requestExtensionInboxFlush()
        const t = setTimeout(requestExtensionInboxFlush, 400)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
        if (!importing || tab !== 'ai') {
            setEtaSeconds(0)
            setEtaTotal(0)
            return
        }
        const total = estimateAiSeconds(text)
        setEtaTotal(total)
        setEtaSeconds(total)
        const id = setInterval(() => {
            setEtaSeconds(s => (s > 0 ? s - 1 : 0))
        }, 1000)
        return () => clearInterval(id)
    }, [importing, tab]) // eslint-disable-line react-hooks/exhaustive-deps -- freeze estimate at start

    const finishSuccess = (res) => {
        onSuccessFeedback?.(formatImportSuccess(res, quota))
        onClose()
    }

    const handlePasteInbox = () => {
        if (inboxWords.length === 0) return
        const wordsString = inboxWords.map(w => w.word).filter(Boolean).join('\n')
        setText(wordsString)
    }

    const inboxText = inboxWords.map(w => w.word).filter(Boolean).join('\n')
    const inboxAlreadyInField = !!inboxText && text.trim() === inboxText.trim()

    const handleAiSubmit = async () => {
        try {
            const remaining = Number(
                quota?.remaining ?? Math.max(0, Number(quota?.limit ?? 50) - Number(quota?.used ?? 0))
            )
            const check = validateAiWordList(text, { remainingQuota: remaining })
            if (!check.ok) return
            const inboxText = inboxWords.map(w => w.word).join('\n')
            const isInboxImport = inboxWords.length > 0 && text.trim() === inboxText.trim()
            const res = await onImport(text, 'openai', isInboxImport ? onClearInbox : null)
            if (res) finishSuccess(res)
        } catch (e) {
            console.error(e)
        }
    }

    const handleJsonSubmit = () => {
        setJsonError('')
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
            if (res) finishSuccess(res)
        } catch (e) {
            setJsonError('格式錯誤：' + e.message)
        }
    }

    const detectedCount = countCardsInJson(jsonText)
    const remainingQuota = Number(
        quota?.remaining ?? Math.max(0, Number(quota?.limit ?? 50) - Number(quota?.used ?? 0))
    )
    const listCheck = useMemo(() => {
        if (!text.trim()) {
            return { ok: false, reason: '', words: [], count: 0, maxAllowed: Math.min(40, remainingQuota) }
        }
        return validateAiWordList(text, { remainingQuota })
    }, [text, remainingQuota])
    const aiBlocked = tab === 'ai' && !!text.trim() && !listCheck.ok
    const etaProgress = etaTotal > 0
        ? Math.min(92, ((etaTotal - etaSeconds) / etaTotal) * 100)
        : 0

    const requestClose = () => {
        if (tourMode || importing) return
        onClose()
    }

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
        <div className="modal-overlay" onClick={tourMode ? undefined : requestClose}>
            <div className="modal im-modal-v5" data-tour="import-modal" onClick={e => e.stopPropagation()}>
                {/* Header with Dual Tabs - Compressed for space */}
                <div className="im-header">
                    <div className="im-header-main">
                        <h2 className="im-title">匯入單字{tourMode ? ' · 導覽示範' : ''}</h2>
                        <div className="im-tabs-horizontal">
                            <button className={`im-tab-h ${tab === 'ai' ? 'active' : ''}`} onClick={() => !importing && setTab('ai')} disabled={importing}>
                                AI 自動解析
                            </button>
                            <button className={`im-tab-h ${tab === 'manual' ? 'active' : ''}`} onClick={() => !importing && setTab('manual')} disabled={importing}>
                                手動 / JSON
                            </button>
                        </div>
                    </div>
                    <div className="im-header-actions">
                        <button className="im-close-v4" onClick={requestClose} disabled={importing || tourMode} aria-label="關閉">
                            <Icon name="x" size={16} />
                        </button>
                    </div>
                </div>

                {/* Content Body - Set to flex:1 to maximize textarea height */}
                <div className="im-body">
                    {tab === 'ai' && (
                        <div className="im-ai-container">
                            <div className="im-textarea-wrapper">
                                <textarea
                                    className="im-textarea-v4"
                                    placeholder={'每行一個單字，或：\nhuis / 房子\nhuis, fiets, water'}
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    disabled={importing || tourMode}
                                    readOnly={tourMode}
                                />
                                {importing && (
                                    <div className="im-loading-overlay" role="status" aria-live="polite">
                                        <div className="im-loading-card">
                                            <div className="im-loading-spinner" aria-hidden="true" />
                                            <p className="im-loading-title">AI 正在解析單字…</p>
                                            <p className="im-loading-eta">
                                                {etaSeconds > 0
                                                    ? `預估還需約 ${etaSeconds} 秒`
                                                    : '快好了，再等一下…'}
                                            </p>
                                            <div className="im-loading-bar" aria-hidden="true">
                                                <div className="im-loading-bar-fill" style={{ width: `${etaProgress}%` }} />
                                            </div>
                                            <p className="im-loading-hint">字越多越久，請勿關閉視窗</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!importing && (
                                <div className="im-catch-row">
                                    <button
                                        type="button"
                                        className="im-catch-paste-btn"
                                        onClick={handlePasteInbox}
                                        disabled={inboxWords.length === 0 || inboxAlreadyInField}
                                    >
                                        {inboxWords.length === 0
                                            ? '尚未收到 Catch 單字'
                                            : inboxAlreadyInField
                                                ? `已填入 Catch 的 ${inboxWords.length} 個單字`
                                                : `貼上 Catch 的 ${inboxWords.length} 個單字`}
                                    </button>
                                    {inboxWords.length === 0 && (
                                        <span className="im-catch-hint">用擴充功能選字後，回到此頁再按一次，或重新整理</span>
                                    )}
                                </div>
                            )}
                            <div className="im-field-hint">
                                {loggedIn
                                    ? `💡 只接受單字列表（一行一字、NL / 中文、逗號分隔）。一次最多 ${Math.min(40, remainingQuota)} 個。額度 ${quota?.used ?? 0}/${quota?.limit ?? 50}。文章請改「手動」頁。`
                                    : '💡 尚未登入：請每行「原文 / 譯文」，或先 Google 登入再用 AI。'}
                            </div>
                            {!aiBlocked && listCheck.ok && text.trim() && (
                                <div className="im-field-hint" style={{ color: 'var(--good)', marginTop: 4 }}>
                                    辨識到 {listCheck.count} 個單字，可匯入
                                </div>
                            )}
                            {!loggedIn && (
                                <button type="button" className="im-catch-paste-btn" onClick={onLogin} style={{ marginTop: 8 }}>
                                    使用 Google 登入以啟用 AI
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
                                disabled={tourMode}
                                readOnly={tourMode}
                            />
                            {detectedCount > 0 && (
                                <div className="im-field-hint" style={{ color: 'var(--good)', flexShrink: 0 }}>
                                    辨識到 {detectedCount} 張卡
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="im-status-bar" aria-live="polite">
                    {jsonError && <div className="im-error-v4">{jsonError}</div>}
                    {error && <div className="im-error-v4">{error}</div>}
                    {!error && aiBlocked && (
                        <div className="im-error-v4">{listCheck.reason}</div>
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
                        <button className="btn-secondary im-btn-v5" onClick={requestClose} disabled={importing || tourMode}>取消</button>
                        <button
                            className="btn-primary im-btn-v5"
                            onClick={tab === 'manual' ? handleJsonSubmit : handleAiSubmit}
                            disabled={
                                tourMode
                                || importing
                                || (tab === 'manual' ? !jsonText.trim() : !text.trim() || !listCheck.ok || !loggedIn)
                            }
                        >
                            {importing
                                ? (etaSeconds > 0 ? `解析中 ${etaSeconds}s` : '快好了…')
                                : '匯入'}
                        </button>
                    </div>
                </div>

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
                    .im-loading-overlay {
                        position: absolute;
                        inset: 0;
                        z-index: 20;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: var(--space-lg);
                        background: rgba(255, 255, 255, 0.82);
                        backdrop-filter: blur(4px);
                    }
                    .im-loading-card {
                        width: min(360px, 100%);
                        text-align: center;
                        padding: var(--space-lg) var(--space-xl);
                        border-radius: var(--radius-lg);
                        background: var(--bg-surface);
                        box-shadow: var(--elevation-2, 0 8px 24px rgba(0,0,0,0.08));
                        border: 1px solid var(--border-default);
                    }
                    .im-loading-spinner {
                        width: 36px;
                        height: 36px;
                        margin: 0 auto 14px;
                        border: 3px solid var(--border-default);
                        border-top-color: var(--brand-primary);
                        border-radius: 50%;
                        animation: imSpin 0.8s linear infinite;
                    }
                    @keyframes imSpin { to { transform: rotate(360deg); } }
                    .im-loading-title {
                        margin: 0 0 6px;
                        font-size: 1rem;
                        font-weight: 800;
                        color: var(--text-primary);
                    }
                    .im-loading-eta {
                        margin: 0 0 14px;
                        font-size: 0.92rem;
                        font-weight: 700;
                        color: var(--brand-primary);
                        font-variant-numeric: tabular-nums;
                    }
                    .im-loading-bar {
                        height: 6px;
                        border-radius: 999px;
                        background: var(--border-default);
                        overflow: hidden;
                        margin-bottom: 10px;
                    }
                    .im-loading-bar-fill {
                        height: 100%;
                        border-radius: inherit;
                        background: var(--brand-primary);
                        transition: width 0.9s linear;
                    }
                    .im-loading-hint {
                        margin: 0;
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: var(--text-secondary);
                    }
                    .im-close-v4:disabled,
                    .im-tab-h:disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                    }
                    .im-btn-v5:disabled {
                        opacity: 0.65;
                        cursor: not-allowed;
                    }
                    
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
                    .im-paste-inbox-btn:disabled {
                        opacity: 0.75;
                        cursor: default;
                        transform: none;
                        filter: none;
                        box-shadow: 0 4px 12px rgba(241, 90, 41, 0.25);
                    }
                    .im-catch-row {
                        flex-shrink: 0;
                        display: flex;
                        flex-wrap: wrap;
                        align-items: center;
                        gap: 8px 12px;
                        margin-top: var(--space-sm);
                    }
                    .im-catch-paste-btn {
                        background: var(--brand-accent);
                        color: #fff;
                        border: none;
                        border-radius: var(--radius-sm);
                        padding: 10px 14px;
                        font-weight: 800;
                        font-size: 0.88rem;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(241, 90, 41, 0.28);
                    }
                    .im-catch-paste-btn:hover:not(:disabled) {
                        filter: brightness(1.06);
                    }
                    .im-catch-paste-btn:disabled {
                        opacity: 0.55;
                        cursor: not-allowed;
                        box-shadow: none;
                    }
                    .im-catch-hint {
                        font-size: 0.75rem;
                        font-weight: 600;
                        color: var(--text-secondary);
                    }
                    
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

                    .im-status-bar {
                        flex-shrink: 0;
                        min-height: 36px;
                        margin: 0 var(--space-lg);
                        padding: 0 0 var(--space-sm);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .im-success-v4 { font-size: 0.82rem; font-weight: 700; color: var(--good); background: var(--good-bg); padding: 6px 12px; border-radius: 8px; }
                    .im-error-v4 { font-size: 0.82rem; font-weight: 700; color: var(--again); background: var(--again-bg); padding: 6px 12px; border-radius: 8px; }

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
                        max-height: 210px;
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
                        position: relative;
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
                    .im-flow-demo[data-step="5"] .im-flow-placeholder {
                        animation: imAppPhHide 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="5"] .im-flow-pasted {
                        animation: imAppPasteIn 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="5"] .im-mini-box {
                        animation: imAppBoxFill 5s ease-in-out infinite;
                    }
                    .im-app-paste-flag {
                        position: absolute;
                        right: 16px;
                        top: 36px;
                        font-size: 0.68rem;
                        font-weight: 800;
                        border-radius: 99px;
                        padding: 3px 8px;
                        color: var(--brand-accent);
                        background: rgba(241, 90, 41, 0.12);
                        opacity: 0;
                        z-index: 3;
                    }
                    .im-flow-demo[data-step="5"] .im-app-paste-flag {
                        animation: imFlagIn 5s ease-in-out infinite;
                    }
                    @keyframes imAppPhHide {
                        0%, 18% { opacity: 0.7; }
                        28%, 100% { opacity: 0; }
                    }
                    @keyframes imAppPasteIn {
                        0%, 22% {
                            opacity: 0;
                            clip-path: inset(0 0 100% 0);
                            transform: translateY(6px);
                        }
                        38%, 100% {
                            opacity: 1;
                            clip-path: inset(0 0 0 0);
                            transform: none;
                        }
                    }
                    @keyframes imAppBoxFill {
                        0%, 18% { box-shadow: inset 0 0 0 0 rgba(241, 90, 41, 0); }
                        28%, 100% { box-shadow: inset 0 0 0 1px rgba(241, 90, 41, 0.35); }
                    }
                    .im-flow-app-btns { display: flex; gap: 6px; }
                    .im-view.app .im-flow-chip { font-size: 0.66rem; padding: 5px 8px; }

                    .im-chat-thread {
                        flex: 1; min-height: 0; overflow: hidden;
                        padding: 8px 12px 6px;
                        display: flex; flex-direction: column; gap: 6px; justify-content: flex-end;
                    }
                    .im-bubble {
                        max-width: 82%;
                        font-size: 0.7rem; line-height: 1.4; font-weight: 500;
                        padding: 7px 9px; border-radius: 12px;
                        opacity: 0;
                        transform: translateY(6px);
                    }
                    .im-bubble.user {
                        align-self: flex-end;
                        background: #E8EEF4; color: var(--brand-ink);
                    }
                    .im-bubble.bot {
                        align-self: flex-start;
                        position: relative;
                        background: #fff; color: var(--brand-ink);
                        border: 1px solid var(--border-subtle);
                        max-width: 88%;
                        padding-bottom: 22px;
                    }
                    .im-bubble.prompt {
                        overflow: hidden;
                        max-height: 0;
                        padding-top: 0;
                        padding-bottom: 0;
                    }
                    .im-prompt-body { display: block; }
                    .im-prompt-slot {
                        display: block;
                        margin-top: 5px;
                        padding: 3px 6px;
                        border-radius: 6px;
                        background: rgba(241, 90, 41, 0.14);
                        color: var(--brand-accent);
                        font-weight: 700;
                        font-size: 0.66rem;
                    }
                    .im-prompt-words {
                        display: block;
                        margin-top: 5px;
                        padding: 3px 6px;
                        border-radius: 6px;
                        background: rgba(11, 143, 140, 0.12);
                        color: var(--good);
                        font-weight: 700;
                        white-space: pre-line;
                        font-size: 0.66rem;
                    }

                    .im-composer {
                        flex-shrink: 0;
                        margin: 0 10px 8px;
                        height: 32px;
                        border-radius: 16px;
                        background: #fff;
                        border: 1px solid var(--border-default);
                        display: flex; align-items: flex-end;
                        padding: 4px 8px 4px 10px;
                        position: relative;
                        overflow: hidden;
                    }
                    .im-composer-inner {
                        flex: 1;
                        min-width: 0;
                        min-height: 22px;
                        height: 100%;
                        position: relative;
                        display: flex;
                        align-items: stretch;
                    }
                    .im-composer-ph {
                        position: absolute;
                        left: 0; top: 50%;
                        transform: translateY(-50%);
                        font-size: 0.68rem;
                        color: var(--text-secondary);
                        opacity: 1;
                        z-index: 1;
                    }
                    .im-composer-scroll {
                        flex: 1;
                        min-height: 0;
                        overflow: hidden;
                        opacity: 0;
                        mask-image: linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%);
                    }
                    .im-composer-draft {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        font-size: 0.64rem;
                        line-height: 1.35;
                        font-weight: 600;
                        color: var(--brand-ink);
                        transform: translateY(0);
                    }
                    .im-draft-line { display: block; }
                    .im-draft-slot {
                        display: block;
                        margin-top: 2px;
                        padding: 2px 5px;
                        border-radius: 5px;
                        background: rgba(241, 90, 41, 0.14);
                        color: var(--brand-accent);
                        font-weight: 800;
                    }
                    .im-draft-words {
                        display: block;
                        margin-top: 2px;
                        padding: 2px 5px;
                        border-radius: 5px;
                        background: rgba(11, 143, 140, 0.12);
                        color: var(--good);
                        font-weight: 800;
                        white-space: pre-line;
                        max-height: 0;
                        opacity: 0;
                        overflow: hidden;
                    }
                    .im-send {
                        flex-shrink: 0;
                        margin-left: 6px; width: 22px; height: 22px; border-radius: 50%;
                        background: #0B1F33; color: #fff; font-size: 12px; font-weight: 800;
                        display: flex; align-items: center; justify-content: center;
                    }

                    /* Step 2: paste prompt into composer only — no send */
                    .im-flow-demo[data-step="1"] .im-composer {
                        animation: imComposerPasteOnly 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="1"] .im-composer-ph {
                        animation: imPhFadeOutStay 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="1"] .im-composer-scroll {
                        animation: imScrollShow 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="1"] .im-composer-draft {
                        transform: translateY(0);
                    }
                    .im-flow-demo[data-step="1"] .im-draft-words {
                        display: none;
                    }
                    .im-flow-demo[data-step="1"] .im-paste-flag {
                        animation: imFlagIn 5s ease-in-out infinite;
                    }
                    @keyframes imComposerPasteOnly {
                        0%, 10% { height: 32px; }
                        22%, 100% { height: 72px; }
                    }
                    @keyframes imPhFadeOutStay {
                        0%, 10% { opacity: 1; }
                        18%, 100% { opacity: 0; }
                    }
                    @keyframes imScrollShow {
                        0%, 12% { opacity: 0; }
                        20%, 100% { opacity: 1; }
                    }

                    /* Step 3: scroll to last line → paste words → send → bubble */
                    .im-flow-demo[data-step="2"] .im-composer {
                        animation: imComposerThenSend 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-composer-ph { opacity: 0; }
                    .im-flow-demo[data-step="2"] .im-composer-scroll {
                        opacity: 1;
                        animation: imScrollHideAfterSend 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-composer-draft {
                        animation: imDraftScrollToEnd 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-draft-slot {
                        animation: imSlotHighlight 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-draft-words {
                        animation: imDraftWordsIn 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-send {
                        animation: imSendPulse 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-words-flag {
                        animation: imFlagIn 5s ease-in-out infinite;
                    }
                    .im-flow-demo[data-step="2"] .im-bubble.prompt {
                        animation: imPromptBubbleAfterSend 5s ease-in-out infinite;
                    }
                    @keyframes imComposerThenSend {
                        0%, 72% { height: 72px; }
                        82%, 100% { height: 32px; }
                    }
                    @keyframes imScrollHideAfterSend {
                        0%, 74% { opacity: 1; }
                        82%, 100% { opacity: 0; }
                    }
                    @keyframes imDraftScrollToEnd {
                        0%, 12% { transform: translateY(0); }
                        28%, 100% { transform: translateY(-42px); }
                    }
                    @keyframes imSlotHighlight {
                        0%, 24% { box-shadow: none; }
                        30%, 48% { box-shadow: 0 0 0 2px rgba(241, 90, 41, 0.35); }
                        58%, 100% { box-shadow: none; opacity: 0.55; }
                    }
                    @keyframes imDraftWordsIn {
                        0%, 36% { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; }
                        48%, 100% { opacity: 1; max-height: 40px; padding: 2px 5px; }
                    }
                    @keyframes imSendPulse {
                        0%, 58% { transform: scale(1); box-shadow: none; }
                        64% { transform: scale(0.88); }
                        70%, 78% { transform: scale(1.08); box-shadow: 0 0 0 4px rgba(11, 31, 51, 0.18); }
                        86%, 100% { transform: scale(1); box-shadow: none; }
                    }
                    @keyframes imPromptBubbleAfterSend {
                        0%, 72% {
                            opacity: 0;
                            max-height: 0;
                            padding-top: 0;
                            padding-bottom: 0;
                            transform: translateY(8px);
                        }
                        82%, 100% {
                            opacity: 1;
                            max-height: 96px;
                            padding: 7px 9px;
                            transform: none;
                        }
                    }

                    /* Steps 4–5: waiting / answer — prompt already sent */
                    .im-flow-demo[data-step="3"] .im-bubble.prompt,
                    .im-flow-demo[data-step="4"] .im-bubble.prompt {
                        opacity: 1;
                        transform: none;
                        max-height: 96px;
                        padding: 7px 9px;
                    }
                    .im-flow-demo[data-step="3"] .im-composer-ph,
                    .im-flow-demo[data-step="4"] .im-composer-ph { opacity: 1; }
                    .im-flow-demo[data-step="3"] .im-bubble.bot,
                    .im-flow-demo[data-step="4"] .im-bubble.bot {
                        opacity: 1;
                        transform: none;
                    }
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
                        font-size: 0.64rem; line-height: 1.35; color: #2A241C;
                        white-space: pre-wrap; opacity: 0;
                    }
                    .im-flow-demo[data-step="3"] .im-typing { opacity: 1; }
                    .im-flow-demo[data-step="3"] .im-json { opacity: 0; }
                    .im-flow-demo[data-step="3"] .im-copy-btn { opacity: 0; }
                    .im-flow-demo[data-step="4"] .im-typing { opacity: 0; }
                    .im-flow-demo[data-step="4"] .im-json { opacity: 1; }

                    .im-copy-btn {
                        position: absolute;
                        right: 6px;
                        bottom: 4px;
                        width: 18px;
                        height: 18px;
                        border: none;
                        border-radius: 5px;
                        background: transparent;
                        color: #6B7A8A;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        padding: 0;
                    }
                    .im-flow-demo[data-step="4"] .im-copy-btn {
                        opacity: 1;
                        animation: imCopyClick 5s ease-in-out infinite;
                    }
                    .im-flow-cursor.copy-cursor {
                        position: absolute;
                        right: -2px;
                        bottom: -6px;
                        width: 12px;
                        height: 12px;
                        background: var(--brand-ink);
                        clip-path: polygon(0 0, 100% 70%, 45% 70%, 60% 100%, 40% 100%, 28% 70%, 0 78%);
                        opacity: 0;
                        z-index: 2;
                        filter: drop-shadow(0 1px 1px rgba(255,255,255,0.8));
                    }
                    .im-flow-demo[data-step="4"] .im-flow-cursor.copy-cursor {
                        opacity: 1;
                        animation: imCopyCursor 5s ease-in-out infinite;
                    }
                    @keyframes imCopyCursor {
                        0%, 20% { transform: translate(16px, -14px); opacity: 0; }
                        28% { opacity: 1; transform: translate(16px, -14px); }
                        42% { transform: translate(0, 0); }
                        50% { transform: translate(0, 2px) scale(0.88); }
                        58%, 100% { transform: translate(0, 0); opacity: 1; }
                    }
                    @keyframes imCopyClick {
                        0%, 46% { background: transparent; color: #6B7A8A; box-shadow: none; }
                        50%, 62% { background: rgba(11, 143, 140, 0.16); color: var(--good); box-shadow: 0 0 0 3px rgba(11, 143, 140, 0.2); }
                        72%, 100% { background: transparent; color: #6B7A8A; box-shadow: none; }
                    }

                    .im-paste-flag,
                    .im-words-flag,
                    .im-copied-flag {
                        position: absolute; right: 12px; top: 8px;
                        font-size: 0.68rem; font-weight: 800;
                        border-radius: 99px; padding: 3px 8px;
                        opacity: 0;
                        z-index: 2;
                    }
                    .im-paste-flag, .im-words-flag {
                        color: var(--brand-accent);
                        background: rgba(241, 90, 41, 0.12);
                    }
                    .im-copied-flag {
                        color: #0B6B4F;
                        background: #D8F3E8;
                    }
                    .im-flow-demo[data-step="4"] .im-copied-flag {
                        animation: imCopiedPop 5s ease-in-out infinite;
                    }
                    @keyframes imFlagIn {
                        0%, 6% { opacity: 0; transform: translateY(-6px); }
                        12%, 36% { opacity: 1; transform: none; }
                        48%, 100% { opacity: 0; }
                    }
                    @keyframes imCopiedPop {
                        0%, 52% { opacity: 0; transform: translateY(-6px); }
                        60%, 88% { opacity: 1; transform: none; }
                        100% { opacity: 0; }
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

function estimateAiSeconds(text) {
    const raw = (text || '').trim()
    if (!raw) return 18
    const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean).length
    const tokens = raw.split(/[\s,，、;；/|]+/).filter(Boolean).length
    const units = Math.max(lines, Math.ceil(tokens * 0.6))
    // 經驗值再 ×1.2，避免倒數比實際還快
    const base = Math.min(90, Math.max(12, 8 + Math.round(units * 1.2)))
    return Math.min(108, Math.max(15, Math.round(base * 1.2)))
}

export function formatImportSuccess(result, quota) {
    const added = result?.added || 0
    const extra = [
        result?.updated > 0 ? `更新 ${result.updated} 張` : '',
        result?.relearned > 0 ? `${result.relearned} 張進入重學` : '',
    ].filter(Boolean)
    const q = result?.quota || quota
    const limit = Number(q?.limit ?? 50)
    const remaining = q
        ? Number(q.remaining ?? Math.max(0, limit - Number(q.used ?? 0)))
        : null
    let text = `成功匯入 ${added} 張`
    if (extra.length) text += `（${extra.join('，')}）`
    if (remaining != null) {
        text += `。AI 名額還剩 ${remaining} / ${limit}`
        if (remaining === 0) text += '，之後請用手動匯入'
    }
    return text
}

function ManualGuide() {
    const [step, setStep] = useState(0)
    const [progress, setProgress] = useState(0)
    const [hold, setHold] = useState(false)
    const progressRef = useRef(0)
    const holdRef = useRef(false)
    progressRef.current = progress
    holdRef.current = hold

    useEffect(() => {
        let raf
        let t0 = performance.now()
        let origin = progressRef.current / 100
        const tick = (now) => {
            const p = Math.min(1, origin + (now - t0) / STEP_MS)
            progressRef.current = p * 100
            setProgress(p * 100)
            if (p >= 1) {
                progressRef.current = 0
                setProgress(0)
                if (holdRef.current) {
                    // 停在此步驟重播動畫，不跳下一步
                    t0 = now
                    origin = 0
                    raf = requestAnimationFrame(tick)
                    return
                }
                setStep(s => (s + 1) % FLOW_STEPS.length)
                return
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [step])

    const hoverStep = (i) => {
        setHold(true)
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
                    onMouseEnter={() => setHold(true)}
                    onMouseLeave={() => setHold(false)}
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
            <ExternalAiDemo step={step} />
        </div>
    )
}

const STEP_MS = 5000

const FLOW_STEPS = [
    { n: 1, label: '步驟 1 · 點擊複製提示並開啟', text: '點擊下方「複製提示並開啟 ChatGPT」' },
    { n: 2, label: '步驟 2 · 貼上提示詞', text: '把提示詞貼進輸入框（先別送出）' },
    { n: 3, label: '步驟 3 · 加上自己的單字', text: '滑到提示詞最後，貼上生字後再送出' },
    { n: 4, label: '步驟 4 · 等待 JSON', text: '等待 AI 輸出 JSON' },
    { n: 5, label: '步驟 5 · 複製結果', text: '點右下角複製圖示' },
    { n: 6, label: '步驟 6 · 貼回這裡匯入', text: '回到這裡，貼上結果後匯入' },
]

function ExternalAiDemo({ step }) {
    return (
        <div className="im-flow-demo" data-step={step} aria-hidden="true">
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
                            <span className="im-app-paste-flag">⌘V 貼上結果</span>
                            <div className="im-flow-app-btns">
                                <span className="im-flow-chip gpt">複製提示並開啟 ChatGPT ↗</span>
                                <span className="im-flow-chip gem">Gemini ↗</span>
                            </div>
                        </div>
                    </div>

                    <div className="im-view chat">
                        <div className="im-chat-thread">
                            <div className="im-bubble user prompt">
                                <span className="im-prompt-body">你是荷蘭語教授。請把單字整理成純 JSON 陣列，含 front、lemma、forms、例句與聯想記憶法。</span>
                                <span className="im-prompt-slot">（←在這裡貼上你的單字，然後送出）</span>
                                <span className="im-prompt-words">{`kinderen
huiswerk
opbellen`}</span>
                            </div>
                            <div className="im-bubble bot">
                                <span className="im-typing"><i /><i /><i /></span>
                                <pre className="im-json">{`[{ "front": "kinderen", "lemma": "kind", "back": "孩子們" }]`}</pre>
                                <span className="im-copy-btn" aria-hidden="true">
                                    <Icon name="copy" size={12} />
                                    <span className="im-flow-cursor copy-cursor" />
                                </span>
                            </div>
                        </div>
                        <div className="im-composer">
                            <div className="im-composer-inner">
                                <span className="im-composer-ph">詢問任何問題</span>
                                <div className="im-composer-scroll">
                                    <div className="im-composer-draft">
                                        <span className="im-draft-line">你是荷蘭語教授。請把單字整理成純 JSON 陣列。</span>
                                        <span className="im-draft-line">每張卡含 front、lemma、forms、例句與聯想記憶法。</span>
                                        <span className="im-draft-line">只輸出 JSON，不要其他說明文字。</span>
                                        <span className="im-draft-slot">（←在這裡貼上你的單字，然後送出）</span>
                                        <span className="im-draft-words">{`kinderen
huiswerk
opbellen`}</span>
                                    </div>
                                </div>
                            </div>
                            <span className="im-send">↑</span>
                        </div>
                        <span className="im-paste-flag">⌘V 貼上提示詞</span>
                        <span className="im-words-flag">滑到最後再貼生字</span>
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
