import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ActionItem from "@/models/ActionItem";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";

// PUT /api/actions/[id] — Update an action item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  await connectDB();

  const action = await ActionItem.findById((await params).id);
  if (!action) return NextResponse.json({ error: "Action item not found" }, { status: 404 });

  // Users can update status of their own items; admins can update anything
  const isOwner = action.assignedTo.toString() === session.user.id;
  const isAdmin = hasPermission(session.user.role as UserRole, "actions:update:all");

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.status === "Completed") {
    body.completedAt = new Date();
  }

  const updated = await ActionItem.findByIdAndUpdate((await params).id, body, { new: true })
    .populate("assignedTo", "name email");

  return NextResponse.json({ action: updated });
}

// DELETE /api/actions/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "actions:update:all")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  await ActionItem.findByIdAndDelete((await params).id);
  return NextResponse.json({ success: true });
}
