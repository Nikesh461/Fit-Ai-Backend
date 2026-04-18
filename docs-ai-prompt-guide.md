# AI Documentation Assistant Prompt Guide

## Complete Project Context for AI Documentation Help

Use this **exact copy-paste** template when asking AI to help with documentation. Provides full context for accurate responses.

---

**PROJECT**: AI Fitness Coach - Full-stack app (Node/Express/Mongo + Vanilla JS/Tailwind)

**CURRENT DIR**: `f:/Projects/ai fitness coach edit/AI-Fitness coach`

### File Structure (Key Files)
```
├── server.js (entry)
├── src/app.js (Express setup)
├── src/db/db.js (Mongo connect)
├── src/models/ (7 schemas: user, workoutLog, dietLog, growth, chat, exercise, food)
├── src/services/ (gemini.service.js, exerciseDbService.js, edamamService.js, dietService.js, chat.service.js)
├── src/controller/ (*.controller.js)
├── src/router/ (*.router.js)
├── frontend/ (HTML + js/ modular)
   ├── js/services/api.js (fetch client)
   ├── js/state/auth.js (localStorage)
   ├── js/app.js (global init/chat)
   └── js/pages/ (workouts-page.js, nutrition-page.js)
├── package.json (deps listed below)
├── docs.md (main docs)
└── docs-models-flow.md (models detail)
```

### Tech Stack (Copy to AI)
```
BACKEND: Node/Express 5.2/Mongo+Mongoose 9.2/JWT+Bcrypt/Axios
AI: Google Gemini (gemini-2.5-flash JSON mode)
FRONTEND: Vanilla JS/Tailwind (CDN)/localStorage/Fetch
APIs: ExerciseDB (RapidAPI), Edamam Food DB
```

### Dependencies (package.json)
```
"@google/generative-ai": "^0.24.1"
"express": "^5.2.1", "mongoose": "^9.2.4"
"jsonwebtoken": "^9.0.3", "bcrypt": "^6.0.0"
"axios": "^1.13.6", "cors", "cookie-parser", "dotenv"
"nodemon": dev
```

### Env Vars Required
```
DB_URL, JWT_SECRET
GEMINI_API_KEY
EXERCISE_DB_KEY
EDAMAM_APP_ID, EDAMAM_APP_KEY
PORT=3000
```

### 7 Data Models (Full Detail)
```
1. user: name/email/password(age/height/weight/goal/gender/preferences)/currentWorkoutPlan/currentDietPlan/planGeneratedAt/experience/streak
2. workoutLog: userId/exerciseName/sets/reps/weight/completedAt (idx: userId+date)
3. dietLog: userId/mealName/calories/protein/carbs/fats/completedAt
4. growth: userId/weight/height/date (idx: userId+date)
5. chat: userId/messages[{role:content}]/lastMessageAt (idx: userId+lastMsg)
6. exercise (cache): name(img/instructions[]) unique lowercase
7. food (cache): name(image/calories/protein/carbs/fats)
```

### API Endpoints (20+)
```
Auth: POST /register /login | GET /me
Workout: GET /weekly-plan(?refresh) /today | POST /logs/complete | GET /logs/history
Diet: GET /generate(?refresh) | POST /logs/complete | GET /logs/today
Growth: POST /log | GET /history /latest /stats
Chat: POST /message | GET /history(?limit) /profile | DELETE /history
```
**All protected except register/login** (JWT middleware).

### Core Flows (Generation)
**Workout Plan** (`/workout/weekly-plan`):
```
Cache check (user.currentWorkoutPlan + Monday reset?) → Gemini prompt(profile) → {week_plan[...]} → 
exerciseDbService: unique names → Exercise model/Mongo → missing→RapidAPI→cache→attach img/instr → 
user.currentWorkoutPlan=now → return
```

**Diet Plan** (`/diet/generate`):
```
Similar → Gemini → {diet_plan[{meals{...}}]} → edamamService → Food model/Edamam → attach macros/img → cache
```

### Frontend Modules Structure
```
config.js: API_BASE_URL='http://localhost:3000'
state/auth.js: localStorage token/user
services/api.js: fetch + Bearer auth
utils/ui.js: toasts/date/format
app.js: DOM init + chat shell + dashboard
pages/workouts-page.js: day selector/timer modal/logs
pages/nutrition-page.js: meals/modal
```

### Key Business Logic
```
- Weekly cache (dateUtils.js Monday reset)
- Streak: daily logs from lastActivityDate → +experience
- Aggregation: dashboard sums calories(time from workout logs
- Completion merge: today's logs → isCompleted:true in plan
- Rate limits: Edamam 300ms delays
- Fallbacks: Giphy/Unsplash images
```

### Pages & UX
```
Dashboard: stats cards/rings/insights (index.html+app.js)
Workouts: day buttons/cards/timer modal (workouts.html+workouts-page.js)
Nutrition: meals/nutrition modal (nutrition.html+nutrition-page.js)
Shared: sidebar/chat bubble/dark mode
```

### Run Instructions
```
npm i && fill .env && npm run dev
Serve frontend/index.html (CORS ok)
```

---

**PROMPT TEMPLATE for AI**:
```
[PASTE FULL CONTEXT ABOVE]

TASK: [Your documentation task here]
Analyze: [specific file/path if needed]
Focus on: [architecture/flow/UI/edge cases]
```

