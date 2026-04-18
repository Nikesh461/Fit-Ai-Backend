window.FitAIUI = (() => {
    function ensureToastRoot() {
        let root = document.getElementById('fitai-toast-root');

        if (!root) {
            root = document.createElement('div');
            root.id = 'fitai-toast-root';
            root.className = 'fixed top-4 right-4 z-[200] flex flex-col gap-3 max-w-sm';
            document.body.appendChild(root);
        }

        return root;
    }

    function showToast(message, type = 'info') {
        const root = ensureToastRoot();
        const palette = {
            success: 'bg-emerald-500 text-white',
            error: 'bg-rose-500 text-white',
            info: 'bg-primary text-white'
        };
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = `${palette[type] || palette.info} shadow-2xl rounded-2xl px-4 py-3 flex items-start gap-3 text-sm font-medium border border-white/10 animate-[fadeIn_.2s_ease-out]`;
        toast.innerHTML = `
            <span class="material-symbols-outlined text-lg shrink-0">${icons[type] || icons.info}</span>
            <span class="leading-5">${message}</span>
        `;

        root.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    function setButtonLoading(button, isLoading, loadingLabel = 'Loading...') {
        if (!button) return;

        if (isLoading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml = button.innerHTML;
            }
            button.disabled = true;
            button.innerHTML = `
                <span class="animate-spin material-symbols-outlined text-xl">sync</span>
                ${loadingLabel}
            `;
            return;
        }

        button.disabled = false;
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
        }
    }

    function renderState(container, message, icon = 'info') {
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full p-8 text-center bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-primary/10">
                <span class="material-symbols-outlined text-4xl text-primary/60 mb-2 block">${icon}</span>
                <p class="text-sm text-slate-500 font-medium">${message}</p>
            </div>
        `;
    }

    function formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
    }

    return {
        showToast,
        setButtonLoading,
        renderState,
        formatDate
    };
})();
