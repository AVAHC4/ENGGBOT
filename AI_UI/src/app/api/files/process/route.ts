import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_PER_FILE_CHARS = 45000;
const MAX_COMBINED_CHARS = 90000;
const CHUNK_SIZE = 1600;
const CHUNK_OVERLAP = 220;
const MAX_RETURNED_CHUNKS = 40;

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.webp', '.heic', '.heif'];
const STOP_WORDS = new Set([
  'the','and','with','that','this','from','have','would','there','their','about','will','could','should',
  'into','over','where','when','what','which','while','were','been','than','also','because','after','before',
  'such','through','these','those','your','into','onto','here','only','other','very','upon','between','within',
  'per','each','most','many','more','less','much','same','some','like','just','even','ever','every','both'
]);

type FileCategory =
  | 'pdf'
  | 'docx'
  | 'markdown'
  | 'text'
  | 'html'
  | 'json'
  | 'spreadsheet'
  | 'image'
  | 'unknown';

interface TextChunk {
  id: string;
  text: string;
  start: number;
  end: number;
}

interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  category: FileCategory;
  text: string;
  truncated: boolean;
  preview: string;
  warnings: string[];
  chunks: TextChunk[];
  keywords: string[];
  stats: {
    chars: number;
    words: number;
    tokensEstimate: number;
    chunkCount: number;
  };
}

let ocrWorkerPromise: Promise<any> | null = null;

function truncateText(input: string, limit: number) {
  if (!input) return '';
  if (input.length <= limit) return input;
  const headKeep = Math.floor(limit * 0.7);
  return input.slice(0, headKeep) + '\n\n...\n\n' + input.slice(-Math.floor(limit * 0.3));
}

let pdfParserPromise: Promise<any> | null = null;

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    if (!pdfParserPromise) {
      pdfParserPromise = (async () => {
        const mod = await import('pdf-parse/lib/pdf-parse.js');
        return (mod as any).default || mod;
      })().catch((error) => {
        pdfParserPromise = null;
        throw error;
      });
    }

    const parser = await pdfParserPromise;
    const data = await parser(buffer);
    return data?.text || '';
  } catch (error) {
    console.error('PDF parse error:', error);
    return '';
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mod = await import('mammoth');
    const mammoth = (mod as any).default || mod;
    const result = await mammoth.extractRawText({ buffer });
    return (result as any)?.value || '';
  } catch (error) {
    console.error('DOCX parse error:', error);
    return '';
  }
}

async function extractFromSpreadsheet(buffer: Buffer): Promise<string> {
  try {
    const mod = await import('xlsx');
    const XLSX = (mod as any).default || mod;
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true });
    const sheets: string[] = [];
    for (const sheetName of workbook.SheetNames || []) {
      const sheet = workbook.Sheets?.[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t', blankrows: false }).trim();
      if (csv) {
        sheets.push(`[Sheet: ${sheetName}]\n${csv}`);
      }
    }
    return sheets.join('\n\n');
  } catch (error) {
    console.error('Spreadsheet parse error:', error);
    return '';
  }
}

async function extractFromImage(buffer: Buffer): Promise<string> {
  try {
    if (!ocrWorkerPromise) {
      ocrWorkerPromise = (async () => {
        const mod = await import('tesseract.js');
        const { createWorker } = mod as any;
        return createWorker('eng');
      })().catch((error) => {
        ocrWorkerPromise = null;
        throw error;
      });
    }

    const worker = await ocrWorkerPromise;
    const result = await worker.recognize(buffer);
    return result?.data?.text || '';
  } catch (error) {
    console.error('OCR error:', error);
    return '';
  }
}

function stripHtml(html: string): string {
  try {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    console.error('HTML strip error:', error);
    return '';
  }
}

function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text: string): TextChunk[] {
  if (!text) return [];
  const chunks: TextChunk[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + CHUNK_SIZE);

    if (end < text.length) {
      const newlineIdx = text.lastIndexOf('\n', end);
      if (newlineIdx > cursor + 200) {
        end = newlineIdx;
      } else {
        const spaceIdx = text.lastIndexOf(' ', end);
        if (spaceIdx > cursor + 200) {
          end = spaceIdx;
        }
      }
    }

    const slice = text.slice(cursor, end).trim();
    if (slice) {
      chunks.push({
        id: `${cursor}-${end}`,
        text: slice,
        start: cursor,
        end,
      });
    }

    if (end >= text.length) break;
    const nextCursor = Math.max(end - CHUNK_OVERLAP, cursor + 1);
    if (nextCursor <= cursor) break;
    cursor = nextCursor;
  }

  return chunks;
}

