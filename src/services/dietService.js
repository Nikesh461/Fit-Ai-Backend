// services/dietService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Retry helper with exponential backoff
async function withRetry(promiseFn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await promiseFn();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      // Check if error is retryable (503, 429, network errors)
      const isRetryable = error.status === 503 ||
        error.status === 429 ||
        error.message?.includes('503') ||
        error.message?.includes('UNAVAILABLE') ||
        error.message?.includes('network');

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function generateWeeklyDiet(userProfile) {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    Act as a professional Nutritionist. Create a 7-day diet plan for:
    - Age: ${userProfile.age}, Weight: ${userProfile.weight}kg, Height: ${userProfile.height}cm.
    - Goal: ${userProfile.goal}.
    - Dietary Restrictions: ${userProfile.dietPreference || 'None'}.
    - Cuisine Preference: ${userProfile.cuisinePreference || 'None'}.

    For each day, provide:
    1. Total daily Calories, Protein, Carbs, and Fats.
    2. Four meals: Breakfast, Lunch, Snack, Dinner.
    3. For EACH meal, provide:
       - \`name\`: Name of the dish.
       - \`description\`: Brief description.
       - \`image_keyword\`: A few search terms (e.g. "oatmeal_berries").
       - \`image_category\`: EXACTLY one of these: [ "indian_breakfast", "indian_main", "south_indian", "western_breakfast", "western_main", "vegetable_dish", "chicken_dish", "fish_dish", "fruit_bowl", "smoothie", "healthy_snack", "eggs_toast", "salad" ].
       - \`macros\`: Approximate macros for the meal with \`calories\`, \`protein\`, \`carbs\`, and \`fats\`.
    
    Return ONLY this JSON format:
    {
      "diet_plan": [
        {
          "day": "Monday",
          "total_macros": { "calories": 2200, "protein": "150g", "carbs": "200g", "fats": "70g" },
          "meals": {
            "breakfast": { "name": "Oatmeal with Berries", "description": "1 cup oats with blueberries and nuts", "image_keyword": "oatmeal_berries", "image_category": "western_breakfast", "macros": { "calories": 350, "protein": "10g", "carbs": "60g", "fats": "8g" } },
            "lunch": { "name": "Grilled Chicken Salad", "description": "Chicken breast with mixed greens and olive oil", "image_keyword": "grilled_chicken_salad", "image_category": "salad", "macros": { "calories": 450, "protein": "40g", "carbs": "15g", "fats": "20g" } },
            "snack": { "name": "Greek Yogurt", "description": "One cup of plain Greek yogurt", "image_keyword": "greek_yogurt", "image_category": "healthy_snack", "macros": { "calories": 150, "protein": "15g", "carbs": "10g", "fats": "5g" } },
            "dinner": { "name": "Baked Salmon", "description": "Salmon fillet with steamed broccoli and quinoa", "image_keyword": "baked_salmon", "image_category": "fish_dish", "macros": { "calories": 550, "protein": "35g", "carbs": "40g", "fats": "25g" } }
          }
        }
      ]
    }
  `;

  // Use retry wrapper for API calls
  const result = await withRetry(async () => {
    return await model.generateContent(prompt);
  });

  // Parse the response correctly (often wrapped in markdown tags)
  let rawText = result.response.text ? result.response.text() : result.response.candidates[0].content.parts[0].text;
  if (typeof rawText !== 'string') rawText = result.response.candidates[0].content.parts[0].text;
  rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(rawText);
}

module.exports = { generateWeeklyDiet };
