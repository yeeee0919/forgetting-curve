export default function Navbar({ view, setView, dueCount, onImport, onSettings }) {
  return (
    <nav className="navbar">
      <div className="nav-brand">🧠 toocheepfordutch</div>
      <div className="nav-tabs">
        <button
          className={`nav-tab ${view === 'home' ? 'active' : ''}`}
          onClick={() => setView('home')}
        >
          首頁
        </button>
        <button
          className={`nav-tab ${view === 'review' ? 'active' : ''}`}
          onClick={() => setView('review')}
        >
          複習
          {dueCount > 0 && <span className="badge">{dueCount}</span>}
        </button>
        <button
          className={`nav-tab ${view === 'library' ? 'active' : ''}`}
          onClick={() => setView('library')}
        >
          卡片庫
        </button>
      </div>
      <div className="nav-actions">
        <button className="nav-btn" onClick={onImport} title="AI 匯入">✨</button>
        <button className="nav-btn" onClick={onSettings} title="設定">⚙️</button>
      </div>

      <style>{`
        .navbar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 24px;
          height: 60px;
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .nav-brand {
          font-weight: 800;
          font-size: 1.1rem;
          background: linear-gradient(135deg, #6c63ff, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
        }
        .nav-tabs {
          display: flex;
          gap: 4px;
          flex: 1;
          justify-content: center;
        }
        .nav-tab {
          background: none;
          color: var(--text-muted);
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s, background 0.2s;
          position: relative;
        }
        .nav-tab:hover { background: var(--border); color: var(--text); }
        .nav-tab.active { background: rgba(108,99,255,0.15); color: var(--accent-light); font-weight: 700; }
        .badge {
          position: absolute;
          top: 2px; right: 2px;
          background: var(--again);
          color: #fff;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }
        .nav-actions { display: flex; gap: 4px; }
        .nav-btn {
          background: none;
          font-size: 1.2rem;
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .nav-btn:hover { background: var(--border); }
      `}</style>
    </nav>
  )
}
