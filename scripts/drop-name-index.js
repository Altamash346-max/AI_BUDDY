// One-off migration: removes the old unique index on users.name, which blocked
// two students with the same name from signing up. Safe to run more than once.
// Usage: node scripts/drop-name-index.js
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import "../src/env.js";
import mongoose from "mongoose";
import { DB_NAME } from "../src/constants.js";

await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
const users = mongoose.connection.collection("users");
const indexes = await users.indexes();
if (indexes.some((i) => i.name === "name_1")) {
    await users.dropIndex("name_1");
    console.log("Dropped users.name_1 index");
} else {
    console.log("users.name_1 index not present, nothing to do");
}
await mongoose.disconnect();
