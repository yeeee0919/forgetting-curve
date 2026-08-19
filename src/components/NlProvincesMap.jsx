import { useMemo, useState } from 'react'
import mapSvg from '../assets/nl-provinces.svg?raw'

const SVG_INNER = mapSvg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')

export const PROVINCES = [
    { id: 'Groningen', zh: '格羅寧根', hint: '東北角', short: 'Groningen', lx: 169, ly: 26 },
    { id: 'Friesland', zh: '弗里斯蘭', hint: '西北，弗里斯蘭語', short: 'Friesland', lx: 122, ly: 30 },
    { id: 'Drenthe', zh: '德倫特', hint: '格羅寧根南邊', short: 'Drenthe', lx: 164, ly: 58 },
    { id: 'Overijssel', zh: '上艾瑟爾', hint: '中東部', short: 'Overijssel', lx: 156, ly: 86 },
    { id: 'Flevoland', zh: '弗萊福蘭', hint: '圍海造地，最年輕', short: 'Flevoland', lx: 118, ly: 86 },
    { id: 'Gelderland', zh: '海爾德蘭', hint: '面積最大', short: 'Gelderland', lx: 144, ly: 126 },
    { id: 'Utrecht', zh: '烏特勒支', hint: 'Randstad 一員', short: 'Utrecht', lx: 88, ly: 108 },
    { id: 'Noord-Holland', zh: '北荷蘭', hint: '首都阿姆斯特丹', short: 'N-Holland', lx: 68, ly: 68 },
    { id: 'Zuid-Holland', zh: '南荷蘭', hint: '海牙、鹿特丹', short: 'Z-Holland', lx: 50, ly: 128 },
    { id: 'Zeeland', zh: '澤蘭', hint: '西南島嶼、三角洲工程', short: 'Zeeland', lx: 28, ly: 168 },
    { id: 'Noord-Brabant', zh: '北布拉班特', hint: '南部', short: 'N-Brabant', lx: 92, ly: 172 },
    { id: 'Limburg', zh: '林堡', hint: '東南細長', short: 'Limburg', lx: 138, ly: 198 },
]

const CITIES = [
    { name: 'Amsterdam', x: 72, y: 94 },
    { name: 'Den Haag', x: 46, y: 122 },
    { name: 'Rotterdam', x: 56, y: 138 },
    { name: 'Utrecht', x: 94, y: 118 },
]

function pickProvince(event) {
    const node = event.target.closest?.('[data-province]')
    return node?.getAttribute('data-province') || null
}

