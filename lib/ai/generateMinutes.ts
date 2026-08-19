/**
 * Server-side only: generates structured Minutes of Meeting (MoM) using OpenAI / Groq.
 * NEVER import this file in client-side code.
 */

import OpenAI from "openai";
import { getResolvedApiKey } from "@/lib/ai/keyService";

export interface MeetingMeta {
  title: string;
  date: string;
  location?: string;
  organizerName: string;
  participants: Array<{ name: string; role: string }>;
  agendaItems: Array<{ title: string; description?: string }>;
}

export interface GeneratedMoM {
  summary?: string;
  meetingSummary?: string;
  callToOrder?: string;
  quorum?: string;
  attendees?: Array<{ name: string; status?: string; role?: string }>;
  absentees?: Array<{ name: string; reason?: string }>;
  agendaItems?: Array<{ title: string; discussion?: string; outcome?: string }>;
  keyDiscussionPoints?: Array<{
    topic: string;
    discussion: string;
    outcome?: string;
  }>;
  decisions?: Array<{
    decision: string;
    votingResult?: string;
    rationale?: string;
  }>;
  keyDecisions?: Array<any>;
  resolutions?: Array<any>;
  actionItems?: Array<{
    title: string;
    assigneeName?: string;
    dueDate?: string;
    priority?: "High" | "Medium" | "Low";
  }>;
  nextMeeting?: string;
  nextMeetingDate?: string;
  closingRemarks?: string;
}

const SYSTEM_PROMPT = `You are an expert executive board secretary specializing in writing formal Minutes of Meeting (MoM) for corporate boards and high-stakes executive teams.

You will be given:
1. Meeting Metadata (title, date, organizer, participants, agenda items)
2. Raw transcript or text summary of what occurred in the meeting.

Your job is to generate a comprehensive, professional, structured Minutes of Meeting document.

Respond ONLY with a valid JSON object adhering strictly to the following structure:
{
  "summary": "Executive summary paragraph...",
  "meetingSummary": "Executive summary paragraph...",
  "callToOrder": "Meeting called to order...",
  "quorum": "Quorum present...",
  "attendees": [{ "name": "..." }],
  "absentees": [{ "name": "..." }],
  "agendaItems": [{ "title": "...", "discussion": "..." }],
  "keyDiscussionPoints": [{ "topic": "...", "discussion": "...", "outcome": "..." }],
  "decisions": [{ "decision": "...", "votingResult": "...", "rationale": "..." }],
  "keyDecisions": [{ "decision": "..." }],
  "resolutions": [{ "title": "..." }],
  "actionItems": [{ "title": "...", "assigneeName": "...", "dueDate": "YYYY-MM-DD", "priority": "High" }],
  "nextMeeting": "YYYY-MM-DD",
  "closingRemarks": "Meeting adjourned..."
}

Do NOT wrap response in markdown backticks or extra text outside JSON.`;

/**
 * Main function: accepts meeting metadata and raw text/transcript,
 * returns structured JSON MoM.
 */
export async function generateMoMFromTranscript(
  arg1: any,
  arg2?: any
): Promise<GeneratedMoM> {
  let meta: Partial<MeetingMeta> = {};
  let transcript = "";

  if (typeof arg1 === "string") {
    transcript = arg1;
    if (typeof arg2 === "object" && arg2 !== null) meta = arg2;
  } else if (typeof arg1 === "object" && arg1 !== null) {
    meta = arg1;
    if (typeof arg2 === "string") transcript = arg2;
  }

  const userPrompt = `MEETING METADATA:
Title: ${meta.title || "Board Meeting"}
Date: ${meta.date || new Date().toISOString()}
Organizer: ${meta.organizerName || "Admin"}
Participants: ${meta.participants ? meta.participants.map((p) => `${p.name} (${p.role})`).join(", ") : ""}
Agenda Items: ${meta.agendaItems ? meta.agendaItems.map((a) => a.title).join("; ") : ""}

MEETING TRANSCRIPT:
${(transcript || "").trim().slice(0, 12000)}

Generate the structured Minutes of Meeting in valid JSON only.`;

  let raw = "";

  // Resolve API keys dynamically from DB (with .env fallback)
  const openaiResolved = await getResolvedApiKey("openai");
  const grokResolved = await getResolvedApiKey("grok");

  // 1. Primary Attempt: OpenAI
  if (openaiResolved.apiKey) {
    try {
      const client = new OpenAI({
        apiKey: openaiResolved.apiKey,
        baseURL: openaiResolved.baseUrl || undefined,
      });
      const response = await client.chat.completions.create({
        model: openaiResolved.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 3000,
      });
      raw = response.choices[0]?.message?.content ?? "";
    } catch (openaiErr: any) {
      console.warn("[AI MoM Fallback] OpenAI failed. Falling back to Groq API...", openaiErr?.message || openaiErr);
    }
  }

  // 2. Fallback Attempt: Groq / Grok
  if (!raw && grokResolved.apiKey) {
    try {
      const groqClient = new OpenAI({
        apiKey: grokResolved.apiKey,
        baseURL: grokResolved.baseUrl || "https://api.groq.com/openai/v1",
      });
      const response = await groqClient.chat.completions.create({
        model: grokResolved.model || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 3000,
      });
      raw = response.choices[0]?.message?.content ?? "{}";
    } catch (groqErr: any) {
      console.error("[AI MoM Fallback] Groq API also failed:", groqErr?.message || groqErr);
      throw new Error(`AI MoM generation failed on both OpenAI and Groq fallback: ${groqErr?.message || "Unknown error"}`);
    }
  }

  if (!raw) {
    throw new Error("No AI API keys configured. Please add an API Key under Admin Dashboard -> Settings -> API Keys.");
  }

  let parsed: GeneratedMoM;
  try {
    parsed = JSON.parse(raw) as GeneratedMoM;
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]) as GeneratedMoM;
    } else {
      throw new Error("Failed to parse AI output into valid Minutes structure.");
    }
  }

  // Ensure default arrays if undefined
  if (!parsed.attendees) parsed.attendees = [];
  if (!parsed.absentees) parsed.absentees = [];
  if (!parsed.agendaItems) parsed.agendaItems = [];
  if (!parsed.actionItems) parsed.actionItems = [];
  if (!parsed.keyDecisions) parsed.keyDecisions = parsed.decisions || [];
  if (!parsed.resolutions) parsed.resolutions = [];

  return parsed;
}

export const generateMoM = generateMoMFromTranscript;
