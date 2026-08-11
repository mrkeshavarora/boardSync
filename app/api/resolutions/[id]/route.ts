import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Resolution from "@/models/Resolution";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

// PUT /api/resolutions/[id] — Update vote tally / status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  await connectDB();

  const resolution = await Resolution.findByIdAndUpdate((await params).id, body, { new: true });
  if (!resolution) return NextResponse.json({ error: "Resolution not found" }, { status: 404 });
  return NextResponse.json({ resolution });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  await Resolution.findByIdAndDelete((await params).id);
  return NextResponse.json({ success: true });
}
