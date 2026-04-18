# Data Models & Plan Generation Flow

## Complete Data Models Breakdown

### 1. User Model (`src/models/user.model.js`)
**Purpose**: Central profile + cached personalization data  
**Fields**:
```
name: String (required) - Display name
email: String (required, unique) - Login
password: String (required, bcrypt hash)
age/height/weight: String (required) - Physical profile
goal: String (required) - 'hypertrophy', 'strength', etc.
gender: String (required)
preference: String - Location/equipment
dietPreference/cuisinePreference: String - 'vegetarian', 'indian', etc.
currentWorkoutPlan: Object - Cached 7-day JSON plan
currentDietPlan: Object - Cached 7-day JSON plan
planGeneratedAt/dietGeneratedAt: Date - Cache expiry
experience: Number (default:0) - Progress points from logs
streak: Number (default:0) - Consecutive log days
lastActivityDate: Date - Streak calculation
```
**Usage**: Single source of truth for personalization + caching.

### 2. WorkoutLog (`src/models/workout.model.js`)
**Purpose**: Track completed exercises/sets  
**Fields**:
```
userId: ObjectId (ref: user, required)
exerciseName: String - 'push up', 'squat'
sets: Number - Completed sets
reps: String - '12', '8-10'
weight: Number? - Optional kg
duration: Number? - Seconds
completedAt: Date - Timestamp
```
**Index**: `{userId:1, completedAt:-1}`  
**Flow**: POST `/workout/logs/complete` → Streak++/Experience++ → Dashboard aggregation.

### 3. DietLog (`src/models/dietLog.model.js`)
**Purpose**: Track consumed meals  
**Fields**:
```
userId: ObjectId (ref: user)
mealName: String - 'Grilled Chicken Salad'
calories: Number
protein/carbs/fats: Number (grams)
servingSize: String? - Portion
completedAt: Date
```
**Flow**: POST `/diet/logs/complete` → Macro progress bars.

### 4. Growth (`src/models/growth.model.js`)
**Purpose**: Body measurements over time  
**Fields**:
```
userId: ObjectId (ref: user)
weight: Number (kg)
height: Number (cm)
bodyFat?: Number (%)
date: Date
notes?: String
```
**Index**: `{userId:1, date:-1}`  
**Charts**: Insights page history/stats.

### 5. Chat (`src/models/chat.model.js`)
**Purpose**: Persistent AI conversations  
**Structure**:
```
sessions: [
  {
    userId: ObjectId,
    messages: [{
      role: 'user'|'assistant',
      content: String,
      timestamp: Date
    }],
    lastMessageAt: Date
  }
]
```
**Index**: `{userId:1, lastMessageAt:-1}`  
**Limits**: GET `/chat/history?limit=20`.

### 6. Exercise (Cache) (`src/models/exercise.model.js`)
**Purpose**: Avoid repeated ExerciseDB calls  
**Fields**:
```
name: String (lowercase, unique, required)
img: String - Official image URL
instructions: String[] - Step-by-step
```
**Auto-populated**: By `exerciseDbService.js`.

### 7. Food (Cache) (`src/models/food.model.js`)
**Purpose**: Nutrition lookup cache  
**Fields**:
```
name: String (lowercase)
image: String
calories: Number (per 100g)
protein/carbs/fats: Number (grams)
```
**Auto-populated**: By `edamamService.js`.

## Workout Plan Generation Flow

**Endpoint**: `GET /api/workout/weekly-plan?refresh=true` (workout.controller.js)

```
1. GET user by req.user._id
2. CHECK CACHE:
   if currentWorkoutPlan && planGeneratedAt && !Monday reset && !refresh:
     → Return cached (status: 'CACHED')
3. GENERATE (gemini.service.js):
   Prompt: 'age:X goal:Y...' → JSON {week_plan: [{day:'Monday', focus:'Chest', exercises:[{name:'push up',sets:3,reps:'12',rest:'60s',target_muscle:'Chest'}]}]}
4. ENRICH (exerciseDbService.js):
   Extract unique names → Query Exercise model → Missing? → RapidAPI → Cache → Attach img/instructions
5. CACHE: user.currentWorkoutPlan = enriched, planGeneratedAt=now → user.save()
6. RETURN: {success:true, status:'GENERATED', data:plan}
```

**Today Flow** (`/today`):
- Find today by `new Date().getDay()` → Merge logs (completedAt today?) → Add `isCompleted:true`

**Weekly Reset**: `dateUtils.js` → Most recent Monday → If planGeneratedAt < Monday → Regenerate.

## Diet Plan Generation Flow

**Endpoint**: `GET /api/diet/generate?refresh=true` (dietController.js)

```
1. Similar cache check (currentDietPlan/dietGeneratedAt)
2. GENERATE (dietService.js):
   Gemini prompt → {diet_plan: [{day:'Monday', total_macros:{calories:2200,...}, meals:{breakfast:{name:'Oats',image_category:'smoothie'},...}}]}
3. ENRICH (edamamService.js):
   Extract meal names → Query Food model → Missing? → Edamam → Cache macros/img → Attach real_macros
4. CACHE: user.currentDietPlan = enriched → dietGeneratedAt=now
5. RETURN enriched plan
```

**Key Differences**:
- **Workout**: Exercise name → image/instructions (RapidAPI)
- **Diet**: Meal name → macros/image (Edamam, category fallbacks)

## Data Flow Diagram

```
User Profile → Gemini Prompt → Raw JSON Plan
                ↓
RapidAPI/Edamam → Enriched Data → Mongo Cache (Exercise/Food)
                ↓
Attach to Plan → User.current*Plan → Frontend/API Response
                ↓
Logs → Aggregation → Dashboard Stats (calories/streak)
```

**Streak Logic**: Daily log check from lastActivityDate → +1 experience per set/meal.

**All models interconnected via userId** for per-user personalization and progress tracking.

