import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

// POST /api/minutes/[id]/approve
// Approves minutes (status: Review → Approved). Requires minutes:approve permission.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:approve")) {
    return NextResponse.json({ error: "Forbidden — only Board Secretaries and Admins can approve minutes." }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const minutes = await Minutes.findById(id);
  if (!minutes) return NextResponse.json({ error: "Minutes not found" }, { status: 404 });

  if (minutes.status !== "Draft" && minutes.status !== "Review") {
    return NextResponse.json({ error: `Cannot approve minutes with status "${minutes.status}".` }, { status: 409 });
  }

  const updated = await Minutes.findByIdAndUpdate(
    id,
    {
      status: "Approved",
      approvedBy: new mongoose.Types.ObjectId(session.user.id),
      approvedAt: new Date(),
    },
    { new: true }
  )
    .populate("draftedBy", "name email")
    .populate("approvedBy", "name email");

  return NextResponse.json({ minutes: updated });
}
