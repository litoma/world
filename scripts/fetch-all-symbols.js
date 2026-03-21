/**
 * fetch-all-symbols.js
 * Fetch symbols for TVC, TSE, NASDAQ, NYSE from TradingView API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://www.tradingview.com/',
    'Origin': 'https://www.tradingview.com',
};

function fetchSymbols(text, exchange) {
    return new Promise((resolve, reject) => {
        const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(text)}&exchange=${exchange}&lang=ja&domain=production`;
        const req = https.get(url, { headers: HEADERS }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Generate query strings
function generateQueries(exchange) {
    if (exchange === 'TSE') {
        // Japanese stocks are mostly 4 digits (1300-9999).
        // Let's query by 2-digit prefixes: '13', '14', ..., '99'
        const queries = [];
        for (let i = 13; i <= 99; i++) {
            queries.push(i.toString());
        }
        return queries;
    } else {
        // NASDAQ, NYSE mostly letters
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const queries = [''];

        // 1-letter
        for (const c of chars) queries.push(c);

        // 2-letter
        for (const c1 of chars) {
            for (const c2 of chars) {
                queries.push(c1 + c2);
            }
        }
        return queries;
    }
}

async function fetchExchange(exchange) {
    console.log(`\n=== Fetching ${exchange} ===`);
    const symbolMap = new Map();
    const queries = generateQueries(exchange);

    // Also add explicit empty and popular single chars for all
    if (exchange !== 'TSE') {
        queries.unshift('ETF', 'TRUST', 'INC', 'CORP', 'LTD');
    }

    console.log(`Total queries for ${exchange}: ${queries.length}`);

    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        if (i % 20 === 0) {
            process.stdout.write(`[${exchange} ${i + 1}/${queries.length}] query="${q}" ... `);
        }

        // Retry logic
        let results = [];
        for (let retry = 0; retry < 3; retry++) {
            try {
                results = await fetchSymbols(q, exchange);
                if (Array.isArray(results)) break;
            } catch (e) {
                await sleep(1000);
            }
        }

        let added = 0;
        for (const r of results) {
            if (!r.symbol) continue;
            const fullSymbol = `${exchange}:${r.symbol}`;
            if (!symbolMap.has(fullSymbol)) {
                symbolMap.set(fullSymbol, {
                    symbol: fullSymbol,
                    description: r.description || r.full_name || '',
                    type: r.type || ''
                });
                added++;
            }
        }

        if (i % 20 === 0 || added > 0) {
            if (i % 20 !== 0) process.stdout.write(`[${exchange} ${i + 1}/${queries.length}] query="${q}" ... `);
            console.log(`+${added} new (total: ${symbolMap.size})`);
        }

        await sleep(150); // rate limit
    }

    return Array.from(symbolMap.values());
}

async function main() {
    let allSymbols = [];

    // We already have TVC, but let's re-fetch if needed or just use the old one.
    // Actually, user wants "TSE:, NASDAQ: and NYSE: full volume as well".
    // We will fetch TSE, NASDAQ, NYSE and then merge with existing TVC if available.

    const exchanges = ['TSE', 'NASDAQ', 'NYSE'];

    for (const ex of exchanges) {
        const symbols = await fetchExchange(ex);
        allSymbols = allSymbols.concat(symbols);
    }

    // Also include TVC logic since we want ONE combined json, or keep them separate?
    // Let's create `all-symbols.json`
    console.log(`\nFetching TVC...`);
    const tvcQueries = [
        '', ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        'US', 'JP', 'EU', 'UK', 'AU', 'CN', 'HK', 'DE', 'FR', 'CA',
        'INDEX', 'BOND', 'YIELD', 'OIL', 'GOLD', 'SILVER',
        'SP', 'VIX', 'HSI', 'DAX', '10Y',
    ];
    const tvcMap = new Map();
    for (const q of tvcQueries) {
        const results = await fetchSymbols(q, 'TVC');
        for (const r of results) {
            if (!r.symbol) continue;
            tvcMap.set(`TVC:${r.symbol}`, {
                symbol: `TVC:${r.symbol}`,
                description: r.description || r.full_name || '',
                type: r.type || ''
            });
        }
        await sleep(100);
    }

    allSymbols = allSymbols.concat(Array.from(tvcMap.values()));

    // Sort and save
    allSymbols.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const outputPath = path.join(__dirname, '..', 'js', 'all-symbols.json');
    fs.writeFileSync(outputPath, JSON.stringify(allSymbols, null, 2), 'utf-8');
    console.log(`\nSaved ${allSymbols.length} total symbols to ${outputPath}`);
}

main().catch(console.error);
