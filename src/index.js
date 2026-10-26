import dns from "dns"
dns.setServers(["8.8.8.8", "8.8.4.4"])

import "./env.js"
import { connectDb } from "./db/index.js";
import { app } from "./app.js"

connectDb()
.then(() => {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`);
        
    });
})
.catch((error) => {
    console.log("Mongo DB connection failed ",error);
})