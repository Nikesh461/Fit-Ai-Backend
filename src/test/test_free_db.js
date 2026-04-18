const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('https://www.exercisedb.dev/api/v1/exercises/search', {
            params: { q: 'push up', limit: 1 }
        });
        console.log("STATUS:", res.status);
        console.log("DATA:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("FAIL:", e.message);
        if (e.response) console.error("BODY:", e.response.data);
    }
}
test();
