const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  // Lowercase name for easy lookup
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  image: String,
  calories: Number,
  protein: String,
  carbs: String,
  fats: String,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Food', foodSchema);