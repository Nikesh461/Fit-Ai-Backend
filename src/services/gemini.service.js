const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateWeeklyPlan(userProfile) {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Assume that you are an experienced professional fitness trainer.
            Create a highly personalized 7-day workout plan for:
            - Age: ${userProfile.age}, Goal: ${userProfile.goal}, Location: ${userProfile.preference}, weight: ${userProfile.weight}, height: ${userProfile.height}, gender: ${userProfile.gender}.
            
            IMPORTANT RULES:
            1. Use ONLY standard, simple exercise names that would be found in a fitness database (e.g., 'push up' not 'Pushups', 'sit up' not 'Abs session', 'barbell squat' not 'Squats').
            2. Do not use symbols like "/" or "&" in exercise names.
            3. Return exactly 7 days with at least 1 rest day.
            4. Each exercise must include: name, sets (number), reps (string like "10" or "10-12"), rest (string like "60s"), and target_muscle.

            Return ONLY valid JSON in exactly this format, no extra text:
            {
                "week_plan": [
                    {
                        "day": "Monday",
                        "focus": "Chest and Triceps",
                        "estimated_duration": 45,
                        "exercises": [
                            {"name": "push up", "sets": 3, "reps": "12", "rest": "60s", "target_muscle": "Chest"},
                            {"name": "dips", "sets": 3, "reps": "10", "rest": "60s", "target_muscle": "Triceps"}
                        ]
                    },
                    { "day": "Tuesday", "focus": "Rest", "estimated_duration": 0, "exercises": [] }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        let rawText = result.response.text();
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(rawText);
        return data;

    } catch (error) {
        let errorMessage = "Sorry could not generate a plan for you, try again later";

        console.error("Gemini Service Error:", error.message);

        if (error.message?.includes("503") || error.message?.includes("UNAVAILABLE")) {
            errorMessage = "The AI service is temporarily busy. Please try again in a few moments.";
        } else if (error.message?.includes("429")) {
            errorMessage = "Too many requests. Please wait a moment and try again.";
        }

        return { error: errorMessage };
    }
}

module.exports = { generateWorkoutNames: generateWeeklyPlan };



