import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Group from "@/models/Group";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

// GET /api/groups/[id] — get group details (must be a member)
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const group = await Group.findOne({
    _id: id,
    members: new mongoose.Types.ObjectId(session.user.id),
  })
    .populate("members", "name email avatar role")
    .populate("createdBy", "name email avatar");

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  return NextResponse.json({ group });
}
