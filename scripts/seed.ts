/**
 * Seed script — run with: npx tsx scripts/seed.ts
 * Creates a default super_admin user if none exists.
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/MONGODB_URI\s*=\s*(.+)/);
      if (match) {
        MONGODB_URI = match[1].trim().replace(/['"]/g, "");
      }
    }
  } catch (err) {
    console.error("Could not parse .env.local automatically:", err);
  }
}

if (!MONGODB_URI) throw new Error("Set MONGODB_URI in environment or .env.local");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "board_member" },
  status: { type: String, default: "active" },
  department: String,
  title: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅ Connected to MongoDB");

  const existing = await User.findOne({ email: "admin@boardsync.com" });
  if (existing) {
    console.log("ℹ️  Admin user already exists");
    process.exit(0);
  }

  const password = await bcrypt.hash("Admin@123", 12);
  await User.create({
    name: "Admin",
    email: "admin@boardsync.com",
    password,
    role: "super_admin",
    status: "active",
    department: "Executive",
    title: "System Administrator",
  });

  console.log("✅ Seed complete!");
  console.log("   Email:    admin@boardsync.com");
  console.log("   Password: Admin@123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
