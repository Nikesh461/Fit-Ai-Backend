const chatModel = require("../models/chat.model");
const chatService = require("../services/chat.service");

// Send a chat message and get AI response
const sendMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { message } = req.body;

        if (!message || message.trim() === "") {
            return res.status(400).json({
                message: "Message is required"
            });
        }

        // Get or create chat session
        let chatSession = await chatModel.findOne({ userId });
        
        if (!chatSession) {
            chatSession = await chatModel.create({ userId, messages: [] });
        }

        // Get chat history for context
        const chatHistory = chatSession.messages;

        // Send message to AI and get personalized response
        const { response, userData } = await chatService.sendChatMessage(
            userId, 
            message, 
            chatHistory
        );

        // Save user message and AI response to database
        chatSession.messages.push({
            role: 'user',
            content: message
        });
        chatSession.messages.push({
            role: 'assistant',
            content: response
        });
        
        // Keep only last 50 messages to prevent unbounded growth
        if (chatSession.messages.length > 50) {
            chatSession.messages = chatSession.messages.slice(-50);
        }
        
        chatSession.lastMessageAt = new Date();
        await chatSession.save();

        res.status(200).json({
            message: response,
            userStats: {
                weight: userData.currentStats.weight,
                height: userData.currentStats.height,
                experience: userData.progress.experience,
                streak: userData.progress.streak,
                goal: userData.user.goal
            }
        });

    } catch (error) {
        console.error("Error in chat:", error);
        res.status(500).json({
            message: error.message || "Failed to get response from AI"
        });
    }
};

// Get chat history
const getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 20 } = req.query;

        const chatSession = await chatModel.findOne({ userId });

        if (!chatSession) {
            return res.status(200).json({
                messages: [],
                total: 0
            });
        }

        const messages = chatSession.messages.slice(-parseInt(limit));

        res.status(200).json({
            messages: messages,
            total: chatSession.messages.length
        });

    } catch (error) {
        console.error("Error getting chat history:", error);
        res.status(500).json({
            message: "Failed to get chat history"
        });
    }
};

// Get user profile data for display
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const userData = await chatService.getUserProfileData(userId);

        res.status(200).json(userData);

    } catch (error) {
        console.error("Error getting user profile:", error);
        res.status(500).json({
            message: "Failed to get user profile"
        });
    }
};

// Clear chat history
const clearChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;

        await chatModel.findOneAndDelete({ userId });

        res.status(200).json({
            message: "Chat history cleared"
        });

    } catch (error) {
        console.error("Error clearing chat history:", error);
        res.status(500).json({
            message: "Failed to clear chat history"
        });
    }
};

module.exports = {
    sendMessage,
    getChatHistory,
    getUserProfile,
    clearChatHistory
};
