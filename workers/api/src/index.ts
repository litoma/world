import { SYMBOLS } from './symbols';

interface Env {
  MARKET_KV: KVNamespace;
  LAYOUT_DB: D1Database;
  FINNHUB_API_KEY: string;
}

interface Quote {
  price: number;
  change: number;
  changePct: number;
  source: 'yahoo' | 'finnhub';
  updatedAt: number;
}

interface Snapshot {
  fetchedAt: number;
  quotes: {
    [symbolId: string]: Quote;
  };
}

interface HistoryPoint {
  t: number; // UNIX timestamp in seconds
  p: number; // Price
}

interface History {
  updatedAt: number;
  series: {
    [symbolId: string]: HistoryPoint[];
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_LAYOUT = {
  version: 1,
  enabledSymbols: ['usdjpy', 'eurusd', 'dxy', 'sp500', 'nasdaq', 'dow', 'n225', 'topix', 'us10y', 'gold', 'btc', 'vix'],
  gridColumns: 4
};

export default {
  // Cron Trigger
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(fetchAndSave(env));
  },

  // HTTP Requests (API + Debug Triggers)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // GET /api/snapshot
    if (url.pathname === '/api/snapshot' && request.method === 'GET') {
      try {
        const marketDataStr = await env.MARKET_KV.get('market:data');
        let snapshot = { fetchedAt: 0, quotes: {} };
        let history = { updatedAt: 0, series: {} };

        if (marketDataStr) {
          const marketData = JSON.parse(marketDataStr);
          if (marketData.snapshot) snapshot = marketData.snapshot;
          if (marketData.history) history = marketData.history;
        } else {
          // Migration/fallback logic: If market:data is not found, fetch from old keys
          const snapshotStr = await env.MARKET_KV.get('market:snapshot');
          const historyStr = await env.MARKET_KV.get('market:history');
          if (snapshotStr) {
            try {
              snapshot = JSON.parse(snapshotStr);
            } catch (e) {
              console.warn('Failed to parse fallback snapshot.');
            }
          }
          if (historyStr) {
            try {
              history = JSON.parse(historyStr);
            } catch (e) {
              console.warn('Failed to parse fallback history.');
            }
          }
          // Immediately save to market:data so subsequent requests don't need to read old keys
          if (snapshotStr || historyStr) {
            await env.MARKET_KV.put('market:data', JSON.stringify({ snapshot, history }));
          }
        }

        return corsResponse({
          snapshot,
          history
        });
      } catch (error: any) {
        return corsResponse({ error: error.message || error }, 500);
      }
    }

    // GET /api/layout
    if (url.pathname === '/api/layout' && request.method === 'GET') {
      try {
        const uid = url.searchParams.get('uid') || 'default';
        const result = await env.LAYOUT_DB.prepare(
          'SELECT config FROM layout WHERE user_id = ?'
        ).bind(uid).first<{ config: string }>();

        if (result && result.config) {
          const config = JSON.parse(result.config);
          return corsResponse({ config });
        } else {
          return corsResponse({ config: DEFAULT_LAYOUT });
        }
      } catch (error: any) {
        return corsResponse({ error: error.message || error }, 500);
      }
    }

    // POST /api/layout
    if (url.pathname === '/api/layout' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const uid = url.searchParams.get('uid') || body.uid || 'default';
        const config = body.config;

        if (!config) {
          return corsResponse({ error: 'Missing config parameter' }, 400);
        }

        const configStr = JSON.stringify(config);
        const now = new Date().toISOString();

        await env.LAYOUT_DB.prepare(
          `INSERT INTO layout (user_id, config, updated_at) 
           VALUES (?, ?, ?) 
           ON CONFLICT(user_id) 
           DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at`
        ).bind(uid, configStr, now).run();

        return corsResponse({ ok: true });
      } catch (error: any) {
        return corsResponse({ error: error.message || error }, 500);
      }
    }

    // GET /api/cron-trigger (Manual trigger for testing / populating data)
    if (url.pathname === '/api/cron-trigger' && request.method === 'GET') {
      try {
        const result = await fetchAndSave(env);
        return corsResponse({ success: true, result });
      } catch (error: any) {
        return corsResponse({ success: false, error: error.message || error }, 500);
      }
    }

    // Default 404
    return corsResponse({ error: 'Not Found' }, 404);
  }
};

async function getYahooCredentials() {
  console.log("Fetching cookie from fc.yahoo.com...");
  const fcResponse = await fetch("https://fc.yahoo.com/", {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  const setCookie = fcResponse.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error("Failed to get cookie from fc.yahoo.com");
  }

  const cookie = setCookie.split(';')[0];
  console.log("Successfully retrieved cookie.");

  console.log("Fetching crumb from getcrumb...");
  const crumbResponse = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Cookie': cookie
    }
  });

  if (!crumbResponse.ok) {
    throw new Error(`Failed to get crumb: ${crumbResponse.status}`);
  }

  const crumb = await crumbResponse.text();
  console.log(`Successfully retrieved crumb: ${crumb}`);
  return { cookie, crumb };
}

