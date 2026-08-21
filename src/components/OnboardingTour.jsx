import { useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react'
import Icon from './Icons'
import { CatcherDemo } from './WordCatcherPromo'
import './OnboardingTour.css'

const PAD = 10
const FADE_MS = 280
const SETTLE_MS = 320

function measure(selector, fallbackSelector) {
    const el =
        (selector && document.querySelector(selector)) ||
        (fallbackSelector && document.querySelector(fallbackSelector))
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width < 2 && r.height < 2) return null
    return {
        top: Math.max(4, r.top - PAD),
        left: Math.max(4, r.left - PAD),
        width: Math.min(window.innerWidth - 8, r.width + PAD * 2),
        height: Math.min(window.innerHeight - 8, r.height + PAD * 2),
        el,
    }
}

function placeCard(hole, cardW, cardH) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 16
    if (!hole) {
        return { top: Math.max(24, vh * 0.22), left: Math.max(16, (vw - cardW) / 2) }
    }
    const below = hole.top + hole.height + gap
    const above = hole.top - cardH - gap
    let top = below + cardH < vh - 12 ? below : above > 12 ? above : Math.max(12, vh - cardH - 12)
    let left = hole.left + hole.width / 2 - cardW / 2
    left = Math.min(Math.max(12, left), vw - cardW - 12)
    return { top, left }
}

function clearTourActive() {
    document.querySelectorAll('[data-tour-active="1"]').forEach(n => n.removeAttribute('data-tour-active'))
    document.querySelectorAll('[data-tour-lit="1"]').forEach(n => n.removeAttribute('data-tour-lit'))
}

function lightExtraTargets(selectors = []) {
    selectors.forEach(sel => {
        const el = document.querySelector(sel)
        if (el) el.setAttribute('data-tour-lit', '1')
    })
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
    const [phase, setPhase] = useState('settling')
    const [displayStep, setDisplayStep] = useState(step)
    const timers = useRef([])
    const busy = phase !== 'ready'

    const clearTimers = () => {
        timers.current.forEach(clearTimeout)
        timers.current = []
    }

    const later = (fn, ms) => {
        const id = setTimeout(fn, ms)
        timers.current.push(id)
        return id
    }

    const applyMeasure = useCallback((targetStep) => {
        const s = targetStep || step
        if (!s) return null
        const next = measure(s.selector, s.fallbackSelector)
        clearTourActive()
        if (next?.el) next.el.setAttribute('data-tour-active', '1')
        lightExtraTargets(s.litSelectors)
        setHole(next)
        const cardW = Math.min(360, window.innerWidth - 32)
        const cardH = s.showCatchDemo ? 420 : 220
        setCardPos(placeCard(next, cardW, cardH))
        return next
    }, [step])

    useLayoutEffect(() => {
        if (!step) return undefined
        clearTimers()
        setPhase('settling')
        setHole(null)
        clearTourActive()

        later(() => {
            setDisplayStep(step)
            applyMeasure(step)
            later(() => {
                applyMeasure(step)
                setPhase('ready')
            }, 40)
        }, SETTLE_MS)

        return () => {
            clearTimers()
            clearTourActive()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIndex])

    useEffect(() => {
        if (phase !== 'ready') return undefined
        const onResize = () => applyMeasure(step)
        window.addEventListener('resize', onResize)
        window.addEventListener('scroll', onResize, true)
        return () => {
            window.removeEventListener('resize', onResize)
            window.removeEventListener('scroll', onResize, true)
        }
    }, [phase, applyMeasure, step])

    const runLeaveThen = (action) => {
        if (busy) return
        setPhase('leaving')
        clearTourActive()
        later(() => {
            action()
        }, FADE_MS)
    }

    if (!step || !displayStep) return null

    const isFirst = stepIndex === 0
    const isLast = stepIndex >= total - 1
    const showRing = phase === 'ready' && hole
    const cardVisible = phase === 'ready'

    return (
        <div className="obt-root" role="dialog" aria-modal="true" aria-labelledby="obt-title">
            <div className="obt-blocker" aria-hidden="true" />
            <div className={`obt-veil ${phase === 'ready' ? 'is-soft' : ''}`} aria-hidden="true" />
            <div
                className={`obt-ring ${showRing ? 'is-visible' : ''}`}
                style={
                    hole
                        ? { top: hole.top, left: hole.left, width: hole.width, height: hole.height }
                        : undefined
                }
            />
            <div
                className={`obt-card ${cardVisible ? 'is-visible' : ''}`}
                style={{ top: cardPos.top, left: cardPos.left }}
            >
                <div className="obt-card-top">
                    <span className="obt-progress">{stepIndex + 1} / {total}</span>
                    <button type="button" className="obt-close" onClick={onSkip} aria-label="關閉導覽">
                        <Icon name="x" size={14} />
                    </button>
                </div>
                <h2 id="obt-title" className="obt-title">{displayStep.title}</h2>
                <p className="obt-body">{displayStep.body}</p>
                {displayStep.showCatchDemo && (
                    <div className="obt-demo-wrap">
                        <CatcherDemo />
                    </div>
                )}
                <div className="obt-actions">
                    <button
                        type="button"
                        className="obt-btn"
                        onClick={() => runLeaveThen(onPrev)}
                        disabled={isFirst || busy}
                    >
                        上一步
                    </button>
                    <button
                        type="button"
                        className="obt-btn obt-btn-primary"
                        onClick={() => runLeaveThen(onNext)}
                        disabled={busy}
                    >
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
