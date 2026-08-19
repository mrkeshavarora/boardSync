/**
 * Server-side only: transcribes audio using OpenAI Whisper API.
 * NEVER import this file in client-side code.
 */

import OpenAI from "openai";
import { Readable } from "stream";

let _openaiClient: OpenAI | null = null;
let _groqClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set.");
    }
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

function getGroqClient(): OpenAI {
  if (!_groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is not set.");
    }
    _groqClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groqClient;
}

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

  // 1. Primary Attempt: OpenAI Whisper-1
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = getOpenAIClient();
      const transcription = await client.audio.transcriptions.create({
        model: "whisper-1",
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
  try {
    const groqClient = getGroqClient();
    const groqFile = new File([new Uint8Array(audioBuffer)], filename, { type: mimeType });
    const transcription = await groqClient.audio.transcriptions.create({
      model: "whisper-large-v3",
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
