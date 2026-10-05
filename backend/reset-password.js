import bcrypt from "bcryptjs";
import "dotenv/config";
import { db } from "./src/prisma/db.ts";

const newPassword = "12345678";

const hashedPassword = await bcrypt.hash(newPassword, 10);

await db.orm.public.User
    .where({ id: 2 })
    .update({
        password: hashedPassword
    });

console.log("Password berhasil diubah menjadi:", newPassword);