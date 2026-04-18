const express = require("express");
const chatController = require("../controller/chat.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send a chat message
router.post("/message", chatController.sendMessage);

// Get chat history
router.get("/history", chatController.getChatHistory);

// Get user profile for display
router.get("/profile", chatController.getUserProfile);

// Clear chat history
router.delete("/history", chatController.clearChatHistory);

module.exports = router;
