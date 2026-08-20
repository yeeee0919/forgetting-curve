import { useState, useEffect } from 'react'
import Icon from './Icons'

const LANG_MAP = {
    nl: 'nl', en: 'en', ja: 'ja', de: 'de', fr: 'fr', ko: 'ko', es: 'es',
}

const PAGE_TITLE = {
    home: '設定',
    api: 'API 金鑰',
    voice: '發音',
    backup: '資料備份',
}

export default function SettingsModal({ settings, onSave, onClose, onExport, onRestore, user, quota, lastSynced, onGoogleLogin, onLogout }) {
    const [page, setPage] = useState('home')
    const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '')
    const [elevenLabsKey, setElevenLabsKey] = useState(settings.elevenLabsKey || '')
    const [voices, setVoices] = useState([])
    const [selectedVoice, setSelectedVoice] = useState(settings.voiceName || '')
    const [voiceLang, setVoiceLang] = useState('nl')
    const [rate, setRate] = useState(settings.speechRate ?? 0.35)
    const [testPlaying, setTestPlaying] = useState(false)

    useEffect(() => {
        const load = () => setVoices(window.speechSynthesis.getVoices())
        load()
        window.speechSynthesis.onvoiceschanged = load
    }, [])

    const filteredVoices = voices.filter(v =>
        v.lang.toLowerCase().startsWith(voiceLang.toLowerCase())
    )

    const saveDetails = () => {
        localStorage.setItem('memoflip_voice_name', selectedVoice)
        localStorage.setItem('memoflip_speech_rate', String(rate))
        onSave({ ...settings, geminiKey, elevenLabsKey, voiceName: selectedVoice, speechRate: rate })
    }

    const goHome = () => {
        saveDetails()
        setPage('home')
    }

    const testVoice = () => {
        window.speechSynthesis.cancel()
        const utter = new SpeechSynthesisUtterance(
            voiceLang === 'nl' ? 'Goedemorgen, hoe gaat het met jou?' :
                voiceLang === 'en' ? 'Good morning, how are you today?' :
                    voiceLang === 'de' ? 'Guten Morgen, wie geht es Ihnen?' :
                        'Hello, this is a test.'
        )
        utter.rate = rate
        const voice = voices.find(v => v.name === selectedVoice)
        if (voice) utter.voice = voice
        else if (filteredVoices.length) utter.voice = filteredVoices[0]
        utter.lang = filteredVoices.find(v => v.name === selectedVoice)?.lang ||
            filteredVoices[0]?.lang || `${voiceLang}-${voiceLang.toUpperCase()}`
        setTestPlaying(true)
        utter.onend = () => setTestPlaying(false)
        window.speechSynthesis.speak(utter)
    }

    const keySummary = [
        geminiKey && 'Gemini TTS',
        elevenLabsKey && 'ElevenLabs',
    ].filter(Boolean)

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal sm-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    {page !== 'home' ? (
                        <button className="close-btn" onClick={goHome} title="返回">
                            <Icon name="chevronLeft" size={18} />
                        </button>
                    ) : (
                        <span className="sm-header-spacer" />
                    )}
                    <h2>{PAGE_TITLE[page]}</h2>
                    <button className="close-btn" onClick={() => { saveDetails(); onClose() }}>
                        <Icon name="x" size={16} />
                    </button>
                </div>

                {page === 'home' && (
                    <div className="sm-home">
                        <section className="sm-id-card">
                            <p className="form-label">帳號</p>
                            {user ? (
                                <>
                                    <p className="sm-id-hint">{user.email || '已用 Google 登入'}</p>
                                    {quota && (
                                        <p className="sm-id-meta">AI 額度 {quota.used || 0} / {quota.limit || 50}（用完仍可手動加字）</p>
                                    )}
                                    {lastSynced && (
                                        <p className="sm-id-meta">上次同步：{new Date(lastSynced).toLocaleString()}</p>
                                    )}
                                    <button className="btn-secondary" onClick={onLogout}>登出</button>
                                </>
                            ) : (
                                <>
                                    <p className="sm-id-hint">沒登入也能用這台瀏覽器。登入後字卡會同步，才能用 AI 匯入。</p>
                                    <button className="btn-primary" onClick={onGoogleLogin}>使用 Google 登入</button>
                                </>
                            )}
                        </section>

                        <nav className="sm-list">
                            <button type="button" className="sm-row" onClick={() => setPage('api')}>
                                <span className="sm-row-text">
                                    <span className="sm-row-title">API 金鑰</span>
                                    <span className="sm-row-meta">
                                        {keySummary.length ? `已設定 ${keySummary.join('、')}` : '高品質發音選填'}
                                    </span>
                                </span>
                                <Icon name="chevronRight" size={18} />
                            </button>
                            <button type="button" className="sm-row" onClick={() => setPage('voice')}>
                                <span className="sm-row-text">
                                    <span className="sm-row-title">發音</span>
                                    <span className="sm-row-meta">{voiceLang.toUpperCase()} · {rate}x</span>
                                </span>
                                <Icon name="chevronRight" size={18} />
                            </button>
                            <button type="button" className="sm-row" onClick={() => setPage('backup')}>
                                <span className="sm-row-text">
                                    <span className="sm-row-title">資料備份</span>
                                    <span className="sm-row-meta">匯出或還原字卡</span>
                                </span>
                                <Icon name="chevronRight" size={18} />
                            </button>
                        </nav>
                    </div>
                )}

                {page === 'api' && (
                    <div className="sm-page">
                        <p className="sm-id-hint">AI 匯入已含在 Google 登入裡，不必再貼 OpenAI key。這裡只給發音用。</p>
                        <div className="form-group">
                            <label className="form-label">Google Gemini API Key（選填，發音）</label>
                            <input className="form-input" type="password" placeholder="AIzaSy..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
                            <p className="sm-help">前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> 取得。</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">ElevenLabs API Key（選填）</label>
                            <input className="form-input" type="password" placeholder="sk_..." value={elevenLabsKey} onChange={e => setElevenLabsKey(e.target.value)} />
                            <p className="sm-help">前往 <a href="https://elevenlabs.io/" target="_blank" rel="noreferrer">ElevenLabs</a> 取得高品質發音。</p>
                        </div>
                        <p className="sm-help">Key 只存在這台裝置，不會上傳。</p>
                        <button className="btn-primary" onClick={goHome}>儲存</button>
                    </div>
                )}

                {page === 'voice' && (
                    <div className="sm-page">
                        <div className="sm-lang-row">
                            {Object.keys(LANG_MAP).map(lang => (
                                <button
                                    key={lang}
                                    type="button"
                                    className={`sm-chip ${voiceLang === lang ? 'on' : ''}`}
                                    onClick={() => { setVoiceLang(lang); setSelectedVoice('') }}
                                >
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {filteredVoices.length === 0 ? (
                            <p className="sm-warn">系統沒有 {voiceLang.toUpperCase()} 語音。請到「系統設定 → 輔助使用 → 語音內容」下載。</p>
                        ) : (
                            <select className="form-input" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)}>
                                <option value="">自動選擇最佳語音</option>
                                {filteredVoices.map(v => (
                                    <option key={v.name} value={v.name}>
                                        {v.name} — {v.lang} {v.localService ? '(本機)' : '(線上)'}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="sm-rate">
                            <label>語速 {rate}x</label>
                            <input type="range" min="0.2" max="1.0" step="0.05" value={rate} onChange={e => setRate(parseFloat(e.target.value))} />
                            <span>0.2 最慢 · 1.0 正常</span>
                        </div>

                        <button className="btn-secondary" onClick={testVoice} disabled={testPlaying}>
                            <Icon name="volume" size={16} />
                            {testPlaying ? '播放中…' : '試聽'}
                        </button>
                        <button className="btn-primary" onClick={goHome}>儲存</button>
                    </div>
                )}

                {page === 'backup' && (
                    <div className="sm-page">
                        <p className="sm-id-hint">把字卡備份成 JSON，或從舊檔還原。</p>
                        <button className="btn-secondary" onClick={onExport}>匯出備份</button>
                        <button className="btn-secondary" onClick={() => document.getElementById('restore-input').click()}>
                            還原備份
                        </button>
                        <input
                            id="restore-input"
                            type="file"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files[0]
                                if (!file) return
                                const reader = new FileReader()
                                reader.onload = (event) => {
                                    try {
                                        onRestore(JSON.parse(event.target.result))
                                    } catch (err) {
                                        alert('讀取備份檔案失敗：' + err.message)
                                    }
                                }
                                reader.readAsText(file)
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
