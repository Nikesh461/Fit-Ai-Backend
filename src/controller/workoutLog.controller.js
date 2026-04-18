const workoutLogModel = require("../models/workout.model");
const usermodel = require("../models/user.model");
const { calculateStreak } = require("../utils/progression");

const completeExercise = async (req, res) => {
    try {
        const userId = req.user._id;
        const { exerciseName, sets, reps, weight } = req.body;

        if (!exerciseName) {
            return res.status(400).json({
                message: "Exercise name is required"
            });
        }

        // Base XP for completing an exercise
        const experienceEarned = 25; 

        // Get current user for streak calculation
        const user = await usermodel.findById(userId);

        // Calculate new streak
        const newStreak = calculateStreak(user);

        // Create workout log
        const log = await workoutLogModel.create({
            userId,
            exerciseName,
            sets: sets ? parseInt(sets) : 0,
            reps: reps || "",
            weight: weight ? parseFloat(weight) : null,
            experienceEarned,
            completedAt: new Date()
        });

        // Update user stats
        const updatedUser = await usermodel.findByIdAndUpdate(
            userId,
            {
                $inc: { experience: experienceEarned },
                streak: newStreak,
                lastActivityDate: new Date()
            },
            { returnDocument: 'after' }
        ).select('-password');

        res.status(201).json({
            message: "Exercise marked as done!",
            experienceEarned,
            user: {
                experience: updatedUser.experience,
                streak: updatedUser.streak
            }
        });

    } catch (error) {
        console.error("Error completing exercise:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getWorkoutLogs = async (req, res) => {
    try {
        const userId = req.user._id;
        const logs = await workoutLogModel.find({ userId }).sort({ completedAt: -1 }).limit(50);
        
        res.status(200).json({ logs });
    } catch (error) {
        console.error("Error getting workout logs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    completeExercise,
    getWorkoutLogs
};
