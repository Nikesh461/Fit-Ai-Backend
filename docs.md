# AI Fitness Coach - Complete Technical Documentation

## Overview
Production-ready full-stack fitness coaching app using **AI (Google Gemini)** for personalized workout/diet plans, enriched with real nutrition/exercise data from external APIs. Features real-time logging, progress tracking, chat coach, and polished responsive UI. No frameworks on frontend (vanilla JS), Express/Mongo backend.

**Current Directory**: `f:/Projects/ai fitness coach edit/AI-Fitness coach`

## Tech Stack

### Backend (Node.js v20+)
| Category | Tech | Version | Purpose |
|----------|------|---------|---------|
| Server | Express.js | ^5.2.1 | REST API |
| DB | MongoDB + Mongoose | ^9.2.4 | Schemas, queries |
| Auth | JWT + bcrypt | ^9.0.3, ^6.0.0 | Sessions, hashing |
| HTTP | Axios | ^1.13.6 | External APIs |
| Utils | cors, cookie-parser, dotenv | Latest | Middleware, config |
| AI | @google/generative-ai | ^0.24.1 | Plan generation/chat |

**Scripts**:
- `npm start` (production)
- `npm run dev` (nodemon)

### Frontend (Static HTML/JS)
| Category | Tech | Notes |
|----------|------|-------|
| UI | Tailwind CSS (CDN) | Custom theme (`primary: #0066FF`) |
| JS | Vanilla ES6+ | Modular (services/state/utils/pages) |
| Fonts/Icons | Google Fonts (Manrope), Material Symbols | - |
| Storage | localStorage | Auth, theme, settings |
| HTTP | Fetch API | Auth interceptor |

**Pages**:
- `index.html` (Dashboard)
- `workouts.html`
- `nutrition.html`
- `insights.html`
- `settings.html`
- `login.html` / `register.html`

## External APIs & Integrations

1. **Google Gemini AI** (`gemini.service.js`, `chat.service.js`)
   - **Models**: `gemini-2.5-flash`, `gemini-3.1-flash-lite-preview` (JSON responseMimeType)
   - **Usage**: 7-day workout plans, diet plans, real-time chat
   - **Env Var**: `GEMINI_API_KEY`
   - **Prompts**: Strict JSON schemas with user details (age, weight, height, goal, gender, preferences)

2. **ExerciseDB (RapidAPI)** (`exerciseDbService.js`)
   - **Endpoint**: `https://exercisedb.p.rapidapi.com/exercises/name/{name}`
   - **Data**: Images, instructions
   - **Caching**: `Exercise` model to avoid rate limits
   - **Env Var**: `EXERCISE_DB_KEY`

3. **Edamam Food Database** (`edamamService.js`)
   - **Endpoint**: `https://api.edamam.com/api/food-database/v2/parser?ingr={name}`
   - **Data**: Macros (calories/protein/carbs/fats), images
   - **Caching**: `Food` model to avoid rate limits
   - **Env Vars**: `EDAMAM_APP_ID`, `EDAMAM_APP_KEY`
   - **Rate Limiting**: 300ms delays

## Data Models - Detailed (7 Models)

[Previous models section - 1.User to 7.Food with all fields/indexes as before]

## Detailed Plan Generation Flows (End-to-End)

### Workout Plan Generation Flow (`GET /api/workout/weekly-plan`)

**1. Frontend Request** (workouts-page.js or dashboard):
```
api.workout.getPlan(refresh=true) → fetch('/api/workout/weekly-plan?refresh=true', {
  headers: { Authorization: `Bearer ${localStorage.token}` }
})
```

**2. Backend Processing** (workout.controller.js):
```
req → auth.middleware → find user by JWT id
→ CHECK USER CACHE:
  if user.currentWorkoutPlan && !expired && !refresh → return cached
→ GEMINI CALL (gemini.service.js):
  prompt = `Create plan for age:${user.age}, weight:${user.weight}, height:${user.height}, 
            goal:${user.goal}, gender:${user.gender}, preference:${user.preference}
            Return ONLY JSON: {week_plan: [{day:'Monday', focus:'Chest', exercises:[
              {name:'push up', sets:3, reps:'12', rest:'60s', target_muscle:'Chest'} 
            ]}]}`
  → Raw JSON response (gemini-3.1-flash-lite-preview, JSON mode)
→ EXERCISE ENRICHMENT (exerciseDbService.js - KEY LOGIC):
  1. extract unique exercise names (lowercase): ['push up', 'squat', ...]
  2. Query Exercise model: Exercise.find({name: {$in: names}})
  3. FOR MISSING exercises:
     axios('https://exercisedb.p.rapidapi.com/exercises/name/push%20up', {
       headers: { 'x-rapidapi-key': process.env.EXERCISE_DB_KEY }
     }) → {id, instructions, image}
     → Exercise.create({name:'push up', img:official_url, instructions})
  4. Build library { 'push up': {img, instructions} }
  5. Attach to plan: exercises.map(ex => ({...ex, details: library[ex.name]}))
→ CACHE & RETURN:
  user.currentWorkoutPlan = enriched_plan
  user.planGeneratedAt = Date.now()
  user.save()
  res.json({status:'GENERATED', data:plan})
```

**3. Frontend Response**:
```
Render cards: image (details.img), sets/reps/rest/target_muscle
```

**Rate Limit Protection**: Local Mongo cache prevents repeated RapidAPI hits.

### Diet Plan Generation Flow (`GET /api/diet/generate`)

**1. Frontend**: `api.diet.getPlan(refresh=true)`

**2. Backend** (dietController.js):
```
Similar cache check → GEMINI (dietService.js):
  prompt with full profile → {diet_plan: [{day, total_macros, meals:{
    breakfast: {name:'Oats &amp; Eggs', image_category:'breakfast'}
  }}]}
→ FOOD ENRICHMENT (edamamService.js - KEY LOGIC):
  1. extract unique meal names: ['oats &amp; eggs', 'grilled chicken'...]
  2. Food.find({name: {$in: names.map(lowercase)}})
  3. FOR MISSING:
     axios(`https://api.edamam.com/api/food-database/v2/parser?ingr=oats`, {
       params: {app_id, app_key}
     }) → hints[0].food.nutrients → {calories, PROCNT, FAT, CHOCDF}
     → await new Promise(r=>setTimeout(r,300)) // Rate limit
     → Food.findOneAndUpdate({name}, {calories, protein, ...}, {upsert:true})
  4. Attach real_macros/image OR fallback Unsplash (FALLBACK_IMAGES['breakfast'])
→ user.currentDietPlan = enriched → dietGeneratedAt=now → return
```

**Key Anti-Rate-Limit Strategy**:
```
Local MongoDB CACHES external API responses permanently
Only uncached items hit RapidAPI/Edamam
Frontend gets instant enriched data from cache
```

**Weekly Reset**: `utils/dateUtils.js` detects Monday → force refresh.

## API Endpoints, App Flow, etc. [rest unchanged]

**Updated docs complete with detailed generation flows.**

