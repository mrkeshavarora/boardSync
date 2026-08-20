import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { send2FAOTPEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password +twoFactorEnabled");
    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "pending") {
      return NextResponse.json({ error: "Your account is pending admin approval." }, { status: 403 });
    }
    if (user.status === "inactive") {
      return NextResponse.json({ error: "Your account has been deactivated." }, { status: 403 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ requires2FA: false });
    }

    // Generate 6-digit OTP
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
      requires2FA: true,
      email: user.email,
      message: "2FA verification code sent to your email.",
    });
  } catch (error) {
    console.error("2FA send login OTP error:", error);
    return NextResponse.json({ error: "Failed to process 2FA request" }, { status: 500 });
  }
}
