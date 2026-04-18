const usermodel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');


const registeruser = async (req, res) => {
    try {
        const { name, email, password, age, height, weight, goal, preference, gender, dietPreference, cuisinePreference } = req.body;
        const isemailexists = await usermodel.findOne({ email: email });
        if (isemailexists) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await usermodel.create({
            name,
            email,
            password: hashedPassword,
            age,
            height,
            weight,
            goal,
            preference,
            gender,
            dietPreference,
            cuisinePreference
        });
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 86400000
        });
        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                goal: user.goal,
                cuisinePreference: user.cuisinePreference
            }
        });
    } catch (er) {
        console.error(er);
        res.status(500).json({
            success: false,
            message: "Some internal error occured"
        });
    }
}
async function Userlogin(req, res) {
    try {
        const { email, password } = req.body;
        const user = await usermodel.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );


        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 86400000
        });

        res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                goal: user.goal,
                cuisinePreference: user.cuisinePreference
            }
        });

    } catch (er) {
        res.status(500).json({ success: false, message: "Server error", er });
        console.error(er);
    }
}
async function UserLogout(req, res) {
    res.clearCookie('token');
    res.status(200).json({ message: "Logged out" });
}

async function getCurrentUser(req, res) {
    try {
        let token = req.cookies.token;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await usermodel.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                goal: user.goal,
                cuisinePreference: user.cuisinePreference
            }
        });
    } catch (er) {
        res.status(401).json({ success: false, message: "Invalid token" });
    }
}

module.exports = { registeruser, Userlogin, UserLogout, getCurrentUser };
