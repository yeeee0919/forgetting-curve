import { useState } from 'react'
import Icon from './Icons'
import {
    CHROME_EXTENSION_STORE_URL,
    CHROME_EXTENSION_ZIP_URL,
    HIDE_EXT_CARD_KEY,
    hasChromeStoreListing,
} from '../config/extension'
import './WordCatcherPromo.css'

export function ExtensionDownloadCard({ onOpenGuide }) {
    const [showManual, setShowManual] = useState(false)

    const dismiss = () => {
        try {
            localStorage.setItem(HIDE_EXT_CARD_KEY, '1')
        } catch {
            /* private mode */
        }
        window.dispatchEvent(new Event('memoflip-hide-ext-card'))
    }

    return (
        <section className="ext-card" aria-label="Chrome 擴充功能">
            <button type="button" className="ext-card-close" onClick={dismiss} aria-label="關閉">
                <Icon name="x" size={16} />
            </button>
            <div className="ext-card-copy">
                <p className="ext-card-kicker">Word Catcher</p>
                <h3>{hasChromeStoreListing ? '網頁選字，直接進 Inbox' : '下載 Chrome 擴充功能'}</h3>
                <p>
                    {hasChromeStoreListing
                        ? '在任何網頁反白單字，收集到 Toocheep 再複習。'
                        : '商店審核前可先手動安裝 zip；上架後會改為一鍵連到 Chrome 商店。'}
                </p>
            </div>
            {hasChromeStoreListing ? (
                <a
                    className="btn-primary ext-card-btn"
                    href={CHROME_EXTENSION_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                >
                    <Icon name="plus" size={16} strokeWidth={2} />
                    安裝 Chrome 擴充功能
                </a>
            ) : (
                <>
                    <a className="btn-primary ext-card-btn" href={CHROME_EXTENSION_ZIP_URL} download>
                        <Icon name="download" size={16} />
                        下載擴充功能（zip）
                    </a>
                    <button type="button" className="ext-card-toggle" onClick={() => setShowManual(v => !v)}>
                        {showManual ? '收合安裝說明' : '如何手動安裝？'}
                    </button>
                    {showManual && (
                        <ol className="ext-card-steps">
                            <li>解壓縮下載的 zip</li>
                            <li>開啟 <code>chrome://extensions</code></li>
                            <li>打開右上角「開發人員模式」</li>
                            <li>點「載入未封裝項目」，選解壓後的資料夾</li>
                        </ol>
                    )}
                </>
            )}
            <div className="ext-card-footer">
                <button type="button" className="ext-card-link-btn" onClick={onOpenGuide}>
                    看看怎麼用
                </button>
                <a className="ext-card-link" href="/privacy.html" target="_blank" rel="noreferrer">隱私權政策</a>
            </div>
        </section>
    )
}

export function ExtensionGuideModal({ open, onClose, installed }) {
    if (!open) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal ext-guide-modal" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="ext-guide-title">
                <header className="ext-guide-header">
                    <div>
                        <p className="ext-card-kicker">Word Catcher</p>
                        <h2 id="ext-guide-title">網頁選字，直接進 Inbox</h2>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="關閉">
                        <Icon name="x" size={18} />
                    </button>
                </header>

                <CatcherDemo />

                <ol className="ext-guide-steps">
                    <li>在任意網頁<strong>反白</strong>單字</li>
                    <li>選取旁出現<strong>加號</strong></li>
                    <li><strong>點擊加號</strong></li>
                    <li>出現翻譯<strong>框框</strong></li>
                    <li>點<strong>收錄此單字</strong>，加入 Inbox</li>
                </ol>

                {installed ? (
                    <p className="ext-guide-installed">已安裝，可直接到網頁選字。</p>
                ) : hasChromeStoreListing ? (
                    <a
                        className="btn-primary ext-card-btn"
                        href={CHROME_EXTENSION_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Icon name="puzzle" size={16} />
                        安裝 Chrome 擴充功能
                    </a>
                ) : (
                    <a className="btn-primary ext-card-btn" href={CHROME_EXTENSION_ZIP_URL} download>
                        <Icon name="download" size={16} />
                        下載擴充功能（zip）
                    </a>
                )}
            </div>
        </div>
    )
}

function CatcherDemo() {
    return (
        <div className="catcher-demo" aria-hidden="true">
            <div className="catcher-demo-bar">
                <span className="catcher-demo-dots" />
                <span className="catcher-demo-url">krant.nl / artikel</span>
            </div>
            <div className="catcher-demo-page">
                <p className="catcher-demo-line">
                    Voor welke partij ga jij{' '}
                    <span className="catcher-demo-hit">
                        <span className="catcher-demo-word">stemmen</span>
                        <span className="catcher-demo-plus">+</span>
                    </span>
                    ?
                </p>
                <p className="catcher-demo-line muted">Er zijn twee partijen betrokken bij het conflict.</p>
                <div className="catcher-demo-popup">
                    <div className="catcher-demo-popup-head">
                        <span>偵測語言 → 繁體中文</span>
                        <span className="catcher-demo-popup-open">打開單字卡</span>
                    </div>
                    <div className="catcher-demo-popup-word">stemmen</div>
                    <div className="catcher-demo-popup-def">(verb) 投票、調音、聲音</div>
                    <div className="catcher-demo-add">+ 收錄此單字</div>
                </div>
                <div className="catcher-demo-toast">已進 Inbox</div>
            </div>
            <p className="catcher-demo-caption">示範循環播放</p>
        </div>
    )
}
