import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icons'
import { KNM_SECTIONS } from '../data/knmContent'

const QUIZ_URL =
    'https://notebook.google.com/notebook/b62c7bc3-52fd-4f3c-abd6-0d38b8b27138/artifact/9999ebc8-8ae1-4afe-af64-f0f9a8c30be1'

function Block({ block }) {
    if (block.type === 'p') {
        return <p className="knm-p">{block.text}</p>
    }
    if (block.type === 'compare') {
        return (
            <div className="knm-compare">
                <div>
                    <h4>{block.left.title}</h4>
                    <ul>{block.left.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                    <h4>{block.right.title}</h4>
                    <ul>{block.right.items.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
            </div>
        )
    }
    if (block.type === 'list') {
        return (
            <div className="knm-block">
                {block.title && <h4 className="knm-h4">{block.title}</h4>}
                <ul className="knm-list">
                    {block.items.map((item) => (
                        <li key={item.lead}>
                            <strong>{item.lead}</strong>
                            <span>{item.body}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
    if (block.type === 'cards') {
        return (
            <div className="knm-cards">
                {block.items.map((card) => (
                    <article key={card.title} className="knm-card">
                        <header>
                            <h4>{card.title}</h4>
                            {card.meta && <span>{card.meta}</span>}
                        </header>
                        <ul>
                            {card.rows.map((row) => <li key={row}>{row}</li>)}
                        </ul>
                    </article>
                ))}
            </div>
        )
    }
    if (block.type === 'phones') {
        return (
            <ul className="knm-phones">
                {block.items.map((item) => (
                    <li key={item.num}>
                        <code>{item.num}</code>
                        <span>{item.when}</span>
                    </li>
                ))}
            </ul>
        )
    }
    if (block.type === 'dl') {
        return (
            <div className="knm-block">
                {block.title && <h4 className="knm-h4">{block.title}</h4>}
                <dl className="knm-dl">
                    {block.rows.map((row) => (
                        <div key={row.k} className="knm-dl-row">
                            <dt>{row.k}</dt>
                            <dd>{row.v}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        )
    }
    if (block.type === 'callout') {
        return <p className="knm-callout">{block.text}</p>
    }
    if (block.type === 'chips') {
        return (
            <div className="knm-block">
                {block.title && <h4 className="knm-h4">{block.title}</h4>}
                <ul className="knm-chips">
                    {block.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
            </div>
        )
    }
    return null
}

export default function KnmView() {
    const iframeRef = useRef(null)
    const [embedState, setEmbedState] = useState('loading')
    const [activeId, setActiveId] = useState(KNM_SECTIONS[0].id)

    useEffect(() => {
        const timer = setTimeout(() => {
            setEmbedState((s) => (s === 'loading' ? 'blocked' : s))
        }, 8000)
        return () => clearTimeout(timer)
    }, [])

    const handleIframeError = useCallback(() => {
        setEmbedState('blocked')
    }, [])

    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current
        if (!iframe) return
        try {
            const nested = iframe.contentWindow?.length ?? 0
            if (nested === 0) {
                setEmbedState('blocked')
                return
            }
            setEmbedState('ok')
        } catch {
            setEmbedState('ok')
        }
    }, [])

    const jumpTo = (id) => {
        setActiveId(id)
        document.getElementById(`knm-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const showFallback = embedState === 'blocked'

    return (
        <div className="knm-layout">
            <section className="knm-pane knm-study" aria-label="KNM 教材">
                <header className="knm-pane-header">
                    <h2>KNM</h2>
                    <p className="knm-pane-kicker">Kennis van de Nederlandse Maatschappij · 2025/26</p>
                </header>
                <div className="knm-study-body">
                    <nav className="knm-toc" aria-label="章節">
                        {KNM_SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                type="button"
                                className={activeId === section.id ? 'active' : ''}
                                onClick={() => jumpTo(section.id)}
                            >
                                {section.nav}
                            </button>
                        ))}
                    </nav>

                    {KNM_SECTIONS.map((section) => (
                        <article key={section.id} id={`knm-${section.id}`} className="knm-section">
                            <p className="knm-section-kicker">{section.kicker}</p>
                            <h3>{section.title}</h3>
                            {section.facts && (
                                <ul className="knm-facts">
                                    {section.facts.map((fact) => (
                                        <li key={fact.label}>
                                            <span>{fact.label}</span>
                                            <strong>{fact.value}</strong>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {section.blocks.map((block, i) => (
                                <Block key={`${section.id}-${i}`} block={block} />
                            ))}
                        </article>
                    ))}
                </div>
            </section>

            <section className="knm-pane knm-quiz" aria-label="KNM 考題">
                <header className="knm-pane-header knm-quiz-header">
                    <h2>考題</h2>
                    <a
                        className="knm-open-btn"
                        href={QUIZ_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        在新分頁開啟
                        <Icon name="arrowUpRight" size={14} />
                    </a>
                </header>
                <div className="knm-quiz-body">
                    {!showFallback && (
                        <iframe
                            ref={iframeRef}
                            className="knm-iframe"
                            src={QUIZ_URL}
                            title="KNM 考題"
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            allow="clipboard-write"
                        />
                    )}
                    {embedState === 'loading' && (
                        <div className="knm-fallback knm-loading-hint" aria-live="polite">
                            正在載入考題…
                        </div>
                    )}
                    {showFallback && (
                        <div className="knm-fallback">
                            <p className="knm-fallback-title">無法在此頁鑲嵌考題</p>
                            <p className="knm-fallback-copy">
                                Google NotebookLM 不允許把考題嵌進別的網站，作答也需要登入 Google 帳號。請在新分頁開啟。
                            </p>
                            <a
                                className="knm-fallback-cta"
                                href={QUIZ_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                在新分頁開啟考題
                                <Icon name="arrowUpRight" size={16} />
                            </a>
                        </div>
                    )}
                </div>
            </section>

            <style>{`
                .knm-layout {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    min-height: 0;
                    overflow: hidden;
                    background: var(--bg-canvas);
                }

                .knm-pane {
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    min-height: 0;
                    overflow: hidden;
                }

                .knm-study {
                    flex: 0 0 45%;
                    width: 45%;
                    border-right: 1px solid var(--border-subtle);
                    background: var(--bg-surface);
                }

                .knm-quiz {
                    flex: 1 1 55%;
                    background: var(--bg-canvas);
                }

                .knm-pane-header {
                    flex-shrink: 0;
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border-subtle);
                    background: var(--bg-surface);
                }

                .knm-pane-header h2 {
                    margin: 0;
                    font-family: var(--font-sans);
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    letter-spacing: 0.02em;
                }

                .knm-pane-kicker {
                    margin: 4px 0 0;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    letter-spacing: 0.01em;
                }

                .knm-quiz-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .knm-open-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    height: 32px;
                    padding: 0 12px;
                    border-radius: var(--radius-btn);
                    border: 1px solid var(--border-default);
                    background: var(--bg-surface);
                    color: var(--text-primary);
                    font-size: 0.78rem;
                    font-weight: 600;
                    text-decoration: none;
                    white-space: nowrap;
                    transition: background 0.15s var(--spring-smooth);
                }

                .knm-open-btn:hover {
                    background: var(--bg-tint);
                }

                .knm-study-body {
                    flex: 1;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    padding: 0 0 48px;
                }

                .knm-toc {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    display: flex;
                    flex-wrap: nowrap;
                    gap: 6px;
                    padding: 10px 16px;
                    overflow-x: auto;
                    background: rgba(255, 255, 255, 0.92);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid var(--border-subtle);
                }

                .knm-toc button {
                    flex: 0 0 auto;
                    height: 28px;
                    padding: 0 10px;
                    border: 1px solid transparent;
                    border-radius: var(--radius-full);
                    background: var(--bg-tint);
                    color: var(--text-secondary);
                    font-family: var(--font-sans);
                    font-size: 0.72rem;
                    font-weight: 700;
                    cursor: pointer;
                }

                .knm-toc button.active,
                .knm-toc button:hover {
                    background: var(--brand-accent-soft);
                    color: var(--brand-ink);
                    border-color: rgba(241, 90, 41, 0.25);
                }

                .knm-section {
                    padding: 22px 24px 8px;
                    scroll-margin-top: 52px;
                    border-bottom: 1px solid var(--border-subtle);
                }

                .knm-section:last-child {
                    border-bottom: none;
                }

                .knm-section-kicker {
                    margin: 0 0 4px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: var(--brand-primary);
                }

                .knm-section h3 {
                    margin: 0 0 12px;
                    font-family: var(--font-sans);
                    font-size: 1.18rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .knm-h4 {
                    margin: 14px 0 8px;
                    font-size: 0.82rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .knm-p,
                .knm-list span,
                .knm-card li,
                .knm-compare li {
                    font-family: var(--font-word);
                    font-size: 0.95rem;
                    line-height: 1.65;
                    color: var(--text-secondary);
                }

                .knm-p {
                    margin: 0 0 12px;
                }

                .knm-facts {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin: 0 0 14px;
                    list-style: none;
                }

                .knm-facts li {
                    padding: 10px 12px;
                    border-radius: var(--radius-md);
                    background: var(--bg-tint);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .knm-facts span {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--text-tertiary);
                }

                .knm-facts strong {
                    font-size: 0.82rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .knm-compare {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin: 0 0 14px;
                }

                .knm-compare > div {
                    padding: 12px;
                    border-radius: var(--radius-md);
                    background: var(--bg-tint);
                }

                .knm-compare h4 {
                    margin: 0 0 6px;
                    font-size: 0.78rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .knm-compare ul,
                .knm-card ul {
                    margin: 0;
                    padding-left: 1.1em;
                }

                .knm-list {
                    list-style: none;
                    margin: 0 0 8px;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .knm-list li {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .knm-list strong {
                    font-family: var(--font-sans);
                    font-size: 0.84rem;
                    font-weight: 800;
                    color: var(--brand-ink);
                }

                .knm-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin: 0 0 12px;
                }

                .knm-card {
                    padding: 12px 14px;
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    background: var(--bg-canvas);
                }

                .knm-card header {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    gap: 8px;
                    margin-bottom: 6px;
                }

                .knm-card h4 {
                    margin: 0;
                    font-size: 0.88rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .knm-card header span {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--brand-primary);
                    white-space: nowrap;
                }

                .knm-phones {
                    list-style: none;
                    margin: 0 0 14px;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .knm-phones li {
                    display: grid;
                    grid-template-columns: 88px 1fr;
                    gap: 10px;
                    align-items: start;
                }

                .knm-phones code {
                    font-family: var(--font-sans);
                    font-size: 0.78rem;
                    font-weight: 800;
                    color: var(--brand-accent);
                    background: var(--brand-accent-soft);
                    border-radius: 6px;
                    padding: 4px 8px;
                    text-align: center;
                }

                .knm-phones span {
                    font-family: var(--font-word);
                    font-size: 0.88rem;
                    line-height: 1.5;
                    color: var(--text-secondary);
                }

                .knm-dl {
                    margin: 0 0 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .knm-dl-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
                    gap: 10px;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--border-subtle);
                }

                .knm-dl-row:last-child {
                    border-bottom: none;
                }

                .knm-dl dt {
                    font-family: var(--font-word);
                    font-size: 0.88rem;
                    line-height: 1.45;
                    color: var(--text-secondary);
                }

                .knm-dl dd {
                    margin: 0;
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: var(--brand-ink);
                    text-align: right;
                    line-height: 1.4;
                }

                .knm-callout {
                    margin: 8px 0 14px;
                    padding: 10px 12px;
                    border-left: 3px solid var(--brand-accent);
                    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
                    background: var(--brand-accent-soft);
                    font-family: var(--font-sans);
                    font-size: 0.84rem;
                    font-weight: 600;
                    line-height: 1.5;
                    color: var(--text-primary);
                }

                .knm-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    list-style: none;
                    margin: 0 0 12px;
                    padding: 0;
                }

                .knm-chips li {
                    padding: 5px 10px;
                    border-radius: var(--radius-full);
                    background: var(--bg-tint);
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .knm-quiz-body {
                    position: relative;
                    flex: 1;
                    min-height: 0;
                    background: var(--bg-canvas);
                }

                .knm-iframe {
                    display: block;
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: var(--bg-surface);
                }

                .knm-fallback {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 32px 24px;
                    text-align: center;
                    background: var(--bg-surface);
                }

                .knm-loading-hint {
                    background: transparent;
                    pointer-events: none;
                    color: var(--text-tertiary);
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .knm-fallback-title {
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: var(--text-primary);
                }

                .knm-fallback-copy {
                    margin: 0;
                    max-width: 28em;
                    font-size: 0.9rem;
                    line-height: 1.55;
                    color: var(--text-secondary);
                }

                .knm-fallback-cta {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                    height: var(--btn-height);
                    padding: var(--btn-pad);
                    border-radius: var(--radius-btn);
                    background: var(--brand-accent);
                    color: var(--text-on-accent);
                    font-size: 0.92rem;
                    font-weight: 700;
                    text-decoration: none;
                    box-shadow: var(--elevation-1);
                    transition: transform 0.15s var(--spring-smooth);
                }

                .knm-fallback-cta:hover {
                    transform: translateY(-1px);
                }

                @media (max-width: 768px) {
                    .knm-layout {
                        flex-direction: column;
                        overflow: auto;
                    }
                    .knm-study,
                    .knm-quiz {
                        flex: 1 1 50%;
                        width: 100%;
                        min-height: 48vh;
                    }
                    .knm-study {
                        border-right: none;
                        border-bottom: 1px solid var(--border-subtle);
                    }
                    .knm-section {
                        padding: 18px 16px 8px;
                    }
                    .knm-facts {
                        grid-template-columns: 1fr;
                    }
                    .knm-compare {
                        grid-template-columns: 1fr;
                    }
                    .knm-phones li,
                    .knm-dl-row {
                        grid-template-columns: 1fr;
                    }
                    .knm-dl dd {
                        text-align: left;
                    }
                }
            `}</style>
        </div>
    )
}
