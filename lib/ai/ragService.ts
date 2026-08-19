import OpenAI from "openai";
import { getActiveAiConfig } from "@/lib/ai/keyService";

export interface DocumentChunk {
  fileName: string;
  text: string;
  chunkIndex: number;
}

export type RagMode = "qa" | "generate-questions" | "summary" | "key-points";

/**
 * Splits text into overlapping chunks to preserve context across boundaries.
 */
export function chunkText(text: string, chunkSize = 1200, overlap = 200): string[] {
  if (!text || text.length <= chunkSize) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Retrieves the top relevant chunks for a given user query using keyword and phrase scoring.
 */
export function retrieveTopChunks(
  query: string,
  chunks: DocumentChunk[],
  topK = 6
): DocumentChunk[] {
  if (chunks.length <= topK) return chunks;

  const normalizedQuery = query.toLowerCase();
  const queryTokens = normalizedQuery
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = chunks.map((chunk) => {
    let score = 0;
    const lowerText = chunk.text.toLowerCase();

    // Exact phrase match bonus
    if (normalizedQuery.length > 5 && lowerText.includes(normalizedQuery)) {
      score += 15;
    }

    // Keyword frequency match
    for (const token of queryTokens) {
      const occurrences = lowerText.split(token).length - 1;
      score += occurrences * 2;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If no high scores found, return first N chunks to provide general overview
  if (scored[0].score === 0) {
    return chunks.slice(0, topK);
  }

  return scored.slice(0, topK).map((s) => s.chunk);
}

/**
 * Executes RAG query using the admin-configured AI provider and model.
 */
export async function queryDocumentRAG(
  question: string,
  documentContents: Array<{ fileName: string; text: string }>,
  mode: RagMode = "qa"
): Promise<{
  answer: string;
  sources: string[];
  modelUsed?: string;
  providerUsed?: string;
}> {
  // 1. Validate that document text exists
  const validDocs = documentContents.filter((d) => d.text && d.text.trim().length > 0);
  if (validDocs.length === 0) {
    return {
      answer: "The selected documents could not be parsed or do not contain readable text.",
      sources: [],
    };
  }

  // 2. Chunk documents
  const allChunks: DocumentChunk[] = [];
  for (const doc of validDocs) {
    const chunks = chunkText(doc.text);
    chunks.forEach((chunk, index) => {
      allChunks.push({
        fileName: doc.fileName,
        text: chunk,
        chunkIndex: index,
      });
    });
  }

  // 3. Retrieve relevant context
  const relevantChunks = mode === "summary" || mode === "generate-questions"
    ? allChunks.slice(0, 8)
    : retrieveTopChunks(question, allChunks, 6);

  const contextText = relevantChunks
    .map((c) => `[Source: ${c.fileName} | Section ${c.chunkIndex + 1}]\n${c.text}`)
    .join("\n\n---\n\n");

  const sources = Array.from(new Set(relevantChunks.map((c) => c.fileName)));

  // 4. Resolve Active AI Key & Model (configured by admin in Admin Panel)
  const aiConfig = await getActiveAiConfig();

  if (!aiConfig.apiKey) {
    return {
      answer: "⚠️ No AI API key is configured. Please configure an active API key (OpenAI, Groq, Gemini, or Custom) in Admin Dashboard -> Settings -> API Keys.",
      sources,
    };
  }

  // 5. Build system prompt based on mode
  let systemPrompt = "";
  if (mode === "generate-questions") {
    systemPrompt = `You are a corporate board advisor and auditor.
Based STRICTLY on the provided document excerpts, generate 5 key analytical questions that board members and executives should ask about this document.
For each question, provide:
1. **The Question**
2. **Context / Why it matters**
3. **The Answer / Evidence found in the document** (cite the document name).
Format with clear markdown headings and bullet points.`;
  } else if (mode === "summary") {
    systemPrompt = `You are an expert executive board secretary.
Provide a clear, executive-level summary of the provided document excerpts.
Include:
- **Executive Summary** (1-2 paragraphs)
- **Key Objectives / Topics**
- **Critical Numbers / Data Points**
- **Risks & Next Steps**
Format with clean markdown headings and bullet points.`;
  } else if (mode === "key-points") {
    systemPrompt = `You are an executive assistant. Extract the most critical takeaways, metrics, financial figures, deadlines, and action items from the provided document excerpts. Format with clean bullet points.`;
  } else {
    systemPrompt = `You are BoardSync AI Document Assistant.
Your task is to answer the user's question accurately and helpfully based STRICTLY on the provided document excerpts.
Rules:
- Only answer based on the provided document context.
- If the answer cannot be found in the document excerpts, clearly state: "Based on the provided documents, this information is not mentioned."
- Cite the relevant document name(s) in your answer.
- Format responses clearly using markdown.`;
  }

  // 6. Resolve client and model with auto-matching based on key format
  let apiKey = aiConfig.apiKey;
  let baseURL = aiConfig.baseUrl;
  let modelName = aiConfig.model || "";
  let provider = aiConfig.provider;

  // Auto-detect provider from API Key prefix
  if (apiKey.startsWith("gsk_")) {
    provider = "grok";
    baseURL = "https://api.groq.com/openai/v1";
    if (!modelName || modelName.startsWith("gpt-") || modelName.startsWith("gemini-")) {
      modelName = "llama-3.3-70b-versatile";
    }
  } else if (apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-")) {
    // OpenAI Key
    provider = "openai";
    baseURL = undefined;
    if (!modelName || modelName.startsWith("llama-") || modelName.startsWith("mixtral-") || modelName.startsWith("gemini-")) {
      modelName = "gpt-4o-mini";
    }
  } else if (apiKey.startsWith("AIzaSy")) {
    // Google Gemini Key
    provider = "gemini";
    baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    if (!modelName || modelName.startsWith("gpt-") || modelName.startsWith("llama-")) {
      modelName = "gemini-1.5-flash";
    }
  } else {
    if (provider === "grok") {
      baseURL = "https://api.groq.com/openai/v1";
      if (!modelName) modelName = "llama-3.3-70b-versatile";
    } else if (provider === "openai") {
      if (!modelName) modelName = "gpt-4o-mini";
    }
  }

  const promptContent = `DOCUMENT EXCERPTS:\n${contextText}\n\nUSER REQUEST:\n${question}`;

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined,
    });

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptContent },
      ],
      temperature: mode === "generate-questions" ? 0.4 : 0.2,
      max_tokens: 2000,
    });

    const answer = completion.choices[0]?.message?.content || "No response received from AI.";

    return {
      answer,
      sources,
      modelUsed: modelName,
      providerUsed: provider,
    };
  } catch (err: any) {
    console.error("[RAG Engine Primary Attempt Failed]:", err?.message || err);

    // If model failed with 404 on Groq, try standard llama-3.1-8b-instant or gpt-4o-mini fallback
    if (provider === "grok" && (err?.status === 404 || err?.message?.includes("404") || err?.message?.includes("model"))) {
      try {
        console.log("[RAG Engine] Retrying with Groq fallback model 'llama-3.1-8b-instant'...");
        const fallbackClient = new OpenAI({
          apiKey,
          baseURL: "https://api.groq.com/openai/v1",
        });
        const fallbackRes = await fallbackClient.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: promptContent },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        });

        return {
          answer: fallbackRes.choices[0]?.message?.content || "No response received from AI.",
          sources,
          modelUsed: "llama-3.1-8b-instant",
          providerUsed: "grok",
        };
      } catch (fallbackErr: any) {
        console.error("[RAG Engine Fallback also failed]:", fallbackErr);
      }
    }

    throw new Error(err?.message || "Failed to generate AI response from document.");
  }
}
