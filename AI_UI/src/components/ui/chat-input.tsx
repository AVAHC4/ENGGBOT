import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, Paperclip, X, Lightbulb, Square, CornerUpLeft, Globe, Wrench, Loader2 } from "lucide-react";
import { VoiceInputModal } from "@/components/ui/voice-input-modal";
import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChat } from "@/context/chat-context";
 
 
 
 
 
 

 
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

 
const hasWebSpeechAPI = typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

interface ChatInputProps {
  onSend: (message: string, attachments?: File[], replyToId?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  thinkingMode?: boolean;
  onToggleThinking?: () => void;
  isAwaitingResponse?: boolean;
  onStopGeneration?: () => void;
  webSearchMode?: boolean;
  onToggleWebSearch?: () => void;
  isPrivateMode?: boolean;
  togglePrivateMode?: () => void;
  engineeringMode?: boolean;
  onToggleEngineering?: () => void;
}

export function ChatInput({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  thinkingMode = false,
  onToggleThinking,
  isAwaitingResponse = false,
  onStopGeneration,
  webSearchMode = false,
  onToggleWebSearch,
  engineeringMode = false,
  onToggleEngineering,

}: ChatInputProps) {
  const { replyToMessage, setReplyToMessage } = useChat();
  const [message, setMessage] = useState("");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

   
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [useWhisper, setUseWhisper] = useState(!hasWebSpeechAPI);
  const [modelLoaded, setModelLoaded] = useState(false);  

   
  const webSpeechRef = useRef<SpeechRecognition | null>(null);

   
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

   
  useEffect(() => {
     
  }, []);

   
  useEffect(() => {
    setAwaitingResponse(isAwaitingResponse);
  }, [isAwaitingResponse]);

   
  useEffect(() => {
    if (replyToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyToMessage]);

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
       
      setAwaitingResponse(true);
       
      onSend(message, attachments, replyToMessage?.id);
      setMessage("");
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
       
      setReplyToMessage(null);
    }
  };

