import { NextResponse } from 'next/server';
import { executeCode } from '@/lib/judge0';

export async function POST(request: Request) {
  try {
    const { code, language, input } = await request.json();
    if (!code || !language) {
      return NextResponse.json({ error: 'Missing code or language' }, { status: 400 });
    }
     
    const output = await executeCode(code, language, input || '');
    return NextResponse.json({ output });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 