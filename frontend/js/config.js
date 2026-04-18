window.FitAIConfig = (() => {
    const apiBaseKey = 'fitai_api_base_url';
    const metaValue = document.querySelector('meta[name="fitai-api-base-url"]')?.content?.trim();
    const localValue = localStorage.getItem(apiBaseKey)?.trim();
    const globalValue = typeof window.__FITAI_API_URL__ === 'string' ? window.__FITAI_API_URL__.trim() : '';
    const sameOrigin = window.location.origin && window.location.origin !== 'null' && /^https?:/i.test(window.location.origin)
        ? window.location.origin
        : 'http://localhost:3000';

    return {
        API_BASE_URL: (globalValue || metaValue || localValue || sameOrigin).replace(/\/$/, ''),
        STORAGE_KEYS: {
            session: 'fitai_session',
            settings: 'fitai_settings',
            apiBaseUrl: apiBaseKey
        }
    };
})();
