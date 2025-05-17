import { NextRequest, NextResponse } from 'next/server';

// Replace with your actual API key or use an environment variable for security
const NGC_API_KEY = "***REMOVED***";
const FUNCTION_ID = "b702f636-f60c-4a3d-a6f4-f3568c13bd7d";
const CLOUD_ENDPOINT = "https://nvcf-nim-api.nvidia.com/v2/nim/whisper-large-v3/transcribe";

export const runtime = 'edge'; // Use edge runtime for lower latency

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || 'audio/mpeg';
    const audioData = await request.arrayBuffer();

    // Send to NVIDIA Cloud NIM endpoint
    try {
      const response = await fetch(CLOUD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Authorization': `Bearer ${NGC_API_KEY}`,
          'function-id': FUNCTION_ID,
        },
        body: audioData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('NVIDIA Cloud NIM API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return NextResponse.json(
          { error: `NVIDIA Cloud NIM API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Failed to connect to NVIDIA Cloud NIM server:', error);
      return NextResponse.json(
        { error: 'Failed to connect to NVIDIA Cloud speech recognition server.' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to process audio data' },
      { status: 500 }
    );
  }
} 