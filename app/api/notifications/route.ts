import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { auth } from "@/lib/auth";

// GET /api/notifications — fetch current user's notifications
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "30");

  await connectDB();
  const notifications = await Notification.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({
    userId: session.user.id,
    read: false,
  });

  return NextResponse.json({ notifications, unreadCount });
}

// PUT /api/notifications — mark all as read OR a specific one
export async function PUT(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id } = body;

  await connectDB();

  if (id) {
    await Notification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { read: true }
    );
  } else {
    // Mark all as read
    await Notification.updateMany({ userId: session.user.id, read: false }, { read: true });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications — dismiss a notification by id
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await connectDB();
  await Notification.findOneAndDelete({ _id: id, userId: session.user.id });

  return NextResponse.json({ success: true });
}
