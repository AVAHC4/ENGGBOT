import React, { useState } from 'react';
import { X } from 'lucide-react';
 
import { Button } from '@/components/ui/button';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscription: (text: string) => void;
}

export function VoiceInputModal({ 
  isOpen, 
  onClose, 
  onTranscription 
}: VoiceInputModalProps) {
  const [recording, setRecording] = useState(false);
  
  if (!isOpen) return null;
  
   
  const mockTranscribe = (duration: number) => {
     
    if (duration < 1) return;
    
    const mockTranscriptions = [
      "I'm looking for information about artificial intelligence and machine learning.",
      "Can you explain how the chat interface works?",
      "What's the difference between supervised and unsupervised learning?",
      "I need help with my project on natural language processing.",
      "How can I implement voice recognition in my application?"
    ];
    
    const randomIndex = Math.floor(Math.random() * mockTranscriptions.length);
    const transcription = mockTranscriptions[randomIndex];
    
     
    onTranscription(transcription);
    onClose();
  };
  
  const handleVoiceStart = () => {
    setRecording(true);
  };
  
  const handleVoiceStop = (duration: number) => {
    setRecording(false);
    mockTranscribe(duration);
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl w-full max-w-md shadow-lg dark:bg-gray-900 dark:border dark:border-gray-700">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium">Voice Input</h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={recording}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4">
          { } { }
          
          <div className="text-center mt-2 text-sm text-muted-foreground dark:text-gray-400">
            {recording ? 
              "Speak clearly. Recording will automatically process when you pause..." : 
              "Click the microphone to start recording"
            }
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={recording}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
} 