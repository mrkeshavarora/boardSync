import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/models/User";
import mongoose from "mongoose";

import { canAccessMeeting, isAdmin } from "@/lib/meetingAccess";

type Params = { params: Promise<{ id: string }> };

// GET /api/minutes/[id] — fetch a single minutes document
export async function GET(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const minutes = await Minutes.findById(id)
    .populate("meetingId", "title date status meetingType location onlineMeeting organizerId")
    .populate("draftedBy", "name email")
    .populate("approvedBy", "name email");

  if (!minutes) return NextResponse.json({ error: "Minutes not found" }, { status: 404 });

  const role = session.user.role as UserRole;
  const meetingIdStr = (minutes.meetingId as any)?._id?.toString() ?? minutes.meetingId?.toString();
  if (meetingIdStr) {
    const hasAccess = await canAccessMeeting(session.user.id, role, meetingIdStr);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden — You do not have access to minutes for this meeting." }, { status: 403 });
    }
  }

  return NextResponse.json({ minutes });
}


// PATCH /api/minutes/[id] — update minutes fields (Secretary/Admin only)
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  await connectDB();
  const minutes = await Minutes.findById(id);
  if (!minutes) return NextResponse.json({ error: "Minutes not found" }, { status: 404 });

  // Cannot edit approved/published minutes
  if (minutes.status === "Published" || minutes.status === "Archived") {
    return NextResponse.json({ error: "Cannot edit minutes that are Published or Archived." }, { status: 409 });
  }

  const allowedFields = [
    "meetingSummary", "callToOrder", "quorum", "attendees", "absentees",
    "agendaItems", "keyDecisions", "resolutions", "actionItems",
    "nextMeeting", "closingRemarks", "content", "status",
  ];

  const update: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  // Only allow status transitions: Draft → Review or Review → Draft
  if (update.status && !["Draft", "Review"].includes(update.status)) {
    delete update.status; // Approve & Publish are handled by dedicated endpoints
  }

  const updated = await Minutes.findByIdAndUpdate(id, update, { new: true })
    .populate("meetingId", "title scheduledAt status type")
    .populate("draftedBy", "name email")
    .populate("approvedBy", "name email");

  return NextResponse.json({ minutes: updated });
}

// DELETE /api/minutes/[id] — delete a minutes record (Organizer, Author, or Admin only)
export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const minutes = await Minutes.findById(id).populate("meetingId", "organizerId");
  if (!minutes) return NextResponse.json({ error: "Minutes not found" }, { status: 404 });

  const role = session.user.role as UserRole;
  const userId = session.user.id;

  const meetingOrganizerId = (minutes.meetingId as any)?.organizerId?._id?.toString() ?? (minutes.meetingId as any)?.organizerId?.toString();
  const authorId = (minutes.draftedBy as any)?._id?.toString() ?? minutes.draftedBy?.toString();

  const isOrganizer = meetingOrganizerId === userId;
  const isAuthor = authorId === userId;
  const isAdminUser = isAdmin(role) || hasPermission(role, "minutes:delete");

  if (!isOrganizer && !isAuthor && !isAdminUser) {
    return NextResponse.json(
      { error: "Forbidden — Only the meeting creator, minutes author, or admin can delete these minutes." },
      { status: 403 }
    );
  }

  await Minutes.findByIdAndDelete(id);
  return NextResponse.json({ message: "Minutes deleted successfully" });
}
