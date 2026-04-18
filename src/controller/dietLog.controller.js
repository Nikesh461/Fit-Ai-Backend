const DietLog = require("../models/dietLog.model");
const usermodel = require("../models/user.model");
const { calculateStreak } = require("../utils/progression");

const completeMeal = async (req, res) => {
    try {
        const userId = req.user._id;
        const { mealName, mealType, calories, protein, carbs, fats } = req.body;

        if (!mealName || !mealType) {
            return res.status(400).json({
                message: "Meal name and type are required"
            });
        }

        // Base XP for completing a meal
        const experienceEarned = 15; 

        // Get current user for streak calculation
        const user = await usermodel.findById(userId);

        // Calculate new streak
        const newStreak = calculateStreak(user);

        // Check if already completed today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const existingLog = await DietLog.findOne({
            userId,
            mealType,
            completedAt: { $gte: startOfDay }
        });

        if (existingLog) {
            return res.status(400).json({
                message: "Meal already marked as done today!"
            });
        }

        // Create diet log
        const log = await DietLog.create({
            userId,
            mealName,
            mealType,
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            carbs: Number(carbs) || 0,
            fats: Number(fats) || 0,
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
            message: "Meal marked as done!",
            experienceEarned,
            user: {
                experience: updatedUser.experience,
                streak: updatedUser.streak
            }
        });

    } catch (error) {
        console.error("Error completing meal:", error);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getTodayDietLogs = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const logs = await DietLog.find({ 
            userId,
            completedAt: { $gte: startOfDay }
        });
        
        res.status(200).json({ data: logs });
    } catch (error) {
        console.error("Error getting diet logs:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    completeMeal,
    getTodayDietLogs
};
