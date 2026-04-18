const axios = require('axios');
const Food = require('../models/food.model');

const EDAMAM_APP_ID = process.env.EDAMAM_APP_ID;
const EDAMAM_APP_KEY = process.env.EDAMAM_APP_KEY;

// Fallback images strictly mapped to Gemini's 'image_category'
const FALLBACK_IMAGES = {
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
  smoothie: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400",
  healthy_snack: "https://images.unsplash.com/photo-1599490659213-e2b9527f1011?w=400",
  fruit_bowl: "https://images.unsplash.com/photo-1490474418585-ba9bd8c52ab8?w=400",
  eggs_toast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
  chicken_dish: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400",
  fish_dish: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",
  vegetable_dish: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400",
  western_breakfast: "https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=400",
  western_main: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
  indian_breakfast: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=400",
  indian_main: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400",
  south_indian: "https://images.unsplash.com/photo-1616489370860-2646bdebdcb9?w=400",
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400",
  lunch: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  snack: "https://images.unsplash.com/photo-1599490659213-e2b9527f1011?w=400",
  dinner: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
  default: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400"
};

const FOOD_FALLBACK = FALLBACK_IMAGES.default;

async function fetchFromEdamam(mealName) {
  try {
    const cleanName = mealName.toLowerCase().trim();

    // 1. Search Edamam Food Database (or Recipe API)
    // We use the Food Database 'parser' for nutritional data and images
    const response = await axios.get(`https://api.edamam.com/api/food-database/v2/parser`, {
      params: {
        app_id: EDAMAM_APP_ID,
        app_key: EDAMAM_APP_KEY,
        ingr: cleanName
      }
    });

    const data = response.data;
    if (data.hints && data.hints.length > 0) {
      const food = data.hints[0].food;
      
      const entry = {
        name: cleanName,
        image: food.image || FOOD_FALLBACK,
        calories: Math.round(food.nutrients.ENERC_KCAL) || 0,
        protein: `${Math.round(food.nutrients.PROCNT || 0)}g`,
        fats: `${Math.round(food.nutrients.FAT || 0)}g`,
        carbs: `${Math.round(food.nutrients.CHOCDF || 0)}g`
      };

      // Save to our DB cache
      return await Food.findOneAndUpdate({ name: cleanName }, entry, { upsert: true, returnDocument: 'after' });
    }
    return null;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    console.error(`Edamam API Error for ${mealName}:`, error.message);
    return null;
  }
}

/**
 * Iterates through the Gemini diet plan and attaches real images/macros
 */
async function attachMealData(dietPlan) {
  // Extract all unique meal names across 7 days
  const mealNames = new Set();
  dietPlan.forEach(day => {
    Object.values(day.meals).forEach(meal => mealNames.add(meal.name.toLowerCase().trim()));
  });

  const uniqueNames = Array.from(mealNames);
  
  // 1. Check DB for existing foods
  const existingFoods = await Food.find({ name: { $in: uniqueNames } });
  const foodLibrary = {};
  existingFoods.forEach(f => foodLibrary[f.name] = f);

  // 2. Identify missing foods and fetch from Edamam
  const missingNames = uniqueNames.filter(name => !foodLibrary[name]);
  
  if (missingNames.length > 0) {
    for (const name of missingNames) {
      try {
        const result = await fetchFromEdamam(name);
        if (result) foodLibrary[name] = result;
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        if (error.message === 'RATE_LIMIT') {
          console.warn('Edamam rate limit reached. Falling back to Gemini macros for remaining items.');
          break; // Stop fetching from Edamam to prevent further 429 errors
        }
      }
    }
  }

  // 3. Map the data back into the diet plan
  dietPlan.forEach(day => {
    for (let mealKey in day.meals) {
      const meal = day.meals[mealKey];
      const data = foodLibrary[meal.name.toLowerCase().trim()];
      
      if (data) {
        day.meals[mealKey].image = data.image;
        day.meals[mealKey].real_macros = {
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fats: data.fats
        };
      } else {
        // Find matching category fallback or use mealKey as fallback
        let category = mealKey.toLowerCase();
        if (meal.image_category && FALLBACK_IMAGES[meal.image_category.trim()]) {
          category = meal.image_category.trim();
        }
        day.meals[mealKey].image = FALLBACK_IMAGES[category] || FOOD_FALLBACK;
      }
    }
  });

  return dietPlan;
}

module.exports = { attachMealData };