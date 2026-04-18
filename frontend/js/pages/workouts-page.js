document.addEventListener('DOMContentLoaded', async () => {
    const api = window.FitAIApi;
    const ui = window.FitAIUI;
    const auth = window.FitAIAuth;
    const common = window.FitAICommon;

    const exercisesContainer = document.getElementById('exercises-container');
    if (!exercisesContainer || !api || !ui || !auth || !common) return;

    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    const dayBtns = Array.from(document.querySelectorAll('.day-btn'));
    const workoutDayTitle = document.getElementById('workout-day-title');
    const workoutFocus = document.getElementById('workout-focus');

    const timerModal = document.getElementById('timer-modal');
    const closeTimerBtn = document.getElementById('close-timer-btn');
    const instructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsBtn = document.getElementById('close-instructions-btn');
    const modalExName = document.getElementById('modal-exercise-name');
    const modalExPart = document.getElementById('modal-exercise-part');
    const modalExImage = document.getElementById('modal-exercise-image');
    const timerStatus = document.getElementById('timer-status');
    const timerDisplay = document.getElementById('timer-display');
    const timerProgress = document.getElementById('timer-progress');
    const currentSetDisplay = document.getElementById('current-set-display');
    const targetRepsDisplay = document.getElementById('target-reps-display');
    const timerPrimaryBtn = document.getElementById('timer-primary-btn');

    const refreshBtn = injectRefreshButton();

    let weeklyPlan = [];
    let currentDay = common.todayShort();
    let currentLevel = 'Beginner';
    let activeExercise = null;
    let currentSet = 1;
    let timerInterval = null;
    let timeRemaining = 0;
    let totalTime = 45;

    const fallbackImages = {
        chest: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80',
        triceps: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80',
        back: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80',
        biceps: 'https://images.unsplash.com/photo-1581009137042-c552e48ce52f?w=500&q=80',
        legs: 'https://images.unsplash.com/photo-1541534741627-52d260f8f94d?w=500&q=80',
        shoulders: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=500&q=80',
        core: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&q=80',
        rest: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&q=80'
    };

    bindEvents();
    highlightDayButtons();
    workoutDayTitle.textContent = `${currentDay} Workout`;
    workoutFocus.textContent = 'Loading...';
    await loadWorkoutPlan(false);

    function injectRefreshButton() {
        const header = document.querySelector('main header');
        if (!header) return null;

        let button = document.getElementById('refresh-workout-btn');
        if (button) return button;

        button = document.createElement('button');
        button.id = 'refresh-workout-btn';
        button.className = 'px-5 py-2.5 bg-primary text-background-dark font-bold rounded-xl flex items-center gap-2';
        button.innerHTML = `
            <span class="material-symbols-outlined">autorenew</span>
            Refresh Plan
        `;

        header.appendChild(button);
        return button;
    }

    function bindEvents() {
        refreshBtn?.addEventListener('click', () => loadWorkoutPlan(true));
        closeTimerBtn?.addEventListener('click', closeTimer);
        timerPrimaryBtn?.addEventListener('click', handlePrimaryAction);

        timerModal?.addEventListener('click', (event) => {
            if (event.target === timerModal) {
                closeTimer();
            }
        });

        closeInstructionsBtn?.addEventListener('click', () => {
            instructionsModal?.classList.add('hidden');
        });

        instructionsModal?.addEventListener('click', (event) => {
            if (event.target === instructionsModal) {
                instructionsModal.classList.add('hidden');
            }
        });

        dayBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                currentDay = btn.dataset.day;
                highlightDayButtons();
                renderCurrentDay();
            });
        });
    }

    async function loadWorkoutPlan(refresh) {
        renderLoadingState();
        ui.setButtonLoading(refreshBtn, true, refresh ? 'REFRESHING...' : 'LOADING...');

        try {
            const [planResponse, todayResponse, profileResponse] = await Promise.all([
                api.workout.getPlan(refresh),
                api.workout.getToday().catch(() => null),
                api.chat.getProfile().catch(() => null)
            ]);

            weeklyPlan = Array.isArray(planResponse?.data) ? planResponse.data : [];
            currentLevel = getLevelFromExperience(profileResponse?.progress?.experience || 0);
            mergeTodayCompletion(todayResponse);

            if (!weeklyPlan.length) {
                ui.renderState(exercisesContainer, 'No workout plan is available yet. Refresh to generate one from your profile.', 'fitness_center');
                return;
            }

            const matchingDay = weeklyPlan.find((item) => common.shortFromDay(item.day) === currentDay);
            if (!matchingDay) {
                currentDay = common.shortFromDay(weeklyPlan[0]?.day || common.todayName());
            }

            highlightDayButtons();
            renderCurrentDay();

            if (refresh) {
                ui.showToast('Your AI workout plan has been refreshed.', 'success');
            }
        } catch (error) {
            console.error('Failed to load workout plan:', error);
            ui.renderState(exercisesContainer, error.message || 'Unable to load your workout plan right now.', 'error');
            ui.showToast(error.message || 'Unable to load your workout plan right now.', 'error');
        } finally {
            ui.setButtonLoading(refreshBtn, false);
        }
    }

    function mergeTodayCompletion(todayResponse) {
        const todayName = todayResponse?.day || common.todayName();
        const todayExercises = Array.isArray(todayResponse?.data?.exercises) ? todayResponse.data.exercises : [];

        if (!todayExercises.length) return;

        weeklyPlan = weeklyPlan.map((day) => {
            if (day.day !== todayName) return day;

            return {
                ...day,
                exercises: (day.exercises || []).map((exercise) => {
                    const match = todayExercises.find((item) => item.name === exercise.name);
                    return match ? { ...exercise, isCompleted: Boolean(match.isCompleted) } : exercise;
                })
            };
        });
    }

    function renderCurrentDay() {
        const dayPlan = weeklyPlan.find((item) => common.shortFromDay(item.day) === currentDay) || weeklyPlan[0];
        if (!dayPlan) {
            ui.renderState(exercisesContainer, 'No exercises found for this day.', 'event_busy');
            return;
        }

        const exercises = Array.isArray(dayPlan.exercises) ? dayPlan.exercises : [];
        const isRestDay = !exercises.length || /rest/i.test(dayPlan.focus || '');

        workoutDayTitle.textContent = isRestDay ? `${dayPlan.day} - Rest & Recovery` : `${dayPlan.day} Workout`;
        workoutFocus.textContent = dayPlan.focus || (isRestDay ? 'Recovery' : 'AI Personalized');

        if (isRestDay) {
            exercisesContainer.innerHTML = `
                <div class="col-span-1 md:col-span-2 xl:col-span-3 bg-primary/10 border border-primary/20 rounded-3xl p-12 text-center mt-4">
                    <span class="material-symbols-outlined text-6xl text-primary mb-4 block">self_improvement</span>
                    <h3 class="text-2xl font-black mb-2">Recovery Day</h3>
                    <p class="text-slate-500 max-w-md mx-auto">Your backend marked this as a recovery-focused day. Prioritize mobility, hydration, and sleep.</p>
                </div>
            `;
            return;
        }

        let hasUncompleted = false;
        const isToday = currentDay === common.todayShort();

        exercisesContainer.innerHTML = '';
        exercises.forEach((exercise) => {
            if (!exercise.isCompleted) hasUncompleted = true;
            
            const card = document.createElement('div');
            const image = getExerciseImage(exercise);
            const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(exercise.name || 'Workout')}&background=121c26&color=0066FF&size=128&font-size=0.33`;
            const statusLabel = exercise.isCompleted ? 'Completed' : 'Ready';
            const target = exercise.target_muscle || 'Full Body';

            card.className = 'bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-primary/5 overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer flex flex-col h-full';
            card.innerHTML = `
                <div class="h-48 overflow-hidden relative bg-slate-200 dark:bg-slate-800">
                    <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${image}" onerror="this.onerror=null;this.src='${fallback}';" alt="${escapeHtml(exercise.name || 'Workout exercise')}" />
                    <div class="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">${escapeHtml(target)}</div>
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <h4 class="font-bold text-lg mb-1 leading-tight text-slate-900 dark:text-white">${escapeHtml(exercise.name || 'Exercise')}</h4>
                    <p class="text-xs text-slate-500 font-medium mb-4">${escapeHtml(String(exercise.sets || 3))} Sets x ${escapeHtml(String(exercise.reps || '10'))} Reps • Rest ${escapeHtml(String(exercise.rest || '60s'))}</p>
                    <div class="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div class="flex flex-col">
                             <span class="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                             <span class="text-xs font-bold ${exercise.isCompleted ? 'text-emerald-500' : 'text-primary'}">${statusLabel}</span>
                        </div>
                        <div class="flex gap-2">
                            <button class="instruction-btn size-8 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-colors" title="View Instructions">
                                <span class="material-symbols-outlined text-sm">info</span>
                            </button>
                            ${(!exercise.isCompleted && isToday) ? `<button class="quick-complete-btn size-8 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors" title="Mark Done">
                                <span class="material-symbols-outlined text-sm">check</span>
                            </button>` : ''}
                            <div class="size-8 rounded-full ${exercise.isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'} flex items-center justify-center transition-colors" title="Timer">
                                <span class="material-symbols-outlined text-sm">${exercise.isCompleted ? 'check_circle' : 'play_arrow'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.quick-complete-btn') || e.target.closest('.instruction-btn')) {
                    return; // Handled separately
                }
                openTimer(exercise);
            });

            // Instructions logic
            const instBtn = card.querySelector('.instruction-btn');
            if (instBtn) {
                instBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showInstructions(exercise);
                });
            }

            // Quick complete logic
            const quickBtn = card.querySelector('.quick-complete-btn');
            if (quickBtn) {
                quickBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const prevHTML = quickBtn.innerHTML;
                    try {
                        quickBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span>';
                        quickBtn.disabled = true;
                        
                        await api.workout.completeExercise({
                            exerciseName: exercise.name,
                            sets: exercise.sets,
                            reps: exercise.reps,
                            weight: ''
                        });
                        ui.showToast(`${exercise.name} marked as complete.`, 'success');
                        await loadWorkoutPlan(false);
                    } catch (err) {
                        console.error('Quick completion failed:', err);
                        ui.showToast('Unable to complete exercise.', 'error');
                        quickBtn.innerHTML = prevHTML;
                        quickBtn.disabled = false;
                    }
                });
            }

            exercisesContainer.appendChild(card);
        });
    }

    function renderLoadingState() {
        exercisesContainer.innerHTML = Array.from({ length: 4 }).map(() => `
            <div class="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-primary/5 overflow-hidden animate-pulse">
                <div class="h-48 bg-slate-200 dark:bg-slate-800"></div>
                <div class="p-4 space-y-3">
                    <div class="h-5 rounded bg-slate-200 dark:bg-slate-800"></div>
                    <div class="h-4 rounded bg-slate-100 dark:bg-slate-700"></div>
                    <div class="h-10 rounded bg-slate-100 dark:bg-slate-700"></div>
                </div>
            </div>
        `).join('');
    }

    function highlightDayButtons() {
        dayBtns.forEach((btn) => {
            const isActive = btn.dataset.day === currentDay;
            btn.className = isActive
                ? 'day-btn px-4 py-2 rounded-xl text-sm font-bold bg-primary text-background-dark shadow-md shrink-0 transition-all scale-105'
                : 'day-btn px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-white dark:bg-card-dark border border-slate-200 dark:border-primary/5 hover:border-primary/50 shrink-0 transition-all';
        });
    }

    function openTimer(exercise) {
        activeExercise = exercise;
        currentSet = 1;
        totalTime = Math.max(30, parseRestSeconds(exercise.rest || '45s'));

        modalExName.textContent = exercise.name || 'Exercise';
        modalExPart.textContent = exercise.target_muscle || 'Full Body';
        targetRepsDisplay.innerHTML = `${escapeHtml(String(exercise.reps || '10'))} <span class="text-sm text-slate-400">Reps</span>`;

        if (modalExImage) {
            modalExImage.src = getExerciseImage(exercise);
            modalExImage.style.display = 'block';
            modalExImage.onerror = function () {
                this.onerror = null;
                this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(exercise.name || 'Workout')}&background=121c26&color=0066FF&size=128&font-size=0.33`;
            };
        }

        updateTimerUI();
        timerStatus.textContent = exercise.isCompleted ? 'Completed Earlier Today' : 'Ready to Start';
        timerStatus.className = 'text-sm font-black text-primary uppercase tracking-widest mb-2';
        timerDisplay.textContent = '00:00';
        setProgressBar(0);
        timerPrimaryBtn.textContent = 'START SET';
        timerPrimaryBtn.dataset.action = 'start';

        timerModal.classList.remove('hidden');
    }

    function updateTimerUI() {
        const totalSets = Number(activeExercise?.sets) || 1;
        currentSetDisplay.innerHTML = `${currentSet} <span class="text-sm text-slate-400">/ ${totalSets}</span>`;
    }

    function handlePrimaryAction() {
        const action = timerPrimaryBtn.dataset.action;

        if (action === 'start') {
            timerStatus.textContent = 'GO! PERFORM SET';
            timerStatus.className = 'text-sm font-black text-emerald-500 uppercase tracking-widest mb-2';
            timerPrimaryBtn.textContent = 'FINISH SET';
            timerPrimaryBtn.dataset.action = 'finish-set';
            startTimer(totalTime, null, true);
            return;
        }

        if (action === 'finish-set') {
            finishSet();
            return;
        }

        if (action === 'skip-rest') {
            prepareNextSet();
            return;
        }

        if (action === 'finish-workout') {
            completeActiveExercise();
        }
    }

    function finishSet() {
        clearInterval(timerInterval);
        const totalSets = Number(activeExercise?.sets) || 1;

        if (currentSet < totalSets) {
            timerStatus.textContent = 'SET COMPLETE - RESTING';
            timerStatus.className = 'text-sm font-black text-orange-500 uppercase tracking-widest mb-2';
            timerPrimaryBtn.textContent = 'SKIP REST';
            timerPrimaryBtn.dataset.action = 'skip-rest';
            startTimer(parseRestSeconds(activeExercise?.rest || '60s'), prepareNextSet, false);
            return;
        }

        timerStatus.textContent = 'EXERCISE COMPLETE!';
        timerStatus.className = 'text-sm font-black text-primary uppercase tracking-widest mb-2';
        
        if (currentDay === common.todayShort()) {
            timerPrimaryBtn.textContent = 'MARK COMPLETE';
            timerPrimaryBtn.dataset.action = 'finish-workout';
        } else {
            timerPrimaryBtn.textContent = 'CLOSE TIMER';
            timerPrimaryBtn.dataset.action = '';
            timerPrimaryBtn.onclick = closeTimer;
        }

        setProgressBar(100);
        timerDisplay.textContent = 'DONE';
    }

    function prepareNextSet() {
        clearInterval(timerInterval);
        currentSet += 1;
        timerStatus.textContent = 'GET READY';
        timerStatus.className = 'text-sm font-black text-primary uppercase tracking-widest mb-2';
        timerPrimaryBtn.textContent = 'START SET';
        timerPrimaryBtn.dataset.action = 'start';
        timerDisplay.textContent = '00:00';
        setProgressBar(0);
        updateTimerUI();
    }

    async function completeActiveExercise() {
        if (!activeExercise) return;

        try {
            ui.setButtonLoading(timerPrimaryBtn, true, 'SAVING...');
            await api.workout.completeExercise({
                exerciseName: activeExercise.name,
                sets: activeExercise.sets,
                reps: activeExercise.reps,
                weight: ''
            });

            ui.showToast(`${activeExercise.name} marked as complete.`, 'success');
            closeTimer();
            await loadWorkoutPlan(false);
        } catch (error) {
            console.error('Workout completion failed:', error);
            ui.showToast(error.message || 'Unable to save exercise completion right now.', 'error');
            ui.setButtonLoading(timerPrimaryBtn, false);
        }
    }

    function closeTimer() {
        clearInterval(timerInterval);
        timerModal.classList.add('hidden');
        ui.setButtonLoading(timerPrimaryBtn, false);
        timerPrimaryBtn.textContent = 'START SET';
        timerPrimaryBtn.dataset.action = 'start';
    }

    function showInstructions(exercise) {
        if (!instructionsModal) return;
        const title = document.getElementById('instructions-title');
        const list = document.getElementById('instructions-list');
        
        if (title) title.textContent = exercise.name || 'Instructions';
        if (list) {
            list.innerHTML = '';
            let instArray = ['Focus on your form.', 'Maintain a steady pace.', 'Breathe on exertion.'];
            
            // Check for backend instructions
            if (exercise.details && exercise.details.instructions && Array.isArray(exercise.details.instructions)) {
                if (exercise.details.instructions.length > 0 && exercise.details.instructions[0].trim() !== '') {
                    instArray = exercise.details.instructions;
                }
            }

            instArray.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                list.appendChild(li);
            });
        }
        
        instructionsModal.classList.remove('hidden');
    }

    function startTimer(duration, onComplete, isCountUp) {
        clearInterval(timerInterval);
        totalTime = Math.max(1, Number(duration) || 1);
        timeRemaining = isCountUp ? 0 : totalTime;

        const tick = () => {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (isCountUp) {
                const percent = Math.min(100, (timeRemaining / totalTime) * 100);
                setProgressBar(percent);
                timeRemaining += 1;
                return;
            }

            const percent = ((totalTime - timeRemaining) / totalTime) * 100;
            setProgressBar(percent);

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                onComplete?.();
                return;
            }

            timeRemaining -= 1;
        };

        tick();
        timerInterval = setInterval(tick, 1000);
    }

    function setProgressBar(percent) {
        if (!timerProgress) return;
        const offset = 553 - (553 * percent) / 100;
        timerProgress.style.strokeDashoffset = String(offset);
    }

    function getExerciseImage(exercise) {
        const directImage = exercise?.details?.img;
        if (directImage) return directImage;

        const target = String(exercise?.target_muscle || '').toLowerCase();
        if (target.includes('chest')) return fallbackImages.chest;
        if (target.includes('tricep')) return fallbackImages.triceps;
        if (target.includes('back')) return fallbackImages.back;
        if (target.includes('bicep')) return fallbackImages.biceps;
        if (target.includes('leg')) return fallbackImages.legs;
        if (target.includes('shoulder')) return fallbackImages.shoulders;
        if (target.includes('core') || target.includes('abs')) return fallbackImages.core;
        return fallbackImages.rest;
    }

    function getLevelFromExperience(experience) {
        const value = Number(experience) || 0;
        if (value >= 250) return 'Advanced';
        if (value >= 100) return 'Intermediate';
        return 'Beginner';
    }

    function parseRestSeconds(value) {
        const match = String(value || '').match(/(\d+(?:\.\d+)?)/);
        return match ? Math.max(30, Math.round(Number(match[1]))) : 60;
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
