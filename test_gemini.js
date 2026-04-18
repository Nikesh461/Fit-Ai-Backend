require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    console.log('API Key present:', !!process.env.GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
    });
    try {
        const result = await model.generateContent('Return this JSON exactly: {"test": true, "status": "working"}');
        console.log('SUCCESS:', result.response.text());
    } catch (e) {
        console.error('FULL ERROR:', e);
    }
}

test();

