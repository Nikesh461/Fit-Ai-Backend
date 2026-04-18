window.FitAICommon = {
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    shortDayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    todayName() {
        return this.dayNames[new Date().getDay()];
    },

    todayShort() {
        return this.shortDayNames[new Date().getDay()];
    },

    shortFromDay(day = '') {
        return day ? day.slice(0, 3) : '';
    },

    parseMacroValue(value) {
        if (typeof value === 'number') return value;
        const match = String(value || '').match(/[\d.]+/);
        return match ? Number(match[0]) : 0;
    },

    findDayPlan(days = [], dayName = this.todayName()) {
        return days.find((item) => item.day === dayName) || days[0] || null;
    },

    estimateWorkoutCalories(log) {
        const sets = Number(log?.sets) || 1;
        const weightedMultiplier = log?.weight ? 40 : 32;
        return Math.max(35, Math.round(sets * weightedMultiplier));
    },

    estimateWorkoutMinutes(log) {
        const sets = Number(log?.sets) || 1;
        return Math.max(6, sets * 4);
    },

    deriveAthleteLevel(experience = 0) {
        if (experience >= 250) return 'Advanced Athlete';
        if (experience >= 100) return 'Intermediate Athlete';
        return 'Beginner Athlete';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const api = window.FitAIApi;
    const auth = window.FitAIAuth;
    const ui = window.FitAIUI;
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isAuthPage = pageName === 'login.html' || pageName === 'register.html';

    applySavedTheme();
    setupLogoutButtons();
    setupDashboardNavigation();
    setupChatShell();

    if (isAuthPage) {
        if (auth.isAuthenticated()) {
            try {
                const data = await api.auth.me();
                auth.updateUser(data.user);
                window.location.href = 'index.html';
                return;
            } catch (error) {
                auth.clearSession();
            }
        }
        return;
    }

    const user = await hydrateUser();
    if (!user) return;

    if (pageName === 'index.html' || window.location.pathname === '/' || pageName === '') {
        await loadDashboard(user);
    }

    async function hydrateUser() {
        if (!auth.isAuthenticated()) {
            window.location.href = 'login.html';
            return null;
        }

        try {
            const data = await api.auth.me();
            auth.updateUser(data.user);
            updateUserChrome(data.user);
            await loadChatHistory(data.user);
            return data.user;
        } catch (error) {
            console.error('Session validation failed:', error);
            auth.clearSession();
            ui.showToast('Please sign in again to continue.', 'error');
            window.location.href = 'login.html';
            return null;
        }
    }

    function applySavedTheme() {
        const settings = JSON.parse(localStorage.getItem(window.FitAIConfig?.STORAGE_KEYS?.settings || 'fitai_settings') || '{}');
        const savedTheme = settings.theme || localStorage.getItem('theme') || 'dark';
        document.documentElement.classList.toggle('dark', savedTheme !== 'light');
    }

    function updateUserChrome(user = {}) {
        const level = window.FitAICommon.deriveAthleteLevel(Number(user.experience) || 0);
        const name = user.name || 'FitAI Member';
        const firstName = name.split(' ')[0];
        const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

        document.querySelectorAll('#sidebar-user-name').forEach((el) => {
            el.textContent = name;
        });

        document.querySelectorAll('#sidebar-user-goal').forEach((el) => {
            el.textContent = user.goal ? `${user.goal} • ${level}` : level;
        });

        document.querySelectorAll('#user-avatar-initials').forEach((el) => {
            el.textContent = initials || 'FI';
        });

        const initialMessage = document.querySelector('#chat-messages .rounded-2xl');
        if (initialMessage && !initialMessage.dataset.loadedFromApi) {
            initialMessage.textContent = `Hi ${firstName}! I'm your FitAI Coach. Ask me about your workout, nutrition, or recovery.`;
        }
    }

    window.FitAICommon.updateUserChrome = updateUserChrome;

    function setupLogoutButtons() {
        const buttons = [document.getElementById('logout-btn'), document.getElementById('dash-logout-btn')].filter(Boolean);

        buttons.forEach((button) => {
            button.addEventListener('click', async (event) => {
                event.preventDefault();

                try {
                    await api.auth.logout();
                } catch (error) {
                    console.warn('Logout request failed:', error.message);
                }

                auth.clearSession();
                window.location.href = 'login.html';
            });
        });
    }

    function setupDashboardNavigation() {
        const routineButton = document.getElementById('view-routine-btn');
        if (!routineButton) return;

        routineButton.addEventListener('click', () => {
            window.location.href = 'workouts.html';
        });
    }

    function setupChatShell() {
        const chatButton = document.getElementById('chat-toggle-btn');
        const chatWindow = document.getElementById('chat-window');
        const closeChatBtn = document.getElementById('close-chat-btn');
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');

        if (chatButton && chatWindow) {
            chatButton.addEventListener('click', () => {
                chatWindow.classList.toggle('hidden');
                chatWindow.classList.toggle('flex');
            });
        }

        if (closeChatBtn && chatWindow) {
            closeChatBtn.addEventListener('click', () => {
                chatWindow.classList.add('hidden');
                chatWindow.classList.remove('flex');
            });
        }

        if (chatForm && chatInput) {
            chatForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const message = chatInput.value.trim();
                if (!message) return;

                renderChatMessage(message, 'user');
                chatInput.value = '';
                const loadingId = addChatLoading();

                try {
                    const response = await api.chat.sendMessage({ message });
                    removeChatMessage(loadingId);
                    renderChatMessage(response.message || "I'm here to help.", 'assistant');
                } catch (error) {
                    console.error('Chat send failed:', error);
                    removeChatMessage(loadingId);
                    renderChatMessage('Sorry, I could not reach your coach right now. Please try again shortly.', 'assistant');
                    ui.showToast(error.message, 'error');
                }
            });
        }
    }

    async function loadChatHistory(user) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages || !auth.isAuthenticated()) return;

        try {
            const data = await api.chat.getHistory();
            const messages = Array.isArray(data.messages) ? data.messages : [];
            chatMessages.innerHTML = '';

            if (!messages.length) {
                const firstName = (user?.name || 'Athlete').split(' ')[0];
                renderChatMessage(`Hi ${firstName}! I'm your FitAI Coach. Ask me about today's workout, your diet plan, or recovery tips.`, 'assistant');
                return;
            }

            messages.forEach((message) => {
                renderChatMessage(message.content, message.role);
            });
        } catch (error) {
            console.warn('Unable to load chat history:', error.message);
        }
    }

    function renderChatMessage(text, role = 'assistant') {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const isUser = role === 'user';
        const wrapper = document.createElement('div');
        wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;

        const bubble = document.createElement('div');
        bubble.className = `max-w-[80%] rounded-2xl p-3 text-sm ${
            isUser
                ? 'bg-primary text-white rounded-br-none'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
        }`;
        bubble.dataset.loadedFromApi = 'true';

        if (isUser) {
            bubble.textContent = text;
        } else {
            // Basic markdown rendering for AI responses
            let html = text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">$1</code>')
                .replace(/\n/g, '<br>');
            bubble.innerHTML = html;
        }

        wrapper.appendChild(bubble);
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addChatLoading() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return '';

        const id = `chat-loading-${Date.now()}`;
        const wrapper = document.createElement('div');
        wrapper.id = id;
        wrapper.className = 'flex justify-start mb-4';

        const bubble = document.createElement('div');
        bubble.className = 'max-w-[80%] rounded-2xl p-3 text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none flex items-center gap-1';

        for (let index = 0; index < 3; index += 1) {
            const dot = document.createElement('span');
            dot.className = 'w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce';
            dot.style.animationDelay = `${index * 0.15}s`;
            bubble.appendChild(dot);
        }

        wrapper.appendChild(bubble);
        chatMessages.appendChild(wrapper);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    function removeChatMessage(id) {
        if (!id) return;
        document.getElementById(id)?.remove();
    }

    async function loadDashboard(user) {
        const caloriesEl = document.getElementById('dash-calories');
        const exercisesContainer = document.getElementById('dash-exercises-container');
        if (!caloriesEl && !exercisesContainer) return;

        try {
            const [growthStatsResponse, todayWorkoutResponse, workoutHistoryResponse, dietResponse, dietLogResponse] = await Promise.all([
                api.growth.getStats().catch(() => ({ stats: {} })),
                api.workout.getToday().catch(() => null),
                api.workout.getHistory().catch(() => ({ logs: [] })),
                api.diet.getPlan().catch(() => null),
                api.diet.getToday().catch(() => ({ data: [] }))
            ]);

            const stats = growthStatsResponse?.stats || {};
            const logs = Array.isArray(workoutHistoryResponse?.logs) ? workoutHistoryResponse.logs : [];
            const todayKey = new Date().toDateString();
            const todayLogs = logs.filter((log) => new Date(log.completedAt).toDateString() === todayKey);
            const todayWorkout = todayWorkoutResponse?.data || null;
            const plannedExercises = Array.isArray(todayWorkout?.exercises) ? todayWorkout.exercises : [];
            const todayDiet = window.FitAICommon.findDayPlan(dietResponse?.data?.diet_plan || []);
            const todayDietLogs = Array.isArray(dietLogResponse?.data) ? dietLogResponse.data : [];

            const totalCalories = todayLogs.reduce((sum, log) => sum + window.FitAICommon.estimateWorkoutCalories(log), 0);
            const totalMinutes = todayLogs.reduce((sum, log) => sum + window.FitAICommon.estimateWorkoutMinutes(log), 0);
            const completedCount = plannedExercises.filter((exercise) => exercise.isCompleted).length;
            const intensity = plannedExercises.length ? Math.round((completedCount / plannedExercises.length) * 100) : (todayLogs.length ? Math.min(100, todayLogs.length * 20) : 0);

            caloriesEl.innerHTML = `${totalCalories} <span class="text-sm font-medium text-slate-400 uppercase">kcal</span>`;

            const timeEl = document.getElementById('dash-time');
            if (timeEl) {
                timeEl.innerHTML = `${totalMinutes} <span class="text-sm font-medium text-slate-400 uppercase">mins</span>`;
            }

            const intensityEl = document.getElementById('dash-intensity');
            if (intensityEl) {
                intensityEl.innerHTML = `${intensity}<span class="text-sm font-medium text-slate-400 uppercase">%</span>`;
            }

            const subtitle = document.getElementById('dash-header-subtitle');
            if (subtitle) {
                subtitle.textContent = `${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} — You're on a ${stats.streak || 0}-day streak! 🔥`;
            }

            renderTodayExercises(plannedExercises, todayWorkout?.focus);
            updateDashboardMacros(todayDiet, todayDietLogs);
            updateInsightCard(user, stats, todayWorkout, todayDiet);
        } catch (error) {
            console.error('Dashboard sync failed:', error);
            ui.showToast(error.message, 'error');
        }
    }

    function renderTodayExercises(exercises = [], focus = '') {
        const container = document.getElementById('dash-exercises-container');
        const focusEl = document.getElementById('dash-workout-focus');
        if (!container) return;

        if (focusEl) {
            focusEl.textContent = focus || (exercises.length ? "Today's Plan" : 'No workout yet');
        }

        if (!exercises.length) {
            container.innerHTML = `
                <div class="p-8 text-center">
                    <span class="material-symbols-outlined text-4xl text-primary/50 mb-2">event_available</span>
                    <p class="text-sm text-slate-500 font-medium">Your personalized workout will appear here after the weekly plan is generated.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = exercises.map((exercise) => `
            <div class="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors cursor-pointer group">
                <div class="size-14 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <img class="w-full h-full object-cover" src="${exercise.details?.img || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80'}" alt="${exercise.name}" onerror="this.src='https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80'" />
                </div>
                <div class="flex-1">
                    <p class="font-bold">${exercise.name}</p>
                    <p class="text-xs text-slate-500 font-medium">${exercise.sets || 3} Sets x ${exercise.reps || '10'} Reps</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold text-primary">${exercise.target_muscle || 'Full Body'}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold">${exercise.rest || '60s'} rest</p>
                </div>
                <span class="material-symbols-outlined ${exercise.isCompleted ? 'text-primary' : 'text-slate-300 group-hover:text-primary'}">
                    ${exercise.isCompleted ? 'check_circle' : 'play_circle'}
                </span>
            </div>
        `).join('');

        Array.from(container.children).forEach((card) => {
            card.addEventListener('click', () => {
                window.location.href = 'workouts.html';
            });
        });
    }

    function updateDashboardMacros(dayPlan, dietLogs = []) {
        const kcalEl = document.getElementById('dash-kcal-left');
        const labelEl = document.getElementById('dash-kcal-label');

        if (!dayPlan) {
            if (kcalEl) kcalEl.textContent = '—';
            if (labelEl) labelEl.textContent = 'No Plan';
            return;
        }

        const targetCalories = Number(dayPlan.total_macros?.calories) || 2000;
        const targetProtein = window.FitAICommon.parseMacroValue(dayPlan.total_macros?.protein) || 150;
        const targetCarbs = window.FitAICommon.parseMacroValue(dayPlan.total_macros?.carbs) || 200;
        const targetFats = window.FitAICommon.parseMacroValue(dayPlan.total_macros?.fats) || 60;

        const consumedCalories = dietLogs.reduce((sum, log) => sum + (Number(log.calories) || 0), 0);
        const consumedProtein = dietLogs.reduce((sum, log) => sum + (Number(log.protein) || 0), 0);
        const consumedCarbs = dietLogs.reduce((sum, log) => sum + (Number(log.carbs) || 0), 0);
        const consumedFats = dietLogs.reduce((sum, log) => sum + (Number(log.fats) || 0), 0);

        const remainingCalories = Math.max(0, targetCalories - consumedCalories);

        if (kcalEl) kcalEl.textContent = remainingCalories.toLocaleString();
        if (labelEl) labelEl.textContent = 'Calories Left';

        const ring = document.getElementById('dash-kcal-ring');
        if (ring) {
            const circumference = 502.6; // 2 * PI * 80
            const progress = Math.min(consumedCalories / targetCalories, 1);
            const offset = circumference - (progress * circumference);
            ring.style.strokeDashoffset = String(offset);
        }

        [
            ['dash-protein-val', 'dash-protein-bar', consumedProtein, targetProtein],
            ['dash-carbs-val', 'dash-carbs-bar', consumedCarbs, targetCarbs],
            ['dash-fats-val', 'dash-fats-bar', consumedFats, targetFats]
        ].forEach(([labelId, barId, consumed, target]) => {
            const label = document.getElementById(labelId);
            const bar = document.getElementById(barId);

            if (label) label.textContent = `${Math.round(consumed)}g / ${Math.round(target)}g`;
            if (bar) bar.style.width = `${Math.min((consumed / target) * 100, 100)}%`;
        });
    }

    function updateInsightCard(user, stats, todayWorkout, dayPlan) {
        const titleEl = document.getElementById('dash-insight-title');
        const textEl = document.getElementById('dash-insight-desc');
        const button = document.getElementById('view-routine-btn');
        const firstName = (user?.name || 'Athlete').split(' ')[0];
        const focus = todayWorkout?.focus || 'your next training block';
        const exerciseCount = Array.isArray(todayWorkout?.exercises) ? todayWorkout.exercises.length : 0;
        const protein = window.FitAICommon.parseMacroValue(dayPlan?.total_macros?.protein);

        if (titleEl) {
            titleEl.textContent = `You're on track for ${user?.goal || 'your goal'}, ${firstName}.`;
        }

        if (textEl) {
            textEl.innerHTML = `Your current streak is <b>${stats.streak || 0} days</b>, and today's focus is <b>${focus}</b>${exerciseCount ? ` with ${exerciseCount} planned exercises` : ''}. Aim for about <b>${protein || 0}g protein</b> to stay aligned with your nutrition plan.`;
        }

        if (button) {
            button.textContent = "Open Today's Workout";
            button.onclick = () => {
                window.location.href = 'workouts.html';
            };
        }
    }
});
