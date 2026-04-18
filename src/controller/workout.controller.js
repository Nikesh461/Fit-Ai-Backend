// controllers/workoutController.js
const User = require('../models/user.model');
const { generateWorkoutNames } = require('../services/gemini.service');
const { attachExerciseData } = require('../services/exerciseDbService');
const workoutLogModel = require('../models/workout.model');
const { isWeeklyResetDue } = require('../utils/dateUtils');

const getWorkoutPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = Date.now();

    // 1. Logic Gate: Check if plan exists AND isn't expired AND no manual refresh
    if (user.currentWorkoutPlan && user.planGeneratedAt && !req.query.refresh) {

      // Change: Check for weekly reset every Monday instead of every 7 days
      if (!isWeeklyResetDue(user.planGeneratedAt)) {
        // Check if this is an old-format plan or has old Wger images
        const isStaleFormat = user.currentWorkoutPlan.some(
          day => day.exercises && day.exercises.length > 0 && (
            typeof day.exercises[0] === 'string' || 
            (day.exercises[0].details && day.exercises[0].details.img && day.exercises[0].details.img.includes('wger.de'))
          )
        );

        if (!isStaleFormat) {
          return res.status(200).json({
            success: true,
            status: "CACHED",
            data: user.currentWorkoutPlan
          });
        }
        // Old format detected — fall through to regenerate with images
        console.log("Stale plan format detected (no images). Regenerating...");
      } else {
        // If code reaches here, it means it's a new week (Monday reset)
        console.log("New week detected. Generating fresh content...");
      }
    }

    // 2. Generate new plan if missing or expired
    const names = await generateWorkoutNames(user);

    // Check if Gemini returned an error
    if (names.error) {
      return res.status(503).json({
        success: false,
        message: names.error
      });
    }

    const fullWorkout = await attachExerciseData(names.week_plan);

    // 3. Update User document with new plan and NEW timestamp
    user.currentWorkoutPlan = fullWorkout;
    user.planGeneratedAt = now; // Update the clock!
    await user.save();

    res.status(200).json({
      success: true,
      status: "GENERATED",
      data: fullWorkout
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to process workout plan", error: error.message });
  }
};

const getTodayWorkout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.currentWorkoutPlan) {
      return res.status(404).json({ success: false, message: "No workout plan found. Please generate one first." });
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    let todayPlan = user.currentWorkoutPlan.find(day => day.day === todayName) || 
                      user.currentWorkoutPlan[new Date().getDay() % user.currentWorkoutPlan.length];

    // Check for today's completion logs
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const logs = await workoutLogModel.find({
      userId: user._id,
      completedAt: { $gte: startOfToday, $lte: endOfToday }
    });

    const completedExerciseNames = logs.map(log => log.exerciseName);

    // Deep clone to avoid mutating cached plan if necessary, and add completion status
    const exercisesWithStatus = todayPlan.exercises.map(ex => ({
      ...ex,
      isCompleted: completedExerciseNames.includes(ex.name)
    }));

    res.status(200).json({
      success: true,
      day: todayName,
      data: { ...todayPlan, exercises: exercisesWithStatus }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch today's workout", error: error.message });
  }
};

module.exports = { getWorkoutPlan, getTodayWorkout };
