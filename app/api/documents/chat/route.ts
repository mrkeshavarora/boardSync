import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MeetingDocument from "@/models/Document";
import { auth } from "@/lib/auth";
import { extractTextFromDocumentUrl } from "@/lib/ai/documentParser";
import { queryDocumentRAG, RagMode } from "@/lib/ai/ragService";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { question, documentNames, meetingId, mode = "qa" } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    await connectDB();

    // Query documents
    const query: any = {};
    if (meetingId) {
      query.meetingId = meetingId;
    }

    if (Array.isArray(documentNames) && documentNames.length > 0) {
      query.fileName = { $in: documentNames };
    } else if (typeof documentNames === "string" && documentNames.trim().length > 0) {
      query.fileName = documentNames.trim();
    }

    const rawDocuments = await MeetingDocument.find(query).lean();

    if (!rawDocuments || rawDocuments.length === 0) {
      return NextResponse.json(
        {
          error: "No matching documents found to analyze. Please select or upload a document first.",
        },
        { status: 404 }
      );
    }

    // De-duplicate documents by fileName to avoid processing the same file multiple times
    const uniqueDocsMap = new Map<string, any>();
    for (const doc of rawDocuments) {
      if (doc.fileName && !uniqueDocsMap.has(doc.fileName)) {
        uniqueDocsMap.set(doc.fileName, doc);
      }
    }

    // Take up to 8 documents to ensure fast response without Vercel serverless timeout
    const documents = Array.from(uniqueDocsMap.values()).slice(0, 8);

    // Extract text from matched documents concurrently with error isolation
    const documentContents = await Promise.all(
      documents.map(async (doc) => {
        try {
          const text = await extractTextFromDocumentUrl(doc.storageUrl, doc.fileType);
          return {
            fileName: doc.fileName,
            text,
          };
        } catch {
          return { fileName: doc.fileName, text: "" };
        }
      })
    );

    const validContents = documentContents.filter((d) => d.text && d.text.trim().length > 0);

    if (validContents.length === 0) {
      return NextResponse.json(
        {
          error: "Unable to extract readable text from the selected document(s). The document might be image-only or empty.",
        },
        { status: 422 }
      );
    }

    // Query RAG
    const result = await queryDocumentRAG(
      question,
      validContents,
      (mode as RagMode) || "qa"
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API /api/documents/chat Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process document query." },
      { status: 500 }
    );
  }
}
