import { useCallback, useEffect, useMemo, useState } from 'react'
import { KNM_QUIZZES } from '../data/knmQuiz'

const STORAGE_KEY = 'memoflip_knm_quiz'

function emptyState(quizId) {
    const quiz = KNM_QUIZZES.find((q) => q.id === quizId) || KNM_QUIZZES[0]
    const n = quiz.questions.length
    return {
        quizId: quiz.id,
        i: 0,
        answers: {},
        queue: Array.from({ length: n }, (_, idx) => idx),
        phase: 'quiz',
        missedOnly: false,
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return emptyState(KNM_QUIZZES[0].id)
        const parsed = JSON.parse(raw)
        const quiz = KNM_QUIZZES.find((q) => q.id === parsed.quizId)
        if (!quiz) return emptyState(KNM_QUIZZES[0].id)
        return { ...emptyState(quiz.id), ...parsed, quizId: quiz.id }
    } catch {
        return emptyState(KNM_QUIZZES[0].id)
    }
}

export default function KnmQuiz() {
    const [state, setState] = useState(loadState)

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, [state])

    const quiz = useMemo(
        () => KNM_QUIZZES.find((q) => q.id === state.quizId) || KNM_QUIZZES[0],
        [state.quizId],
    )
    const qIndex = state.queue[state.i] ?? 0
    const question = quiz.questions[qIndex]
    const selected = state.answers[String(qIndex)]
    const revealed = selected !== undefined

    const score = useMemo(() => {
        let right = 0
        let done = 0
        quiz.questions.forEach((item, idx) => {
            const pick = state.answers[String(idx)]
            if (pick === undefined) return
            done += 1
            if (pick === item.correctIndex) right += 1
        })
        return { right, done, total: quiz.questions.length }
    }, [quiz, state.answers])

    const missed = useMemo(
        () => quiz.questions
            .map((item, idx) => ({ item, idx }))
            .filter(({ item, idx }) => state.answers[String(idx)] !== undefined && state.answers[String(idx)] !== item.correctIndex)
            .map(({ idx }) => idx),
        [quiz, state.answers],
    )

    const switchQuiz = (quizId) => setState(emptyState(quizId))

    const pick = (optionIndex) => {
        if (revealed) return
        setState((s) => ({
            ...s,
            answers: { ...s.answers, [String(qIndex)]: optionIndex },
        }))
    }

    const goNext = () => {
        setState((s) => {
            if (s.i + 1 >= s.queue.length) return { ...s, phase: 'results' }
            return { ...s, i: s.i + 1 }
        })
    }

    const goPrev = () => {
        setState((s) => ({ ...s, i: Math.max(0, s.i - 1) }))
    }

    const retryAll = () => setState(emptyState(quiz.id))

    const retryMissed = useCallback(() => {
        if (missed.length === 0) return
        setState((s) => {
            const nextAnswers = { ...s.answers }
            missed.forEach((idx) => { delete nextAnswers[String(idx)] })
            return {
                ...s,
                answers: nextAnswers,
                queue: missed,
                i: 0,
                phase: 'quiz',
                missedOnly: true,
            }
        })
    }, [missed])

    if (state.phase === 'results') {
        return (
            <QuizShell>
            <div className="kq">
                <QuizTabs quizId={quiz.id} onSwitch={switchQuiz} />
                <div className="kq-results">
                    <p className="kq-score">{score.right}／{score.total}</p>
                    <p className="kq-score-copy">
                        {score.right === score.total ? '全對。' : `錯了 ${missed.length} 題。`}
                    </p>
                    <div className="kq-result-actions">
                        <button type="button" className="kq-btn primary" onClick={retryAll}>再做全部</button>
                        {missed.length > 0 && (
                            <button type="button" className="kq-btn" onClick={retryMissed}>只做錯的</button>
                        )}
                    </div>
                </div>
            </div>
            </QuizShell>
        )
    }

    if (!question) return null

    const isLast = state.i + 1 >= state.queue.length

    return (
        <QuizShell>
        <div className="kq">
            <QuizTabs quizId={quiz.id} onSwitch={switchQuiz} />
            <div className="kq-progress">
                <span>{state.i + 1}／{state.queue.length}</span>
                {state.missedOnly && <span className="kq-missed-flag">錯題</span>}
            </div>
            <p className="kq-question">{question.question}</p>
            <ul className="kq-options">
                {question.options.map((opt, idx) => {
                    let cls = 'kq-opt'
                    if (revealed) {
                        if (idx === question.correctIndex) cls += ' correct'
                        else if (idx === selected) cls += ' wrong'
                    }
                    const optionExplain = revealed ? question.optionExplains?.[idx] : ''
                    return (
                        <li key={idx}>
                            <button type="button" className={cls} onClick={() => pick(idx)} disabled={revealed}>
                                <span className="kq-letter">{String.fromCharCode(65 + idx)}</span>
                                <span className="kq-opt-body">
                                    <span className="kq-opt-text">{opt}</span>
                                    {optionExplain ? <span className="kq-opt-explain">{optionExplain}</span> : null}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>
            <div className="kq-nav">
                <button type="button" className="kq-btn" onClick={goPrev} disabled={state.i === 0}>返回</button>
                <button
                    type="button"
                    className="kq-btn primary"
                    onClick={goNext}
                    disabled={!revealed}
                >
                    {isLast ? '看成績' : '繼續'}
                </button>
            </div>
        </div>
        </QuizShell>
    )
}

const KQ_CSS = `
.kq {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0 16px 16px;
    width: 100%;
}
.kq-tabs {
    display: flex;
    gap: 6px;
    padding: 10px 0 8px;
    flex-shrink: 0;
}
.kq-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    background: var(--bg-tint);
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
}
.kq-tabs button span {
    font-size: 0.65rem;
    font-weight: 800;
    color: var(--text-tertiary);
}
.kq-tabs button.active {
    background: var(--brand-accent-soft);
    color: var(--brand-ink);
    border-color: rgba(241, 90, 41, 0.25);
}
.kq-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--text-tertiary);
    margin-bottom: 10px;
    flex-shrink: 0;
}
.kq-missed-flag {
    font-size: 0.68rem;
    color: var(--brand-accent);
    background: var(--brand-accent-soft);
    border-radius: var(--radius-full);
    padding: 2px 8px;
}
.kq-question {
    margin: 0 0 14px;
    font-family: var(--font-word);
    font-size: 1.02rem;
    font-weight: 600;
    line-height: 1.5;
    color: var(--text-primary);
    flex-shrink: 0;
}
.kq-options {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}
.kq-opt {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    cursor: pointer;
    color: var(--text-primary);
    font-family: var(--font-word);
    font-size: 0.9rem;
    line-height: 1.45;
}
.kq-opt:hover:not(:disabled) { background: var(--bg-tint); }
.kq-opt:disabled { cursor: default; }
.kq-opt.correct { border-color: var(--good); background: var(--good-bg); }
.kq-opt.wrong { border-color: var(--again); background: var(--again-bg); }
.kq-letter {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: var(--bg-tint);
    font-family: var(--font-sans);
    font-size: 0.72rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
}
.kq-opt.correct .kq-letter { background: var(--good); color: #fff; }
.kq-opt.wrong .kq-letter { background: var(--again); color: #fff; }
.kq-opt-text { display: block; }
.kq-opt-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}
.kq-opt-explain {
    font-family: var(--font-sans);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1.45;
    color: var(--text-secondary);
}
.kq-nav {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
    flex-shrink: 0;
}
.kq-btn {
    height: 36px;
    padding: 0 14px;
    border-radius: var(--radius-btn);
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
}
.kq-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.kq-btn.primary {
    background: var(--brand-accent);
    border-color: var(--brand-accent);
    color: var(--text-on-accent);
}
.kq-results {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
}
.kq-score {
    margin: 0;
    font-size: 2.4rem;
    font-weight: 800;
    color: var(--text-primary);
}
.kq-score-copy {
    margin: 0 0 8px;
    color: var(--text-secondary);
    font-size: 0.95rem;
}
.kq-result-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
}
`

function QuizShell({ children }) {
    return (
        <>
            {children}
            <style>{KQ_CSS}</style>
        </>
    )
}

function QuizTabs({ quizId, onSwitch }) {
    return (
        <div className="kq-tabs" role="tablist" aria-label="測驗套卷">
            {KNM_QUIZZES.map((q) => (
                <button
                    key={q.id}
                    type="button"
                    role="tab"
                    aria-selected={q.id === quizId}
                    className={q.id === quizId ? 'active' : ''}
                    onClick={() => onSwitch(q.id)}
                >
                    {q.title}
                    <span>{q.questions.length}</span>
                </button>
            ))}
        </div>
    )
}
