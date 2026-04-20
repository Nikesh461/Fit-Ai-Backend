const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true, // Converts email to lowercase automatically
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"]
    },
    age: {
        type: Number, // Changed from String to Number
        required: [true, "Age is required"],
        min: [15, "Age must be at least 15"],
        max: [70, "Age cannot exceed 70"]
    },
    height: {
        type: Number, // Changed from String to Number
        required: [true, "Height is required"],
        min: [120, "Height must be at least 120cm"], // Adjust minimums as needed
        max:[250,"Height must not exceed 250"]
    },
    weight: {
        type: Number, // Changed from String to Number
        required: [true, "Weight is required"],
        min: [30, "Weight must be at least 30kg"],
        max:[200,"Weight must not exceed 200kg"]
    },
    goal: {
        type: String,
        required: [true, "Goal is required"],
    },
    preference: {
        type: String
    },
    gender: {
        type: String,
        required: [true, "Gender is required"],
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
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

const usermodel = mongoose.model("user", userSchema);
module.exports = usermodel;