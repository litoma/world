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
        if (typeof TradingView === 'undefined' || typeof TradingView.MiniWidget === 'undefined') {
            console.warn("TradingView not ready, retrying for", symbol);
            setTimeout(() => this.renderChart(containerId, symbol), 500);
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) return;

        try {
            // TradingView MiniWidget expects target element to be clear
            container.innerHTML = "";

            new TradingView.MiniWidget({
                "container_id": containerId,
                "symbol": symbol,
                "width": "100%",
                "height": "100%", // Fit to the CSS-defined .chart-widget-container
                "locale": "ja",
                "dateRange": "12M",
                "colorTheme": this.theme,
                "isTransparent": true,
                "autosize": true,
                "largeChartUrl": ""
            });
        } catch (e) {
            console.error("TradingView init error for", symbol, e);
        }
    }
};
