window.StorageManager = {
    DEFAULT_DATA: {
        theme: "dark",
        sections: [
            {
                id: "jp-stock",
                label: "🇯🇵 日本株式",
                charts: [
                    { id: "chart-001", symbol: "TVC:NI225", label: "日経平均" },
                    { id: "chart-002", symbol: "CME:NKD1!", label: "日経時間外" }
                ]
            },
            {
                id: "us-stock",
                label: "🇺🇸 米国株式",
                charts: [
                    { id: "chart-003", symbol: "DJ:DJI", label: "ダウ平均" },
                    { id: "chart-004", symbol: "CME:YM1!", label: "サンデーダウ" },
                    { id: "chart-005", symbol: "NASDAQ:IXIC", label: "ナスダック" },
                    { id: "chart-006", symbol: "SP:SPX", label: "S&P500" }
                ]
            },
            {
                id: "bond",
                label: "📊 債券・恐怖指数",
                charts: [
                    { id: "chart-007", symbol: "CBOE:VIX", label: "恐怖指数(VIX)" },
                    { id: "chart-008", symbol: "TVC:JP10Y", label: "日本国債10年" },
                    { id: "chart-009", symbol: "TVC:US10Y", label: "米国国債10年" }
                ]
            },
            {
                id: "commodity",
                label: "🥇 コモディティ",
                charts: [
                    { id: "chart-010", symbol: "TVC:GOLD", label: "ゴールド" },
                    { id: "chart-011", symbol: "COMEX:GC1!", label: "ゴールドサンデー" },
                    { id: "chart-012", symbol: "TVC:USOIL", label: "WTI原油先物" },
                    { id: "chart-013", symbol: "NYMEX:CL1!", label: "WTI原油先物サンデー" }
                ]
            },
            {
                id: "fx",
                label: "💱 為替",
                charts: [
                    { id: "chart-014", symbol: "FX:USDJPY", label: "ドル円" },
                    { id: "chart-015", symbol: "FX:EURUSD", label: "ユーロドル" }
                ]
            },
            {
                id: "crypto",
                label: "🪙 暗号資産",
                charts: [
                    { id: "chart-016", symbol: "COINBASE:BTCUSD", label: "ビットコイン(BTC)" },
                    { id: "chart-017", symbol: "COINBASE:ETHUSD", label: "イーサリアム(ETH)" },
                    { id: "chart-018", symbol: "COINBASE:SOLUSD", label: "ソラナ(SOL)" }
                ]
            },
            {
                id: "jp-individual",
                label: "🏢 日本個別株",
                charts: []
            }
        ]
    },

    load() {
        const data = localStorage.getItem('world_stock_dashboard');
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error("Storage parse error", e);
                return this.DEFAULT_DATA;
            }
        }
        return this.DEFAULT_DATA;
    },

    save(data) {
        localStorage.setItem('world_stock_dashboard', JSON.stringify(data));
    }
};
