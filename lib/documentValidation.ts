export const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "md"
];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/x-markdown",
  // Let generic binary types pass if the extension is valid (e.g. from some OS/browser variations)
  "application/octet-stream"
];

/**
 * Validates if the file is an allowed document type (Excel, Word, PDF, Text, PPT, Markdown).
 * Rejects images, videos, audio, etc.
 */
export function isAllowedDocument(fileName: string, mimeType?: string): boolean {
  if (!fileName) return false;

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }

  if (mimeType) {
    const mimeLower = mimeType.toLowerCase();
    if (
      mimeLower.startsWith("image/") ||
      mimeLower.startsWith("video/") ||
      mimeLower.startsWith("audio/")
    ) {
      return false;
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeLower)) {
      return false;
    }
  }

  return true;
}
