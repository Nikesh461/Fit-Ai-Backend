const express=require("express");
const workoutcontroller=require("../controller/workout.controller");
const workoutLogController = require("../controller/workoutLog.controller");
const authmiddleware=require("../middlewares/auth.middleware")


const router=express.Router();

// routes/workout.js
router.get('/weekly-plan',authmiddleware.protect ,workoutcontroller.getWorkoutPlan);
router.get('/today', authmiddleware.protect, workoutcontroller.getTodayWorkout);

// Workout Completion Logs
router.post('/logs/complete', authmiddleware.protect, workoutLogController.completeExercise);
router.get('/logs/history', authmiddleware.protect, workoutLogController.getWorkoutLogs);

module.exports=router;