import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AIVoiceInput } from '@/components/ui/ai-voice-input';
import { Button } from '@/components/ui/button';
import MicRecorder from 'mic-recorder-to-mp3';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

const Mp3Recorder = new MicRecorder({ bitRate: 128 });

export function VoiceInputModal({ isOpen, onClose, onTranscription }: VoiceInputModalProps) {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVoiceStart = async () => {
    if (recording || loading) return;
    try {
      await Mp3Recorder.start();
      setRecording(true);
    } catch (err) {
      alert('Could not start audio recording.');
    }
  };

  const handleVoiceStop = async () => {
    if (!recording) return;
    setRecording(false);
    setLoading(true);
    try {
      const [buffer, blob] = await Mp3Recorder.stop().getMp3();
      // Send MP3 blob to backend
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
        },
        body: blob,
      });
      const data = await response.json();
      if (data.text) {
        onTranscription(data.text);
        onClose();
      } else {
        alert(data.error || 'Transcription failed.');
      }
    } catch (err) {
      alert('Error transcribing audio.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl w-full max-w-md shadow-lg dark:bg-gray-900 dark:border dark:border-gray-700">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium">Voice Input</h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={recording || loading}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <AIVoiceInput 
            onStart={handleVoiceStart} 
            onStop={handleVoiceStop}
          />
          <div className="text-center mt-2 text-sm text-muted-foreground dark:text-gray-400">
            {loading ? "Transcribing..." : recording ? "Speak clearly. Recording will automatically process when you pause..." : "Click the microphone to start recording"}
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={recording || loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
} 