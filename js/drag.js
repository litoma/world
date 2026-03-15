window.DragManager = {
    init() {
        const container = document.getElementById('dashboard-container');
        if (!container) return;

        // --- HTML5 Drag and Drop (PC) ---
        let draggedElement = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList && e.target.classList.contains('chart-card')) {
                draggedElement = e.target;
                e.dataTransfer.effectAllowed = 'move';

                // Add dragging class slightly later so it doesn't vanish from under mouse
                setTimeout(() => {
                    e.target.classList.add('dragging');
                }, 0);
            }
        });

        container.addEventListener('dragend', async (e) => {
            if (e.target.classList && e.target.classList.contains('chart-card')) {
                e.target.classList.remove('dragging');
                draggedElement = null;
                await this.saveOrder();
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // crucial to allow dropping

            if (!draggedElement) return;

            const grid = draggedElement.closest('.charts-grid');
            const targetGrid = e.target.closest('.charts-grid');

            // Prevent cross-section drops
            if (!grid || grid !== targetGrid) return;

            e.dataTransfer.dropEffect = 'move';

            const afterElement = this.getDragAfterElement(grid, e.clientY);
            if (afterElement == null) {
                grid.appendChild(draggedElement);
            } else {
                grid.insertBefore(draggedElement, afterElement);
            }
        });

        // --- Touch Events (Mobile) ---
        let isDragging = false;

        container.addEventListener('touchstart', (e) => {
            const handle = e.target.closest('.drag-handle');
            if (handle) {
                const card = handle.closest('.chart-card');
                if (!card) return;

                draggedElement = card;
                isDragging = true;
                draggedElement.classList.add('dragging');

                // Optional: Prevent default to avoid scrolling, 
                // but might trap users. Usually handle is small enough.
                if (e.cancelable) e.preventDefault();
            }
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            if (!isDragging || !draggedElement) return;
            if (e.cancelable) e.preventDefault(); // Stop scrolling while dragging

            const touch = e.touches[0];
            const grid = draggedElement.closest('.charts-grid');

            // Find element at current touch position
            const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY);
            let targetGrid = null;

            for (let el of elementsUnderTouch) {
                if (el.classList.contains('charts-grid')) {
                    targetGrid = el;
                    break;
                }
            }

            if (grid && targetGrid && grid === targetGrid) {
                const afterElement = this.getDragAfterElement(grid, touch.clientY);
                if (afterElement == null) {
                    grid.appendChild(draggedElement);
                } else {
                    grid.insertBefore(draggedElement, afterElement);
                }
            }
        }, { passive: false });

        container.addEventListener('touchend', async (e) => {
            if (isDragging && draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
                isDragging = false;
                await this.saveOrder();
            }
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.chart-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    async saveOrder() {
        const data = window.StorageManager.getData();

        data.sections.forEach(section => {
            const gridId = `grid-${section.id}`;
            const grid = document.getElementById(gridId);
            if (!grid) return;

            const cards = grid.querySelectorAll('.chart-card');
            const newChartsOrder = [];

            cards.forEach(card => {
                const chartId = card.dataset.id;
                const chartData = section.charts.find(c => c.id === chartId);
                if (chartData) {
                    newChartsOrder.push(chartData);
                }
            });

            if (newChartsOrder.length === section.charts.length) {
                section.charts = newChartsOrder;
            }
        });

        await window.StorageManager.save(data);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // window.DragManager.init() will be called internally from main.js if needed or kept here
    // Currently init doesn't rely on loaded data, it just attaches events.
    window.DragManager.init();
});
