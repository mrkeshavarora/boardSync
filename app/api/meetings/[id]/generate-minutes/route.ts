import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Minutes from "@/models/Minutes";
import Meeting from "@/models/Meeting";
import MeetingParticipant from "@/models/MeetingParticipant";
import AgendaItem from "@/models/AgendaItem";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";
import { transcribeAudio } from "@/lib/ai/transcription";
import { generateMoM } from "@/lib/ai/generateMinutes";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 min timeout for AI processing

// POST /api/meetings/[id]/generate-minutes
// Accepts multipart/form-data with "audio" file + optional "transcript" text fallback
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "minutes:generate")) {
    return NextResponse.json({ error: "Forbidden — only Board Secretaries and Admins can generate minutes." }, { status: 403 });
  }

  const { id: meetingId } = await params;
  await connectDB();

  // --- 1. Load meeting ---
  const meeting = await Meeting.findById(meetingId).populate("organizerId", "name email role");
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  if (meeting.status !== "Completed") {
    return NextResponse.json({ error: "Minutes can only be generated for completed meetings." }, { status: 400 });
  }

  // --- 2. Check for existing draft ---
  const existing = await Minutes.findOne({ meetingId });
  if (existing && existing.status !== "Draft") {
    return NextResponse.json({ error: "Minutes already exist and are past the draft stage." }, { status: 409 });
  }

  // --- 3. Parse multipart form ---
  let audioBuffer: Buffer | null = null;
  let transcriptText: string = "";
  let recordingUrl: string = "";

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const manualTranscript = formData.get("transcript") as string | null;
    recordingUrl = (formData.get("recordingUrl") as string) || "";

    if (audioFile && audioFile.size > 0) {
      const arrayBuffer = await audioFile.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }

    if (manualTranscript) {
      transcriptText = manualTranscript;
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
  }

  // --- 4. Transcribe audio if provided ---
  if (audioBuffer && !transcriptText) {
    try {
      transcriptText = await transcribeAudio(audioBuffer, "meeting_recording.webm");
    } catch (err: any) {
      return NextResponse.json(
        { error: `Transcription failed: ${err.message || "Unknown error"}` },
        { status: 500 }
      );
    }
  }

  if (!transcriptText || transcriptText.trim().length < 20) {
    return NextResponse.json({ error: "No transcript or audio provided. Please upload a recording or paste a transcript." }, { status: 400 });
  }

  // --- 5. Load participants & agenda ---
  const [participants, agendaItems] = await Promise.all([
    MeetingParticipant.find({ meetingId }).populate("userId", "name email role"),
    AgendaItem.find({ meetingId }).sort({ order: 1 }),
  ]);

  const organizer = meeting.organizerId as any;
  const meta = {
    title: meeting.title,
    date: meeting.date
      ? new Date(meeting.date).toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : new Date().toLocaleDateString(),
    location: meeting.location || meeting.onlineMeeting || "Virtual Meeting",
    organizerName: organizer?.name || "Organizer",
    participants: participants.map((p: any) => ({
      name: p.userId?.name || "Unknown",
      role: p.userId?.role || "member",
    })),
    agendaItems: agendaItems.map((a: any) => ({
      title: a.title,
      description: a.description,
    })),
  };

  // --- 6. Generate AI MoM ---
  let generated;
  try {
    generated = await generateMoM(transcriptText, meta);
  } catch (err: any) {
    let errorMsg = err.message || "Unknown error";
    if (err.status === 429 || errorMsg.includes("429") || errorMsg.includes("credits") || errorMsg.includes("quota")) {
      errorMsg = "OpenAI API Quota Exceeded: Your OpenAI account has 0 remaining credits. Please add billing credits at platform.openai.com or update OPENAI_API_KEY.";
    }
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }

  // --- 7. Map attendees with userIds ---
  const attendeesWithIds = generated.attendees.map((a) => {
    const match = participants.find(
      (p: any) => p.userId?.name?.toLowerCase() === a.name.toLowerCase()
    );
    return {
      ...a,
      userId: match?.userId?._id,
    };
  });

  // --- 8. Save or update the Minutes document ---
  const minutesData = {
    meetingId: new mongoose.Types.ObjectId(meetingId),
    content: generated.meetingSummary || "",
    status: "Draft" as const,
    draftedBy: new mongoose.Types.ObjectId(session.user.id),
    generatedByAI: true,
    transcript: transcriptText,
    recordingUrl,
    meetingSummary: generated.meetingSummary,
    callToOrder: generated.callToOrder,
    quorum: generated.quorum,
    attendees: attendeesWithIds,
    absentees: generated.absentees,
    agendaItems: generated.agendaItems,
    keyDecisions: generated.keyDecisions,
    resolutions: generated.resolutions,
    actionItems: generated.actionItems,
    nextMeeting: generated.nextMeeting,
    closingRemarks: generated.closingRemarks,
  };

  let minutes;
  if (existing) {
    minutes = await Minutes.findOneAndUpdate(
      { meetingId },
      minutesData,
      { new: true }
    );
  } else {
    minutes = await Minutes.create(minutesData);
  }

  return NextResponse.json({ success: true, minutesId: minutes?._id?.toString() }, { status: 200 });
}
