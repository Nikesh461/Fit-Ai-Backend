require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "say hi",
        });
        console.log("SUCCESS:", JSON.stringify(result, null, 2));
        console.log("TEXT METHOD:", result.text);
    } catch (e) {
        console.error("FAIL:", e);
    }
}
run();
