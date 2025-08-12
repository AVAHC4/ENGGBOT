import { NextResponse } from 'next/server';

// Node runtime only (uses Node libs)
export const runtime = 'nodejs';

// Soft size limits to keep token usage low
const MAX_PER_FILE_CHARS = 30000; // ~10k tokens
const MAX_COMBINED_CHARS = 60000; // ~20k tokens total

function truncateText(input: string, limit: number) {
  if (!input) return '';
  if (input.length <= limit) return input;
  // keep head and tail parts to preserve context
  const keep = Math.floor(limit / 2);
  return input.slice(0, keep) + "\n\n...\n\n" + input.slice(-keep);
}

async function extractFromPDF(buffer: Buffer): Promise<string> {
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e) {
    console.error('PDF parse error:', e);
    return '';
  }
}

async function extractFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return (result as any).value || '';
  } catch (e) {
    console.error('DOCX parse error:', e);
    return '';
  }
}

function stripHtml(html: string): string {
  try {
    // Lightweight tag strip; avoids heavy DOM libs by default
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    console.error('HTML strip error:', e);
    return '';
  }
}

async function extractTextForFile(file: File): Promise<{ name: string; type: string; text: string; truncated: boolean }>{
  const name = file.name;
  const type = (file as any).type || '';
  const ab = await file.arrayBuffer();
  const buffer = Buffer.from(ab);

  const lower = name.toLowerCase();
  let raw = '';

  if (type.includes('pdf') || lower.endsWith('.pdf')) {
    raw = await extractFromPDF(buffer);
  } else if (type.includes('wordprocessingml') || lower.endsWith('.docx')) {
    raw = await extractFromDOCX(buffer);
  } else if (type.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.csv') || lower.endsWith('.json')) {
    raw = buffer.toString('utf8');
  } else if (type.includes('html') || lower.endsWith('.html') || lower.endsWith('.htm')) {
    raw = stripHtml(buffer.toString('utf8'));
  } else {
    // Unsupported for now
    raw = '';
  }

  const cleaned = raw.replace(/\u0000/g, ' ').replace(/\s+$/g, '');
  const truncatedText = truncateText(cleaned, MAX_PER_FILE_CHARS);
  return { name, type: type || 'unknown', text: truncatedText, truncated: cleaned.length > truncatedText.length };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const parts = Array.from(form.entries())
      .filter(([, v]) => v instanceof File)
      .map(([k, v]) => ({ key: k, file: v as File }));

    if (parts.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const processed: Array<{ name: string; type: string; text: string; truncated: boolean }> = [];

    for (const { file } of parts) {
      const result = await extractTextForFile(file);
      if (result.text && result.text.trim()) {
        processed.push(result);
      } else {
        processed.push({ name: result.name, type: result.type, text: '', truncated: false });
      }
    }

    // Combine with overall cap
    let combined = '';
    for (const p of processed) {
      const header = `\n\n[FILE: ${p.name}]\n`;
      const remaining = Math.max(0, MAX_COMBINED_CHARS - combined.length - header.length);
      if (remaining <= 0) break;
      const slice = p.text.slice(0, remaining);
      combined += header + slice;
    }

    return NextResponse.json({
      success: true,
      files: processed,
      combinedChars: combined.length,
      combinedText: combined,
      note: 'Content truncated to keep prompt within safe token limits.'
    });
  } catch (error) {
    console.error('File processing error:', error);
    return NextResponse.json({ error: 'Failed to process files' }, { status: 500 });
  }
}
