export interface SymbolDef {
  id: string;
  label: string;
  category: string;
  source: 'yahoo' | 'finnhub';
  yahooSymbol?: string;
  finnhubSymbol?: string;
  defaultOn: boolean;
}

export const SYMBOLS: SymbolDef[] = [
  // 為替（Yahoo Finance）
  { id: 'usdjpy',  label: 'USD/JPY',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'USDJPY=X',  defaultOn: true  },
  { id: 'eurusd',  label: 'EUR/USD',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'EURUSD=X',  defaultOn: true  },
  { id: 'gbpusd',  label: 'GBP/USD',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'GBPUSD=X',  defaultOn: false },
  { id: 'gbpjpy',  label: 'GBP/JPY',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'GBPJPY=X',  defaultOn: false },
  { id: 'eurjpy',  label: 'EUR/JPY',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'EURJPY=X',  defaultOn: false },
  { id: 'eurgbp',  label: 'EUR/GBP',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'EURGBP=X',  defaultOn: false },
  { id: 'audusd',  label: 'AUD/USD',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'AUDUSD=X',  defaultOn: false },
  { id: 'audjpy',  label: 'AUD/JPY',     category: 'fx',        source: 'yahoo',   yahooSymbol: 'AUDJPY=X',  defaultOn: false },
  { id: 'dxy',     label: 'DXY',         category: 'fx',        source: 'yahoo',   yahooSymbol: 'DX-Y.NYB',  defaultOn: true  },
  // 米国インデックス（Finnhub）
  { id: 'sp500',   label: 'S&P500',      category: 'index',     source: 'finnhub', finnhubSymbol: 'SPY',     defaultOn: true  },
  { id: 'nasdaq',  label: 'NASDAQ',      category: 'index',     source: 'finnhub', finnhubSymbol: 'QQQ',     defaultOn: true  },
  { id: 'dow',     label: 'ダウ平均',    category: 'index',     source: 'finnhub', finnhubSymbol: 'DIA',     defaultOn: true  },
  // 国際インデックス（Yahoo Finance）
  { id: 'n225',    label: '日経225',     category: 'index',     source: 'yahoo',   yahooSymbol: '^N225',     defaultOn: true  },
  { id: 'topix',   label: 'TOPIX(ETF)',  category: 'index',     source: 'yahoo',   yahooSymbol: '1306.T',    defaultOn: true  },
  { id: 'ftse',    label: 'FTSE100',     category: 'index',     source: 'yahoo',   yahooSymbol: '^FTSE',     defaultOn: false },
  { id: 'dax',     label: 'DAX',         category: 'index',     source: 'yahoo',   yahooSymbol: '^GDAXI',    defaultOn: false },
  { id: 'hsi',     label: 'ハンセン',    category: 'index',     source: 'yahoo',   yahooSymbol: '^HSI',      defaultOn: false },
  { id: 'asx200',  label: 'ASX200',      category: 'index',     source: 'yahoo',   yahooSymbol: '^AXJO',     defaultOn: false },
  { id: 'sse',     label: '上海総合',    category: 'index',     source: 'yahoo',   yahooSymbol: '000001.SS', defaultOn: false },
  // 米国債（Yahoo Finance）
  { id: 'us10y',   label: 'US10Y利回',   category: 'bond',      source: 'yahoo',   yahooSymbol: '^TNX',      defaultOn: true  },
  { id: 'us3m',    label: 'US3M利回',    category: 'bond',      source: 'yahoo',   yahooSymbol: '^IRX',      defaultOn: false },
  { id: 'tnote',   label: 'T-NOTE先物',  category: 'bond',      source: 'yahoo',   yahooSymbol: 'ZN=F',      defaultOn: false },
  { id: 'tbond',   label: 'T-BOND先物',  category: 'bond',      source: 'yahoo',   yahooSymbol: 'ZB=F',      defaultOn: false },
  // コモディティ先物（Finnhub）
  { id: 'gold',    label: 'ゴールド',    category: 'commodity', source: 'finnhub', finnhubSymbol: 'GLD',     defaultOn: true  },
  { id: 'silver',  label: 'シルバー',    category: 'commodity', source: 'finnhub', finnhubSymbol: 'SLV',     defaultOn: false },
  { id: 'wti',     label: 'WTI原油',     category: 'commodity', source: 'finnhub', finnhubSymbol: 'USO',     defaultOn: false },
  { id: 'brent',   label: 'Brent原油',   category: 'commodity', source: 'finnhub', finnhubSymbol: 'BNO',     defaultOn: false },
  // 仮想通貨（Yahoo Finance）
  { id: 'btc',     label: 'BTC/USD',     category: 'crypto',    source: 'yahoo',   yahooSymbol: 'BTC-USD',   defaultOn: true  },
  // その他（Yahoo Finance）
  { id: 'vix',     label: 'VIX',         category: 'other',     source: 'yahoo',   yahooSymbol: '^VIX',      defaultOn: true  },
  { id: 'hy',      label: 'ハイイールド',category: 'other',     source: 'yahoo',   yahooSymbol: 'HYG',       defaultOn: false },
  { id: 'reit',    label: 'REIT',        category: 'other',     source: 'yahoo',   yahooSymbol: 'VNQ',       defaultOn: false },
];
