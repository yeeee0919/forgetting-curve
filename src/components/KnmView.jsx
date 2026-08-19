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
                </header>
                <div className="knm-quiz-body">
                    <KnmQuiz />
                </div>
            </section>

            <style>{`
                .knm-layout {
                    --knm-paper: #F3EFE4;
                    --knm-paper-edge: #E7DFD0;
                    --knm-card: #FFF9EE;
                    --knm-wash: #E9E0CD;
                    --knm-ink: #1E1A14;
                    --knm-ink-soft: #4F473C;
                    --knm-line: rgba(30, 26, 20, 0.12);
                    --knm-margin: #C45C4A;
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
                    border-right: 1px solid var(--knm-paper-edge);
                    background:
                        linear-gradient(90deg, transparent 27px, var(--knm-margin) 27px, var(--knm-margin) 29px, transparent 29px),
                        repeating-linear-gradient(
                            180deg,
                            transparent 0,
                            transparent 31px,
                            rgba(70, 110, 160, 0.09) 31px,
                            rgba(70, 110, 160, 0.09) 32px
                        ),
                        var(--knm-paper);
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
                    padding: 16px 20px 14px 40px;
                    border-bottom: 1px solid var(--knm-line);
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
                    font-size: 1.35rem;
                    font-weight: 700;
                    color: var(--knm-ink);
                    letter-spacing: -0.02em;
                }

                .knm-pane-kicker {
                    margin: 4px 0 0;
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    letter-spacing: 0.01em;
                }

                .knm-study .knm-pane-kicker {
                    color: var(--knm-ink-soft);
                    font-weight: 500;
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
                    padding: 0 0 56px;
                }

                .knm-toc {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    display: flex;
                    flex-wrap: nowrap;
                    gap: 6px;
                    padding: 10px 16px 10px 40px;
                    overflow-x: auto;
                    background: rgba(243, 239, 228, 0.94);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border-bottom: 1px dashed var(--knm-line);
                }

                .knm-toc button {
                    flex: 0 0 auto;
                    height: 28px;
                    padding: 0 10px;
                    border: 1px solid transparent;
                    border-radius: 999px;
                    background: transparent;
                    color: var(--knm-ink-soft);
                    font-family: var(--font-sans);
                    font-size: 0.72rem;
                    font-weight: 700;
                    cursor: pointer;
                }

                .knm-toc button.active,
                .knm-toc button:hover {
                    background: #FFF9EE;
                    color: var(--knm-ink);
                    border-color: rgba(196, 92, 74, 0.35);
                }

                .knm-section {
                    padding: 26px 22px 14px 40px;
                    scroll-margin-top: 52px;
                    border-bottom: 1px dashed var(--knm-line);
                }

                .knm-section:last-child {
                    border-bottom: none;
                }

                .knm-section-kicker {
                    margin: 0 0 4px;
                    font-family: var(--font-sans);
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: var(--knm-margin);
                }

                .knm-section h3 {
                    margin: 0 0 14px;
                    font-family: var(--font-word);
                    font-size: 1.28rem;
                    font-weight: 700;
                    color: var(--knm-ink);
                    letter-spacing: -0.02em;
                    line-height: 1.3;
                }

                .knm-h4 {
                    margin: 16px 0 8px;
                    font-family: var(--font-sans);
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--knm-ink);
                }

                .knm-p,
                .knm-list span,
                .knm-card li,
                .knm-compare li {
                    font-family: var(--font-word);
                    font-size: 1.02rem;
                    line-height: 1.78;
                    color: var(--knm-ink-soft);
                }

                .knm-p {
                    margin: 0 0 14px;
                    color: var(--knm-ink);
                    max-width: 42em;
                }

                .knm-facts {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin: 0 0 16px;
                    list-style: none;
                }

                .knm-facts li {
                    padding: 10px 12px;
                    border-radius: 4px;
                    background: var(--knm-card);
                    border: 1px solid var(--knm-line);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .knm-facts span {
                    font-family: var(--font-sans);
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--knm-margin);
                }

                .knm-facts strong {
                    font-size: 0.86rem;
                    font-weight: 800;
                    color: var(--knm-ink);
                }

                .knm-compare {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin: 0 0 16px;
                }

                .knm-compare > div {
                    padding: 12px 14px;
                    border-radius: 4px;
                    background: var(--knm-card);
                    border: 1px solid var(--knm-line);
                }

                .knm-compare h4 {
                    margin: 0 0 6px;
                    font-size: 0.78rem;
                    font-weight: 800;
                    color: var(--knm-ink);
                }

                .knm-compare ul,
                .knm-card ul {
                    margin: 0;
                    padding-left: 1.15em;
                }

                .knm-list {
                    list-style: none;
                    margin: 0 0 10px;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .knm-list li {
                    display: grid;
                    grid-template-columns: 8px 1fr;
                    column-gap: 10px;
                    row-gap: 2px;
                }

                .knm-list li::before {
                    content: '';
                    width: 8px;
                    height: 8px;
                    margin-top: 0.55em;
                    border-radius: 50%;
                    background: var(--knm-margin);
                }

                .knm-list strong,
                .knm-list span {
                    grid-column: 2;
                }

                .knm-list strong {
                    font-family: var(--font-sans);
                    font-size: 0.86rem;
                    font-weight: 800;
                    color: var(--knm-ink);
                }

                .knm-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin: 0 0 14px;
                }

                .knm-card {
                    padding: 12px 14px;
                    border: 1px solid var(--knm-line);
                    border-left: 3px solid var(--brand-primary);
                    border-radius: 0 4px 4px 0;
                    background: var(--knm-card);
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
                    font-size: 0.92rem;
                    font-weight: 800;
                    color: var(--knm-ink);
                }

                .knm-card header span {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--brand-primary);
                    white-space: nowrap;
                }

                .knm-phones {
                    list-style: none;
                    margin: 0 0 16px;
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
                    color: var(--knm-margin);
                    background: #F7E3D8;
                    border-radius: 4px;
                    padding: 4px 8px;
                    text-align: center;
                }

                .knm-phones span {
                    font-family: var(--font-word);
                    font-size: 0.95rem;
                    line-height: 1.55;
                    color: var(--knm-ink-soft);
                }

                .knm-dl {
                    margin: 0 0 14px;
                    display: flex;
                    flex-direction: column;
                }

                .knm-dl-row {
                    display: grid;
                    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
                    gap: 12px;
                    padding: 10px 0;
                    border-bottom: 1px dotted var(--knm-line);
                }

                .knm-dl-row:last-child {
                    border-bottom: none;
                }

                .knm-dl dt {
                    font-family: var(--font-word);
                    font-size: 0.95rem;
                    line-height: 1.5;
                    color: var(--knm-ink);
                }

                .knm-dl dd {
                    margin: 0;
                    font-family: var(--font-sans);
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: var(--knm-ink-soft);
                    text-align: right;
                    line-height: 1.45;
                }

                .knm-callout {
                    margin: 10px 0 16px;
                    padding: 10px 14px;
                    border: none;
                    border-radius: 2px;
                    background: #F4E7A3;
                    font-family: var(--font-word);
                    font-size: 0.95rem;
                    font-weight: 600;
                    line-height: 1.6;
                    color: var(--knm-ink);
                }

                .knm-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    list-style: none;
                    margin: 0 0 14px;
                    padding: 0;
                }

                .knm-chips li {
                    padding: 4px 9px;
                    border-radius: 3px;
                    background: var(--knm-wash);
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--knm-ink);
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
                        border-bottom: 1px solid var(--knm-paper-edge);
                    }
                    .knm-section,
                    .knm-study .knm-pane-header,
                    .knm-toc {
                        padding-left: 36px;
                    }
                    .knm-section {
                        padding-right: 16px;
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
