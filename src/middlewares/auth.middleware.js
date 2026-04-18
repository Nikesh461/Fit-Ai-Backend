const jwt = require('jsonwebtoken');
const usermodel = require('../models/user.model');

const protect = async (req, res, next) => {
  try {
    // 1. Get token from cookies OR Authorization header
    let token = req.cookies.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, please login' });
    }


    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await usermodel.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error("Auth Error:", error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { protect };