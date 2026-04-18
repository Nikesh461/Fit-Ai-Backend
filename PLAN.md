# React Frontend Development Plan - Aura AI Fitness Coach

## Information Gathered

### Template Design (from Framer)
- **Theme**: Dark mode with lime green primary color (#ccff00)
- **Font**: Inter font family with Material Symbols Outlined icons
- **Pages**:
  1. **Login Page** - Email/password form, Google/Apple login buttons, glassmorphism card
  2. **Registration Page** - Two-column layout with form and hero image, collects user details
  3. **Dashboard** - Left sidebar with stats/chat history, main chat area, right sidebar with workout context
  4. **Chat Interface** - AI chat with message bubbles, typing indicator, suggestion pills
  5. **Progress Page** - Weight charts, muscle mass, body fat %, XP/level system, achievements
  6. **Workout Plan Page** - Weekly tabs, exercise cards with images, sets/reps/rest details

### Backend API Endpoints (Existing)
- **Auth**: POST `/api/auth/register`, POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/me`
- **Workout**: GET `/api/workout` (get/generate weekly plan)
- **Diet**: GET `/api/diet` (get/generate diet plan)
- **Chat**: POST `/api/chat/message`, GET `/api/chat/history`
- **Growth**: POST `/api/growth/log`, GET `/api/growth/history`, GET `/api/growth/stats`

## Plan

### Step 1: Create React Project
- Use create-react-app or Vite to set up React project
- Install dependencies: react-router-dom, axios, tailwindcss

### Step 2: Set up Tailwind CSS with Custom Theme
- Configure tailwind.config.js with:
  - Primary color: #ccff00
  - Background colors: #0a0b05 (dark), #f8f8f5 (light)
  - Font family: Inter

### Step 3: Create API Service
- Set up axios instance with base URL and interceptors for JWT tokens

### Step 4: Build Pages/Components

#### Pages:
1. **LoginPage** - Login form with glassmorphism design
2. **RegisterPage** - Registration form with all user details
3. **Dashboard** - Main layout with sidebar navigation
4. **ChatPage** - AI chat interface
5. **ProgressPage** - Stats, charts, growth logging
6. **WorkoutPage** - Weekly workout plan display
7. **DietPage** - Weekly diet plan display

#### Components:
- Navbar, Sidebar, ProtectedRoute
- ChatBubble, ChatInput, TypingIndicator
- WorkoutCard, ExerciseCard
- StatsCard, ProgressChart
- Form inputs with validation

### Step 5: Connect to Backend
- AuthContext for authentication state management
- API service calls to existing backend
- Token management in cookies/localStorage

### Step 6: Cleanup
- Delete old frontend files (frontend/ folder, index.html, src/styles/, src/js/)

## Followup Steps
1. Create React project structure
2. Install dependencies
3. Build all components and pages
4. Test API connections
5. Verify all features work with backend

## Files to Delete After
- frontend/ (entire folder)
- index.html
- src/styles/main.css
- src/js/api.js
- src/js/auth.js
- src/js/app.js

