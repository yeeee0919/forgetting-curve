import { useState, useEffect } from 'react'

const LANG_MAP = {
    nl: 'nl', en: 'en', ja: 'ja', de: 'de', fr: 'fr', ko: 'ko', es: 'es',
}

export default function SettingsModal({ settings, onSave, onClose }) {
    const [key, setKey] = useState(settings.openaiKey || '')
    const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '')
    const [voices, setVoices] = useState([])
    const [selectedVoice, setSelectedVoice] = useState(settings.voiceName || '')
    const [voiceLang, setVoiceLang] = useState('nl')
    const [rate, setRate] = useState(settings.speechRate ?? 0.35)
    const [testPlaying, setTestPlaying] = useState(false)

    // 載入系統可用的語音
    useEffect(() => {
        const load = () => {
            const all = window.speechSynthesis.getVoices()
            setVoices(all)
        }
        load()
        window.speechSynthesis.onvoiceschanged = load
    }, [])

    // 依選擇的語言過濾語音
    const filteredVoices = voices.filter(v =>
        v.lang.toLowerCase().startsWith(voiceLang.toLowerCase())
    )

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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⚙️ 設定</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* API Keys */}
                <div style={{ display: 'flex', gap: 'var(--space-md)', flexDirection: 'column', marginBottom: 'var(--space-lg)' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">OpenAI API Key</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="sk-..."
                            value={key}
                            onChange={e => setKey(e.target.value)}
                        />
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0 }}>
                            前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" style={{ color: 'rgba(167, 139, 250, 1)' }}>platform.openai.com</a> 取得。
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Google Gemini API Key</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="AIzaSy..."
                            value={geminiKey}
                            onChange={e => setGeminiKey(e.target.value)}
                        />
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0 }}>
                            前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'rgba(167, 139, 250, 1)' }}>Google AI Studio</a> 取得。
                        </p>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 0 }}>
                        Key 儲存在本機，不會上傳至任何其他伺服器。
                    </p>
                </div>

                {/* 發音設定 */}
                <div className="form-group">
                    <label className="form-label">🔊 發音語音設定</label>

                    {/* ... (rest of voice settings are unchanged) ... */}
                    {/* 語言選擇 */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        {Object.keys(LANG_MAP).map(lang => (
                            <button
                                key={lang}
                                onClick={() => { setVoiceLang(lang); setSelectedVoice('') }}
                                style={{
                                    padding: 'var(--space-xs) var(--space-md)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1.5px solid ${voiceLang === lang ? 'var(--brand-accent)' : 'var(--border-default)'}`,
                                    background: voiceLang === lang ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-canvas)',
                                    color: voiceLang === lang ? 'var(--brand-accent)' : 'var(--text-secondary)',
                                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                }}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* 語音清單 */}
                    {filteredVoices.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#ff9f43', padding: 'var(--space-sm) var(--space-md)', background: 'rgba(255,159,67,0.1)', borderRadius: 'var(--radius-sm)' }}>
                            ⚠️ 你的系統沒有安裝 {voiceLang.toUpperCase()} 語音。<br />
                            請到「系統設定 → 輔助使用 → 語音內容」下載。
                        </div>
                    ) : (
                        <select
                            className="form-input"
                            value={selectedVoice}
                            onChange={e => setSelectedVoice(e.target.value)}
                            style={{ marginBottom: 10 }}
                        >
                            <option value="">自動選擇最佳語音</option>
                            {filteredVoices.map(v => (
                                <option key={v.name} value={v.name}>
                                    {v.name} — {v.lang} {v.localService ? '(本機)' : '(線上)'}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* 語速 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            語速：{rate}x
                        </label>
                        <input
                            type="range" min="0.2" max="1.0" step="0.05"
                            value={rate}
                            onChange={e => setRate(parseFloat(e.target.value))}
                            style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            0.2（最慢）～ 1.0（正常）
                        </span>
                    </div>

                    {/* 試聽 */}
                    <button
                        onClick={testVoice}
                        disabled={testPlaying}
                        style={{
                            background: 'rgba(124, 58, 237, 0.08)',
                            border: '1.5px solid rgba(167, 139, 250, 1)',
                            borderRadius: 'var(--radius-md)', color: 'var(--brand-accent)',
                            padding: 'var(--space-sm) var(--space-md)', fontSize: '0.85rem',
                            fontWeight: 700, cursor: testPlaying ? 'default' : 'pointer',
                            opacity: testPlaying ? 0.6 : 1,
                        }}
                    >
                        {testPlaying ? '▶ 播放中...' : '🔊 試聽這個語音'}
                    </button>
                </div>

                <button
                    className="btn-primary"
                    onClick={() => {
                        localStorage.setItem('memoflip_voice_name', selectedVoice)
                        localStorage.setItem('memoflip_speech_rate', String(rate))
                        onSave({ ...settings, openaiKey: key, geminiKey, voiceName: selectedVoice, speechRate: rate })
                    }}
                >
                    儲存設定
                </button>

                {/* 資料遷移備份 */}
                <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '2px dashed var(--border-default)' }}>
                    <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>📦 資料備份與還原</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <button
                            className="btn-secondary"
                            style={{ flex: 1, fontSize: '0.85rem', height: '40px' }}
                            onClick={onExport}
                        >
                            📤 匯出備份 (JSON)
                        </button>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <button
                                className="btn-secondary"
                                style={{ width: '100%', fontSize: '0.85rem', height: '40px' }}
                                onClick={() => document.getElementById('restore-input').click()}
                            >
                                📥 還原備份
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
                                            const data = JSON.parse(event.target.result)
                                            onRestore(data)
                                        } catch (err) {
                                            alert('讀取備份檔案失敗：' + err.message)
                                        }
                                    }
                                    reader.readAsText(file)
                                }}
                            />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                        可以用來將資料從 localhost 遷移到 Vercel 或是備份到雲端。
                    </p>
                </div>
            </div>
        </div>
    )
}
