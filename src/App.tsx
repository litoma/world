import { useState, useEffect, useCallback } from 'react';
import { initAuth, login, logout } from './firebase/auth';
import { User } from 'firebase/auth';
import { MiniChart } from './components/MiniChart';
import { SettingsPanel } from './components/SettingsPanel';
import { SYMBOLS, CATEGORY_LABELS, Category } from './symbols';
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

const CATEGORY_EMOJIS: Record<Category, string> = {
  fx: '💱',
  index: '📈',
  bond: '🏦',
  commodity: '🪙',
  crypto: '🪙',
  other: '📊'
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

  const handleChangeEnabledSymbols = (newSymbols: string[]) => {
    setEnabledSymbols(newSymbols);
    saveLayout(newSymbols, gridColumns);
  };

  const handleChangeGridColumns = (newCols: number) => {
    setGridColumns(newCols);
    saveLayout(enabledSymbols, newCols);
  };

  // Group enabled symbols by category
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div>
      <header>
        <h1 style={{ cursor: 'pointer' }} onClick={fetchData}>グローバルマーケット・ダッシュボード</h1>
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
      </header>

      <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        {loading && <p style={{ color: 'var(--text-secondary)' }}>データをロード中...</p>}
        {error && <p style={{ color: '#ef5350' }}>エラー: {error}</p>}

        {!loading && !error && marketData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {categories.map(category => {
              const categorySymbols = SYMBOLS.filter(
                s => s.category === category && enabledSymbols.includes(s.id)
              );
              if (categorySymbols.length === 0) return null;

              return (
                <section key={category} className="dashboard-section">
                  <div className="section-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <span>{CATEGORY_EMOJIS[category]}</span>
                      <span>{CATEGORY_LABELS[category]}</span>
                    </h2>
                  </div>

                  <div style={{
                    display: 'grid',
                    // Responsive grid columns template driven by state, fallback to 1 column on small screens
                    gridTemplateColumns: `repeat(auto-fill, minmax(calc(100% / ${gridColumns} - 1.5rem), 1fr))`,
                    gap: '1.5rem'
                  }}>
                    {categorySymbols.map(symbolDef => {
                      const quote = marketData.snapshot.quotes[symbolDef.id];
                      const history = marketData.history.series[symbolDef.id] || [];

                      if (!quote) return null;

                      const isUp = quote.change >= 0;
                      const priceColor = isUp ? '#26a69a' : '#ef5350';
                      const decimalPlaces = symbolDef.category === 'fx' ? 3 : symbolDef.category === 'bond' ? 3 : 2;

                      return (
                        <div key={symbolDef.id} className="chart-card" style={{ padding: '1.25rem', minHeight: '220px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{symbolDef.label}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{symbolDef.id}</span>
                            </div>
                            <span style={{
                              color: priceColor,
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              backgroundColor: isUp ? 'rgba(38, 166, 154, 0.08)' : 'rgba(239, 83, 80, 0.08)',
                              padding: '2px 8px',
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
                            <span style={{ fontSize: '1.7rem', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                              {quote.price.toFixed(decimalPlaces)}
                            </span>
                            <span style={{ color: priceColor, fontSize: '0.85rem', fontWeight: 500 }}>
                              {isUp ? '+' : ''}{quote.change.toFixed(decimalPlaces)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Settings Sliding Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        enabledSymbols={enabledSymbols}
        onChangeEnabledSymbols={handleChangeEnabledSymbols}
        gridColumns={gridColumns}
        onChangeGridColumns={handleChangeGridColumns}
      />
    </div>
  );
}

export default App;
