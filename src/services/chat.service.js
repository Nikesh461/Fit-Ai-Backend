const { GoogleGenAI } = require("@google/genai");
const usermodel = require("../models/user.model");
const growthModel = require("../models/growth.model");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Get user profile with growth data for personalization
const getUserProfileData = async (userId) => {
    try {
        // Get basic user profile
        const user = await usermodel.findById(userId).select('-password');

        if (!user) {
            throw new Error("User not found");
        }

        // Get recent growth logs (last 5)
        const recentGrowth = await growthModel.find({ userId })
            .sort({ date: -1 })
            .limit(5);

        // Get growth stats
        const latestGrowth = await growthModel.findOne({ userId }).sort({ date: -1 });
        const firstGrowth = await growthModel.findOne({ userId }).sort({ date: 1 });

        let weightChange = null;
        if (latestGrowth && firstGrowth && latestGrowth._id.toString() !== firstGrowth._id.toString()) {
            weightChange = (latestGrowth.weight - firstGrowth.weight).toFixed(1);
        }

        return {
            user: {
                name: user.name,
                age: user.age,
                gender: user.gender,
                goal: user.goal,
                preference: user.preference,
                dietPreference: user.dietPreference,
                currentWorkoutPlan: user.currentWorkoutPlan,
                currentDietPlan: user.currentDietPlan
            },
            currentStats: {
                weight: latestGrowth ? latestGrowth.weight : user.weight,
                height: latestGrowth ? latestGrowth.height : user.height,
                bodyFat: latestGrowth ? latestGrowth.bodyFat : null,
                muscleMass: latestGrowth ? latestGrowth.muscleMass : null
            },
            progress: {
                experience: user.experience || 0,
                streak: user.streak || 0,
                lastActivityDate: user.lastActivityDate,
                weightChange: weightChange,
                totalLogs: await growthModel.countDocuments({ userId }),
                recentGrowth: recentGrowth.map(g => ({
                    date: g.date,
                    weight: g.weight,
                    height: g.height,
                    bodyFat: g.bodyFat,
                    muscleMass: g.muscleMass
                }))
            }
        };
    } catch (error) {
        console.error("Error getting user profile data:", error);
        throw error;
    }
};

// Build personalized system prompt with user data
const buildSystemPrompt = (userData) => {
    const { user, currentStats, progress } = userData;

    let prompt = `You are FitBuddy, an experienced and motivating AI fitness coach. 
Your role is to provide personalized fitness advice based on the user's profile and progress.

USER PROFILE:
- Name: ${user.name}
- Age: ${user.age} years old
- Gender: ${user.gender}
- Fitness Goal: ${user.goal}
- Workout Preference: ${user.preference}
- Diet Preference: ${user.dietPreference}

CURRENT STATS:
- Weight: ${currentStats.weight} kg
- Height: ${currentStats.height} cm
- Body Fat: ${currentStats.bodyFat ? currentStats.bodyFat + '%' : 'Not tracked'}
- Muscle Mass: ${currentStats.muscleMass ? currentStats.muscleMass + ' kg' : 'Not tracked'}

PROGRESS:
- Experience Points: ${progress.experience}
- Current Streak: ${progress.streak} days
- Weight Change: ${progress.weightChange ? progress.weightChange + ' kg' : 'No change recorded'}
- Total Growth Logs: ${progress.totalLogs}

`;

    if (progress.recentGrowth && progress.recentGrowth.length > 0) {
        prompt += `RECENT GROWTH LOGS:
`;
        progress.recentGrowth.forEach((log, index) => {
            const date = new Date(log.date).toLocaleDateString();
            prompt += `- ${date}: Weight ${log.weight}kg, Height ${log.height}cm`;
            if (log.bodyFat) prompt += `, Body Fat ${log.bodyFat}%`;
            if (log.muscleMass) prompt += `, Muscle Mass ${log.muscleMass}kg`;
            prompt += `\n`;
        });
    }

    prompt += `
GUIDELINES:
1. Provide encouraging and supportive responses
2. Give specific, actionable advice based on their current stats and goals
3. Consider their progress when making suggestions
4. Keep responses concise but informative (2-4 sentences for simple questions, more for detailed advice)
5. If they ask about their workout or diet plans, reference their current plans
6. Always prioritize safety - remind them to consult professionals for serious concerns
7. Use their name to make responses more personal

Remember: You are their personal fitness companion. Be motivating, knowledgeable, and always supportive!`;

    return prompt;
};

// Send message to AI and get personalized response
const sendChatMessage = async (userId, userMessage, chatHistory = []) => {
    try {
        // Get user profile data for personalization
        const userData = await getUserProfileData(userId);

        // Build system prompt with user data
        const systemPrompt = buildSystemPrompt(userData);

        // Build conversation history
        const contents = [];

        // Add previous chat history (last 10 messages for context)
        const recentHistory = chatHistory.slice(-10);
        recentHistory.forEach(msg => {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        });

        // Add current message
        contents.push({
            role: "user",
            parts: [{ text: userMessage }]
        });

        // Generate response
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                maxOutputTokens: 500
            }
        });

        // Parse the response correctly using standard text getter
        const responseText = result.text || result.candidates[0].content.parts[0].text;

        return {
            response: responseText,
            userData: userData
        };

    } catch (error) {
        console.error("Error in chat service:", error);

        let errorMessage = "Sorry, I'm having trouble responding right now. Please try again.";

        if (error.response?.data?.error?.message) {
            errorMessage = error.response.data.error.message;
        } else if (error.message) {
            if (error.message.includes("503") || error.message.includes("UNAVAILABLE")) {
                errorMessage = "The AI service is busy. Please try again in a moment.";
            } else if (error.message.includes("429")) {
                errorMessage = "Too many requests. Please wait a moment.";
            }
        }

        throw new Error(errorMessage);
    }
};

module.exports = {
    getUserProfileData,
    buildSystemPrompt,
    sendChatMessage
};
