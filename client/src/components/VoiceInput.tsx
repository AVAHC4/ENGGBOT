import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscription, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          await processAudio(audioBlob);
        } catch (e) {
          console.error("Error processing audio:", e);
          setError("Failed to process speech. Please try again.");
        } finally {
          setIsProcessing(false);
        }
        
        // Stop all tracks from the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Error accessing microphone:", e);
      setError("Could not access microphone. Please check permissions.");
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const processAudio = async (audioBlob: Blob): Promise<void> => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    
    try {
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.text) {
        onTranscription(data.text);
      } else {
        setError("No speech detected. Please try again.");
      }
    } catch (e) {
      console.error("Speech recognition error:", e);
      setError("Failed to connect to NVIDIA Cloud speech recognition server.");
      throw e;
    }
  };
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`p-2 rounded-full transition-all ${
          isRecording 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        } ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isRecording ? "Stop recording" : "Start voice input"}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-red-500 text-white text-xs px-2 py-1 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceInput; 