# Frontend Setup

## Run locally

1. Start the backend:
   ```powershell
   cd "D:\AI-Fitness coach nikesh\AI-Fitness coach"
   node server.js
   ```

2. Serve the frontend as static files:
   ```powershell
   cd "D:\AI-Fitness coach nikesh\AI-Fitness coach\frontend"
   python -m http.server 5500
   ```

3. Open:
   - `http://localhost:5500/login.html`

## API base URL

The frontend reads the backend URL from `js/config.js` in this order:

1. `window.__FITAI_API_URL__`
2. `localStorage['fitai_api_base_url']`
3. current site origin
4. fallback: `http://localhost:3000`

### Example override in browser console
```js
localStorage.setItem('fitai_api_base_url', 'http://localhost:3000');
location.reload();
```

## Frontend structure

- `js/services/api.js` → centralized REST calls
- `js/state/auth.js` → auth session state
- `js/utils/ui.js` → toast/loading helpers
- `js/pages/` → page-specific backend integrations
