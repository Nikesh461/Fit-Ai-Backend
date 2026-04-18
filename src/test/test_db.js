require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const fs = require('fs');

async function test() {
    await mongoose.connect(process.env.DB_URL);
    const u = await User.findOne();
    if (!u) return console.log('no user');
    fs.writeFileSync('db_dump.json', JSON.stringify(u.currentWorkoutPlan, null, 2));
    console.log('Saved to db_dump.json');
    process.exit(0);
}
test();
