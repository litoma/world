import { db, doc, getDoc, setDoc, currentUser } from '/js/auth.js';

window.StorageManager = {
    DEFAULT_DATA: {
        theme: "dark",
        sections: [
            {
                id: "indices",
                label: "Indices",
                charts: [
                    { id: "chart-001", symbol: "TVC:NI225", label: "日経平均" },
                    { id: "chart-002", symbol: "DJ:DJI", label: "ダウ平均" },
                    { id: "chart-003", symbol: "NASDAQ:IXIC", label: "ナスダック" },
                    { id: "chart-004", symbol: "SP:SPX", label: "S&P500" }
                ]
            },
            {
                id: "futures",
                label: "Futures",
                charts: [
                    { id: "chart-005", symbol: "CME:NKD1!", label: "日経時間外" },
                    { id: "chart-006", symbol: "CME:YM1!", label: "サンデーダウ" },
                    { id: "chart-007", symbol: "TVC:GOLD", label: "ゴールド" },
                    { id: "chart-008", symbol: "COMEX:GC1!", label: "ゴールドサンデー" },
                    { id: "chart-009", symbol: "TVC:USOIL", label: "WTI原油先物" },
                    { id: "chart-010", symbol: "NYMEX:CL1!", label: "WTI原油先物サンデー" }
                ]
            },
            {
                id: "forex",
                label: "Forex",
                charts: [
                    { id: "chart-011", symbol: "FX:USDJPY", label: "ドル円" },
                    { id: "chart-012", symbol: "FX:EURUSD", label: "ユーロドル" }
                ]
            },
            {
                id: "crypto",
                label: "Crypto",
                charts: [
                    { id: "chart-013", symbol: "COINBASE:BTCUSD", label: "BTC" },
                    { id: "chart-014", symbol: "COINBASE:ETHUSD", label: "ETH" },
                    { id: "chart-015", symbol: "COINBASE:SOLUSD", label: "SOL" }
                ]
            },
            {
                id: "stocks",
                label: "Stocks",
                charts: []
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

                    // Respect local theme setting over cloud sync if available
                    if (savedTheme) {
                        this.currentData.theme = savedTheme;
                    }

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
