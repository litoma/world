import { useState, useEffect, useCallback } from 'react';
import { initAuth, login, logout } from './firebase/auth';
import { User } from 'firebase/auth';
import { MiniChart } from './components/MiniChart';
import { SYMBOLS, Category } from './symbols';
import './index.css';

interface Quote {
  price: number;
  change: number;
  changePct: number;
  source: string;
  updatedAt: number;
}

interface MarketData {
  snapshot: {
    fetchedAt: number;
    quotes: {
      [symbolId: string]: Quote;
    };
  };
  history: {
    updatedAt: number;
    series: {
      [symbolId: string]: Array<{ t: number; p: number }>;
    };
  };
}

interface LayoutConfig {
  version: number;
  enabledSymbols: string[];
  gridColumns: number;
}


const CATEGORY_COLORS: Record<Category, string> = {
  fx: '#29b6f6',        // 明るい青色
  index: '#e040fb',     // 鮮やかなネオンパープル
  bond: '#00e5ff',      // 非常に明るいシアン/水色
  commodity: '#ffd600', // 鮮やかなイエロー
  crypto: '#1de9b6',    // 鮮やかなミント/ターコイズグリーン (BONDの水色と区別)
  other: '#b0bec5'      // 明るめの灰色
};

const DEFAULT_ENABLED_SYMBOLS = SYMBOLS.filter(s => s.defaultOn).map(s => s.id);
const LOCAL_STORAGE_KEY = 'world_stock_layout_config';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout state
  const [enabledSymbols, setEnabledSymbols] = useState<string[]>(DEFAULT_ENABLED_SYMBOLS);
  const [gridColumns, setGridColumns] = useState<number>(4);
  const [currentView, setCurrentView] = useState<string>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.body.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
  };

  // Hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const path = hash.replace(/^#\//, '');
      setCurrentView(path || 'home');
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Initialize layout from localStorage (synchronous fallback)
  useEffect(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const config: LayoutConfig = JSON.parse(cached);
        if (config.enabledSymbols && config.enabledSymbols.length > 0) {
          setEnabledSymbols(config.enabledSymbols);
        }
        if (config.gridColumns) {
          setGridColumns(config.gridColumns);
        }
      } catch (e) {
        console.error('Failed to parse cached layout config');
      }
    }
  }, []);

  // Fetch market data
  const fetchData = async () => {
    try {
      const apiBase = import.meta.env.DEV ? 'http://localhost:8788' : 'https://world.litoma.workers.dev';
      const res = await fetch(`${apiBase}/api/snapshot?_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`API returned status ${res.status}`);
      }
      const data = await res.json();
      setMarketData(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  // Load layout config from D1 Database (and sync to localStorage)
  const fetchLayout = useCallback(async (uid: string) => {
    try {
      const apiBase = import.meta.env.DEV ? 'http://localhost:8788' : 'https://world.litoma.workers.dev';
      const res = await fetch(`${apiBase}/api/layout?uid=${uid}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const config: LayoutConfig = data.config;
          if (config.enabledSymbols && config.enabledSymbols.length > 0) {
            setEnabledSymbols(config.enabledSymbols);
          }
          if (config.gridColumns) {
            setGridColumns(config.gridColumns);
          }
          // Sync back to localStorage
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
        }
      }
    } catch (e) {
      console.error('Failed to fetch layout from database', e);
    }
  }, []);

  // Initialize Firebase Auth
  useEffect(() => {
    initAuth((user) => {
      setUser(user);
      const uid = user ? user.uid : 'default';
      fetchLayout(uid);
    });
  }, [fetchLayout]);

  // Market data polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save layout config to local and database (hybrid save)
  const saveLayout = async (newSymbols: string[], newCols: number) => {
    const config: LayoutConfig = {
      version: 1,
      enabledSymbols: newSymbols,
      gridColumns: newCols
    };

    // 1. Instant save to local storage for snappy UI
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));

    // 2. Save to D1 database asynchronously
    const uid = user ? user.uid : 'default';
    try {
      const apiBase = import.meta.env.DEV ? 'http://localhost:8788' : 'https://world.litoma.workers.dev';
      await fetch(`${apiBase}/api/layout?uid=${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
    } catch (e) {
      console.error('Failed to save layout to database', e);
    }
  };



  const handleChangeGridColumns = (newCols: number) => {
    setGridColumns(newCols);
    saveLayout(enabledSymbols, newCols);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ cursor: 'pointer', margin: 0, fontSize: '1.5rem', whiteSpace: 'nowrap' }} onClick={() => window.location.hash = '#/'}>
          Global Market Dashboard
        </h1>

        {/* Navigation center */}
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { key: 'home',      label: 'HOME',      color: '#ffffff' },
            { key: 'fx',        label: 'FOREX',     color: '#29b6f6' },
            { key: 'index',     label: 'INDEX',     color: '#e040fb' },
            { key: 'bond',      label: 'BOND',      color: '#00e5ff' },
            { key: 'commodity', label: 'COMMODITY', color: '#ffd600' },
            { key: 'crypto',    label: 'CRYPTO',    color: '#1de9b6' },
            { key: 'other',     label: 'OTHER',     color: '#b0bec5' }
          ].map(item => {
            const isActive = currentView === item.key;
            return (
              <a
                key={item.key}
                href={`#/${item.key === 'home' ? '' : item.key}`}
                style={{
                  color: item.color,
                  opacity: isActive ? 1 : 0.6,
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.95rem',
                  padding: '0.25rem 0.5rem',
                  borderBottom: isActive ? `2px solid ${item.color}` : '2px solid transparent',
                  transition: 'opacity 0.2s, border-bottom 0.2s'
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="header-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* COL select dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>COL</span>
            <select
              value={gridColumns}
              onChange={(e) => handleChangeGridColumns(Number(e.target.value))}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                padding: '0.4rem 0.5rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none'
              }}
            >
              {[4, 6, 8, 10].map(cols => (
                <option key={cols} value={cols} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  {cols}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={toggleTheme}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              padding: '0.45rem 0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem'
            }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <div id="auth-container">
            {!user ? (
              <button id="login-button" onClick={login}>ログイン</button>
            ) : (
              <div id="user-profile">
                <span id="user-email">{user.email || user.displayName || 'User'}</span>
                <button id="logout-button" onClick={logout}>ログアウト</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ padding: '1rem', width: '100%', maxWidth: 'none', boxSizing: 'border-box', flex: 1 }}>
        {loading && <p style={{ color: 'var(--text-secondary)' }}>データをロード中...</p>}
        {error && <p style={{ color: '#ef5350' }}>エラー: {error}</p>}

        {!loading && !error && marketData && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(calc(100% / ${gridColumns} - 1.5rem), 1fr))`,
            gap: '1.5rem',
            width: '100%'
          }}>
            {SYMBOLS.filter(s => currentView === 'home' ? enabledSymbols.includes(s.id) : s.category === currentView).map(symbolDef => {
              const quote = marketData.snapshot.quotes[symbolDef.id];
              const history = marketData.history.series[symbolDef.id] || [];

              if (!quote) return null;

              const isUp = quote.change >= 0;
              const priceColor = isUp ? '#26a69a' : '#ef5350';
              const decimalPlaces = symbolDef.category === 'fx' ? 3 : symbolDef.category === 'bond' ? 3 : 2;
              const themeColor = CATEGORY_COLORS[symbolDef.category] || '#9e9e9e';
              const isAdded = enabledSymbols.includes(symbolDef.id);

              return (
                <div key={symbolDef.id} className="chart-card" style={{ padding: '1.25rem', minHeight: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem', color: themeColor }}>{symbolDef.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{symbolDef.id}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let newSymbols: string[];
                        if (isAdded) {
                          newSymbols = enabledSymbols.filter(id => id !== symbolDef.id);
                        } else {
                          newSymbols = [...enabledSymbols, symbolDef.id];
                        }
                        setEnabledSymbols(newSymbols);
                        saveLayout(newSymbols, gridColumns);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ffffff',
                        borderRadius: '4px',
                        color: '#ffffff',
                        padding: 0,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px'
                      }}
                    >
                      {isAdded ? '－' : '＋'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <span style={{
                      color: priceColor,
                      fontWeight: 700,
                      fontSize: '1.7rem'
                    }}>
                      {isUp ? '+' : ''}{quote.changePct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Chart Container */}
                  <div style={{ height: '90px', width: '100%', marginBottom: '0.75rem', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                    {history.length > 1 ? (
                      <MiniChart data={history} change={quote.change} theme={theme} />
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        十分な履歴データがありません (蓄積中)
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.5px' }}>
                      {quote.price.toFixed(decimalPlaces)}
                    </span>
                    <span style={{ color: priceColor, fontSize: '1rem', fontWeight: 600 }}>
                      {isUp ? '+' : ''}{quote.change.toFixed(decimalPlaces)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem 1rem',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'transparent',
        textAlign: 'center',
        marginTop: 'auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          © 2026 <a href="https://x.com/litoma" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>yusukesakai.com</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
