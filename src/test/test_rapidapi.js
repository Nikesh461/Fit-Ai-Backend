require('dotenv').config();
const axios = require('axios');

async function test() {
    try {
        const response = await axios.get(`https://exercisedb.p.rapidapi.com/exercises/name/push%20up`, {
            headers: {
                'X-RapidAPI-Key': process.env.EXERCISE_DB_KEY,
                'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
            }
        });
        console.log("KEYS:", Object.keys(response.data[0]));
        console.log("FULL:", JSON.stringify(response.data[0], null, 2));
    } catch (e) {
        console.error("FAIL:", e.response ? e.response.data : e.message);
    }
}
test();
