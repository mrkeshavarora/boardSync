import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Meeting from "@/models/Meeting";
import Minutes from "@/models/Minutes";
import MeetingParticipant from "@/models/MeetingParticipant";
import AgendaItem from "@/models/AgendaItem";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import mongoose from "mongoose";
import OpenAI from "openai";

export const maxDuration = 120; // 2 minutes timeout for AI

let _openaiClient: OpenAI | null = null;
let _groqClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

function getGroqClient(): OpenAI {
  if (!_groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not set.");
    }
    _groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groqClient;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: meetingId } = await params;
  await connectDB();

  // Load meeting
  const meeting = await Meeting.findById(meetingId).populate("organizerId", "name email");
  if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

  // Format the full transcript text
  if (!meeting.transcript || meeting.transcript.length === 0) {
    return NextResponse.json({ error: "No live transcript segments saved for this meeting." }, { status: 400 });
  }

  const formattedTranscript = meeting.transcript
    .map((seg) => `[${seg.timestamp}] ${seg.speakerName}: ${seg.text}`)
    .join("\n");

  // Load meeting metadata
  const [participants, agendaItems] = await Promise.all([
    MeetingParticipant.find({ meetingId }).populate("userId", "name email role"),
    AgendaItem.find({ meetingId }).sort({ order: 1 }),
  ]);

  const organizer = meeting.organizerId as any;
  const meta = {
    title: meeting.title,
    date: meeting.date ? new Date(meeting.date).toLocaleDateString("en-US") : "",
    organizerName: organizer?.name || "Organizer",
    participants: participants.map((p: any) => ({
      name: p.userId?.name || "Unknown",
      role: p.userId?.role || "member",
    })),
    agendaItems: agendaItems.map((a: any) => ({
      title: a.title,
      description: a.description || "",
    })),
  };

  try {
    const SYSTEM_PROMPT = `You are a professional corporate secretary assistant. Your task is to generate a structured, formal AI Meeting Analysis based on a meeting transcript and metadata.
Only extract facts from the transcript. Do NOT hallucinate or invent decisions, actions, or tasks.
Always respond with ONLY valid JSON matching this schema:
{
  "summary": "2-4 sentence overview of the meeting",
  "keyDiscussionPoints": ["point 1", "point 2"],
  "decisions": ["decision 1", "decision 2"],
  "actionItems": [
    {
      "task": "description of the action task",
      "owner": "name of assignee",
      "deadline": "date or relative timeframe"
    }
  ],
  "risks": ["risk 1", "risk 2"],
  "followUps": ["follow up task 1", "follow up task 2"]
}`;

    const userPrompt = `
MEETING METADATA:
Title: ${meta.title}
Organized by: ${meta.organizerName}
Participants: ${meta.participants.map((p) => p.name).join(", ")}
Agenda: ${meta.agendaItems.map((a) => a.title).join(", ")}

MEETING TRANSCRIPT:
${formattedTranscript}

Generate the structured JSON analysis:`;

    let rawContent = "";

    // 1. Primary Attempt: OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = getOpenAIClient();
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
        rawContent = response.choices[0]?.message?.content ?? "";
      } catch (openaiErr: any) {
        console.warn("[AI Minutes Fallback] OpenAI failed. Falling back to Groq API...", openaiErr?.message || openaiErr);
      }
    }

    // 2. Fallback Attempt: Groq Llama-3.3-70b-versatile
    if (!rawContent) {
      try {
        const groqClient = getGroqClient();
        const response = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
        rawContent = response.choices[0]?.message?.content ?? "{}";
      } catch (groqErr: any) {
        console.error("[AI Minutes Fallback] Groq failed:", groqErr?.message || groqErr);
        throw new Error(`AI minutes generation failed on both OpenAI and Groq fallback: ${groqErr?.message || "Unknown error"}`);
      }
    }

    const generated = JSON.parse(rawContent);

    // Update the Meeting document
    meeting.summary = generated.summary || "";
    meeting.keyDiscussionPoints = generated.keyDiscussionPoints || [];
    meeting.decisions = generated.decisions || [];
    meeting.actionItems = (generated.actionItems || []).map((item: any) => ({
      task: item.task || "",
      owner: item.owner || "",
      deadline: item.deadline || "",
    }));
    meeting.risks = generated.risks || [];
    meeting.followUps = generated.followUps || [];

    await meeting.save();

    // Map to Minutes document for frontend UI compatibility
    const attendees = participants.map((p: any) => ({
      userId: p.userId?._id,
      name: p.userId?.name || "Participant",
      role: p.role || p.userId?.role || "member",
      attendanceStatus: "Present" as const,
    }));

    const minutesData = {
      meetingId: meeting._id,
      content: generated.summary || "",
      status: "Draft" as const,
      draftedBy: new mongoose.Types.ObjectId(session.user.id),
      generatedByAI: true,
      transcript: formattedTranscript, // Preserves full live captions transcript
      meetingSummary: generated.summary,
      callToOrder: `Meeting called to order by ${meta.organizerName}`,
      quorum: "Quorum verified",
      attendees,
      absentees: [],
      agendaItems: meta.agendaItems.map((a) => ({
        title: a.title,
        discussionSummary: (generated.keyDiscussionPoints || []).join(". "),
        decision: (generated.decisions || []).join(". "),
      })),
      keyDecisions: generated.decisions || [],
      resolutions: (generated.decisions || []).map((d: string) => ({
        title: d.slice(0, 50),
        description: d,
        status: "Passed",
      })),
      actionItems: (generated.actionItems || []).map((item: any) => ({
        task: item.task || "",
        assignedTo: item.owner || "",
        dueDate: item.deadline || "",
        priority: "Medium" as const,
        status: "Open" as const,
      })),
      nextMeeting: (generated.followUps || []).join(", ") || "",
      closingRemarks: "Meeting adjourned.",
    };

    await Minutes.findOneAndUpdate(
      { meetingId: meeting._id },
      minutesData,
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, meeting: { _id: meeting._id.toString() } }, { status: 200 });

  } catch (err: any) {
    console.error("AI minutes generation failed:", err);
    let errorMsg = err.message || "Failed to generate AI minutes";
    if (errorMsg.includes("both OpenAI and Groq")) {
      errorMsg = "AI Provider Failure: Both primary OpenAI and fallback Groq APIs failed to respond. Please check your API keys and network connection.";
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
