window.FitAIApi = (() => {
    const baseUrl = window.FitAIConfig?.API_BASE_URL || 'http://localhost:3000';

    async function request(path, options = {}) {
        const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
        const headers = new Headers(options.headers || {});
        const hasBody = options.body !== undefined && options.body !== null;
        const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

        if (hasBody && !headers.has('Content-Type') && !isFormData) {
            headers.set('Content-Type', 'application/json');
        }

        const token = window.FitAIAuth?.getToken?.();
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        try {
            const response = await fetch(url, {
                credentials: 'include',
                ...options,
                headers
            });

            const rawText = await response.text();
            let data = {};

            if (rawText) {
                try {
                    data = JSON.parse(rawText);
                } catch {
                    data = { message: rawText };
                }
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error('Unable to reach the backend. Make sure the server is running and the API base URL is correct.');
            }
            throw error;
        }
    }

    return {
        request,
        auth: {
            register: (payload) => request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            login: (payload) => request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            logout: () => request('/api/auth/logout', { method: 'POST' }),
            me: () => request('/api/auth/me')
        },
        workout: {
            getPlan: (refresh = false) => request(`/api/workout/weekly-plan${refresh ? '?refresh=true' : ''}`),
            getToday: () => request('/api/workout/today'),
            completeExercise: (payload) => request('/api/workout/logs/complete', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            getHistory: () => request('/api/workout/logs/history')
        },
        growth: {
            log: (payload) => request('/api/growth/log', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            getHistory: (limit = 30, offset = 0) => request(`/api/growth/history?limit=${limit}&offset=${offset}`),
            getLatest: () => request('/api/growth/latest'),
            getStats: () => request('/api/growth/stats')
        },
        diet: {
            getPlan: (refresh = false) => request(`/api/diet/generate${refresh ? '?refresh=true' : ''}`),
            getToday: () => request('/api/diet/logs/today'),
            completeMeal: (payload) => request('/api/diet/logs/complete', {
                method: 'POST',
                body: JSON.stringify(payload)
            })
        },
        chat: {
            sendMessage: (payload) => request('/api/chat/message', {
                method: 'POST',
                body: JSON.stringify(payload)
            }),
            getHistory: (limit = 20) => request(`/api/chat/history?limit=${limit}`),
            getProfile: () => request('/api/chat/profile'),
            clearHistory: () => request('/api/chat/history', { method: 'DELETE' })
        }
    };
})();
