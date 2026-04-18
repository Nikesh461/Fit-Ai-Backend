const express = require("express");
const growthController = require("../controller/growth.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Log new growth data
router.post("/log", growthController.logGrowth);

// Get growth history
router.get("/history", growthController.getGrowthHistory);

// Get latest growth entry
router.get("/latest", growthController.getLatestGrowth);

// Get growth stats/summary
router.get("/stats", growthController.getGrowthStats);

module.exports = router;

