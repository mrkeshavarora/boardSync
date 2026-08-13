import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transcribeAudio } from "@/lib/ai/transcription";

export const maxDuration = 60; // 1 minute timeout

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const filename = audioFile.name || "chunk.webm";
    const mimeType = audioFile.type || "audio/webm";

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Call existing Whisper transcription with dynamic filename and mimeType
    const text = await transcribeAudio(audioBuffer, filename, mimeType);

    return NextResponse.json({ text: text || "" });
  } catch (err: any) {
    console.error("Whisper chunk transcription failed:", err);
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 });
  }
}
