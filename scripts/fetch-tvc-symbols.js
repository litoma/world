/**
 * fetch-tvc-symbols.js
 * TradingViewのAPIからTVC:プレフィックスのシンボルを全量取得してJSONに保存する
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://www.tradingview.com/',
    'Origin': 'https://www.tradingview.com',
};

function fetchSymbols(text) {
    return new Promise((resolve, reject) => {
        const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(text)}&exchange=TVC&lang=ja&domain=production`;
        const req = https.get(url, { headers: HEADERS }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error(`  Parse error for query "${text}":`, data.slice(0, 100));
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

async function main() {
    const symbolMap = new Map(); // symbol -> entry (dedupe)

    // Blank query first to get the most popular items
    const queries = [
        '',
        ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        'US', 'JP', 'EU', 'UK', 'AU', 'CN', 'HK', 'DE', 'FR', 'CA',
        'INDEX', 'BOND', 'GDP', 'CPI', 'RATE', 'YIELD', 'OIL', 'GAS',
        'GOLD', 'SILVER', 'PLATINUM', 'COPPER', 'WHEAT', 'CORN', 'SUGAR',
        'NI', 'SP', 'DJI', 'VIX', 'HSI', 'DAX', 'FTSE', 'CAC', 'ASX',
        '10Y', '2Y', '30Y', 'M2', 'PMI', 'NFP', 'PPI', 'ISM',
    ];

    console.log(`Total queries: ${queries.length}`);

    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        process.stdout.write(`[${i+1}/${queries.length}] query="${q}" ... `);
        const results = await fetchSymbols(q);
        let added = 0;
        for (const r of results) {
            if (!symbolMap.has(r.symbol)) {
                symbolMap.set(r.symbol, {
                    symbol: `TVC:${r.symbol}`,
                    description: r.description || '',
                    type: r.type || ''
                });
                added++;
            }
        }
        console.log(`${results.length} results, ${added} new (total: ${symbolMap.size})`);
        await sleep(300); // rate limit
    }

    const symbols = Array.from(symbolMap.values()).sort((a, b) =>
        a.symbol.localeCompare(b.symbol)
    );

    const outputPath = path.join(__dirname, '..', 'js', 'tvc-symbols.json');
    fs.writeFileSync(outputPath, JSON.stringify(symbols, null, 2), 'utf-8');
    console.log(`\nSaved ${symbols.length} symbols to ${outputPath}`);
}

main().catch(console.error);
