const express=require("express");
const cors=require("cors");
const authRouter=require("./router/auth.router");
const workoutRouter=require("./router/workout.router");
const growthRouter = require("./router/growth.router");
const chatRouter = require("./router/chat.router");
const cookieParser=require("cookie-parser");
const dietRoutes = require('./router/dietRoutes');

const app=express();

// Allow all origins for development (needed for different ports)
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(cookieParser());
app.use(express.json());

const dietLogRouter = require("./router/dietLog.router");

app.use("/api/auth/",authRouter);
app.use("/api/workout",workoutRouter);
app.use("/api/growth", growthRouter);
app.use("/api/chat", chatRouter);
app.use('/api/diet', dietRoutes);
app.use('/api/diet/logs', dietLogRouter);

module.exports=app;

