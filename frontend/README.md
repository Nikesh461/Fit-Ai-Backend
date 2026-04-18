# Frontend setup

## Run locally

1. Start the backend from the project root:
   ```powershell
   cd "D:\AI-Fitness coach nikesh"
   node server.js
   ```
2. Open the app at:
   - `http://localhost:3000/login.html`

## API base URL

The frontend reads the backend URL from `frontend/js/config.js`.

Default:
```js
API_BASE_URL: 'http://localhost:3000'
```

You can override it in the browser console if needed:
```js
localStorage.setItem('fitai_api_base_url', 'https://your-api-url.com')
location.reload()
```

## Supported flows

- Register / login / logout
- Weekly workout plan + completion logging
- Weekly diet plan fetching
- Progress insights + growth logging
- AI coach chat history + messaging
