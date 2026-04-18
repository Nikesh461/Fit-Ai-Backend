const express = require('express');
const router = express.Router();
const workoutLogController = require('../controller/workoutLog.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/complete', protect, workoutLogController.completeExercise);
router.get('/history', protect, workoutLogController.getWorkoutLogs);

module.exports = router;