async function fetchAndSave(env: Env) {
  const nowInSec = Math.floor(Date.now() / 1000);
  const fetchedQuotes: { [symbolId: string]: Omit<Quote, 'updatedAt'> } = {};

  // 1. Fetch Yahoo Finance symbols (Batch fetch in one API call)
  const yahooSymbols = SYMBOLS.filter(s => s.source === 'yahoo' && s.yahooSymbol);
  if (yahooSymbols.length > 0) {
    try {
      const { cookie, crumb } = await getYahooCredentials();
      const symbolQuery = yahooSymbols.map(s => s.yahooSymbol).join(',');
      const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolQuery)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent&crumb=${encodeURIComponent(crumb)}`;

      console.log(`Fetching batch quotes from Yahoo Finance: ${yahooUrl}`);
      const response = await fetch(yahooUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': cookie
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API returned status ${response.status}`);
      }

      const data: any = await response.json();
      const results = data.quoteResponse?.result || [];

      // Map API results back to our symbols
      for (const item of results) {
        const matchingSymbol = yahooSymbols.find(s => s.yahooSymbol === item.symbol);
        if (matchingSymbol && item.regularMarketPrice !== undefined) {
          fetchedQuotes[matchingSymbol.id] = {
            price: item.regularMarketPrice,
            change: item.regularMarketChange || 0,
            changePct: item.regularMarketChangePercent || 0,
            source: 'yahoo'
          };
        }
      }
    } catch (e: any) {
      console.error(`Failed to fetch Yahoo Finance batch: ${e.message || e}`);
    }
  }

  // 2. Fetch Finnhub symbols (Individual fetch with 100ms interval sleep)
  const finnhubSymbols = SYMBOLS.filter(s => s.source === 'finnhub' && s.finnhubSymbol);
  if (finnhubSymbols.length > 0) {
    if (!env.FINNHUB_API_KEY) {
      console.error("FINNHUB_API_KEY is not defined in environment secrets. Skipping Finnhub fetch.");
    } else {
      for (let i = 0; i < finnhubSymbols.length; i++) {
        const symbolDef = finnhubSymbols[i];
        
        // Rate limit protection
        if (i > 0) {
          await sleep(100);
        }

        try {
          const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbolDef.finnhubSymbol!)}&token=${encodeURIComponent(env.FINNHUB_API_KEY)}`;
          console.log(`Fetching quote from Finnhub for ${symbolDef.id} (${symbolDef.finnhubSymbol}): ${finnhubUrl}`);
          
          const response = await fetch(finnhubUrl);
          if (!response.ok) {
            throw new Error(`Finnhub returned status ${response.status}`);
          }

          const data: any = await response.json();
          // Finnhub response format: c = current price, d = change, dp = percent change
          if (data.c !== undefined && data.c !== 0) {
            fetchedQuotes[symbolDef.id] = {
              price: data.c,
              change: data.d || 0,
              changePct: data.dp || 0,
              source: 'finnhub'
            };
          }
        } catch (e: any) {
          console.error(`Failed to fetch Finnhub for ${symbolDef.id}: ${e.message || e}`);
        }
      }
    }
  }

  // 3. Read and Update KV Data (Merge snapshot and history into market:data)
  let snapshot: Snapshot = { fetchedAt: nowInSec, quotes: {} };
  let history: History = { updatedAt: nowInSec, series: {} };

  const marketDataStr = await env.MARKET_KV.get('market:data');
  if (marketDataStr) {
    try {
      const marketData = JSON.parse(marketDataStr);
      if (marketData.snapshot) snapshot = marketData.snapshot;
      if (marketData.history) history = marketData.history;
    } catch (e) {
      console.warn('Failed to parse market:data. Starting fresh.');
    }
  } else {
    // Migration fallback from old keys
    const snapshotStr = await env.MARKET_KV.get('market:snapshot');
    if (snapshotStr) {
      try {
        snapshot = JSON.parse(snapshotStr);
      } catch (e) {
        console.warn('Failed to parse fallback snapshot.');
      }
    }
    const historyStr = await env.MARKET_KV.get('market:history');
    if (historyStr) {
      try {
        history = JSON.parse(historyStr);
      } catch (e) {
        console.warn('Failed to parse fallback history.');
      }
    }
  }

  // Update snapshot
  snapshot.fetchedAt = nowInSec;
  for (const [symbolId, quote] of Object.entries(fetchedQuotes)) {
    snapshot.quotes[symbolId] = {
      ...quote,
      updatedAt: nowInSec
    };
  }

  // Update history
  history.updatedAt = nowInSec;
  const cutoff = nowInSec - 86400; // 24 hours ago

  for (const [symbolId, quote] of Object.entries(fetchedQuotes)) {
    if (!history.series[symbolId]) {
      history.series[symbolId] = [];
    }

    const series = history.series[symbolId];
    
    // Clean up existing duplicates in history
    const cleanedSeries: HistoryPoint[] = [];
    for (const point of series) {
      const prev = cleanedSeries[cleanedSeries.length - 1];
      if (!prev || prev.p !== point.p) {
        cleanedSeries.push(point);
      }
    }

    // Only add new point if price is different from the last point
    const lastPoint = cleanedSeries[cleanedSeries.length - 1];
    if (!lastPoint || lastPoint.p !== quote.price) {
      cleanedSeries.push({
        t: nowInSec,
        p: quote.price
      });
    }

    // Remove data older than 24 hours
    history.series[symbolId] = cleanedSeries.filter(point => point.t >= cutoff);
  }

  // Save both snapshot and history back to market:data in a single write operation!
  await env.MARKET_KV.put('market:data', JSON.stringify({ snapshot, history }));
  console.log('Saved snapshot and history to market:data');

  return {
    updatedCount: Object.keys(fetchedQuotes).length,
    timestamp: nowInSec
  };
}

function corsResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
