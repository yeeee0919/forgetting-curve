import React, { useState, useEffect } from 'react'

const GRAMMAR_CATEGORIES = [
    // === 第一階段：基礎地基 (A0 - A1) ===
    {
        id: 'category-a0',
        title: '基礎地基 (A0 - A1)',
        isHeader: true
    },
    {
        id: 'a0-v2-regel',
        title: '動詞 V2 規則 (De V2-regel)',
        description: '直述句中有限動詞的位置'
    },
    {
        id: 'a0-inversie',
        title: '倒裝 (Inversie)',
        description: '強調成分移至句首時的結構變化'
    },
    {
        id: 'a0-nouns-articles',
        title: '名詞與冠詞 (De/Het)',
        description: '名詞性別及其對形容詞字尾（-e）的影響'
    },
    {
        id: 'a0-pronouns-verbs',
        title: '人稱代名詞與動詞變位',
        description: '包含 jij 倒裝時 -t 脫落的形態規則'
    },
    {
        id: 'a0-negation',
        title: '否定詞 (Niet vs. Geen)',
        description: '兩者的語意區分與位置'
    },
    {
        id: 'a0-separable-verbs',
        title: '分離動詞 (Scheidbare werkwoorden)',
        description: '字首拆解至句尾的初步概念'
    },

    // === 第二階段：結構擴充 (A2) ===
    {
        id: 'category-a2',
        title: '結構擴充 (A2)',
        isHeader: true
    },
    {
        id: 'a2-perfectum',
        title: '框形結構 1 (完成式)',
        description: '助動詞 (V2) + 過去分詞 (句尾)'
    },
    {
        id: 'a2-modals',
        title: '框形結構 2 (情態動詞)',
        description: '情態動詞 (V2) + 原形動詞 (句尾)'
    },
    {
        id: 'a2-reflexive',
        title: '反身動詞 (Wederkerende werkwoorden)',
        description: '如 zich wassen 的用法'
    },
    {
        id: 'a2-comparison',
        title: '比較級與最高級',
        description: '形容詞的程度變化'
    },
    {
        id: 'a2-indirect-questions',
        title: '間接問句',
        description: '語序從 V2 轉變為「動詞尾置」的開端'
    },

    // === 第三階段：邏輯串聯 (B1) ===
    {
        id: 'category-b1',
        title: '邏輯串聯 (B1)',
        isHeader: true
    },
    {
        id: 'b1-subclauses',
        title: '從句語序 (Bijzinnen)',
        description: '動詞全部堆疊在句尾的規則 (SOV 結構)'
    },
    {
        id: 'b1-conjunctions',
        title: '連接詞分類',
        description: '協調連接詞（不影響語序）與從屬連接詞（觸發動詞尾置）'
    },
    {
        id: 'b1-er-functions',
        title: 'Er 的四大功能',
        description: '地點、數量、虛主詞、被動語態中的用法'
    },
    {
        id: 'b1-passive',
        title: '被動語態 (Lijdende vorm)',
        description: 'Worden 與 Zijn 的區分及時態'
    },
    {
        id: 'b1-relative-clauses',
        title: '關係子句 (Relatieve zinnen)',
        description: 'Die/Dat 的選擇與引導'
    },

    // === 第四階段：修辭與精確度 (B2) ===
    {
        id: 'category-b2',
        title: '修辭與精確度 (B2)',
        isHeader: true
    },
    {
        id: 'b2-subjunctive',
        title: '虛擬語氣 (Conjunction)',
        description: '使用 zou/zouden 表達假設、願望或禮貌'
    },
    {
        id: 'b2-participles',
        title: '分詞結構',
        description: '使用現在分詞或過去分詞作為形容詞簡化句子'
    },
    {
        id: 'b2-pronominal-adverbs',
        title: '複合介係詞',
        description: 'Ervoor, daarover, waarmee 等結構的精確運用'
    },
    {
        id: 'b2-modal-particles',
        title: '標點與語氣助詞 (Modal particles)',
        description: 'Eens, even, maar, hoor 的語感掌握'
    },
    {
        id: 'b2-nominalization',
        title: '名詞化 (Nominalisering)',
        description: '將動詞或形容詞轉為名詞，增加學術寫作的正式感'
    }
]

