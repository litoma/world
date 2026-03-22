const https = require('https');
const fs = require('fs');
const path = require('path');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': 'https://www.tradingview.com/',
    'Origin': 'https://www.tradingview.com',
};

function fetchSymbols(text) {
    return new Promise((resolve, reject) => {
        const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(text)}&exchange=VANTAGE&lang=en&domain=production`;
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
    const symbolMap = new Map();

    const queries = [
        '',
        ...Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
        'US', 'JP', 'EU', 'UK', 'AU', 'CN', 'HK', 'DE', 'FR', 'CA',
        'INDEX', 'SP', 'NAS', 'DJ', 'GER', 'UK100', 'FRA40', 'EUSTX50',
    ];

    console.log(`Total queries: ${queries.length}`);

    for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        process.stdout.write(`[${i + 1}/${queries.length}] query="${q}" ... `);
        const results = await fetchSymbols(q);
        let added = 0;
        for (const r of results) {
            if (!symbolMap.has(r.symbol)) {
                symbolMap.set(r.symbol, {
                    symbol: `VANTAGE:${r.symbol}`,
                    description: r.description || '',
                    type: r.type || ''
                });
                added++;
            }
        }
        console.log(`${results.length} results, ${added} new (total: ${symbolMap.size})`);
        await sleep(300);
    }

    const newSymbols = Array.from(symbolMap.values());
    console.log(`Fetched ${newSymbols.length} VANTAGE symbols.`);

    const allSymbolsPath = path.join(__dirname, '..', 'js', 'all-symbols.json');
    let allSymbols = [];
    if (fs.existsSync(allSymbolsPath)) {
        allSymbols = JSON.parse(fs.readFileSync(allSymbolsPath, 'utf-8'));
    }

    const existingSet = new Set(allSymbols.map(s => s.symbol));
    let addedToAll = 0;
    for (const s of newSymbols) {
        if (!existingSet.has(s.symbol)) {
            allSymbols.push(s);
            addedToAll++;
        }
    }

    fs.writeFileSync(allSymbolsPath, JSON.stringify(allSymbols, null, 2), 'utf-8');
    console.log(`Appended ${addedToAll} new VANTAGE symbols to all-symbols.json`);
}

main().catch(console.error);
