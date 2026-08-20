import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await User.findByIdAndUpdate(user._id, {
    twoFactorEnabled: false,
    twoFactorCode: null,
    twoFactorExpires: null,
  });

  return NextResponse.json({
    success: true,
    twoFactorEnabled: false,
    message: "Two-Factor Authentication has been disabled.",
  });
}