function countWords(text: string): number {
  if (!text) return 0;
  const matches = text.match(/\b[\p{L}\p{N}'-]{2,}\b/gu);
  return matches ? matches.length : 0;
}

function estimateTokens(chars: number): number {
  if (!chars) return 0;
  return Math.ceil(chars / 4);
}

function createPreview(text: string, limit = 280): string {
  if (!text) return '';
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > limit ? normalized.slice(0, limit) + '...' : normalized;
}

function extractKeywords(text: string, limit = 8): string[] {
  if (!text) return [];
  const tokens = text.toLowerCase().match(/\b[\p{L}\p{N}]{4,}\b/gu) || [];
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function detectCategory(name: string, type: string): FileCategory {
  const lowerName = name.toLowerCase();
  const lastDot = lowerName.lastIndexOf('.');
  const ext = lastDot >= 0 ? lowerName.slice(lastDot) : '';
  const lowerType = (type || '').toLowerCase();

  if (lowerType.includes('pdf') || ext === '.pdf') return 'pdf';
  if (lowerType.includes('wordprocessingml') || ext === '.docx') return 'docx';
  if (lowerType.includes('markdown') || ext === '.md') return 'markdown';
  if (lowerType.includes('json') || ext === '.json') return 'json';
  if (lowerType.includes('html') || ext === '.html' || ext === '.htm') return 'html';
  if (lowerType.includes('spreadsheetml') || ext === '.xlsx' || ext === '.xls') return 'spreadsheet';
  if (ext === '.csv' || ext === '.tsv') return 'spreadsheet';
  if (lowerType.startsWith('image/') || IMAGE_EXTENSIONS.some((ending) => lowerName.endsWith(ending))) return 'image';
  if (lowerType.startsWith('text/') || ext === '.txt' || ext === '.rtf') return 'text';
  return 'unknown';
}

async function extractTextForFile(file: File): Promise<ProcessedFile> {
  const name = file.name;
  const type = (file as any).type || 'application/octet-stream';
  const size = file.size;
  const buffer = Buffer.from(await file.arrayBuffer());
  const category = detectCategory(name, type);
  const warnings: string[] = [];

  let raw = '';

  switch (category) {
    case 'pdf':
      raw = await extractFromPDF(buffer);
      break;
    case 'docx':
      raw = await extractFromDOCX(buffer);
      break;
    case 'markdown':
    case 'text':
      raw = buffer.toString('utf8');
      break;
    case 'html':
      raw = stripHtml(buffer.toString('utf8'));
      break;
    case 'json':
      try {
        const parsed = JSON.parse(buffer.toString('utf8'));
        raw = JSON.stringify(parsed, null, 2);
      } catch {
        raw = buffer.toString('utf8');
        warnings.push('JSON file contains invalid syntax. Using raw text.');
      }
      break;
    case 'spreadsheet':
      raw = await extractFromSpreadsheet(buffer);
      break;
    case 'image':
      raw = await extractFromImage(buffer);
      if (!raw.trim()) {
        warnings.push('OCR could not detect readable text in this image.');
      }
      break;
    default:
      raw = buffer.toString('utf8');
      warnings.push('File type is unsupported for structured parsing. Processed as plain text.');
      break;
  }

  const normalized = normalizeText(raw);
  const truncatedText = truncateText(normalized, MAX_PER_FILE_CHARS);
  const truncated = normalized.length > truncatedText.length;
  const chunks = chunkText(truncatedText);
  const preview = createPreview(truncatedText);
  const keywords = extractKeywords(truncatedText);

  if (!normalized.trim()) {
    warnings.push('No textual content was extracted from this file.');
  }

  return {
    name,
    type,
    size,
    category,
    text: truncatedText,
    truncated,
    preview,
    warnings,
    chunks,
    keywords,
    stats: {
      chars: truncatedText.length,
      words: countWords(truncatedText),
      tokensEstimate: estimateTokens(truncatedText.length),
      chunkCount: chunks.length,
    },
  };
}

function buildCombinedText(files: ProcessedFile[]) {
  let combined = '';
  for (const file of files) {
    if (!file.text) continue;
    const header = `\n\n[FILE: ${file.name}]\n`;
    const remaining = Math.max(0, MAX_COMBINED_CHARS - combined.length - header.length);
    if (remaining <= 0) break;
    combined += header;
    combined += file.text.slice(0, remaining);
  }
  return combined.trim();
}

function collectChunks(files: ProcessedFile[]) {
  const flattened: Array<TextChunk & { file: string }> = [];
  for (const file of files) {
    for (const chunk of file.chunks) {
      flattened.push({ ...chunk, file: file.name });
      if (flattened.length >= MAX_RETURNED_CHUNKS) {
        return flattened;
      }
    }
  }
  return flattened;
}

function buildHighlights(files: ProcessedFile[]) {
  const scores = new Map<string, number>();
  files.forEach((file) => {
    file.keywords.forEach((keyword, idx) => {
      const weight = file.keywords.length - idx;
      scores.set(keyword, (scores.get(keyword) || 0) + weight);
    });
  });
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, score]) => ({ keyword, weight: score }));
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = Array.from(form.entries())
      .filter(([, value]) => value instanceof File)
      .map(([, value]) => value as File);

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const processed: ProcessedFile[] = [];
    for (const file of files) {
      processed.push(await extractTextForFile(file));
    }

    const combinedText = buildCombinedText(processed);
    const combinedChunks = collectChunks(processed);
    const highlights = buildHighlights(processed);
    const tokensEstimate = processed.reduce((sum, file) => sum + file.stats.tokensEstimate, 0);

    return NextResponse.json({
      success: true,
      files: processed,
      combinedText,
      combinedChars: combinedText.length,
      chunkCount: combinedChunks.length,
      combinedChunks,
      highlights,
      tokensEstimate,
      note: combinedText.length >= MAX_COMBINED_CHARS ? 'Content truncated to keep prompt within safe token limits.' : undefined,
    });
  } catch (error) {
    console.error('File processing error:', error);
    return NextResponse.json({ error: 'Failed to process files' }, { status: 500 });
  }
}
