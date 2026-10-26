// Usage: node scripts/reset-password.js <email> <newPassword>
import "dotenv/config";
import mongoose from "mongoose";
import { DB_NAME } from "../src/constants.js";
import { User } from "../src/models/user.model.js";

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
    console.log("Usage: node scripts/reset-password.js <email> <newPassword>");
    process.exit(1);
}

await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
const user = await User.findOne({ email: email.toLowerCase() });
if (!user) {
    console.log(`No user found with email ${email}`);
} else {
    user.password = newPassword; // hashed by the pre-save hook
    await user.save();
    console.log(`Password updated for ${user.email}`);
}
await mongoose.disconnect();
