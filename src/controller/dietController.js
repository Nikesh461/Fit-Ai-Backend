const { generateWeeklyDiet } = require('../services/dietService');
const { attachMealData } = require('../services/edamamService'); // New Import
const User = require('../models/user.model');
const { isWeeklyResetDue } = require('../utils/dateUtils');

const getDietPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = Date.now();

    // Check if user already has a valid plan (with images attached)
    const hasImages = user.currentDietPlan?.diet_plan?.[0]?.meals?.breakfast?.image;

    if (user.currentDietPlan && !req.query.refresh && hasImages) {
      if (!isWeeklyResetDue(user.dietGeneratedAt)) {
        return res.status(200).json({
          success: true,
          source: "database",
          data: user.currentDietPlan
        });
      }
    }

    // 1. Generate skeleton from Gemini
    const rawDiet = await generateWeeklyDiet(user);

    // 2. ENRICH with Edamam data (images + verified macros)
    const enrichedDietPlan = await attachMealData(rawDiet.diet_plan);

    const finalDiet = { diet_plan: enrichedDietPlan };

    // 3. Save to User
    user.currentDietPlan = finalDiet;
    user.dietGeneratedAt = now;
    await user.save();

    res.status(200).json({
      success: true,
      source: "ai_enriched",
      data: finalDiet
    });
  } catch (error) {
    // ... error handling ...
  }
};
module.exports = { getDietPlan };