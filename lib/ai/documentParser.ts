import pdfParse from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extracts raw text from a document URL (Cloudinary, base64 data URI, or standard HTTP/HTTPS).
 */
export async function extractTextFromDocumentUrl(
  url: string,
  fileType: string = "application/pdf"
): Promise<string> {
  if (!url) return "";

  try {
    let buffer: Buffer;

    // 1. Handle base64 Data URI
    if (url.startsWith("data:")) {
      const base64Data = url.split(",")[1];
      if (!base64Data) return "";
      buffer = Buffer.from(base64Data, "base64");
    } else {
      // 2. Handle HTTP/HTTPS URL (e.g. Cloudinary, S3)
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch document from URL (status ${res.status})`);
      }
      buffer = Buffer.from(await res.arrayBuffer());
    }

    const typeLower = (fileType || "").toLowerCase();
    const urlLower = url.toLowerCase();

    // 3. Parse PDF
    if (typeLower.includes("pdf") || urlLower.includes(".pdf")) {
      const pdfData = await pdfParse(buffer);
      return cleanExtractedText(pdfData.text || "");
    }

    // 4. Parse Word (.docx)
    if (
      typeLower.includes("word") ||
      typeLower.includes("officedocument") ||
      urlLower.includes(".docx") ||
      urlLower.includes(".doc")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return cleanExtractedText(result.value || "");
    }

    // 5. Plain Text, CSV, JSON, Markdown
    const rawText = buffer.toString("utf-8");
    return cleanExtractedText(rawText);
  } catch (err: any) {
    console.error("[DocumentParser] Failed to extract text from document:", err);
    return "";
  }
}

/**
 * Normalizes extracted text: removes excess whitespace, non-printable characters, etc.
 */
function cleanExtractedText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
