import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import AgendaItem from "@/models/AgendaItem";
import Notification from "@/models/Notification";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import { sendMeetingInviteEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const meeting = await Meeting.findById(id).populate("organizerId", "name email avatar");
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  const organizer = meeting.organizerId as any;
  const isOrganizer = organizer?._id?.toString() === session.user.id;
  const canUpdate = hasPermission(session.user.role as UserRole, "meetings:update");

  if (!isOrganizer && !canUpdate) {
    return NextResponse.json(
      { error: "Forbidden — only the meeting organizer or admins can send invites." },
      { status: 403 }
    );
  }

  // Fetch participants and agenda items
  const [participants, agendaItems] = await Promise.all([
    MeetingParticipant.find({ meetingId: id }).populate("userId", "name email role"),
    AgendaItem.find({ meetingId: id }).sort({ order: 1 }).populate("presenterId", "name"),
  ]);

  if (!participants || participants.length === 0) {
    return NextResponse.json({ error: "No participants added to this meeting." }, { status: 400 });
  }

  const formattedDate = new Date(meeting.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedAgenda = agendaItems.map((item: any) => ({
    title: item.title,
    estimatedDuration: item.estimatedDuration,
    presenterName: item.presenterId?.name,
  }));

  const participantList = participants.map((p: any) => ({
    name: p.userId?.name || "Member",
    role: p.role || "Attendee",
  }));

  let sentCount = 0;
  let failedCount = 0;
  const now = new Date();

  // Send email to each participant with email address
  for (const p of participants) {
    const user = p.userId as any;
    if (user && user.email) {
      try {
        await sendMeetingInviteEmail({
          to: user.email,
          recipientName: user.name || "Member",
          recipientRole: p.role || "Attendee",
          meetingId: id,
          meetingTitle: meeting.title,
          meetingType: meeting.meetingType,
          meetingDate: formattedDate,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          timezone: meeting.timezone,
          location: meeting.location,
          organizerName: organizer?.name || "Meeting Organizer",
          organizerEmail: organizer?.email,
          agendaItems: formattedAgenda,
          participants: participantList,
        });

        await MeetingParticipant.findByIdAndUpdate(p._id, {
          invitationStatus: "Sent",
          invitedAt: now,
        });
        sentCount++;
      } catch (err) {
        console.error(`[send-invite] Failed to send meeting invite to ${user.email}:`, err);
        await MeetingParticipant.findByIdAndUpdate(p._id, {
          invitationStatus: "Failed",
        });
        failedCount++;
      }
    }
  }

  // Create in-app Notifications for participants
  const notificationDocs = participants
    .filter((p: any) => p.userId?._id?.toString() !== session.user.id)
    .map((p: any) => ({
      userId: p.userId._id,
      type: "meeting" as const,
      title: `Meeting Invitation: ${meeting.title}`,
      body: `You have been invited by ${organizer?.name || "Organizer"} to "${meeting.title}" on ${formattedDate} (${meeting.startTime} - ${meeting.endTime}).`,
      link: `/meetings/${id}`,
      read: false,
    }));

  if (notificationDocs.length > 0) {
    await Notification.insertMany(notificationDocs);
  }

  return NextResponse.json({
    success: true,
    sentCount,
    failedCount,
    totalCount: participants.length,
    message: `Meeting invite sent successfully to ${sentCount} participant(s).`,
  });
}
