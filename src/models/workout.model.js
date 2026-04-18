const mongoose = require("mongoose");

const workoutLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    exerciseName: {
        type: String,
        required: true
    },
    sets: {
        type: Number,
        default: 0
    },
    reps: {
        type: String,
        default: ""
    },
    weight: {
        type: Number,
        default: null
    },
    experienceEarned: {
        type: Number,
        default: 15 // Base XP for completing an exercise
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying by user and date
workoutLogSchema.index({ userId: 1, completedAt: -1 });

const workoutLogModel = mongoose.model("workoutLog", workoutLogSchema);
module.exports = workoutLogModel;
