import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { send2FAOTPEmail } from "@/lib/email";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  await User.findByIdAndUpdate(user._id, {
    twoFactorCode: otpCode,
    twoFactorExpires,
  });

  await send2FAOTPEmail({
    to: user.email,
    userName: user.name,
    otpCode,
  });

  return NextResponse.json({
    success: true,
    message: `Verification code sent to ${user.email}`,
  });
}
