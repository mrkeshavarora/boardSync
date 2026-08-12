import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import MeetingParticipant from "@/models/MeetingParticipant";
import Meeting from "@/models/Meeting";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { sendMinutesEmail } from "@/lib/email";

// POST /api/minutes/[id]/publish
// Publishes approved minutes, notifies all participants, sends emails.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:publish")) {
    return NextResponse.json({ error: "Forbidden — only Board Secretaries and Admins can publish minutes." }, { status: 403 });
  }

  const { id } = await params;
  await connectDB();

  const minutes = await Minutes.findById(id)
    .populate("approvedBy", "name email");
  if (!minutes) return NextResponse.json({ error: "Minutes not found" }, { status: 404 });

  if (minutes.status !== "Approved") {
    return NextResponse.json({ error: "Only Approved minutes can be published." }, { status: 409 });
  }

  // --- 1. Publish the minutes ---
  const updated = await Minutes.findByIdAndUpdate(
    id,
    { status: "Published", publishedAt: new Date(), distributedAt: new Date() },
    { new: true }
  ).populate("meetingId", "title scheduledAt");

  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  const meeting = updated.meetingId as any;
  const meetingTitle = meeting?.title || "Board Meeting";
  const meetingDate = meeting?.scheduledAt
    ? new Date(meeting.scheduledAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";
  const approverName = (minutes.approvedBy as any)?.name || session.user.name || "Board Secretary";

  // --- 2. Get all participants ---
  const participants = await MeetingParticipant.find({ meetingId: meeting?._id || meeting })
    .populate("userId", "name email");

  // --- 3. Create in-app notifications ---
  const notificationDocs = participants
    .filter((p: any) => p.userId?._id?.toString() !== session.user.id)
    .map((p: any) => ({
      userId: p.userId._id,
      type: "meeting" as const,
      title: "Meeting Minutes Published",
      body: `The official minutes for "${meetingTitle}" have been published and are ready to view.`,
      link: `/minutes/${id}`,
      read: false,
    }));

  if (notificationDocs.length > 0) {
    await Notification.insertMany(notificationDocs);
  }

  // --- 4. Send emails (non-blocking; failures don't abort publish) ---
  const emailPromises = participants
    .filter((p: any) => p.userId?.email)
    .map(async (p: any) => {
      try {
        await sendMinutesEmail({
          to: p.userId.email,
          memberName: p.userId.name || "Board Member",
          meetingTitle,
          meetingDate,
          minutesId: id,
          approvedByName: approverName,
        });
      } catch (e) {
        console.error(`[publish] Failed to send email to ${p.userId.email}:`, e);
      }
    });

  await Promise.allSettled(emailPromises);

  return NextResponse.json({
    success: true,
    minutes: updated,
    notified: notificationDocs.length,
    emailed: participants.filter((p: any) => p.userId?.email).length,
  });
}
