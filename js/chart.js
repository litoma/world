window.ChartManager = {
    observer: null,
    theme: 'dark', // default

    init() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const containerId = entry.target.id;
                    const symbol = entry.target.dataset.symbol;

                    if (containerId && symbol && !entry.target.hasAttribute('data-loaded')) {
                        this.renderChart(containerId, symbol);
                        entry.target.setAttribute('data-loaded', 'true');
                        this.observer.unobserve(entry.target);
                    }
                }
            });
        }, { rootMargin: '100px 0px' });
    },

    observe(element) {
        if (!this.observer) this.init();
        this.observer.observe(element);
    },

    setTheme(newTheme) {
        this.theme = newTheme;
        // Re-rendering will be handled globally when theme changes
    },

    renderChart(containerId, symbol) {
        if (typeof TradingView === 'undefined' || !TradingView.MiniWidget) {
            console.error("TradingView script not loaded yet.");
            // Retry after a short delay
            setTimeout(() => this.renderChart(containerId, symbol), 500);
            return;
        }

        try {
            new TradingView.MiniWidget({
                container_id: containerId,
                symbol: symbol,
                width: "100%",
                height: 220,
                locale: "ja",
                dateRange: "12M",
                colorTheme: this.theme,
                trendLineColor: "rgba(41, 98, 255, 1)",
                underLineColor: "rgba(41, 98, 255, 0.3)",
                isTransparent: true,
                autosize: true,
                largeChartUrl: ""
            });
        } catch (e) {
            console.error("Error rendering chart", symbol, e);
        }
    }
};
