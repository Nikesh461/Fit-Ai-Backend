document.addEventListener('DOMContentLoaded', async () => {
    const themeToggle = document.getElementById('theme-toggle');
    const saveBtn = document.getElementById('save-settings-btn');
    const html = document.documentElement;
    const api = window.FitAIApi;
    const ui = window.FitAIUI;
    const settingsKey = window.FitAIConfig?.STORAGE_KEYS?.settings || 'fitai_settings';

    const savedSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
    const savedTheme = savedSettings.theme || localStorage.getItem('theme') || 'dark';
    const savedUnit = savedSettings.unit || 'metric';

    // --- Theme Toggle ---
    html.classList.toggle('dark', savedTheme !== 'light');
    if (themeToggle) {
        themeToggle.checked = savedTheme !== 'light';
        themeToggle.addEventListener('change', () => {
            const nextTheme = themeToggle.checked ? 'dark' : 'light';
            html.classList.toggle('dark', nextTheme === 'dark');
            localStorage.setItem('theme', nextTheme);
        });
    }

    // --- Sync Note ---
    const header = document.querySelector('main header');
    if (header && !document.getElementById('settings-sync-note')) {
        const note = document.createElement('p');
        note.id = 'settings-sync-note';
        note.className = 'text-xs text-slate-500 dark:text-primary/60 font-medium';
        note.textContent = 'Profile data below is synced from your backend account. Update body metrics from Insights \u2192 Log Progress.';
        header.appendChild(note);
    }

    // --- Disable non-functional toggles ---
    document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        if (input.id === 'theme-toggle') return;
        input.disabled = true;
        input.checked = false;
        input.closest('.flex.items-center.justify-between')?.classList.add('opacity-60');
    });

    // --- Load Profile from Backend ---
    try {
        const profile = await api.chat.getProfile();
        const { user = {}, currentStats = {}, progress = {} } = profile;

        // Get email from stored session (profile endpoint doesn't expose it)
        const sessionUser = window.FitAIAuth?.getUser?.() || {};

        setInputValue('setting-name', user.name);
        setInputValue('setting-email', sessionUser.email || '');
        setInputValue('setting-weight', currentStats.weight || '');
        setInputValue('setting-height', currentStats.height || '');
        setInputValue('setting-age', user.age || '');

        syncSelect('setting-level', window.FitAICommon.deriveAthleteLevel(progress.experience || 0));
        syncSelect('setting-goal', user.goal || '');

        // Populate profile avatar initials
        const initialsEl = document.getElementById('profile-avatar-initials');
        if (initialsEl && user.name) {
            initialsEl.textContent = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
        }

        ['setting-name', 'setting-email', 'setting-weight', 'setting-height', 'setting-age'].forEach(makeReadOnly);
        ['setting-level', 'setting-goal'].forEach(disableField);

        if (window.FitAICommon?.updateUserChrome) {
            window.FitAICommon.updateUserChrome({
                ...user,
                experience: progress.experience || 0
            });
        }
    } catch (error) {
        console.error('Failed to load settings:', error);

        // Fallback: populate from stored session user
        const fallbackUser = window.FitAIAuth?.getUser?.() || {};
        if (fallbackUser.name) {
            setInputValue('setting-name', fallbackUser.name);
            setInputValue('setting-email', fallbackUser.email || '');

            const initialsEl = document.getElementById('profile-avatar-initials');
            if (initialsEl) {
                initialsEl.textContent = fallbackUser.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
            }
        }

        ui.showToast(error.message || 'Unable to load full profile. Showing cached data.', 'error');
    }

    function setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) input.value = value || '';
    }

    function syncSelect(id, value) {
        const select = document.getElementById(id);
        if (!select) return;

        const normalized = value || 'Not set';
        let option = Array.from(select.options).find((item) => item.value === normalized || item.textContent === normalized);

        if (!option) {
            option = document.createElement('option');
            option.value = normalized;
            option.textContent = normalized;
            select.appendChild(option);
        }

        select.value = option.value;
    }

    function makeReadOnly(id) {
        const field = document.getElementById(id);
        if (!field) return;
        field.readOnly = true;
        field.classList.add('opacity-80', 'cursor-not-allowed');
    }

    function disableField(id) {
        const field = document.getElementById(id);
        if (!field) return;
        field.disabled = true;
        field.classList.add('opacity-80', 'cursor-not-allowed');
    }
});