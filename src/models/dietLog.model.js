const mongoose = require("mongoose");

const dietLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        mealName: {
            type: String,
            required: true,
            trim: true
        },
        mealType: {
            type: String, // breakfast, lunch, snack, dinner
            required: true
        },
        calories: {
            type: Number,
            default: 0
        },
        protein: {
            type: Number,
            default: 0
        },
        carbs: {
            type: Number,
            default: 0
        },
        fats: {
            type: Number,
            default: 0
        },
        experienceEarned: {
            type: Number,
            default: 15
        },
        completedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("DietLog", dietLogSchema);
