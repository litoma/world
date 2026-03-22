import { initAuth, login, logout } from '/js/auth.js';

window.App = {
    init() {
        const loginBtn = document.getElementById('login-button');
        const logoutBtn = document.getElementById('logout-button');

        if (loginBtn) loginBtn.addEventListener('click', login);
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        initAuth(async (user) => {
            if (user) {
                document.getElementById('login-button').style.display = 'none';
                document.getElementById('user-profile').style.display = 'flex';
                document.getElementById('user-email').textContent = user.email || user.displayName || 'User';
            } else {
                document.getElementById('login-button').style.display = 'block';
                document.getElementById('user-profile').style.display = 'none';
            }

            const data = await window.StorageManager.load();
            window.ChartManager.theme = data.theme || 'dark';

            this.renderAll(data);
        });

        this.setupEventListeners();
    },

    renderAll(data) {
        if (!data) data = window.StorageManager.getData();
        const container = document.getElementById('dashboard-container');
        container.innerHTML = ''; // Clear for re-render

        data.sections.forEach(section => {
            const sectionEl = this.createSectionElement(section);
            container.appendChild(sectionEl);
        });
    },

    createSectionElement(section) {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'dashboard-section';
        sectionEl.id = section.id;

        const headerEl = document.createElement('div');
        headerEl.className = 'section-header';

        const titleEl = document.createElement('h2');
        titleEl.textContent = section.label;

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-chart';
        addBtn.textContent = '+ 追加';
        addBtn.dataset.sectionId = section.id;

        headerEl.appendChild(titleEl);
        headerEl.appendChild(addBtn);
        sectionEl.appendChild(headerEl);

        const gridEl = document.createElement('div');
        gridEl.className = 'charts-grid';
        gridEl.id = `grid-${section.id}`;

        section.charts.forEach(chart => {
            const cardEl = this.createChartCard(chart);
            gridEl.appendChild(cardEl);
        });

        sectionEl.appendChild(gridEl);
        return sectionEl;
    },

    createChartCard(chart) {
        const cardEl = document.createElement('div');
        cardEl.className = 'chart-card';
        cardEl.dataset.id = chart.id;
        cardEl.setAttribute('draggable', 'true');

        const cardHeader = document.createElement('div');
        cardHeader.className = 'chart-card-header';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.textContent = '≡';

        const cardTitle = document.createElement('span');
        cardTitle.className = 'chart-title';
        cardTitle.textContent = chart.label;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-chart';
        deleteBtn.textContent = '×';
        deleteBtn.dataset.chartId = chart.id;
        deleteBtn.setAttribute('aria-label', '削除');

        cardHeader.appendChild(dragHandle);
        cardHeader.appendChild(cardTitle);
        cardHeader.appendChild(deleteBtn);

        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-widget-container';
        const tvContainerId = `tv-${chart.id}`;
        chartContainer.id = tvContainerId;
        chartContainer.dataset.symbol = chart.symbol;

        cardEl.appendChild(cardHeader);
        cardEl.appendChild(chartContainer);

        // Observe for lazy loading
        window.ChartManager.observe(chartContainer);

        return cardEl;
    },

    setupEventListeners() {
        const modal = document.getElementById('add-chart-modal');
        const form = document.getElementById('add-chart-form');
        const sectionIdInput = document.getElementById('add-chart-section-id');
        const cancelBtn = document.getElementById('modal-cancel');

        // Global click listener for delegation
        document.addEventListener('click', (e) => {
            // Add button click
            if (e.target.classList.contains('btn-add-chart')) {
                const sectionId = e.target.dataset.sectionId;
                sectionIdInput.value = sectionId;
                form.reset();
                modal.showModal();
            }

            // Delete button click
            if (e.target.classList.contains('btn-delete-chart')) {
                const chartId = e.target.dataset.chartId;
                if (confirm('このチャートを削除しますか？')) {
                    this.deleteChart(chartId);
                }
            }
        });

        // Cancel modal
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.close();
            });
        }

        // Symbol suggestion
        this.setupSymbolSuggestion();

        // Submit form
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const sectionId = sectionIdInput.value;
                const label = document.getElementById('add-chart-label').value.trim();
                const symbol = document.getElementById('add-chart-symbol').value.trim();

                if (label && symbol) {
                    this.addChart(sectionId, label, symbol);
                    modal.close();
                }
            });
        }
    },

    async addChart(sectionId, label, symbol) {
        const data = window.StorageManager.getData();
        const section = data.sections.find(s => s.id === sectionId);
        if (section) {
            const newChart = {
                id: `chart-${Date.now()}`,
                label: label,
                symbol: symbol
            };
            section.charts.push(newChart);
            await window.StorageManager.save(data);

            // Append directly to DOM instead of re-rendering everything
            const gridEl = document.getElementById(`grid-${sectionId}`);
            if (gridEl) {
                const cardEl = this.createChartCard(newChart);
                gridEl.appendChild(cardEl);
            }
        }
    },

    async deleteChart(chartId) {
        const data = window.StorageManager.getData();
        let modified = false;

        data.sections.forEach(section => {
            const originalLength = section.charts.length;
            section.charts = section.charts.filter(c => c.id !== chartId);
            if (section.charts.length !== originalLength) {
                modified = true;
            }
        });

        if (modified) {
            await window.StorageManager.save(data);

            // Remove specific chart from DOM instead of re-rendering everything
            const cardEl = document.querySelector(`.chart-card[data-id="${chartId}"]`);
            if (cardEl) {
                cardEl.remove();
            }
        }
    },

    setupSymbolSuggestion() {
        const symbolInput = document.getElementById('add-chart-symbol');
        const suggestionList = document.getElementById('symbol-suggestions');
        const labelInput = document.getElementById('add-chart-label');
        if (!symbolInput || !suggestionList) return;

        // Curated fallback list (used until tvc-symbols.json loads)
        const FALLBACK_SYMBOLS = [
            { symbol: 'VANTAGE:NIKKEI225', description: '日経平均' },
            { symbol: 'VANTAGE:DJ30', description: 'ダウ平均' },
            { symbol: 'VANTAGE:NAS100', description: 'ナスダック' },
            { symbol: 'VANTAGE:SP500', description: 'S&P500' },
            { symbol: 'TVC:GOLD', description: 'ゴールド' },
            { symbol: 'TVC:USOIL', description: 'WTI原油' },
            { symbol: 'FX:USDJPY', description: 'ドル円' },
            { symbol: 'FX:EURUSD', description: 'ユーロドル' },
            { symbol: 'COINBASE:BTCUSD', description: 'ビットコイン' },
            { symbol: 'COINBASE:ETHUSD', description: 'イーサリアム' },
            { symbol: 'NASDAQ:AAPL', description: 'Apple' },
            { symbol: 'NASDAQ:MSFT', description: 'Microsoft' },
            { symbol: 'NASDAQ:GOOGL', description: 'Alphabet' },
            { symbol: 'NASDAQ:AMZN', description: 'Amazon' },
            { symbol: 'NASDAQ:NVDA', description: 'NVIDIA' },
            { symbol: 'NASDAQ:META', description: 'Meta' },
            { symbol: 'NASDAQ:TSLA', description: 'Tesla' },
            { symbol: 'TSE:7203', description: 'トヨタ自動車' },
            { symbol: 'TSE:8306', description: '三菱UFJ' },
            { symbol: 'TSE:9984', description: 'ソフトバンクG' },
            { symbol: 'TSE:8001', description: '伊藤忠商事' },
            { symbol: 'TSE:6758', description: 'ソニーG' },
        ];

        let allSymbols = [...FALLBACK_SYMBOLS];

        // Try to load the full symbol list asynchronously
        fetch('/js/all-symbols.json')
            .then(r => r.json())
            .then(tvcList => {
                // Merge: TVC symbols first, then keep non-TVC from fallback
                const tvcSet = new Set(tvcList.map(s => s.symbol));
                const nonTvcFallback = FALLBACK_SYMBOLS.filter(s => !tvcSet.has(s.symbol));
                allSymbols = [...tvcList, ...nonTvcFallback];
            })
            .catch(() => { /* keep fallback */ });

        let selectedIndex = -1;

        const hideSuggestions = () => {
            suggestionList.style.display = 'none';
            suggestionList.innerHTML = '';
            selectedIndex = -1;
        };

        const showSuggestions = (items) => {
            if (!items.length) { hideSuggestions(); return; }
            suggestionList.innerHTML = '';
            selectedIndex = -1;
            items.forEach((item) => {
                const li = document.createElement('li');
                li.className = 'suggestion-item';
                li.innerHTML = `<strong>${item.symbol}</strong><span>${item.description}</span>`;
                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    symbolInput.value = item.symbol;
                    if (!labelInput.value) {
                        labelInput.value = item.description;
                    }
                    hideSuggestions();
                });
                suggestionList.appendChild(li);
            });
            suggestionList.style.display = 'block';
        };

        const isMatchSection = (s, sectionId) => {
            const ex = s.symbol.split(':')[0];
            const t = s.type || '';
            const desc = s.description.toUpperCase();

            switch (sectionId) {
                case 'indices':
                    return t === 'index' || ex === 'INDEX' || ex === 'SP' || ex === 'DJ' || ex === 'VANTAGE' || desc.includes('INDEX') || s.symbol.includes('VIX');
                case 'futures':
                    return t === 'futures' || ex === 'CME' || ex === 'COMEX' || ex === 'NYMEX' || ex === 'CBOT' || desc.includes('FUTURES');
                case 'forex':
                    return t === 'forex' || ex === 'FX' || ex === 'FOREX';
                case 'crypto':
                    return t === 'crypto' || ex === 'COINBASE' || ex === 'BINANCE' || ex === 'CRYPTO' || ex === 'BITSTAMP';
                case 'us-stocks':
                    return (t === 'stock' || t === 'dr' || t === 'fund' || t === '') && ['NASDAQ', 'NYSE', 'AMEX'].includes(ex);
                case 'jp-stocks':
                    return (t === 'stock' || t === 'dr' || t === 'fund' || t === '') && ['TSE', 'FSE', 'NSE'].includes(ex);
                default:
                    return true;
            }
        };

        symbolInput.addEventListener('input', () => {
            const query = symbolInput.value.trim().toUpperCase();
            if (query.length < 1) { hideSuggestions(); return; }

            const sectionId = document.getElementById('add-chart-section-id').value;

            const matched = allSymbols.filter(s =>
                isMatchSection(s, sectionId) &&
                (s.symbol.toUpperCase().includes(query) || s.description.includes(symbolInput.value.trim()))
            ).slice(0, 8);
            showSuggestions(matched);
        });

        symbolInput.addEventListener('keydown', (e) => {
            const items = suggestionList.querySelectorAll('.suggestion-item');
            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].dispatchEvent(new MouseEvent('mousedown'));
                return;
            } else if (e.key === 'Escape') {
                hideSuggestions();
                return;
            }
            items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
        });

        symbolInput.addEventListener('blur', () => {
            setTimeout(hideSuggestions, 150);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initial load happens within App.init() (auth callback)
    window.App.init();
});
