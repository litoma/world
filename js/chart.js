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

  renderChart(containerId, symbol, dateRange = "1D") {
    const container = document.getElementById(containerId);
    if (!container) return;

    // TradingView Mini Symbol Overview uses a specific external embed script.
    // Dynamically injecting <script> tags into the DOM often fails because the 
    // script relies on `document.currentScript` to find its insertion point.
    // Using an iframe with `srcdoc` provides a clean, isolated document environment 
    // where the script can comfortably execute and render the widget.
    container.innerHTML = "";

    const config = {
      "symbol": symbol,
      "width": "100%",
      "height": "100%",
      "locale": "ja",
      "dateRange": dateRange,
      "colorTheme": this.theme,
      "isTransparent": true,
      "autosize": true,
      "largeChartUrl": "",
      "chartType": "baseline"
    };

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';

    const srcDocContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
              .tradingview-widget-container {
                  position: relative;
                  top: -46px;
                  height: calc(100% + 46px);
              }
            </style>
          </head>
          <body>
            <div class="tradingview-widget-container">
              <div class="tradingview-widget-container__widget"></div>
              <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js" async>
                ${JSON.stringify(config)}
              <\/script>
            </div>
          </body>
        </html>
        `;

    iframe.srcdoc = srcDocContent;
    container.appendChild(iframe);
  }
};
