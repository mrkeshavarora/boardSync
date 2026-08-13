import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("status");
    if (!user) {
      return NextResponse.json({ status: null });
    }

    return NextResponse.json({ status: user.status });
  } catch (error) {
    console.error("Check status API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
