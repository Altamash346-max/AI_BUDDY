import dns from "dns"
dns.setServers(["8.8.8.8", "8.8.4.4"])

import "./env.js"
import { connectDb } from "./db/index.js";
import { app } from "./app.js"

connectDb()
.then(() => {
    app.listen(`${process.env.PORT}`, () => {
        console.log(`Server is running at port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.log("Mongo DB connection failed ",error);
})