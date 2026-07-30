/**
 * Document parsing.
 *
 * Extracts plain text from PDF, Word (DOCX), Excel (XLSX), CSV and TXT/Markdown
 * uploads. The heavy parsers (`unpdf`, `mammoth`, `exceljs`) are imported
 * dynamically so a missing optional dependency yields a clear error instead of
 * breaking the whole route bundle.
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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "txt",
  "text/plain": "txt",
  "text/markdown": "txt",
};

const EXTENSIONS: Record<string, string> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".xlsx": "xlsx",
  ".xls": "xls",
  ".csv": "txt",
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

async function parseXlsx(bytes: Uint8Array): Promise<ParseResult> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);

  const lines: string[] = [];
  wb.eachSheet((sheet) => {
    if (wb.worksheets.length > 1) lines.push(`## ${sheet.name}`);
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        if (v == null) return;
        if (typeof v === "object" && "text" in v) cells.push(String(v.text));
        else if (typeof v === "object" && "result" in v)
          cells.push(String((v as { result: unknown }).result));
        else cells.push(String(v));
      });
      const line = cells.join(" | ").trim();
      if (line) lines.push(line);
    });
  });

  const text = lines.join("\n").trim();
  return { text, pageCount: wb.worksheets.length, charCount: text.length };
}

export async function parseDocument(
  filename: string,
  contentType: string,
  bytes: Uint8Array
): Promise<ParseResult> {
  const kind = detectKind(filename, contentType);
  if (kind === "pdf") return parsePdf(bytes);
  if (kind === "docx") return parseDocx(bytes);
  if (kind === "xlsx") return parseXlsx(bytes);
  if (kind === "xls") {
    // exceljs reads the modern .xlsx format only.
    throw new UnsupportedFileError(
      "Legacy .xls files aren't supported — please re-save as .xlsx."
    );
  }
  return parseTxt(bytes);
}