export default function GrammarView() {
    // 預設選中第一個有效分類（非 header）
    const firstValidCategory = GRAMMAR_CATEGORIES.find(c => !c.isHeader);
    const [selectedCategory, setSelectedCategory] = useState(firstValidCategory ? firstValidCategory.id : null)
    const [page, setPage] = useState(1)

    const category = GRAMMAR_CATEGORIES.find(c => c.id === selectedCategory)

    useEffect(() => {
        setPage(1)
    }, [selectedCategory])

    const handleCategoryClick = (categoryId) => {
        setSelectedCategory(categoryId)
    }

    const prevPage = () => setPage(p => Math.max(1, p - 1))
    const nextPage = () => setPage(p => p + 1)

    return (
        <div className="grammar-split-layout">

            {/* 左側：分類選單 (Sidebar) */}
            <div className="grammar-sidebar">
                <div className="grammar-sidebar-header">
                    <h2>📖 文法分級講義</h2>
                </div>
                <div className="grammar-category-list">
                    {GRAMMAR_CATEGORIES.map(cat => {
                        if (cat.isHeader) {
                            return (
                                <div key={cat.id} className="grammar-category-header">
                                    {cat.title}
                                </div>
                            )
                        }

                        const isActive = cat.id === selectedCategory;
                        return (
                            <button
                                key={cat.id}
                                className={`grammar-category-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(cat.id)}
                            >
                                <div className="cat-icon">{isActive ? '📂' : '📄'}</div>
                                <div className="cat-text">
                                    <div className="cat-title">{cat.title}</div>
                                    <div className="cat-desc">{cat.description}</div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 右側：PPT 檢視器 (Main Content) */}
            <div className="grammar-main">
                {category ? (
                    <div className="ppt-viewer-container">
                        <div className="ppt-viewer-header">
                            <h2 className="ppt-viewer-title">{category.title}</h2>
                            <div className="ppt-viewer-controls">
                                <button className="ppt-btn-small" onClick={prevPage} disabled={page <= 1}>
                                    ← 上一頁
                                </button>
                                <span className="ppt-page-indicator">第 {page} 頁</span>
                                <button className="ppt-btn-small" onClick={nextPage}>
                                    下一頁 →
                                </button>
                                <a
                                    href={`/grammar/${category.id}.pdf`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ppt-btn-small outline"
                                    title="在新分頁開啟"
                                >
                                    ↗
                                </a>
                            </div>
                        </div>

                        <div className="ppt-slide-wrapper" style={{ background: '#f5f5f5' }}>
                            <iframe
                                src={`/grammar/${category.id}.pdf#page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                                width="100%"
                                height="100%"
                                style={{ border: 'none', display: 'block' }}
                                title={category.title}
                            >
                                您的瀏覽器不支援內嵌 PDF，請點擊上方按鈕在「新分頁開啟」。
                            </iframe>
                        </div>
                    </div>
                ) : (
                    <div className="ppt-empty-state">請由左側選擇一個文法主題</div>
                )}
            </div>

            <style>{`
                .grammar-split-layout {
                    display: flex;
                    width: 100%;
                    height: 100%; /* 確保可以填滿父容器 (app-content) */
                    overflow: hidden;
                    background: var(--bg-body);
                }

                /* -- 左側欄 Sidebar -- */
                .grammar-sidebar {
                    width: 240px;
                    flex-shrink: 0;
                    border-right: 1px solid var(--border);
                    background: var(--bg-card);
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }
                .grammar-sidebar-header {
                    padding: 16px 12px;
                    border-bottom: 1px solid var(--border);
                    position: sticky;
                    top: 0;
                    background: var(--bg-card);
                    z-index: 10;
                }
                .grammar-sidebar-header h2 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--text);
                }

                .grammar-category-list {
                    display: flex;
                    flex-direction: column;
                    padding: 10px;
                    gap: 6px;
                }
                
                .grammar-category-header {
                    font-size: 0.9rem;
                    font-weight: 800;
                    color: var(--accent);
                    margin-top: 16px;
                    margin-bottom: 8px;
                    padding: 0 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .grammar-category-header:first-child {
                    margin-top: 8px;
                }

                .grammar-category-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    text-align: left;
                    padding: 10px 10px;
                    border-radius: 12px;
                    border: 1px solid transparent;
                    background: transparent;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .grammar-category-item:hover {
                    background: var(--bg-hover);
                }
                .grammar-category-item.active {
                    background: rgba(108, 99, 255, 0.1); /* 使用你的 emphasis color 變種 */
                    border-color: rgba(108, 99, 255, 0.3);
                }
                .cat-icon {
                    font-size: 1.2rem;
                }
                .cat-text {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .cat-title {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--text);
                }
                .grammar-category-item.active .cat-title {
                    color: var(--accent);
                }
                .cat-desc {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    line-height: 1.3;
                }

                /* -- 右側主內容 Main -- */
                .grammar-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    overflow: hidden;
                    background: var(--bg-body);
                }

                .ppt-viewer-container {
                    flex: 1;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                .ppt-viewer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 16px;
                    border-bottom: 1px solid var(--border);
                    background: var(--bg-card);
                }
                .ppt-viewer-title {
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--text);
                    margin: 0;
                }
                .ppt-viewer-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .ppt-page-indicator {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-light);
                    min-width: 60px;
                    text-align: center;
                }
                .ppt-btn-small {
                    background: var(--accent);
                    color: white;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 16px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                }
                .ppt-btn-small:hover:not(:disabled) {
                    background: var(--accent-hover, #4f46e5);
                    transform: translateY(-1px);
                }
                .ppt-btn-small:disabled {
                    background: var(--border);
                    color: var(--text-muted);
                    cursor: not-allowed;
                }
                .ppt-btn-small.outline {
                    background: transparent;
                    color: var(--accent);
                    border: 1px solid var(--accent);
                    padding: 5px 10px;
                }
                .ppt-btn-small.outline:hover {
                    background: var(--accent);
                    color: white;
                }

                .ppt-slide-wrapper {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden; /* 保證不超出 */
                }

                .ppt-btn {
                    background: var(--accent);
                    color: white;
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                    border: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: opacity 0.2s;
                }
                .ppt-btn:hover {
                    opacity: 0.9;
                }
                .ppt-empty-state {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    font-size: 1.2rem;
                    font-weight: 700;
                    background: var(--bg-card);
                    border-radius: 16px;
                    border: 1px dashed var(--border);
                }

                /* RWD: 手機版自動改為上下堆疊或隱藏側邊欄 (這邊做簡單上下堆疊) */
                @media (max-width: 768px) {
                    .grammar-split-layout {
                        flex-direction: column;
                        overflow-y: auto;
                    }
                    .grammar-sidebar {
                        width: 100%;
                        max-height: 250px; /* 手機版限制選單高度 */
                        border-right: none;
                        border-bottom: 1px solid var(--border);
                    }
                    .grammar-main {
                        padding: 16px;
                        min-height: 500px;
                        overflow: visible;
                    }
                    .ppt-viewer-container {
                        min-height: 400px;
                    }
                    .ppt-btn {
                        padding: 8px 16px;
                        font-size: 0.9rem;
                    }
                }
            `}</style>
        </div>
    )
}

