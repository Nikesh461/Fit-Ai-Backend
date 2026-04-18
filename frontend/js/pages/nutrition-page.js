document.addEventListener('DOMContentLoaded', async () => {
    const api = window.FitAIApi;
    const ui = window.FitAIUI;
    const auth = window.FitAIAuth;
    const common = window.FitAICommon;

    const mealsContainer = document.getElementById('meals-container');
    if (!mealsContainer || !api || !ui || !auth || !common) return;

    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const goalTitle = document.getElementById('nutrition-goal-title');
    const goalDesc = document.getElementById('nutrition-goal-desc');

    const foodModal = document.getElementById('food-modal');
    const closeFoodBtn = document.getElementById('close-food-btn');
    const closeFoodBtn2 = document.getElementById('close-food-btn-2');
    const foodNameEl = document.getElementById('food-name');
    const foodServingEl = document.getElementById('food-serving');
    const foodCaloriesEl = document.getElementById('food-calories');
    const foodProteinEl = document.getElementById('food-protein');
    const foodFatEl = document.getElementById('food-fat');
    const foodCarbsEl = document.getElementById('food-carbs');
    const foodImageEl = document.getElementById('food-image');

    const refreshBtn = injectRefreshButton();
    const daySelector = injectDaySelector();

    const mealIcons = {
        breakfast: 'light_mode',
        lunch: 'sunny',
        snack: 'nutrition',
        dinner: 'dark_mode'
    };

    let currentGoal = 'Weight Gain';
    let currentPreference = 'Veg';
    let currentDay = common.todayName();
    let weeklyPlan = [];
    let completedMeals = [];

    bindEvents();
    if (goalTitle) goalTitle.textContent = 'Loading nutrition plan...';
    if (goalDesc) goalDesc.textContent = 'Syncing your personalized meal plan from your profile.';
    await loadNutritionPlan(false);

    function injectRefreshButton() {
        const header = document.querySelector('main header');
        if (!header) return null;

        let button = document.getElementById('refresh-diet-btn');
        if (button) return button;

        button = document.createElement('button');
        button.id = 'refresh-diet-btn';
        button.className = 'px-5 py-2.5 bg-primary text-background-dark font-bold rounded-xl flex items-center gap-2 self-start md:self-auto';
        button.innerHTML = `
            <span class="material-symbols-outlined">restaurant</span>
            Refresh Plan
        `;
        header.appendChild(button);
        return button;
    }

    function injectDaySelector() {
        const wrapper = document.getElementById('nutrition-day-selector');
        if (!wrapper) return null;

        const days = common.dayNames;
        wrapper.innerHTML = days.map((day) => `
            <button
                class="nutrition-day-btn px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest ${day === common.todayName() ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 scale-105' : 'text-slate-500 bg-white dark:bg-card-dark border border-slate-200 dark:border-primary/5'} shrink-0 hover:scale-105 active:scale-95 transition-all duration-300"
                data-day="${day}">
                ${common.shortFromDay(day)}
            </button>
        `).join('');

        return wrapper;
    }

    function bindEvents() {
        refreshBtn?.addEventListener('click', () => loadNutritionPlan(true));
        closeFoodBtn?.addEventListener('click', closeFoodModal);
        closeFoodBtn2?.addEventListener('click', closeFoodModal);

        foodModal?.addEventListener('click', (event) => {
            if (event.target === foodModal) {
                closeFoodModal();
            }
        });

        daySelector?.addEventListener('click', (event) => {
            const button = event.target.closest('.nutrition-day-btn');
            if (!button) return;
            currentDay = button.dataset.day;
            highlightDayButtons();
            renderMealsForDay();
        });
    }

    async function loadNutritionPlan(refresh) {
        renderLoadingState();
        ui.setButtonLoading(refreshBtn, true, refresh ? 'REFRESHING...' : 'LOADING...');

        try {
            const [profileResponse, planResponse, todayResponse] = await Promise.all([
                api.chat.getProfile().catch(() => ({ user: auth.getUser() })),
                api.diet.getPlan(refresh),
                api.diet.getToday().catch(() => ({ data: [] }))
            ]);

            const user = profileResponse?.user || auth.getUser() || {};
            weeklyPlan = Array.isArray(planResponse?.data?.diet_plan) ? planResponse.data.diet_plan : [];
            completedMeals = (todayResponse?.data || []).map(log => log.mealType);

            currentGoal = normalizeGoal(user.goal);
            currentPreference = normalizePreference(user.dietPreference || user.cuisinePreference);

            if (!weeklyPlan.length) {
                ui.renderState(mealsContainer, 'No nutrition plan is available yet. Refresh to generate one from your profile.', 'restaurant');
                return;
            }

            if (!weeklyPlan.some((item) => item.day === currentDay)) {
                currentDay = weeklyPlan[0]?.day || common.todayName();
            }

            highlightDayButtons();
            renderMealsForDay();

            if (refresh) {
                ui.showToast('Your nutrition plan has been refreshed.', 'success');
            }
        } catch (error) {
            console.error('Failed to load nutrition plan:', error);
            ui.renderState(mealsContainer, error.message || 'Unable to load your nutrition plan right now.', 'error');
            ui.showToast(error.message || 'Unable to load your nutrition plan right now.', 'error');
        } finally {
            ui.setButtonLoading(refreshBtn, false);
        }
    }

    function renderMealsForDay() {
        const dayPlan = weeklyPlan.find((item) => item.day === currentDay) || weeklyPlan[0];
        if (!dayPlan) {
            ui.renderState(mealsContainer, 'No meals found for this day.', 'event_busy');
            return;
        }

        const macros = dayPlan.total_macros || {};
        goalTitle.textContent = `${currentGoal} Plan • ${dayPlan.day}`;
        goalDesc.textContent = `${macros.calories || '—'} kcal • ${macros.protein || '—'} protein • ${currentPreference} • Synced from your backend profile`;

        const meals = Object.entries(dayPlan.meals || {});
        if (!meals.length) {
            ui.renderState(mealsContainer, 'This day does not have meal details yet.', 'restaurant');
            return;
        }

        mealsContainer.innerHTML = '';
        const isToday = currentDay === common.todayName();

        meals.forEach(([mealKey, meal]) => {
            const icon = mealIcons[mealKey] || 'restaurant';
            const isCompleted = isToday && completedMeals.includes(mealKey);
            const imageUrl = meal?.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400';
            const card = document.createElement('div');
            card.className = `group relative bg-white dark:bg-card-dark rounded-[2.5rem] border border-slate-200/60 dark:border-primary/5 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col h-full ${isCompleted ? 'ring-2 ring-emerald-500/20' : ''}`;
            
            card.innerHTML = `
                <!-- Image Section -->
                <div class="relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img class="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-1000" 
                        src="${imageUrl}" alt="${escapeHtml(meal?.name)}" 
                        onerror="this.src='https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=600';" />
                    
                    <!-- Gradient Overlay -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500"></div>
                    
                    <!-- Meal Type Badge -->
                    <div class="absolute top-5 left-5 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center gap-2 text-white shadow-xl">
                        <span class="material-symbols-outlined text-[18px] opacity-80">${icon}</span>
                        <span class="text-[10px] font-black uppercase tracking-[0.15em]">${escapeHtml(mealKey)}</span>
                    </div>

                    ${isCompleted ? `
                        <div class="absolute top-5 right-5 size-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
                            <span class="material-symbols-outlined text-lg font-bold">check</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Content Section -->
                <div class="p-7 flex flex-col gap-6 flex-1">
                    <div class="space-y-2">
                        <h4 class="text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors duration-300">
                            ${escapeHtml(meal?.name || 'Meal')}
                        </h4>
                        <p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            ${escapeHtml(meal?.description || 'Personalized meal guidance optimized for your backend fitness profile.')}
                        </p>
                    </div>

                    <!-- Macro Row -->
                    <div class="flex items-center justify-between p-4 rounded-3xl bg-slate-50 dark:bg-background-dark/50 border border-slate-100 dark:border-primary/5">
                        <div class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Kcal</span>
                            <span class="text-sm font-black text-slate-800 dark:text-white">${escapeHtml(String(meal?.real_macros?.calories || meal?.macros?.calories || '—'))}</span>
                        </div>
                        <div class="w-px h-6 bg-slate-200 dark:bg-primary/10"></div>
                        <div class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Prot</span>
                            <span class="text-sm font-black text-slate-800 dark:text-white">${escapeHtml(String(meal?.real_macros?.protein || meal?.macros?.protein || '—'))}g</span>
                        </div>
                        <div class="w-px h-6 bg-slate-200 dark:bg-primary/10"></div>
                        <div class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Carb</span>
                            <span class="text-sm font-black text-slate-800 dark:text-white">${escapeHtml(String(meal?.real_macros?.carbs || meal?.macros?.carbs || '—'))}g</span>
                        </div>
                        <div class="w-px h-6 bg-slate-200 dark:bg-primary/10"></div>
                        <div class="flex flex-col items-center">
                            <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Fat</span>
                            <span class="text-sm font-black text-slate-800 dark:text-white">${escapeHtml(String(meal?.real_macros?.fats || meal?.macros?.fats || '—'))}g</span>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3 mt-auto pt-2">
                        <button class="meal-details-btn flex-1 h-14 rounded-2xl bg-primary text-background-dark font-black tracking-tight flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                            <span class="material-symbols-outlined text-xl">info</span>
                            DETAILS
                        </button>
                        
                        ${(isToday && !isCompleted) ? `
                            <button class="complete-meal-btn h-14 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:scale-[1.05] flex items-center justify-center transition-all duration-300" title="Mark as Done">
                                <span class="material-symbols-outlined font-bold">check</span>
                            </button>
                        ` : ''}
                        
                        ${(isToday && isCompleted) ? `
                            <div class="h-14 w-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20" title="Completed">
                                <span class="material-symbols-outlined font-bold">check_circle</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            card.querySelector('.meal-details-btn')?.addEventListener('click', () => openFoodModal(mealKey, meal, dayPlan));
            
            card.querySelector('.complete-meal-btn')?.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                if (!isToday || isCompleted) return;
                
                try {
                    ui.setButtonLoading(btn, true, '');
                    await api.diet.completeMeal({
                        mealName: meal.name || 'Meal',
                        mealType: mealKey,
                        calories: common.parseMacroValue(meal?.real_macros?.calories || meal?.macros?.calories),
                        protein: common.parseMacroValue(meal?.real_macros?.protein || meal?.macros?.protein),
                        carbs: common.parseMacroValue(meal?.real_macros?.carbs || meal?.macros?.carbs),
                        fats: common.parseMacroValue(meal?.real_macros?.fats || meal?.macros?.fats)
                    });
                    
                    completedMeals.push(mealKey);
                    ui.showToast(`${meal.name} marked as complete!`, 'success');
                    renderMealsForDay();
                } catch (error) {
                    console.error('Diet completion failed:', error);
                    ui.showToast(error.message || 'Unable to save completion right now.', 'error');
                    ui.setButtonLoading(btn, false);
                }
            });

            mealsContainer.appendChild(card);
        });
    }

    function renderLoadingState() {
        mealsContainer.innerHTML = Array.from({ length: 4 }).map(() => `
            <div class="bg-white dark:bg-card-dark rounded-3xl border border-slate-200 dark:border-primary/10 overflow-hidden animate-pulse">
                <div class="p-6 h-32 bg-slate-100 dark:bg-slate-800"></div>
                <div class="p-5 space-y-3">
                    <div class="h-4 rounded bg-slate-100 dark:bg-slate-700"></div>
                    <div class="h-4 rounded bg-slate-100 dark:bg-slate-700"></div>
                    <div class="h-10 rounded bg-slate-100 dark:bg-slate-700"></div>
                </div>
            </div>
        `).join('');
    }

    function openFoodModal(mealKey, meal, dayPlan) {
        const mealMacros = meal?.real_macros || meal?.macros || {};
        foodNameEl.textContent = meal?.name || 'Meal Details';
        foodServingEl.textContent = `${capitalize(mealKey)} • ${dayPlan?.day || currentDay}`;
        foodCaloriesEl.textContent = String(mealMacros.calories || '—');
        foodProteinEl.textContent = String(mealMacros.protein || '—');
        foodFatEl.textContent = String(mealMacros.fats || '—');
        foodCarbsEl.textContent = String(mealMacros.carbs || '—');

        if (foodImageEl) {
            foodImageEl.src = meal?.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400';
            foodImageEl.alt = meal?.name || 'Meal image';
        }

        foodModal?.classList.remove('hidden');
    }

    function closeFoodModal() {
        foodModal?.classList.add('hidden');
    }

    function highlightDayButtons() {
        document.querySelectorAll('.nutrition-day-btn').forEach((btn) => {
            const isActive = btn.dataset.day === currentDay;
            if (isActive) {
                btn.className = 'nutrition-day-btn px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-primary text-background-dark shadow-lg shadow-primary/20 scale-105 shrink-0 transition-all duration-300';
            } else {
                btn.className = 'nutrition-day-btn px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-slate-500 bg-white dark:bg-card-dark border border-slate-200 dark:border-primary/5 shrink-0 hover:scale-105 active:scale-95 transition-all duration-300';
            }
        });
    }

    function normalizeGoal(value) {
        const goal = String(value || '').toLowerCase();
        return goal.includes('loss') || goal.includes('cut') ? 'Fat Loss' : 'Weight Gain';
    }

    function normalizePreference(value) {
        const pref = String(value || '').toLowerCase();
        if (pref.includes('non')) return 'Non-Veg';
        if (pref.includes('veg')) return 'Veg';
        return 'Protein';
    }

    function capitalize(value) {
        const text = String(value || '');
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
});
