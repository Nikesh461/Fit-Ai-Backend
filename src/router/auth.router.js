const express=require("express");
const authcontroller=require("../controller/auth.controller");

const router=express.Router();

router.post("/register",authcontroller.registeruser);
router.post("/login",authcontroller.Userlogin);
router.post("/logout",authcontroller.UserLogout);
router.get("/me",authcontroller.getCurrentUser);

module.exports=router;
