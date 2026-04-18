require('dotenv').config();
const mongoose = require('mongoose');
const { sendChatMessage } = require('../services/chat.service');
const User = require('../models/user.model');

async function test() {
    await mongoose.connect(process.env.DB_URL);
    const u = await User.findOne();
    if (!u) return console.log('no user');
    try {
        const res = await sendChatMessage(u._id, "hello");
        console.log("SUCCESS:", res);
    } catch (e) {
        console.error("FAIL:", e);
    }
    process.exit(0);
}
test();
