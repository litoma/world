import { db, doc, getDoc, setDoc, currentUser } from '/js/auth.js';

window.StorageManager = {
    DEFAULT_DATA: {
        theme: "dark",
        sections: [
            {
                id: "indices",
                label: "Indices",
                charts: [
                    { id: "chart-001", symbol: "VANTAGE:NIKKEI225", label: "日経平均", dateRange: "1D" },
                    { id: "chart-002", symbol: "VANTAGE:DJ30", label: "ダウ平均", dateRange: "1D" },
                    { id: "chart-003", symbol: "VANTAGE:NAS100", label: "ナスダック", dateRange: "1D" },
                    { id: "chart-004", symbol: "VANTAGE:SP500", label: "S&P500", dateRange: "1D" }
                ]
            },
            {
                id: "futures",
                label: "Futures",
                charts: [
                    { id: "chart-005", symbol: "NK2251!", label: "日経時間外", dateRange: "1D" },
                    { id: "chart-007", symbol: "TVC:GOLD", label: "ゴールド", dateRange: "1D" },
                    { id: "chart-new-silver", symbol: "TVC:SILVER", label: "シルバー", dateRange: "1D" },
                    { id: "chart-009", symbol: "TVC:USOIL", label: "WTI原油先物", dateRange: "1D" }
                ]
            },
            {
                id: "forex",
                label: "Forex",
                charts: [
                    { id: "chart-011", symbol: "FX:USDJPY", label: "ドル円", dateRange: "1D" },
                    { id: "chart-012", symbol: "FX:EURUSD", label: "ユーロドル", dateRange: "1D" }
                ]
            },
            {
                id: "crypto",
                label: "Crypto",
                charts: [
                    { id: "chart-013", symbol: "COINBASE:BTCUSD", label: "BTC", dateRange: "1D" },
                    { id: "chart-014", symbol: "COINBASE:ETHUSD", label: "ETH", dateRange: "1D" },
                    { id: "chart-015", symbol: "COINBASE:SOLUSD", label: "SOL", dateRange: "1D" }
                ]
            },
            {
                id: "us-stocks",
                label: "Stocks (US)",
                charts: [
                    { id: "chart-us-001", symbol: "NASDAQ:AAPL", label: "Apple", dateRange: "1D" },
                    { id: "chart-us-002", symbol: "NASDAQ:MSFT", label: "Microsoft", dateRange: "1D" },
                    { id: "chart-us-003", symbol: "NASDAQ:GOOGL", label: "Alphabet", dateRange: "1D" },
                    { id: "chart-us-004", symbol: "NASDAQ:AMZN", label: "Amazon", dateRange: "1D" },
                    { id: "chart-us-005", symbol: "NASDAQ:NVDA", label: "NVIDIA", dateRange: "1D" },
                    { id: "chart-us-006", symbol: "NASDAQ:META", label: "Meta", dateRange: "1D" },
                    { id: "chart-us-007", symbol: "NASDAQ:TSLA", label: "Tesla", dateRange: "1D" }
                ]
            },
            {
                id: "jp-stocks",
                label: "Stocks (JP)",
                charts: [
                    { id: "chart-jp-001", symbol: "TSE:7203", label: "トヨタ自動車", dateRange: "1D" },
                    { id: "chart-jp-002", symbol: "TSE:8306", label: "三菱UFJ", dateRange: "1D" },
                    { id: "chart-jp-003", symbol: "TSE:9984", label: "ソフトバンクG", dateRange: "1D" },
                    { id: "chart-jp-004", symbol: "TSE:8001", label: "伊藤忠商事", dateRange: "1D" },
                    { id: "chart-jp-005", symbol: "TSE:6758", label: "ソニーG", dateRange: "1D" }
                ]
            }
        ]
    },

    currentData: null,

    async load() {
        let savedTheme = localStorage.getItem('world_stock_theme');

        if (currentUser) {
            try {
                const docRef = doc(db, 'users', currentUser.uid, 'layout', 'config');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    this.currentData = docSnap.data();

                    // Migration for existing layouts containing old 'stocks'
                    const stocksIndex = this.currentData.sections.findIndex(s => s.id === 'stocks');
                    if (stocksIndex !== -1) {
                        this.currentData.sections.splice(stocksIndex, 1,
                            this.DEFAULT_DATA.sections.find(s => s.id === 'us-stocks'),
                            this.DEFAULT_DATA.sections.find(s => s.id === 'jp-stocks')
                        );
                        // Convert old indices to Vantage (quick migration for existing data too)
                        const indicesSection = this.currentData.sections.find(s => s.id === 'indices');
                        if (indicesSection) {
                            indicesSection.charts = this.DEFAULT_DATA.sections.find(s => s.id === 'indices').charts;
                        }
                        this.save(this.currentData);
                    }

                    // Respect local theme setting over cloud sync if available
                    if (savedTheme) {
                        this.currentData.theme = savedTheme;
                    }

                    // Ensure all charts have a dateRange property migrated
                    this.currentData.sections.forEach(sec => {
                        sec.charts.forEach(c => {
                            if (!c.dateRange) c.dateRange = '1D';
                        });
                    });

                    // Update storage with migrated structure
                    this.save(this.currentData);

                    return this.currentData;
                }
            } catch (error) {
                console.error("Firestore load error", error);
            }
        }

        // For unauthenticated users or fresh accounts, return default layout
        this.currentData = JSON.parse(JSON.stringify(this.DEFAULT_DATA));
        if (savedTheme) {
            this.currentData.theme = savedTheme;
        }

        return this.currentData;
    },

    async save(data) {
        this.currentData = data;

        // Only save theme to localStorage so unauthenticated users always get default layouts
        localStorage.setItem('world_stock_theme', data.theme);

        // Clean up legacy localStorage item if it exists
        localStorage.removeItem('world_stock_dashboard');

        if (currentUser) {
            try {
                const docRef = doc(db, 'users', currentUser.uid, 'layout', 'config');
                await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
            } catch (error) {
                console.error("Firestore save error", error);
            }
        }
    },

    getData() {
        return this.currentData || this.DEFAULT_DATA;
    }
};
