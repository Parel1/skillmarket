import "dotenv/config";
import { db } from "./src/prisma/db.ts";

await db.connect();

const user = await db.orm.public.User.create({
    email: "freelancer@skillmarket.com",
    username: "freelancer1",
    name: "Freelancer SkillMarket",
    role: "freelancer"
});

console.log("User berhasil dibuat:");
console.log(user);