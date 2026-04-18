const express = require('express');
const router = express.Router();
const { getDietPlan } = require('../controller/dietController');
const { protect } = require('../middlewares/auth.middleware');

// The 'protect' middleware ensures the user is logged in
// before the 'getDietPlan' controller runs.
router.get('/generate', protect, getDietPlan);

module.exports = router;