  const handleStopGeneration = () => {
    if (onStopGeneration) {
      onStopGeneration();
       
       
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape" && replyToMessage) {
       
      e.preventDefault();
      setReplyToMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...newFiles]);
    e.target.value = "";
  };

   
  const startWebSpeechRecording = useCallback(() => {
    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        return false;
      }

      const recognition = new SpeechRecognitionAPI();
      webSpeechRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      recognition.onstart = () => {
        setIsRecording(true);
        setIsTranscribing(true);
        console.log("Web Speech API recording started");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setMessage((prev) => {
          const baseMessage = prev.replace(/\[.*?\]$/, "").trim();
          const newText = finalTranscript + (interimTranscript ? `[${interimTranscript}]` : "");
          return baseMessage ? `${baseMessage} ${newText}` : newText;
        });
      };

      recognition.onerror = (event: Event & { error: string }) => {
        console.error("Web Speech API error:", event.error);

        if (event.error === "network") {
           
          console.log("Web Speech API network error - switching to Whisper");
          setUseWhisper(true);
          webSpeechRef.current = null;
          setIsRecording(false);
          setIsTranscribing(false);
           
          setTimeout(() => startWhisperRecording(), 100);
          return;
        } else if (event.error === "not-allowed") {
          alert("Microphone permission denied. Please allow microphone access.");
        } else if (event.error !== "aborted" && event.error !== "no-speech") {
          alert(`Speech recognition error: ${event.error}`);
        }
        setIsRecording(false);
        setIsTranscribing(false);
      };

      recognition.onend = () => {
        setMessage((prev) => prev.replace(/\[.*?\]/g, "").trim());
        setIsRecording(false);
        setIsTranscribing(false);
        setTimeout(() => textareaRef.current?.focus(), 50);
        console.log("Web Speech API recording stopped");
      };

      recognition.start();
      return true;
    } catch (err) {
      console.error("Failed to start Web Speech API:", err);
      return false;
    }
     
  }, []);

  const stopWebSpeechRecording = useCallback(() => {
    try {
      webSpeechRef.current?.stop();
      webSpeechRef.current = null;
    } catch (err) {
      console.error("Error stopping Web Speech API:", err);
    }
  }, []);

   
  const startWhisperRecording = useCallback(async () => {
    console.log("Whisper recording temporarily disabled for debugging.");
    alert("Whisper recording is temporarily unavailable.");
  }, []);

  const stopWhisperRecording = useCallback(async () => {
    console.log("Whisper recording disabled.");
    setIsRecording(false);
  }, []);

   
  const startRecording = useCallback(async () => {
    if (useWhisper) {
       
      await startWhisperRecording();
    } else {
       
      const started = startWebSpeechRecording();
      if (!started) {
         
        console.log("Web Speech API not available, falling back to Whisper");
        setUseWhisper(true);
        await startWhisperRecording();
      }
    }
  }, [useWhisper, startWebSpeechRecording, startWhisperRecording]);

  const stopRecording = useCallback(async () => {
    if (webSpeechRef.current) {
      stopWebSpeechRecording();
    } else {
      await stopWhisperRecording();
    }
  }, [stopWebSpeechRecording, stopWhisperRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

   
  useEffect(() => {
    const mediaRecorder = mediaRecorderRef.current;
    const mediaStream = mediaStreamRef.current;
    return () => {
      stopWebSpeechRecording();
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
    };
  }, [stopWebSpeechRecording]);



  const handleVoiceTranscription = (transcription: string) => {
    setMessage(prev => prev + transcription);

     
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

   
  const cancelReply = () => {
    setReplyToMessage(null);
  };

   
  const truncateReplyText = (text: string, maxLength = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

   
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [message]);

  return (
    <>
      <div className="flex flex-col w-full max-w-3xl mx-auto px-2 py-1">
        { }
        {replyToMessage && (
          <div className="flex items-center justify-between mb-2 px-3 py-2 rounded-full bg-muted/50 dark:bg-gray-800/50">
            <div className="flex items-start gap-2">
              <CornerUpLeft className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium">
                  Replying to {replyToMessage.isUser ? "yourself" : "AI Assistant"}
                </div>
                <div className="text-xs opacity-80">
                  {truncateReplyText(replyToMessage.content, 40)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={cancelReply}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        { }
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center bg-muted rounded-full pl-3 pr-1 py-1 text-xs dark:bg-gray-800">
                <span className="max-w-[140px] truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-1.5 md:gap-2 bg-background dark:bg-gray-800/30 rounded-full px-1.5 md:px-2 py-1">
          { }
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={handleFileChange}
            disabled={disabled || awaitingResponse}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full"
            onClick={() => {
              if (disabled || awaitingResponse) return;
              fileInputRef.current?.click();
            }}
            disabled={disabled || awaitingResponse}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          { }
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isRecording ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full",
                  isRecording && "bg-red-500 hover:bg-red-600 text-white"
                )}
                onClick={toggleRecording}
                disabled={disabled || awaitingResponse || isLoadingModel || isTranscribing}
                aria-label={isLoadingModel ? "Loading speech model..." : isRecording ? "Stop recording" : "Start voice input"}
              >
                {isLoadingModel ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isTranscribing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                  <Square className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">
                {isLoadingModel
                  ? "Loading speech model... (first time takes ~30s)"
                  : isTranscribing
                    ? "Transcribing..."
                    : isRecording
                      ? "Stop recording"
                      : useWhisper
                        ? "Start voice input (offline)"
                        : "Start voice input"}
              </p>
            </TooltipContent>
          </Tooltip>

          { }
          {onToggleWebSearch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 md:h-9 md:w-9 rounded-full dark:hover:bg-gray-800",
                    webSearchMode && "text-green-500 dark:text-green-400"
                  )}
                  onClick={onToggleWebSearch}
                  disabled={awaitingResponse}
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {webSearchMode ? "Web search enabled" : "Enable web search"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          { }
          {onToggleThinking && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 md:h-9 md:w-9 rounded-full dark:hover:bg-gray-800",
                    thinkingMode && "text-blue-500 dark:text-blue-400"
                  )}
                  onClick={onToggleThinking}
                  disabled={awaitingResponse}
                >
                  <Lightbulb className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {thinkingMode ? "Deep Think enabled" : "Enable Deep Think"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          { }
          {onToggleEngineering && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 md:h-9 md:w-9 rounded-full dark:hover:bg-gray-800",
                    engineeringMode && "text-orange-500 dark:text-orange-400"
                  )}
                  onClick={onToggleEngineering}
                  disabled={awaitingResponse}
                >
                  <Wrench className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {engineeringMode ? "Engineering mode enabled" : "Enable engineering mode"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          <textarea
            ref={textareaRef}
            placeholder={replyToMessage ? "Type your reply..." : placeholder}
            className={cn(
              "flex-1 resize-none max-h-[150px] min-h-[40px] rounded-full border-0 bg-transparent px-2.5 py-1.5 md:px-3 md:py-2 text-sm",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-transparent dark:border-0 dark:focus-visible:ring-0",
              "dark:placeholder:text-gray-500"
            )}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || awaitingResponse || isTranscribing}
            rows={1}
          />

          { }
          {awaitingResponse ? (
            <Button
              onClick={handleStopGeneration}
              size="icon"
              variant="ghost"
              className="rounded-full h-8 w-8 md:h-9 md:w-9 dark:hover:bg-gray-800/30"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant={message.trim() || attachments.length > 0 ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-full",
                message.trim() || attachments.length > 0
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground"
              )}
              onClick={handleSend}
              disabled={(!message.trim() && attachments.length === 0) || disabled || awaitingResponse || isTranscribing}
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      { }
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscription={handleVoiceTranscription}
      />
    </>
  );
} 
