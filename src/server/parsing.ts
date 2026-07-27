/**
 * Document parsing (Sprint 3) — ported from `services/parsing.py`.
 *
 * Extracts plain text from PDF, DOCX, and TXT/Markdown uploads. The heavy
 * parsers (`unpdf`, `mammoth`) are imported dynamically so a missing optional
 * dependency yields a clear error instead of breaking the whole route bundle.
 */

export interface ParseResult {
  text: string;
  pageCount: number | null;
  charCount: number;
}

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

const CONTENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "txt",
};

const EXTENSIONS: Record<string, string> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
  ".md": "txt",
};

export function detectKind(filename: string, contentType: string): string {
  if (CONTENT_TYPES[contentType]) return CONTENT_TYPES[contentType];
  const lower = filename.toLowerCase();
  for (const [ext, kind] of Object.entries(EXTENSIONS)) {
    if (lower.endsWith(ext)) return kind;
  }
  throw new UnsupportedFileError(
    `Unsupported file type: ${filename} (${contentType || "unknown"})`
  );
}

async function parsePdf(bytes: Uint8Array): Promise<ParseResult> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join("\n\n") : text;
  return {
    text: merged.trim(),
    pageCount: totalPages ?? null,
    charCount: merged.trim().length,
  };
}

async function parseDocx(bytes: Uint8Array): Promise<ParseResult> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });
  const text = value.trim();
  return { text, pageCount: null, charCount: text.length };
}

function parseTxt(bytes: Uint8Array): ParseResult {
  const text = new TextDecoder("utf-8").decode(bytes).trim();
  return { text, pageCount: null, charCount: text.length };
}

export async function parseDocument(
  filename: string,
  contentType: string,
  bytes: Uint8Array
): Promise<ParseResult> {
  const kind = detectKind(filename, contentType);
  if (kind === "pdf") return parsePdf(bytes);
  if (kind === "docx") return parseDocx(bytes);
  return parseTxt(bytes);
}
