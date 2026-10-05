import "dotenv/config";
import { db } from "./src/prisma/db.ts";

const users = await db.orm.public.User.all();

console.log("Users:", users);