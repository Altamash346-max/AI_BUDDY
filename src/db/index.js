import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`connection successfull DB Host, PORT: ,${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("Error in connecting with the data base",error);
        process.exit(1);
    }
}
export { connectDb };