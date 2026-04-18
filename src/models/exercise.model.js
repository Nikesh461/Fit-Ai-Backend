const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  img: String,
  instructions: [String],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exercise', exerciseSchema);