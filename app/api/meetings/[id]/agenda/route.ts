import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AgendaItem from "@/models/AgendaItem";
import Meeting from "@/models/Meeting";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetingId = (await params).id;
  await connectDB();
  const agendaItems = await AgendaItem.find({ meetingId })
    .sort({ order: 1 })
    .populate("presenterId", "name email");
    
  return NextResponse.json({ agendaItems });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetingId = (await params).id;
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

  const body = await request.json();
  const { title, description, estimatedDuration, presenterId, presenterName, order } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  let validPresenterId: mongoose.Types.ObjectId | undefined = undefined;
  let finalPresenterName: string | undefined = presenterName?.trim() || undefined;

  if (presenterId && typeof presenterId === "string" && mongoose.Types.ObjectId.isValid(presenterId)) {
    validPresenterId = new mongoose.Types.ObjectId(presenterId);
  } else if (presenterId && typeof presenterId === "string" && !finalPresenterName) {
    // If presenterId was passed as free text string (e.g. "John Doe")
    finalPresenterName = presenterId.trim();
  }

  let itemOrder = order;
  if (itemOrder === undefined || itemOrder === null) {
    const count = await AgendaItem.countDocuments({ meetingId });
    itemOrder = count + 1;
  }

  const agendaItem = await AgendaItem.create({
    meetingId,
    title: title.trim(),
    description: description?.trim() || undefined,
    estimatedDuration: estimatedDuration ? Number(estimatedDuration) : undefined,
    presenterId: validPresenterId,
    presenterName: finalPresenterName,
    order: itemOrder,
    status: "Pending",
  });

  return NextResponse.json({ agendaItem }, { status: 201 });
}
