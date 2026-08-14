import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AgendaItem from "@/models/AgendaItem";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; agendaId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: meetingId, agendaId } = await params;
  await connectDB();

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const isOrganizer = meeting.organizerId?.toString() === session.user.id;
  const canUpdate = isOrganizer || hasPermission(session.user.role as UserRole, "meetings:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const deleted = await AgendaItem.findOneAndDelete({ _id: agendaId, meetingId });
  if (!deleted) {
    return NextResponse.json({ error: "Agenda item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deletedId: agendaId });
}
