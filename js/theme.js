window.ThemeManager = {
    init() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        // Initial application is handled by main.js through window.ChartManager.theme which is read from StorageManager.
        // We just attach the event listener here.

        toggleBtn.addEventListener('click', () => {
            const data = window.StorageManager.load();
            const newTheme = data.theme === 'dark' ? 'light' : 'dark';

            data.theme = newTheme;
            window.StorageManager.save(data);

            this.applyThemeToDOM(newTheme);
            this.rebuildAllCharts(newTheme);
        });
    },

    applyThemeToDOM(theme) {
        document.body.setAttribute('data-theme', theme);
        if (window.ChartManager) {
            window.ChartManager.theme = theme;
        }
    },

    rebuildAllCharts(newTheme) {
        const containers = document.querySelectorAll('.chart-widget-container');
        containers.forEach(container => {
            const symbol = container.dataset.symbol;
            container.innerHTML = '';
            window.ChartManager.renderChart(container.id, symbol);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // apply initial DOM state
    const data = window.StorageManager.load();
    document.body.setAttribute('data-theme', data.theme || 'dark');
    window.ThemeManager.init();
});
