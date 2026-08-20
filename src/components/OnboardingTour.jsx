import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import Icon from './Icons'
import { CatcherDemo } from './WordCatcherPromo'
import './OnboardingTour.css'

const PAD = 6

function measure(selector, fallbackSelector) {
    const el =
        (selector && document.querySelector(selector)) ||
        (fallbackSelector && document.querySelector(fallbackSelector))
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 2 && r.height < 2) return null
    return {
        top: Math.max(8, r.top - PAD),
        left: Math.max(8, r.left - PAD),
        width: Math.min(window.innerWidth - 16, r.width + PAD * 2),
        height: Math.min(window.innerHeight - 16, r.height + PAD * 2),
        el,
    }
}

function placeCard(hole, cardW, cardH) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 14
    if (!hole) {
        return { top: Math.max(24, vh * 0.2), left: Math.max(16, (vw - cardW) / 2) }
    }
    const below = hole.top + hole.height + gap
    const above = hole.top - cardH - gap
    let top = below + cardH < vh - 12 ? below : above > 12 ? above : Math.max(12, vh - cardH - 12)
    let left = hole.left + hole.width / 2 - cardW / 2
    left = Math.min(Math.max(12, left), vw - cardW - 12)
    return { top, left }
}

export default function OnboardingTour({
    steps,
    stepIndex,
    onPrev,
    onNext,
    onSkip,
}) {
    const step = steps[stepIndex]
    const total = steps.length
    const [hole, setHole] = useState(null)
    const [cardPos, setCardPos] = useState({ top: 80, left: 16 })

    const refresh = useCallback(() => {
        if (!step) return
        const next = measure(step.selector, step.fallbackSelector)
        setHole(next)
        document.querySelectorAll('[data-tour-active="1"]').forEach(n => n.removeAttribute('data-tour-active'))
        if (next?.el) next.el.setAttribute('data-tour-active', '1')
    }, [step])

    useLayoutEffect(() => {
        refresh()
        const t1 = setTimeout(refresh, 80)
        const t2 = setTimeout(refresh, 280)
        const t3 = setTimeout(refresh, 500)
        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
            document.querySelectorAll('[data-tour-active="1"]').forEach(n => n.removeAttribute('data-tour-active'))
        }
    }, [refresh, stepIndex])

    useEffect(() => {
        const onResize = () => refresh()
        window.addEventListener('resize', onResize)
        window.addEventListener('scroll', onResize, true)
        return () => {
            window.removeEventListener('resize', onResize)
            window.removeEventListener('scroll', onResize, true)
        }
    }, [refresh])

    useLayoutEffect(() => {
        const cardW = Math.min(360, window.innerWidth - 32)
        const cardH = step?.showCatchDemo ? 420 : 220
        setCardPos(placeCard(hole, cardW, cardH))
    }, [hole, step])

    if (!step) return null

    const isFirst = stepIndex === 0
    const isLast = stepIndex >= total - 1

    return (
        <div className="obt-root" role="dialog" aria-modal="true" aria-labelledby="obt-title">
            <div className="obt-blocker" aria-hidden="true" />
            <div
                className={`obt-hole ${hole ? '' : 'is-missing'}`}
                style={
                    hole
                        ? { top: hole.top, left: hole.left, width: hole.width, height: hole.height }
                        : undefined
                }
            />
            <div className="obt-card" style={{ top: cardPos.top, left: cardPos.left }}>
                <div className="obt-card-top">
                    <span className="obt-progress">{stepIndex + 1} / {total}</span>
                    <button type="button" className="obt-close" onClick={onSkip} aria-label="關閉導覽">
                        <Icon name="x" size={14} />
                    </button>
                </div>
                <h2 id="obt-title" className="obt-title">{step.title}</h2>
                <p className="obt-body">{step.body}</p>
                {step.showCatchDemo && (
                    <div className="obt-demo-wrap">
                        <CatcherDemo />
                    </div>
                )}
                <div className="obt-actions">
                    <button type="button" className="obt-btn" onClick={onPrev} disabled={isFirst}>
                        上一步
                    </button>
                    <button type="button" className="obt-btn obt-btn-primary" onClick={onNext}>
                        {isLast ? '完成' : '下一步'}
                    </button>
                    <button type="button" className="obt-btn-skip" onClick={onSkip}>
                        跳過導覽
                    </button>
                </div>
            </div>
        </div>
    )
}
