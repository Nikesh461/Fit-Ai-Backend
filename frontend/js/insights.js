document.addEventListener('DOMContentLoaded', async () => {
    const streakElement = document.getElementById('streak-val');
    const workoutsElement = document.getElementById('workouts-val');
    const caloriesElement = document.getElementById('calories-val');
    const proteinElement = document.getElementById('protein-val');
    const api = window.FitAIApi;
    const ui = window.FitAIUI;
    let latestStats = null;

    injectProgressControls();
    setLoadingState(true);
    await loadInsights();

    async function loadInsights() {
        try {
            const [statsResponse, growthHistoryResponse, workoutHistoryResponse, dietResponse] = await Promise.all([
                api.growth.getStats().catch(() => ({ stats: {} })),
                api.growth.getHistory(30, 0).catch(() => ({ growth: [] })),
                api.workout.getHistory().catch(() => ({ logs: [] })),
                api.diet.getPlan().catch(() => null)
            ]);

            const stats = statsResponse?.stats || {};
            const growthHistory = Array.isArray(growthHistoryResponse?.growth) ? growthHistoryResponse.growth : [];
            const logs = Array.isArray(workoutHistoryResponse?.logs) ? workoutHistoryResponse.logs : [];
            const todayDiet = window.FitAICommon.findDayPlan(dietResponse?.data?.diet_plan || []);
            const totalCalories = logs.reduce((sum, log) => sum + window.FitAICommon.estimateWorkoutCalories(log), 0);
            const proteinTarget = window.FitAICommon.parseMacroValue(todayDiet?.total_macros?.protein);

            latestStats = stats;

            if (streakElement) streakElement.textContent = stats.streak || 0;
            if (workoutsElement) workoutsElement.textContent = logs.length;
            if (caloriesElement) {
                caloriesElement.textContent = totalCalories >= 1000 ? `${(totalCalories / 1000).toFixed(1)}k` : totalCalories;
            }
            if (proteinElement) {
                proteinElement.textContent = Math.round(proteinTarget || 0);
                const parentDiv = proteinElement.closest('div')?.parentElement;
                const label = parentDiv?.querySelector('p.text-sm');
                if (label) label.textContent = 'Protein Target';
            }

            const subtitle = document.querySelector('main header p');
            if (subtitle) {
                subtitle.textContent = stats.weightChange !== null && stats.weightChange !== undefined
                    ? `Weight change: ${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} kg since your first log.`
                    : 'Log progress regularly to unlock weight and body composition trends.';
            }

            updateWeeklyBars(logs);
        } catch (error) {
            console.error('Failed to load insights:', error);
            ui.showToast(error.message || 'Unable to load insights right now.', 'error');
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        const elements = [streakElement, workoutsElement, caloriesElement, proteinElement];
        elements.forEach(el => {
            if (el) {
                if (isLoading) {
                    el.classList.add('animate-pulse', 'text-slate-300');
                    el.textContent = '...';
                } else {
                    el.classList.remove('animate-pulse', 'text-slate-300');
                }
            }
        });
    }

    function updateWeeklyBars(logs) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);

        const weeklyData = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

        logs.forEach((item) => {
            const itemDate = new Date(item.completedAt);
            if (itemDate >= firstDayOfWeek) {
                const dayName = days[itemDate.getDay()];
                weeklyData[dayName] += window.FitAICommon.estimateWorkoutCalories(item);
            }
        });

        const maxCalories = Math.max(...Object.values(weeklyData), 350);

        days.forEach((day) => {
            const bar = document.getElementById(`bar-${day}`);
            if (!bar) return;

            const calories = weeklyData[day];
            const percentage = calories > 0 ? (calories / maxCalories) * 90 + 10 : 10;
            bar.style.height = `${percentage}%`;

            const label = bar.querySelector('.bar-label');
            if (label) {
                label.textContent = `${Math.round(calories)} kcal`;
            }

            bar.classList.remove('bg-primary', 'shadow-[0_0_15px_rgba(0,102,255,0.4)]');
            if (calories > 0) {
                bar.classList.add('bg-primary');
                if (day === days[new Date().getDay()]) {
                    bar.classList.add('shadow-[0_0_15px_rgba(0,102,255,0.4)]');
                }
            }
        });
    }

    function injectProgressControls() {
        const header = document.querySelector('main header');
        if (!header || document.getElementById('log-progress-btn')) return;

        const actions = document.createElement('div');
        actions.innerHTML = `
            <button id="log-progress-btn" class="px-5 py-2.5 bg-primary text-background-dark font-bold rounded-xl flex items-center gap-2 w-fit">
                <span class="material-symbols-outlined">add_chart</span>
                Log Progress
            </button>
        `;
        header.appendChild(actions);

        document.body.insertAdjacentHTML('beforeend', `
            <div id="growth-modal" class="fixed inset-0 z-[70] hidden items-center justify-center bg-background-dark/80 backdrop-blur-sm p-4">
                <div class="w-full max-w-2xl bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-primary/10 overflow-hidden shadow-2xl">
                    <div class="p-6 bg-primary text-background-dark flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-black">Log Your Progress</h3>
                            <p class="text-xs font-bold uppercase opacity-70">Sync with your backend growth tracker</p>
                        </div>
                        <button id="close-growth-modal" class="size-10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-colors">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form id="growth-form" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Weight (kg)</label>
                            <input id="growth-weight" type="number" step="0.1" required class="w-full bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Height (cm)</label>
                            <input id="growth-height" type="number" step="0.1" required class="w-full bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Body Fat %</label>
                            <input id="growth-body-fat" type="number" step="0.1" class="w-full bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Muscle Mass (kg)</label>
                            <input id="growth-muscle-mass" type="number" step="0.1" class="w-full bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
                            <textarea id="growth-notes" rows="3" class="w-full bg-slate-50 dark:bg-background-dark border-slate-200 dark:border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Energy, recovery, measurements, or highlights..."></textarea>
                        </div>
                        <div class="md:col-span-2 flex justify-end gap-3 pt-2">
                            <button type="button" id="cancel-growth-btn" class="px-5 py-3 rounded-xl border border-slate-200 dark:border-primary/10 font-bold">Cancel</button>
                            <button type="submit" id="submit-growth-btn" class="px-5 py-3 rounded-xl bg-primary text-background-dark font-bold flex items-center gap-2">
                                <span class="material-symbols-outlined text-lg">save</span>
                                Save Progress
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `);

        const modal = document.getElementById('growth-modal');
        const openBtn = document.getElementById('log-progress-btn');
        const closeBtn = document.getElementById('close-growth-modal');
        const cancelBtn = document.getElementById('cancel-growth-btn');
        const form = document.getElementById('growth-form');
        const submitBtn = document.getElementById('submit-growth-btn');

        const openModal = () => {
            if (latestStats) {
                document.getElementById('growth-weight').value = latestStats.currentWeight || '';
                document.getElementById('growth-height').value = latestStats.currentHeight || '';
                document.getElementById('growth-body-fat').value = latestStats.currentBodyFat ?? '';
                document.getElementById('growth-muscle-mass').value = latestStats.currentMuscleMass ?? '';
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        openBtn?.addEventListener('click', openModal);
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            window.FitAIUI.setButtonLoading(submitBtn, true, 'SAVING...');

            try {
                await api.growth.log({
                    weight: document.getElementById('growth-weight').value,
                    height: document.getElementById('growth-height').value,
                    bodyFat: document.getElementById('growth-body-fat').value,
                    muscleMass: document.getElementById('growth-muscle-mass').value,
                    notes: document.getElementById('growth-notes').value.trim()
                });

                closeModal();
                window.FitAIUI.showToast('Progress logged successfully.', 'success');
                window.FitAIUI.setButtonLoading(submitBtn, false);
                await loadInsights();
            } catch (error) {
                console.error('Growth log failed:', error);
                window.FitAIUI.showToast(error.message || 'Unable to save progress right now.', 'error');
                window.FitAIUI.setButtonLoading(submitBtn, false);
            }
        });
    }
});
