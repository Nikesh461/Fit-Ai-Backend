require("dotenv").config({quiet:true});
const app=require("./src/app");
const ConnectDB=require("./src/db/db");
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); 

ConnectDB();
app.listen(process.env.PORT, function() {
    console.log("Process is running on port", process.env.PORT);
});

