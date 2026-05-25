import { useState, useEffect, useCallback } from 'react';
import { initAuth, login, logout } from './firebase/auth';
import { User } from 'firebase/auth';
import { MiniChart } from './components/MiniChart';
import { SettingsPanel } from './components/SettingsPanel';
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
  fx: '#2196f3',        // 青色
  index: '#9c27b0',     // 紫色
  bond: '#00bcd4',      // 水色
  commodity: '#ffd600', // 黄色
  crypto: '#00bcd4',    // 水色
  other: '#9e9e9e'      // 灰色
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>('home');

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
    <div>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 style={{ cursor: 'pointer', margin: 0, fontSize: '1.5rem' }} onClick={() => window.location.hash = '#/'}>
            Global Market Dashboard
          </h1>
          <div className="header-controls">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 500
              }}
            >
              <span>⚙</span> 設定
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
        </div>

        {/* Navigation center */}
        <nav style={{ display: 'flex', gap: '1.5rem', alignSelf: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { key: 'home',      label: 'HOME',      color: '#ffffff' },
            { key: 'fx',        label: 'FOREX',     color: '#2196f3' },
            { key: 'index',     label: 'INDEX',     color: '#9c27b0' },
            { key: 'bond',      label: 'BOND',      color: '#00bcd4' },
            { key: 'commodity', label: 'COMMODITY', color: '#ffd600' },
            { key: 'crypto',    label: 'CRYPTO',    color: '#00bcd4' },
            { key: 'other',     label: 'OTHER',     color: '#9e9e9e' }
          ].map(item => {
            const isActive = currentView === item.key;
            return (
              <a
                key={item.key}
                href={`#/${item.key === 'home' ? '' : item.key}`}
                style={{
                  color: isActive ? item.color : 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '1rem',
                  padding: '0.25rem 0.5rem',
                  borderBottom: isActive ? `2px solid ${item.color}` : 'none',
                  transition: 'color 0.2s, border-bottom 0.2s'
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>

      <main style={{ padding: '1rem', width: '100%', maxWidth: 'none', boxSizing: 'border-box' }}>
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
                        border: `1px solid ${isAdded ? 'var(--border)' : themeColor}`,
                        borderRadius: '4px',
                        color: isAdded ? 'var(--text-secondary)' : themeColor,
                        padding: '2px 6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      {isAdded ? '➖ HOME' : '➕ HOME'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <span style={{
                      color: priceColor,
                      fontWeight: 700,
                      fontSize: '1.7rem',
                      backgroundColor: isUp ? 'rgba(38, 166, 154, 0.08)' : 'rgba(239, 83, 80, 0.08)',
                      padding: '2px 10px',
                      borderRadius: '4px'
                    }}>
                      {isUp ? '+' : ''}{quote.changePct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Chart Container */}
                  <div style={{ height: '90px', width: '100%', marginBottom: '0.75rem', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
                    {history.length > 1 ? (
                      <MiniChart data={history} change={quote.change} />
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

      {/* Settings Sliding Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gridColumns={gridColumns}
        onChangeGridColumns={handleChangeGridColumns}
      />
    </div>
  );
}

export default App;
