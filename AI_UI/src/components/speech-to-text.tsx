import React, { useState, useRef } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SpeechToTextProps {
  onTranscriptionComplete?: (text: string) => void;
  className?: string;
}

export function SpeechToText({ onTranscriptionComplete, className }: SpeechToTextProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = handleRecordingStop;
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording started", { description: "Speak clearly into your microphone" });
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Microphone access denied", { 
        description: "Please allow microphone access to use speech-to-text" 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleRecordingStop = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        // Extract the base64 string (remove data URL prefix)
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Failed to convert audio to base64');
        }
        
        // Send to our API endpoint
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_b64: base64Audio })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Transcription failed');
        }
        
        const data = await response.json();
        
        if (data.text) {
          toast.success("Transcription complete");
          
          // Call the callback with the transcribed text
          if (onTranscriptionComplete) {
            onTranscriptionComplete(data.text);
          }
        } else {
          throw new Error('No transcription returned');
        }
      };
      
      reader.onerror = () => {
        throw new Error('Error reading audio file');
      };
      
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error("Transcription failed", { 
        description: error instanceof Error ? error.message : "An unknown error occurred" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
      )}
      <span className="sr-only">
        {isRecording ? 'Stop recording' : 'Start speech to text'}
      </span>
    </Button>
  );
} 