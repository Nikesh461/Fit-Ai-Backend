const express = require('express');
const router = express.Router();
const { completeMeal, getTodayDietLogs } = require('../controller/dietLog.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/complete', protect, completeMeal);
router.get('/today', protect, getTodayDietLogs);

module.exports = router;
