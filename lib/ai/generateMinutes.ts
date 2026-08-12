/**
 * Server-side only: generates structured Minutes of Meeting (MoM) using OpenAI GPT-4.
 * NEVER import this file in client-side code.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set.");
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export interface MeetingMeta {
  title: string;
  date: string;
  location?: string;
  organizerName: string;
  participants: Array<{ name: string; role: string }>;
  agendaItems: Array<{ title: string; description?: string }>;
}

export interface GeneratedMoM {
  meetingSummary: string;
  callToOrder: string;
  quorum: string;
  attendees: Array<{
    name: string;
    role: string;
    attendanceStatus: "Present" | "Absent" | "Excused";
  }>;
  absentees: string[];
  agendaItems: Array<{
    title: string;
    discussionSummary: string;
    decision: string;
  }>;
  keyDecisions: string[];
  resolutions: Array<{
    title: string;
    description: string;
    status: string;
  }>;
  actionItems: Array<{
    task: string;
    assignedTo: string;
    dueDate: string;
    priority: "Low" | "Medium" | "High";
    status: "Open" | "Completed";
  }>;
  nextMeeting: string;
  closingRemarks: string;
}

const SYSTEM_PROMPT = `You are a professional corporate secretary assistant. Your task is to generate structured, formal Minutes of Meeting (MoM) based on a meeting transcript and meeting metadata.

CRITICAL RULES:
1. Only extract and summarize what was ACTUALLY discussed in the transcript. Do NOT invent, hallucinate, or add any facts, names, decisions, or resolutions that are not in the transcript.
2. For attendees, use ONLY the participant list provided in the metadata — do not infer additional attendees from the transcript.
3. If a section cannot be filled from the transcript, use an empty string or empty array — never make up content.
4. Keep language formal, professional, and concise.
5. Always respond with ONLY valid JSON matching the exact schema below.

SCHEMA:
{
  "meetingSummary": "string — 2-4 sentence overview of the meeting",
  "callToOrder": "string — who called the meeting to order and when",
  "quorum": "string — quorum statement",
  "attendees": [{"name": "string", "role": "string", "attendanceStatus": "Present|Absent|Excused"}],
  "absentees": ["string"],
  "agendaItems": [{"title": "string", "discussionSummary": "string", "decision": "string"}],
  "keyDecisions": ["string"],
  "resolutions": [{"title": "string", "description": "string", "status": "string"}],
  "actionItems": [{"task": "string", "assignedTo": "string", "dueDate": "string", "priority": "Low|Medium|High", "status": "Open|Completed"}],
  "nextMeeting": "string",
  "closingRemarks": "string"
}`;

/**
 * Generates a structured MoM from a transcript + meeting metadata.
 * @param transcript - Full Whisper transcription text
 * @param meta - Meeting metadata (title, date, participants, agenda)
 * @returns Validated GeneratedMoM structure
 */
export async function generateMoM(
  transcript: string,
  meta: MeetingMeta
): Promise<GeneratedMoM> {
  const client = getClient();

  const userPrompt = `
MEETING METADATA:
Title: ${meta.title}
Date: ${meta.date}
Location: ${meta.location || "Not specified"}
Organized by: ${meta.organizerName}
Registered Participants:
${meta.participants.map((p) => `- ${p.name} (${p.role})`).join("\n")}

AGENDA ITEMS:
${meta.agendaItems.map((a, i) => `${i + 1}. ${a.title}${a.description ? ": " + a.description : ""}`).join("\n")}

MEETING TRANSCRIPT:
${transcript.trim().slice(0, 12000)}

Generate the structured Minutes of Meeting in valid JSON only.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let parsed: GeneratedMoM;
  try {
    parsed = JSON.parse(raw) as GeneratedMoM;
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Minimal validation
  if (typeof parsed.meetingSummary !== "string") {
    throw new Error("AI response failed validation: missing meetingSummary.");
  }
  if (!Array.isArray(parsed.attendees)) parsed.attendees = [];
  if (!Array.isArray(parsed.agendaItems)) parsed.agendaItems = [];
  if (!Array.isArray(parsed.keyDecisions)) parsed.keyDecisions = [];
  if (!Array.isArray(parsed.resolutions)) parsed.resolutions = [];
  if (!Array.isArray(parsed.actionItems)) parsed.actionItems = [];
  if (!Array.isArray(parsed.absentees)) parsed.absentees = [];
  if (!parsed.nextMeeting) parsed.nextMeeting = "";
  if (!parsed.closingRemarks) parsed.closingRemarks = "";
  if (!parsed.callToOrder) parsed.callToOrder = "";
  if (!parsed.quorum) parsed.quorum = "";

  return parsed;
}
