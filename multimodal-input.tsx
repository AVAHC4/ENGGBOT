"use client"

import React from "react"
import { Bot, FileText, RotateCw, Search, SendIcon, Mic, MicOff, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import compilerChatService from "./AI_UI/src/lib/compiler-chat-service"

// VoiceInput component inline
interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscription, disabled = false }) => {
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
      console.log("Sending audio to transcribe endpoint...");
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Speech recognition result:", data);
      
      if (data.text) {
        if (data.fallback) {
          console.warn("Using fallback transcription:", data.error);
          setError("Using fallback: NVIDIA service unavailable");
          setTimeout(() => setError(null), 3000);
        }
        
        onTranscription(data.text);
      } else {
        setError("No speech detected. Please try again.");
      }
    } catch (e) {
      console.error("Speech recognition error:", e);
      setError("Failed to connect to speech recognition server. Check console for details.");
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

// Mock component replacements for missing modules
const Button = ({ className, disabled, onClick, children }) => (
  <button className={className} disabled={disabled} onClick={onClick}>
    {children}
  </button>
)

const Textarea = ({ placeholder, value, onChange, onKeyDown, className }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    className={className}
  />
)

const Select = ({ value, onValueChange, children }) => (
  <div className="relative">
    {children}
  </div>
)

const SelectTrigger = ({ className, children }) => (
  <div className={className}>{children}</div>
)

const SelectValue = ({ placeholder }) => <span>{placeholder}</span>

const SelectContent = ({ className, children }) => (
  <div className={className}>{children}</div>
)

const SelectItem = ({ value, className, children }) => (
  <div className={className}>{children}</div>
)

// Utility function to replace missing cn
const cn = (...classes) => classes.filter(Boolean).join(" ")

// Motion div component replacement
const motion = {
  div: ({ initial, animate, exit, transition, className, key, children }) => (
    <div className={className} key={key}>
      {children}
    </div>
  ),
}

const AIModels = [
  { name: "GPT-4", id: "gpt4" },
  { name: "Claude", id: "claude" },
  { name: "Gemini", id: "gemini" },
  { name: "DeepSeek", id: "deepseek" },
]

const QuickActions = [
  {
    action: "Search knowledge base",
    icon: Search,
    gradient: "from-zinc-900/50 to-black/50",
    hoverGradient: "hover:from-zinc-800/50 hover:to-zinc-900/50",
  },
  {
    action: "Analyze document",
    icon: FileText,
    gradient: "from-zinc-900/50 to-black/50",
    hoverGradient: "hover:from-zinc-800/50 hover:to-zinc-900/50",
  },
  {
    action: "Generate content",
    icon: Bot,
    gradient: "from-zinc-900/50 to-black/50",
    hoverGradient: "hover:from-zinc-800/50 hover:to-zinc-900/50",
  },
]

export function MultimodalInput({ onSubmit, isLoading }) {
  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState(AIModels[0].id)
  
  // Subscribe to compiler output updates to input field
  useEffect(() => {
    const unsubscribe = compilerChatService.subscribeToInputField((text) => {
      // Update the input field with the compiler output
      setInput(text)
    })
    
    // Cleanup subscription when component unmounts
    return () => unsubscribe()
  }, [])

  function handleSubmit() {
    if (input.length > 0) {
      onSubmit(input, selectedModel)
    }
    setInput("")
  }

  // Handle voice input transcription
  const handleTranscription = (text) => {
    if (text) {
      setInput(prev => prev + (prev ? ' ' : '') + text)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <div className="relative bg-zinc-900 rounded-xl border border-zinc-800">
        <Textarea
          placeholder="What would you like to do?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className={cn(
            "w-full px-4 py-3",
            "resize-none",
            "bg-transparent",
            "border-none",
            "text-zinc-100 text-base",
            "focus:outline-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-zinc-500 placeholder:text-base",
            "min-h-[60px]",
          )}
        />
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[140px] h-8 px-3 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                {AIModels.map((model) => (
                  <SelectItem key={model.id} value={model.id} className="text-xs">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <VoiceInput
              onTranscription={handleTranscription}
              disabled={isLoading}
            />
          </div>
          
          <Button
            className={cn(
              "px-1.5 py-1.5 h-6 rounded-lg text-sm transition-colors hover:bg-zinc-800 flex items-center justify-between gap-1",
              "text-zinc-800",
              "disabled:opacity-50 disabled:cursor-not-allowed bg-white",
            )}
            disabled={input.length === 0 || isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 w-full">
        {QuickActions.map((item, index) => {
          const Icon = item.icon
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                delay: 0.1 * index,
                duration: 0.4,
                ease: "easeOut",
              }}
              key={index}
              className={`${index > 1 ? "hidden sm:block" : "block"} h-full`}
            >
              <button
                type="button"
                onClick={() => {
                  setInput(item.action)
                  setTimeout(() => handleSubmit(), 100)
                }}
                className="group w-full h-full text-left rounded-lg p-2.5
                                    bg-zinc-900 hover:bg-zinc-800
                                    border border-zinc-800 hover:border-zinc-700
                                    transition-colors duration-300
                                    flex flex-col justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700">
                    <Icon size={14} className="text-zinc-100" />
                  </div>
                  <div className="text-xs text-zinc-100 font-medium">{item.action}</div>
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

