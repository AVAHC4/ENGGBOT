import { NextResponse } from 'next/server';

// API endpoint for transcription
export async function POST(req: Request) {
  try {
    const { audio_b64 } = await req.json();
    
    if (!audio_b64) {
      return NextResponse.json({ error: 'Missing audio data' }, { status: 400 });
    }
    
    // Using the Chutes API with the provided API key
    const API_KEY = "***REMOVED***";
    
    const response = await fetch("https://chutes-whisper-large-v3.chutes.ai/transcribe", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ audio_b64 })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transcription API error:', errorText);
      return NextResponse.json(
        { error: 'Error transcribing audio', details: errorText }, 
        { status: response.status }
      );
    }
    
    const transcriptionResult = await response.json();
    return NextResponse.json(transcriptionResult);
    
  } catch (error) {
    console.error('Transcription server error:', error);
    return NextResponse.json(
      { error: 'Server error during transcription' }, 
      { status: 500 }
    );
  }
} 