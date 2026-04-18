window.FitAIAuth = (() => {
    const STORAGE_KEY = window.FitAIConfig?.STORAGE_KEYS?.session || 'fitai_session';

    function getSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.error('Unable to read auth session:', error);
            return null;
        }
    }

    function setSession({ token, user }) {
        const session = {
            token,
            user: user || {},
            username: user?.name || '',
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return session;
    }

    function updateUser(user) {
        const current = getSession() || {};
        const next = {
            ...current,
            user: {
                ...(current.user || {}),
                ...(user || {})
            },
            username: user?.name || current.username || ''
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function getToken() {
        return getSession()?.token || '';
    }

    function getUser() {
        return getSession()?.user || {};
    }

    function isAuthenticated() {
        return Boolean(getToken());
    }

    return {
        STORAGE_KEY,
        getSession,
        setSession,
        updateUser,
        clearSession,
        getToken,
        getUser,
        isAuthenticated
    };
})();
