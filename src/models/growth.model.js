const mongoose = require("mongoose");

const growthSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    height: {
        type: Number,
        required: true
    },
    bodyFat: {
        type: Number,
        default: null
    },
    muscleMass: {
        type: Number,
        default: null
    },
    notes: {
        type: String,
        default: ""
    },
    experience: {
        type: Number,
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying
growthSchema.index({ userId: 1, date: -1 });

const growthModel = mongoose.model("growth", growthSchema);
module.exports = growthModel;

