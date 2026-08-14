import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendAccountApprovedEmail } from "@/lib/email";

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["super_admin", "board_member"]).optional(),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "users:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = (await params).id;
  await connectDB();
  const user = await User.findById(id).select("-password");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "users:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = (await params).id;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Update fields
  const data = { ...parsed.data };
  
  // If changing password, hash it first
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }

  // Prevent email duplicate if email is being updated
  if (data.email && data.email !== user.email) {
    const exists = await User.findOne({ email: data.email });
    if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const oldStatus = user.status;
  Object.assign(user, data);
  await user.save();

  if (oldStatus === "pending" && user.status === "active") {
    try {
      await sendAccountApprovedEmail({
        to: user.email,
        userName: user.name,
      });
    } catch (emailErr) {
      console.error("Failed to send account approval email:", emailErr);
    }
  }

  return NextResponse.json({ user: { ...user.toObject(), password: undefined } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "users:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = (await params).id;
  await connectDB();
  
  // Prevent deleting self
  if (session.user.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const user = await User.findByIdAndDelete(id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
