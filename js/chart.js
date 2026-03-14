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
        const container = document.getElementById(containerId);
        if (!container) return;

        // TradingView Mini Symbol Overview uses a specific external embed script, not tv.js
        container.innerHTML = "";

        const config = {
            "symbol": symbol,
            "width": "100%",
            "height": "100%",
            "locale": "ja",
            "dateRange": "12M",
            "colorTheme": this.theme,
            "trendLineColor": "rgba(41, 98, 255, 1)",
            "underLineColor": "rgba(41, 98, 255, 0.3)",
            "isTransparent": true,
            "autosize": true,
            "largeChartUrl": ""
        };

        const widgetWrapper = document.createElement('div');
        widgetWrapper.className = 'tradingview-widget-container__widget';
        widgetWrapper.style.height = "100%";
        widgetWrapper.style.width = "100%";

        const scriptInfo = document.createElement('script');
        scriptInfo.type = "text/javascript";
        scriptInfo.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
        scriptInfo.async = true;
        // The script reads its JSON configuration from innerHTML
        scriptInfo.text = JSON.stringify(config);

        container.appendChild(widgetWrapper);
        container.appendChild(scriptInfo);
    }
};
