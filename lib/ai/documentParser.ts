import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

/**
 * Extracts raw text from a document URL (Cloudinary, base64 data URI, or standard HTTP/HTTPS).
 */
export async function extractTextFromDocumentUrl(
  url: string,
  fileType: string = "application/pdf"
): Promise<string> {
  if (!url) return "";

    const typeLower = (fileType || "").toLowerCase();
    const urlLower = url.toLowerCase();

    // Skip image files (cannot be text parsed directly without OCR)
    if (
      typeLower.startsWith("image/") ||
      urlLower.endsWith(".png") ||
      urlLower.endsWith(".jpg") ||
      urlLower.endsWith(".jpeg") ||
      urlLower.endsWith(".webp") ||
      urlLower.endsWith(".gif")
    ) {
      return "";
    }

    let buffer: Buffer;

    // 1. Handle base64 Data URI
    if (url.startsWith("data:")) {
      const base64Data = url.split(",")[1];
      if (!base64Data) return "";
      buffer = Buffer.from(base64Data, "base64");
    } else {
      // 2. Handle HTTP/HTTPS URL (e.g. Cloudinary, S3) with 4s timeout
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) {
        throw new Error(`Failed to fetch document from URL (status ${res.status})`);
      }
      buffer = Buffer.from(await res.arrayBuffer());
    }

    // 3. Parse PDF
    if (typeLower.includes("pdf") || urlLower.includes(".pdf")) {
      return await parsePdfBuffer(buffer);
    }

    // 4. Parse Word (.docx / .doc)
    if (
      typeLower.includes("word") ||
      typeLower.includes("officedocument.wordprocessing") ||
      urlLower.includes(".docx") ||
      urlLower.includes(".doc")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return cleanExtractedText(result.value || "");
    }

    // 5. Parse Excel (.xlsx / .xls / spreadsheet)
    if (
      typeLower.includes("sheet") ||
      typeLower.includes("excel") ||
      urlLower.includes(".xlsx") ||
      urlLower.includes(".xls") ||
      urlLower.includes(".csv")
    ) {
      const raw = buffer.toString("utf-8");
      // Extract string tags <t>...</t> and values <v>...</v> from OpenXML/XLSX
      const xmlMatches = raw.match(/<t[^>]*>([^<]+)<\/t>/g) || [];
      if (xmlMatches.length > 0) {
        const text = xmlMatches.map((m) => m.replace(/<[^>]+>/g, " ")).join(" ");
        return cleanExtractedText(text);
      }
      return cleanExtractedText(raw);
    }

    // 6. Plain Text, CSV, JSON, Markdown
    const rawText = buffer.toString("utf-8");
    return cleanExtractedText(rawText);
  } catch (err: any) {
    console.error("[DocumentParser] Failed to extract text from document:", err);
    return "";
  }
}

/**
 * Parses PDF buffer using PDFParse with fallback
 */
async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const text = textResult?.text || "";
    await parser.destroy();
    return cleanExtractedText(text);
  } catch (pdfErr) {
    console.warn("[DocumentParser] PDFParse failed, trying raw stream extraction:", pdfErr);
    // Fallback: extract ASCII string streams from PDF buffer
    try {
      const raw = buffer.toString("binary");
      const textMatches = raw.match(/\(([^()]+)\)T[jJ]/g) || [];
      if (textMatches.length > 0) {
        const text = textMatches
          .map((m) => m.replace(/^\(/, "").replace(/\)T[jJ]$/, ""))
          .join(" ");
        return cleanExtractedText(text);
      }
    } catch { }
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
