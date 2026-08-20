import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otp } = await request.json().catch(() => ({}));
  if (!otp || typeof otp !== "string") {
    return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("+twoFactorCode +twoFactorExpires");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.twoFactorCode || user.twoFactorCode !== otp.trim()) {
    return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
  }

  if (!user.twoFactorExpires || user.twoFactorExpires < new Date()) {
    return NextResponse.json({ error: "Verification code expired. Please click Resend Code." }, { status: 400 });
  }

  await User.findByIdAndUpdate(user._id, {
    twoFactorEnabled: true,
    twoFactorCode: null,
    twoFactorExpires: null,
  });

  return NextResponse.json({
    success: true,
    twoFactorEnabled: true,
    message: "Two-Factor Authentication has been enabled successfully.",
  });
}
