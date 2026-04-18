const growthModel = require("../models/growth.model");
const usermodel = require("../models/user.model");
const { calculateStreak } = require("../utils/progression");

// Calculate experience points based on growth metrics
const calculateExperience = (weight, previousWeight, bodyFat, muscleMass) => {
    let exp = 10; // Base experience for logging growth

    // Bonus for weight change (tracking progress)
    if (previousWeight) {
        const weightDiff = Math.abs(weight - previousWeight);
        if (weightDiff > 0) {
            exp += Math.min(weightDiff * 5, 50); // Max 50 bonus points
        }
    }

    // Bonus for body fat tracking
    if (bodyFat !== null && bodyFat !== undefined) {
        exp += 15;
    }

    // Bonus for muscle mass tracking
    if (muscleMass !== null && muscleMass !== undefined) {
        exp += 15;
    }

    // Consistency bonus - add more if logging regularly
    exp += 5; // Logging activity bonus

    return exp;
};

// Log growth data and update user details
const logGrowth = async (req, res) => {
    try {
        const userId = req.user._id;
        const { weight, height, bodyFat, muscleMass, notes } = req.body;

        if (!weight || !height) {
            return res.status(400).json({
                message: "Weight and height are required"
            });
        }

        // Get previous growth entry for comparison
        const previousGrowth = await growthModel.findOne({ userId }).sort({ date: -1 });
        const previousWeight = previousGrowth ? previousGrowth.weight : null;

        // Get current user for streak calculation
        const user = await usermodel.findById(userId);

        // Calculate experience points
        const experienceGained = calculateExperience(
            weight,
            previousWeight,
            bodyFat,
            muscleMass
        );

        // Calculate new streak
        const newStreak = await calculateStreak(user);

        // Create growth log
        const growth = await growthModel.create({
            userId,
            weight: parseFloat(weight),
            height: parseFloat(height),
            bodyFat: bodyFat ? parseFloat(bodyFat) : null,
            muscleMass: muscleMass ? parseFloat(muscleMass) : null,
            notes: notes || "",
            experience: experienceGained,
            date: new Date()
        });

        // Update user details with new weight and height
        const updatedUser = await usermodel.findByIdAndUpdate(
            userId,
            {
                weight: weight.toString(),
                height: height.toString(),
                $inc: { experience: experienceGained },
                streak: newStreak,
                lastActivityDate: new Date()
            },
            { returnDocument: 'after' }
        ).select('-password');

        res.status(201).json({
            message: "Growth logged successfully",
            growth: {
                id: growth._id,
                weight: growth.weight,
                height: growth.height,
                bodyFat: growth.bodyFat,
                muscleMass: growth.muscleMass,
                notes: growth.notes,
                experience: growth.experience,
                date: growth.date
            },
            user: {
                weight: updatedUser.weight,
                height: updatedUser.height,
                experience: updatedUser.experience,
                streak: updatedUser.streak
            },
            experienceGained
        });

    } catch (er) {
        console.error("Error logging growth:", er);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Get growth history for the user
const getGrowthHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 30, offset = 0 } = req.query;

        const growthHistory = await growthModel.find({ userId })
            .sort({ date: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        const total = await growthModel.countDocuments({ userId });

        res.status(200).json({
            growth: growthHistory,
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (er) {
        console.error("Error getting growth history:", er);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Get latest growth entry
const getLatestGrowth = async (req, res) => {
    try {
        const userId = req.user._id;

        const latestGrowth = await growthModel.findOne({ userId }).sort({ date: -1 });

        if (!latestGrowth) {
            return res.status(404).json({
                message: "No growth data found"
            });
        }

        res.status(200).json({
            growth: latestGrowth
        });

    } catch (er) {
        console.error("Error getting latest growth:", er);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Get growth stats/summary
const getGrowthStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const latestGrowth = await growthModel.findOne({ userId }).sort({ date: -1 });
        const firstGrowth = await growthModel.findOne({ userId }).sort({ date: 1 });

        const user = await usermodel.findById(userId).select('experience streak lastActivityDate');

        // Calculate weight change if we have multiple entries
        let weightChange = null;
        if (latestGrowth && firstGrowth && latestGrowth._id.toString() !== firstGrowth._id.toString()) {
            weightChange = latestGrowth.weight - firstGrowth.weight;
        }

        // Get total entries count
        const totalEntries = await growthModel.countDocuments({ userId });

        res.status(200).json({
            stats: {
                currentWeight: latestGrowth ? latestGrowth.weight : null,
                currentHeight: latestGrowth ? latestGrowth.height : null,
                currentBodyFat: latestGrowth ? latestGrowth.bodyFat : null,
                currentMuscleMass: latestGrowth ? latestGrowth.muscleMass : null,
                weightChange,
                totalLogs: totalEntries,
                experience: user.experience,
                streak: user.streak,
                lastActivityDate: user.lastActivityDate,
                firstLogDate: firstGrowth ? firstGrowth.date : null,
                latestLogDate: latestGrowth ? latestGrowth.date : null
            }
        });

    } catch (er) {
        console.error("Error getting growth stats:", er);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = {
    logGrowth,
    getGrowthHistory,
    getLatestGrowth,
    getGrowthStats
};

