import { useState } from 'react'
import { KNM_SECTIONS } from '../data/knmContent'
import KnmQuiz from './KnmQuiz'
import NlProvincesMap from './NlProvincesMap'

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
                            {' '}
                            {item.body}
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
    if (block.type === 'map') {
        return <NlProvincesMap />
    }
    return null
}

export default function KnmView() {
    const [activeId, setActiveId] = useState(KNM_SECTIONS[0].id)

    const jumpTo = (id) => {
        setActiveId(id)
        document.getElementById(`knm-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div className="knm-layout">
            <section className="knm-pane knm-study" aria-label="KNM 教材">
                <header className="knm-pane-header">
                    <h2>KNM</h2>
                    <p className="knm-pane-kicker">Kennis van de Nederlandse Maatschappij · 2025/26</p>
                </header>
                <div className="knm-study-body">
                    <nav className="knm-toc" aria-label="章節">
                        <div className="knm-toc-inner">
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
                        </div>
                    </nav>

                    <div className="knm-article">
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
                </div>
            </section>

            <section className="knm-pane knm-quiz" aria-label="KNM 考題">
                <header className="knm-pane-header knm-quiz-header">
                    <h2>考題</h2>
                </header>
                <div className="knm-quiz-body">
                    <KnmQuiz />
                </div>
            </section>

            <style>{`
                .knm-layout {
                    --knm-bg: #FFFFFF;
                    --knm-ink: #242424;
                    --knm-mute: #6B6B6B;
                    --knm-rule: rgba(36, 36, 36, 0.12);
                    --knm-measure: 680px;
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
                    flex: 2 1 0;
                    width: auto;
                    border-right: 1px solid var(--knm-rule);
                    background: var(--knm-bg);
                    color: var(--knm-ink);
                }

                .knm-quiz {
                    flex: 1 1 0;
                    width: auto;
                    min-width: 0;
                    background: var(--bg-canvas);
                }

                .knm-pane-header {
                    flex-shrink: 0;
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--border-subtle);
                    background: var(--bg-surface);
                }

                .knm-study .knm-pane-header {
                    max-width: calc(var(--knm-measure) + 96px);
                    margin: 0 auto;
                    width: 100%;
                    padding: 28px 48px 8px;
                    border-bottom: none;
                    background: transparent;
                }

                .knm-pane-header h2 {
                    margin: 0;
                    font-family: var(--font-sans);
                    font-size: 1.05rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    letter-spacing: 0.02em;
                }

                .knm-study .knm-pane-header h2 {
                    font-family: var(--font-word);
                    font-size: 2rem;
                    font-weight: 700;
                    line-height: 1.18;
                    letter-spacing: -0.02em;
                    color: var(--knm-ink);
                }

                .knm-pane-kicker {
                    margin: 4px 0 0;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    letter-spacing: 0.01em;
                }

                .knm-study .knm-pane-kicker {
                    margin-top: 8px;
                    font-family: var(--font-sans);
                    font-size: 0.88rem;
                    font-weight: 400;
                    color: var(--knm-mute);
                    letter-spacing: 0;
                }

                .knm-quiz-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }

                .knm-study-body {
                    flex: 1;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    padding: 0 0 80px;
                }

                .knm-toc {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    width: 100%;
                    background: rgba(255, 255, 255, 0.94);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid var(--knm-rule);
                }

                .knm-toc-inner {
                    display: flex;
                    flex-wrap: nowrap;
                    gap: 4px 20px;
                    max-width: calc(var(--knm-measure) + 96px);
                    margin: 0 auto;
                    width: 100%;
                    padding: 12px 48px 14px;
                    overflow-x: auto;
                }

                .knm-toc button {
                    flex: 0 0 auto;
                    height: auto;
                    padding: 6px 0;
                    border: none;
                    border-radius: 0;
                    background: transparent;
                    color: var(--knm-mute);
                    font-family: var(--font-sans);
                    font-size: 0.82rem;
                    font-weight: 500;
                    cursor: pointer;
                }

                .knm-toc button.active,
                .knm-toc button:hover {
                    color: var(--knm-ink);
                    background: transparent;
                    box-shadow: inset 0 -1px 0 var(--knm-ink);
                }

                .knm-article {
                    max-width: calc(var(--knm-measure) + 96px);
                    margin: 0 auto;
                    width: 100%;
                    padding: 0 48px;
                }

                .knm-section {
                    padding: 40px 0 8px;
                    scroll-margin-top: 56px;
                    border-bottom: 1px solid var(--knm-rule);
                }

                .knm-section:last-child {
                    border-bottom: none;
                    padding-bottom: 24px;
                }

                .knm-section-kicker {
                    margin: 0 0 10px;
                    font-family: var(--font-sans);
                    font-size: 0.78rem;
                    font-weight: 500;
                    letter-spacing: 0.01em;
                    text-transform: none;
                    color: var(--knm-mute);
                }

                .knm-section h3 {
                    margin: 0 0 20px;
                    font-family: var(--font-word);
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--knm-ink);
                    letter-spacing: -0.018em;
                    line-height: 1.22;
                }

                .knm-h4 {
                    margin: 28px 0 10px;
                    font-family: var(--font-sans);
                    font-size: 1.05rem;
                    font-weight: 700;
                    letter-spacing: -0.01em;
                    text-transform: none;
                    color: var(--knm-ink);
                }

                .knm-p,
                .knm-list,
                .knm-card li,
                .knm-compare li,
                .knm-phones span,
                .knm-dl dt,
                .knm-dl dd {
                    font-family: var(--font-word);
                    font-size: 1.25rem;
                    line-height: 1.58;
                    letter-spacing: -0.003em;
                    color: var(--knm-ink);
                }

                .knm-p {
                    margin: 0 0 1.35em;
                }

                .knm-facts {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px 22px;
                    margin: 0 0 28px;
                    padding: 0 0 22px;
                    list-style: none;
                    border-bottom: 1px solid var(--knm-rule);
                }

                .knm-facts li {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    padding: 0;
                    background: none;
                    border: none;
                }

                .knm-facts span {
                    font-family: var(--font-sans);
                    font-size: 0.82rem;
                    font-weight: 500;
                    letter-spacing: 0;
                    text-transform: none;
                    color: var(--knm-mute);
                }

                .knm-facts strong {
                    font-family: var(--font-sans);
                    font-size: 0.88rem;
                    font-weight: 600;
                    color: var(--knm-ink);
                }

                .knm-compare {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0 32px;
                    margin: 8px 0 32px;
                }

                .knm-compare > div {
                    padding: 0 0 0 0;
                    background: none;
                    border: none;
                }

                .knm-compare > div:first-child {
                    padding-right: 28px;
                    border-right: 1px solid var(--knm-rule);
                }

                .knm-compare h4 {
                    margin: 0 0 8px;
                    font-family: var(--font-sans);
                    font-size: 0.92rem;
                    font-weight: 700;
                    color: var(--knm-ink);
                }

                .knm-compare ul,
                .knm-card ul {
                    margin: 0;
                    padding-left: 1.15em;
                }

                .knm-list {
                    list-style: none;
                    margin: 0 0 1.4em;
                    padding: 0;
                }

                .knm-list li {
                    margin: 0 0 1.2em;
                }

                .knm-list li:last-child {
                    margin-bottom: 0;
                }

                .knm-list strong {
                    font-family: var(--font-word);
                    font-size: inherit;
                    font-weight: 700;
                    color: var(--knm-ink);
                }

                .knm-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    margin: 8px 0 28px;
                }

                .knm-card {
                    padding: 20px 0;
                    border: none;
                    border-top: 1px solid var(--knm-rule);
                    border-radius: 0;
                    background: none;
                }

                .knm-card:last-child {
                    border-bottom: 1px solid var(--knm-rule);
                }

                .knm-card header {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    gap: 12px;
                    margin-bottom: 8px;
                }

                .knm-card h4 {
                    margin: 0;
                    font-family: var(--font-sans);
                    font-size: 1.12rem;
                    font-weight: 700;
                    letter-spacing: -0.015em;
                    color: var(--knm-ink);
                }

                .knm-card header span {
                    font-family: var(--font-sans);
                    font-size: 0.82rem;
                    font-weight: 500;
                    color: var(--knm-mute);
                    white-space: nowrap;
                }

                .knm-card li {
                    font-size: 1.12rem;
                    line-height: 1.55;
                    margin: 0 0 0.35em;
                }

                .knm-phones {
                    list-style: none;
                    margin: 0 0 28px;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .knm-phones li {
                    display: grid;
                    grid-template-columns: 96px 1fr;
                    gap: 16px;
                    align-items: baseline;
                }

                .knm-phones code {
                    font-family: var(--font-sans);
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--knm-ink);
                    background: none;
                    border-radius: 0;
                    padding: 0;
                    text-align: left;
                }

                .knm-phones span {
                    font-size: 1.12rem;
                    line-height: 1.5;
                    color: var(--knm-ink);
                }

                .knm-dl {
                    margin: 0 0 28px;
                    display: flex;
                    flex-direction: column;
                }

                .knm-dl-row {
                    display: grid;
                    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
                    gap: 20px;
                    padding: 14px 0;
                    border-bottom: 1px solid var(--knm-rule);
                }

                .knm-dl-row:last-child {
                    border-bottom: none;
                }

                .knm-dl dt {
                    font-size: 1.12rem;
                    line-height: 1.45;
                    font-weight: 700;
                }

                .knm-dl dd {
                    margin: 0;
                    font-size: 1.12rem;
                    font-weight: 400;
                    color: var(--knm-ink);
                    text-align: left;
                    line-height: 1.5;
                }

                .knm-callout {
                    margin: 28px 0;
                    padding: 0 0 0 20px;
                    border: none;
                    border-left: 3px solid var(--knm-ink);
                    border-radius: 0;
                    background: none;
                    font-family: var(--font-word);
                    font-size: 1.35rem;
                    font-weight: 400;
                    font-style: italic;
                    line-height: 1.45;
                    letter-spacing: -0.01em;
                    color: var(--knm-ink);
                }

                .knm-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px 18px;
                    list-style: none;
                    margin: 0 0 28px;
                    padding: 0;
                }

                .knm-chips li {
                    padding: 0;
                    border-radius: 0;
                    background: none;
                    font-family: var(--font-sans);
                    font-size: 0.92rem;
                    font-weight: 500;
                    color: var(--knm-mute);
                }

                .knm-quiz-body {
                    position: relative;
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                    background: var(--bg-surface);
                    display: flex;
                    flex-direction: column;
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
                        border-bottom: 1px solid var(--knm-rule);
                    }
                    .knm-study .knm-pane-header,
                    .knm-toc-inner,
                    .knm-article {
                        padding-left: 22px;
                        padding-right: 22px;
                    }
                    .knm-study .knm-pane-header h2 {
                        font-size: 1.6rem;
                    }
                    .knm-section h3 {
                        font-size: 1.45rem;
                    }
                    .knm-p,
                    .knm-list,
                    .knm-card li,
                    .knm-compare li,
                    .knm-phones span,
                    .knm-dl dt,
                    .knm-dl dd {
                        font-size: 1.12rem;
                    }
                    .knm-facts {
                        flex-direction: column;
                        gap: 8px;
                    }
                    .knm-compare {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }
                    .knm-compare > div:first-child {
                        padding-right: 0;
                        border-right: none;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--knm-rule);
                    }
                    .knm-phones li,
                    .knm-dl-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    )
}
