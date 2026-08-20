import Icon from './Icons'
import './ReviewKeysDemo.css'

const HIDE_KEY = 'memoflip_hide_review_keys_demo'

export function shouldShowReviewKeysDemo() {
    try {
        return localStorage.getItem(HIDE_KEY) !== '1'
    } catch {
        return true
    }
}

export function hideReviewKeysDemo() {
    try {
        localStorage.setItem(HIDE_KEY, '1')
    } catch {
        /* private mode */
    }
}

export function showReviewKeysDemo() {
    try {
        localStorage.removeItem(HIDE_KEY)
    } catch {
        /* private mode */
    }
}

export default function ReviewKeysDemo({ onClose }) {
    const dismiss = () => {
        hideReviewKeysDemo()
        onClose?.()
    }

    return (
        <div className="rkd" aria-hidden="true">
            <button type="button" className="rkd-close" onClick={dismiss} aria-label="關閉快捷鍵教學">
                <Icon name="x" size={14} />
            </button>
            <p className="rkd-title">鍵盤快捷鍵</p>
            <div className="rkd-body">
                <div className="rkd-card">
                    <div className="rkd-face rkd-front">
                        <span className="rkd-kicker">正面</span>
                        <span className="rkd-word">huis</span>
                        <span className="rkd-hint">空白鍵翻面</span>
                    </div>
                    <div className="rkd-face rkd-back">
                        <span className="rkd-kicker">答案</span>
                        <span className="rkd-word">房子</span>
                    </div>
                </div>

                <div className="rkd-keys">
                    <span className="rkd-key rkd-key-space">
                        <span className="rkd-key-label">space</span>
                        <span className="rkd-key-cap">翻面</span>
                    </span>
                    <span className="rkd-key-group">
                        <span className="rkd-key">
                            <span className="rkd-key-label">Q</span>
                            <span className="rkd-key-cap">不記得</span>
                        </span>
                        <span className="rkd-key">
                            <span className="rkd-key-label">W</span>
                            <span className="rkd-key-cap">模糊</span>
                        </span>
                        <span className="rkd-key rkd-key-e">
                            <span className="rkd-key-label">E</span>
                            <span className="rkd-key-cap">記得了</span>
                        </span>
                        <span className="rkd-key">
                            <span className="rkd-key-label">R</span>
                            <span className="rkd-key-cap">完全記得</span>
                        </span>
                    </span>
                </div>
            </div>

            <div className="rkd-steps">
                <p className="rkd-step rkd-step-1">空白鍵 → 翻開答案</p>
                <p className="rkd-step rkd-step-2">E → 記得了，進入下一張</p>
            </div>
            <p className="rkd-caption">示範循環播放</p>
        </div>
    )
}
