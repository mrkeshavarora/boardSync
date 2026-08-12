/**
 * Server-side only: transcribes audio using OpenAI Whisper API.
 * NEVER import this file in client-side code.
 */

import OpenAI from "openai";
import { Readable } from "stream";

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

/**
 * Transcribes an audio buffer using OpenAI Whisper.
 * @param audioBuffer - Raw audio bytes (webm, mp4, mp3, wav, etc.)
 * @param filename - Original filename including extension (e.g. "recording.webm")
 * @returns Full transcription text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = "recording.webm"
): Promise<string> {
  const client = getClient();

  // OpenAI SDK expects a File-like object or stream. We create one from the buffer.
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: "audio/webm" });

  const transcription = await client.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
    response_format: "text",
  });

  return transcription as unknown as string;
}