export default function NlProvincesMap() {
    const [activeId, setActiveId] = useState('Noord-Holland')
    const active = useMemo(
        () => PROVINCES.find((p) => p.id === activeId) || PROVINCES[7],
        [activeId],
    )

    return (
        <figure className="nl-map">
            <header className="nl-map-head">
                <h4>十二省 Provincies</h4>
                <p>點地圖或名單，對位置與中文。首都、政府城市已標出。</p>
            </header>
            <div className="nl-map-board">
                <svg
                    className="nl-map-svg"
                    viewBox="12 8 188 220"
                    role="img"
                    aria-label="荷蘭十二省地圖"
                    onClick={(e) => {
                        const id = pickProvince(e)
                        if (id) setActiveId(id)
                    }}
                    onMouseOver={(e) => {
                        const id = pickProvince(e)
                        if (id) setActiveId(id)
                    }}
                >
                    <g
                        className={activeId ? `nl-map-shapes is-${activeId}` : 'nl-map-shapes'}
                        dangerouslySetInnerHTML={{ __html: SVG_INNER }}
                    />
                    {CITIES.map((city) => (
                        <g key={city.name} className="nl-map-city" pointerEvents="none">
                            <circle cx={city.x} cy={city.y} r="1.7" />
                            <text x={city.x + 3.2} y={city.y + 1.4}>{city.name}</text>
                        </g>
                    ))}
                    {PROVINCES.map((p) => (
                        <text
                            key={p.id}
                            className={activeId === p.id ? 'nl-map-label on' : 'nl-map-label'}
                            x={p.lx}
                            y={p.ly}
                            textAnchor="middle"
                            pointerEvents="none"
                        >
                            {p.short}
                        </text>
                    ))}
                </svg>
                <figcaption className="nl-map-caption">
                    <strong>{active.id}</strong>
                    <span>{active.zh}</span>
                    <em>{active.hint}</em>
                </figcaption>
            </div>

            <ol className="nl-map-legend">
                {PROVINCES.map((p) => (
                    <li key={p.id}>
                        <button
                            type="button"
                            className={activeId === p.id ? 'on' : ''}
                            onClick={() => setActiveId(p.id)}
                            onMouseEnter={() => setActiveId(p.id)}
                        >
                            <b>{p.id}</b>
                            <span>{p.zh}</span>
                            <i>{p.hint}</i>
                        </button>
                    </li>
                ))}
            </ol>
            <p className="nl-map-src">地圖輪廓來源：Wikimedia Commons · Provinces of the Netherlands</p>
            <style>{`
                .nl-map {
                    margin: 4px 0 18px;
                    padding: 0;
                }

                .nl-map-head h4 {
                    margin: 0 0 4px;
                    font-family: var(--font-sans);
                    font-size: 0.78rem;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--knm-ink, #1E1A14);
                }

                .nl-map-head p {
                    margin: 0 0 10px;
                    font-family: var(--font-word);
                    font-size: 0.88rem;
                    line-height: 1.5;
                    color: var(--knm-ink-soft, #4F473C);
                }

                .nl-map-board {
                    background: #FFF9EE;
                    border: 1px solid rgba(30, 26, 20, 0.12);
                    border-radius: 4px;
                    padding: 8px 8px 0;
                }

                .nl-map-svg {
                    display: block;
                    width: 100%;
                    max-width: 340px;
                    margin: 0 auto;
                    height: auto;
                    overflow: visible;
                }

                .nl-prov {
                    cursor: pointer;
                    fill-rule: evenodd;
                    stroke: #2C261C;
                    stroke-width: 0.55;
                    stroke-linejoin: round;
                    transition: fill 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease;
                }

                .nl-prov[data-province="Groningen"] { fill: #8FB9A8; }
                .nl-prov[data-province="Friesland"] { fill: #6FA3A0; }
                .nl-prov[data-province="Drenthe"] { fill: #E2A07A; }
                .nl-prov[data-province="Overijssel"] { fill: #D4B15A; }
                .nl-prov[data-province="Flevoland"] { fill: #7EB0D4; }
                .nl-prov[data-province="Gelderland"] { fill: #D57A62; }
                .nl-prov[data-province="Utrecht"] { fill: #E6C56A; }
                .nl-prov[data-province="Noord-Holland"] { fill: #3F7A6C; }
                .nl-prov[data-province="Zuid-Holland"] { fill: #C45C3E; }
                .nl-prov[data-province="Zeeland"] { fill: #7D9B5E; }
                .nl-prov[data-province="Noord-Brabant"] { fill: #B5834A; }
                .nl-prov[data-province="Limburg"] { fill: #8A5E7A; }

                .nl-map-shapes [data-province] { opacity: 0.82; }
                .nl-map-shapes.is-Groningen [data-province="Groningen"],
                .nl-map-shapes.is-Friesland [data-province="Friesland"],
                .nl-map-shapes.is-Drenthe [data-province="Drenthe"],
                .nl-map-shapes.is-Overijssel [data-province="Overijssel"],
                .nl-map-shapes.is-Flevoland [data-province="Flevoland"],
                .nl-map-shapes.is-Gelderland [data-province="Gelderland"],
                .nl-map-shapes.is-Utrecht [data-province="Utrecht"],
                .nl-map-shapes.is-Noord-Holland [data-province="Noord-Holland"],
                .nl-map-shapes.is-Zuid-Holland [data-province="Zuid-Holland"],
                .nl-map-shapes.is-Zeeland [data-province="Zeeland"],
                .nl-map-shapes.is-Noord-Brabant [data-province="Noord-Brabant"],
                .nl-map-shapes.is-Limburg [data-province="Limburg"] {
                    opacity: 1;
                    stroke-width: 1.15;
                }

                .nl-map-label {
                    font-family: var(--font-sans);
                    font-size: 5.6px;
                    font-weight: 800;
                    fill: #1A1814;
                    stroke: #FFF9EE;
                    stroke-width: 2.4px;
                    paint-order: stroke;
                    letter-spacing: -0.02em;
                }

                .nl-map-label.on {
                    fill: #8B1E12;
                    font-size: 6.1px;
                }

                .nl-map-city circle {
                    fill: #1A1814;
                    stroke: #FFF9EE;
                    stroke-width: 0.7;
                }

                .nl-map-city text {
                    font-family: var(--font-sans);
                    font-size: 4.6px;
                    font-weight: 700;
                    fill: #1A1814;
                    stroke: #FFF9EE;
                    stroke-width: 1.8px;
                    paint-order: stroke;
                }

                .nl-map-caption {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 8px;
                    margin: 0;
                    padding: 8px 6px 10px;
                    border-top: 1px dotted rgba(30, 26, 20, 0.12);
                    font-family: var(--font-sans);
                }

                .nl-map-caption strong {
                    font-size: 0.92rem;
                    font-weight: 800;
                    color: #1E1A14;
                }

                .nl-map-caption span {
                    font-size: 0.84rem;
                    font-weight: 700;
                    color: #C45C4A;
                }

                .nl-map-caption em {
                    font-style: normal;
                    font-size: 0.75rem;
                    color: #4F473C;
                }

                .nl-map-legend {
                    list-style: none;
                    margin: 10px 0 0;
                    padding: 0;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 4px;
                }

                .nl-map-legend button {
                    width: 100%;
                    display: grid;
                    grid-template-columns: 1fr auto;
                    grid-template-rows: auto auto;
                    gap: 0 8px;
                    padding: 7px 8px;
                    border: 1px solid transparent;
                    border-radius: 4px;
                    background: transparent;
                    text-align: left;
                    cursor: pointer;
                }

                .nl-map-legend button.on {
                    background: #FFF9EE;
                    border-color: rgba(196, 92, 74, 0.35);
                }

                .nl-map-legend b {
                    font-size: 0.74rem;
                    font-weight: 800;
                    color: #1E1A14;
                    letter-spacing: -0.01em;
                }

                .nl-map-legend span {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: #C45C4A;
                    text-align: right;
                }

                .nl-map-legend i {
                    grid-column: 1 / -1;
                    font-style: normal;
                    font-size: 0.68rem;
                    color: #6A6156;
                    line-height: 1.35;
                }

                .nl-map-src {
                    margin: 8px 0 0;
                    font-size: 0.62rem;
                    color: #8A8074;
                }

                @media (max-width: 768px) {
                    .nl-map-legend {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </figure>
    )
}
