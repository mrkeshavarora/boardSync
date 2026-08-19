/**
 * Server-side only: transcribes audio using OpenAI Whisper API or Groq Whisper.
 * NEVER import this file in client-side code.
 */

import OpenAI from "openai";
import { getResolvedApiKey } from "@/lib/ai/keyService";

/**
 * Transcribes an audio buffer using OpenAI Whisper, falling back to Groq Whisper API.
 * @param audioBuffer - Raw audio bytes (webm, mp4, mp3, wav, etc.)
 * @param filename - Original filename including extension (e.g. "recording.webm")
 * @returns Full transcription text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = "recording.webm",
  mimeType: string = "audio/webm"
): Promise<string> {
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: mimeType });

  const openaiResolved = await getResolvedApiKey("openai");
  const grokResolved = await getResolvedApiKey("grok");

  // 1. Primary Attempt: OpenAI Whisper-1
  if (openaiResolved.apiKey) {
    try {
      const client = new OpenAI({
        apiKey: openaiResolved.apiKey,
        baseURL: openaiResolved.baseUrl || undefined,
      });
      const transcription = await client.audio.transcriptions.create({
        model: openaiResolved.model || "whisper-1",
        file,
        language: "en",
        response_format: "text",
      });
      return transcription as unknown as string;
    } catch (openaiErr: any) {
      console.warn("[Transcription Fallback] OpenAI Whisper failed. Falling back to Groq Whisper...", openaiErr?.message || openaiErr);
    }
  }

  // 2. Fallback Attempt: Groq Whisper Large v3
  if (grokResolved.apiKey) {
    try {
      const groqClient = new OpenAI({
        apiKey: grokResolved.apiKey,
        baseURL: grokResolved.baseUrl || "https://api.groq.com/openai/v1",
      });
      const groqFile = new File([new Uint8Array(audioBuffer)], filename, { type: mimeType });
      const transcription = await groqClient.audio.transcriptions.create({
        model: grokResolved.model || "whisper-large-v3",
        file: groqFile,
        language: "en",
        response_format: "text",
      });
      return transcription as unknown as string;
    } catch (groqErr: any) {
      console.error("[Transcription Fallback] Groq Whisper failed:", groqErr?.message || groqErr);
      throw new Error(`Audio transcription failed on both OpenAI and Groq fallback: ${groqErr?.message || "Unknown error"}`);
    }
  }

  throw new Error("No AI API keys configured for transcription. Please configure an API Key under Admin Dashboard -> Settings -> API Keys.");
}
