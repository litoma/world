window.App = {
    init() {
        this.renderAll();
        this.setupEventListeners();
    },

    renderAll() {
        const data = window.StorageManager.load();
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

    addChart(sectionId, label, symbol) {
        const data = window.StorageManager.load();
        const section = data.sections.find(s => s.id === sectionId);
        if (section) {
            const newChart = {
                id: `chart-${Date.now()}`,
                label: label,
                symbol: symbol
            };
            section.charts.push(newChart);
            window.StorageManager.save(data);

            // Re-render all to reflect changes (and observer will pick up new elements)
            this.renderAll();
        }
    },

    deleteChart(chartId) {
        const data = window.StorageManager.load();
        let modified = false;

        data.sections.forEach(section => {
            const originalLength = section.charts.length;
            section.charts = section.charts.filter(c => c.id !== chartId);
            if (section.charts.length !== originalLength) {
                modified = true;
            }
        });

        if (modified) {
            window.StorageManager.save(data);
            this.renderAll();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const data = window.StorageManager.load();
    window.ChartManager.theme = data.theme || 'dark';
    window.App.init();
});
