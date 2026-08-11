import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Connection from "@/models/Connection";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  await connectDB();

  const userObjectId = new mongoose.Types.ObjectId(session.user.id);
  const query: any = {
    $or: [{ fromUserId: userObjectId }, { toUserId: userObjectId }],
  };
  if (status) query.status = status;

  const connections = await Connection.find(query)
    .populate("fromUserId", "name email role avatar")
    .populate("toUserId", "name email role avatar");

  const mapped = connections.map((connection) => {
    const fromUser = connection.fromUserId as any;
    const toUser = connection.toUserId as any;
    const isOutgoing = fromUser._id.toString() === session.user.id;
    const otherUser = isOutgoing ? toUser : fromUser;

    return {
      id: otherUser._id.toString(),
      name: otherUser.name,
      email: otherUser.email,
      role: otherUser.role,
      avatar: otherUser.avatar ?? null,
      status: connection.status,
      direction: isOutgoing ? "outgoing" : "incoming",
      connectionId: connection._id.toString(),
    };
  });

  return NextResponse.json({ connections: mapped });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const targetUserId = body?.targetUserId;
  if (!targetUserId) {
    return NextResponse.json({ error: "Target user is required." }, { status: 400 });
  }
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "You cannot connect with yourself." }, { status: 400 });
  }

  await connectDB();

  const targetUser = await User.findById(targetUserId).select("name email role");
  if (!targetUser) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }

  const currentId = new mongoose.Types.ObjectId(session.user.id);
  const targetId = new mongoose.Types.ObjectId(targetUserId);

  const existing = await Connection.findOne({
    $or: [
      { fromUserId: currentId, toUserId: targetId },
      { fromUserId: targetId, toUserId: currentId },
    ],
  });

  if (existing) {
    if (existing.status === "Accepted") {
      return NextResponse.json({ error: "You are already connected." }, { status: 409 });
    }
    if (existing.fromUserId.toString() === targetUserId && existing.status === "Pending") {
      existing.status = "Accepted";
      await existing.save();
      return NextResponse.json({
        connection: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          status: existing.status,
          direction: "incoming",
          connectionId: existing._id.toString(),
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      connection: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: existing.status,
        direction: existing.fromUserId.toString() === session.user.id ? "outgoing" : "incoming",
        connectionId: existing._id.toString(),
      },
    }, { status: 200 });
  }

  const connection = await Connection.create({
    fromUserId: currentId,
    toUserId: targetId,
    status: "Pending",
  });

  return NextResponse.json({
    connection: {
      id: targetUser._id.toString(),
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: connection.status,
      direction: "outgoing",
      connectionId: connection._id.toString(),
    },
  }, { status: 201 });
}
