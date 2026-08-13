import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { sendAccountApprovedEmail } from "@/lib/email";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !["super_admin", "admin"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await props.params;
    const { status } = await request.json();

    if (!status || !["active", "inactive", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    if (oldStatus === "pending" && status === "active") {
      try {
        await sendAccountApprovedEmail({
          to: user.email,
          userName: user.name,
        });
      } catch (err) {
        console.error("Failed to send approval email:", err);
      }
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Update user status error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
