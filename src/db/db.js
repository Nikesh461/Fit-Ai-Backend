const mongoose=require("mongoose");

const ConnectDB=async (req,res)=>{
    try{
    await mongoose.connect(process.env.DB_URL);
    await console.log("Connected to database")
    }catch(er){
        console.error("database connection failed",er);
    }
}
module.exports=ConnectDB;