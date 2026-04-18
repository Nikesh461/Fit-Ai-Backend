const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    age: {
        type: String,
        required: true
    },
    height: {
        type: String,
        required: true
    },
    weight: {
        type: String,
        required: true
    },
    goal: {
        type: String,
        required: true,
    },
    preference: {
        type: String
    },
    gender: {
        type: String,
        required: true
    },
    dietPreference: {
        type: String
    },
    cuisinePreference: {
        type: String
    },
    currentWorkoutPlan: { type: Object, default: null },
    currentDietPlan: { type: Object, default: null },
    planGeneratedAt: { type: Date, default: null },
    dietGeneratedAt: { type: Date, default: null },
    experience: {
        type: Number,
        default: 0
    },
    streak: {
        type: Number,
        default: 0
    },
    lastActivityDate: {
        type: Date,
        default: null
    }
});
const usermodel = mongoose.model("user", userSchema);
module.exports = usermodel;