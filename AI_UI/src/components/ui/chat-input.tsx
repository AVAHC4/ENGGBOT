import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, Paperclip, X, Lightbulb, Square, CornerUpLeft, Globe, Wrench, Loader2 } from "lucide-react";
import { VoiceInputModal } from "@/components/ui/voice-input-modal";
import { cn } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChat } from "@/context/chat-context";
import { getVoskModel, preloadVoskModel, isVoskModelLoading, isVoskModelLoaded } from "@/lib/vosk-preloader";

// Web Speech API types
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

// Check if Web Speech API is available and working
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

  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [useVosk, setUseVosk] = useState(!hasWebSpeechAPI);
  const [modelLoaded, setModelLoaded] = useState(isVoskModelLoaded());

  // Web Speech API ref
  const webSpeechRef = useRef<SpeechRecognition | null>(null);

  // Vosk refs
  const voskModelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const finalTranscriptRef = useRef("");

  // Only sync Vosk state if we're using Vosk
  useEffect(() => {
    if (!useVosk) return;

    const interval = setInterval(() => {
      const loading = isVoskModelLoading();
      const loaded = isVoskModelLoaded();

      if (loading !== isLoadingModel) setIsLoadingModel(loading);
      if (loaded !== modelLoaded) {
        setModelLoaded(loaded);
        if (loaded) {
          voskModelRef.current = getVoskModel();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isLoadingModel, modelLoaded, useVosk]);

  // Update internal state when prop changes
  useEffect(() => {
    setAwaitingResponse(isAwaitingResponse);
  }, [isAwaitingResponse]);

  // Focus textarea when reply mode is activated
  useEffect(() => {
    if (replyToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyToMessage]);

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
      // Set awaiting response to true immediately when sending
      setAwaitingResponse(true);
      // Pass the replyToId if replying to a message
      onSend(message, attachments, replyToMessage?.id);
      setMessage("");
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      // Clear reply state after sending
      setReplyToMessage(null);
    }
  };

  const handleStopGeneration = () => {
    if (onStopGeneration) {
      onStopGeneration();
      // We don't set awaitingResponse to false here because that should
      // happen when the isAwaitingResponse prop changes through the context
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === "Escape" && replyToMessage) {
      // Cancel reply mode with Escape key
      e.preventDefault();
      setReplyToMessage(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...newFiles]);
    // Allow re-selecting the same file again
    e.target.value = "";
  };

  // Load Vosk model - uses the global preloader that starts after login
  const loadVoskModel = useCallback(async () => {
    // Check if already loaded in component
    if (voskModelRef.current) return voskModelRef.current;

    // Check if preloaded globally
    const preloadedModel = getVoskModel();
    if (preloadedModel) {
      voskModelRef.current = preloadedModel;
      setModelLoaded(true);
      return preloadedModel;
    }

    // If not preloaded yet, load it now (fallback)
    try {
      setIsLoadingModel(true);
      console.log("Loading Vosk model... (first time may take 15-30 seconds)");

      const model = await preloadVoskModel();
      if (model) {
        voskModelRef.current = model;
        setModelLoaded(true);
        console.log("Vosk model loaded successfully!");
        return model;
      }
      return null;
    } catch (err: any) {
      console.error("Failed to load Vosk model:", err);
      alert("Failed to load speech recognition model. Please try again.");
      return null;
    } finally {
      setIsLoadingModel(false);
    }
  }, []);

  // ========== WEB SPEECH API (Primary for Chrome/Edge) ==========
  const startWebSpeechRecording = useCallback(() => {
    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        return false; // Not supported, will fall back to Vosk
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
          // Network error - switch to Vosk permanently for this session
          console.log("Web Speech API network error - switching to Vosk");
          setUseVosk(true);
          webSpeechRef.current = null;
          setIsRecording(false);
          setIsTranscribing(false);
          // Trigger Vosk recording
          setTimeout(() => startVoskRecording(), 100);
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

  // ========== VOSK (Fallback for Brave/Firefox/Safari) ==========
  const startVoskRecording = useCallback(async () => {
    try {
      setIsLoadingModel(true);

      // Load model if not already loaded
      let model = voskModelRef.current;
      if (!model) {
        model = await loadVoskModel();
        if (!model) {
          setIsLoadingModel(false);
          return;
        }
      }

      // Wait for model to be ready
      if (!model.ready) {
        console.log("Waiting for Vosk model to be ready...");
        await new Promise<void>((resolve) => {
          const checkReady = setInterval(() => {
            if (model.ready) {
              clearInterval(checkReady);
              resolve();
            }
          }, 100);
          setTimeout(() => {
            clearInterval(checkReady);
            resolve();
          }, 30000);
        });
      }

      setIsLoadingModel(false);

      if (!model.ready) {
        alert("Speech recognition model is not ready. Please try again.");
        return;
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      mediaStreamRef.current = stream;

      // Create audio context at 16kHz (required by Vosk)
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Create Vosk recognizer
      const recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
      recognizerRef.current = recognizer;
      finalTranscriptRef.current = "";

      // Handle final results
      recognizer.on("result", (message: any) => {
        const text = message.result?.text;
        if (text && text.trim()) {
          finalTranscriptRef.current += " " + text;
          setMessage((prev) => {
            const cleaned = prev.replace(/\[.*?\]$/, "").trim();
            return cleaned ? cleaned + " " + text : text;
          });
        }
      });

      // Handle partial results (real-time feedback)
      recognizer.on("partialresult", (message: any) => {
        const partial = message.result?.partial;
        if (partial) {
          setMessage((prev) => {
            const base = prev.replace(/\[.*?\]$/, "").trim();
            return base ? `${base} [${partial}]` : `[${partial}]`;
          });
        }
      });

      // Create audio processing pipeline
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (recognizerRef.current) {
          recognizerRef.current.acceptWaveform(e.inputBuffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setIsTranscribing(true);
      console.log("Vosk recording started");
    } catch (err: any) {
      console.error("Failed to start Vosk recording:", err);
      setIsLoadingModel(false);
      if (err.name === "NotAllowedError") {
        alert("Microphone permission denied. Please allow microphone access.");
      } else {
        alert(`Failed to start recording: ${err.message}`);
      }
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, [loadVoskModel]);

  const stopVoskRecording = useCallback(() => {
    try {
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (recognizerRef.current) {
        recognizerRef.current.remove();
        recognizerRef.current = null;
      }
      setMessage((prev) => prev.replace(/\[.*?\]/g, "").trim());
      setIsRecording(false);
      setIsTranscribing(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
      console.log("Vosk recording stopped");
    } catch (err) {
      console.error("Error stopping Vosk recording:", err);
      setIsRecording(false);
      setIsTranscribing(false);
    }
  }, []);

  // ========== HYBRID START/STOP ==========
  const startRecording = useCallback(async () => {
    if (useVosk) {
      // Use Vosk directly (browser doesn't support Web Speech or had network error)
      await startVoskRecording();
    } else {
      // Try Web Speech API first
      const started = startWebSpeechRecording();
      if (!started) {
        // Fall back to Vosk if Web Speech failed to start
        console.log("Web Speech API not available, falling back to Vosk");
        setUseVosk(true);
        await startVoskRecording();
      }
    }
  }, [useVosk, startWebSpeechRecording, startVoskRecording]);

  const stopRecording = useCallback(() => {
    if (webSpeechRef.current) {
      stopWebSpeechRecording();
    } else {
      stopVoskRecording();
    }
  }, [stopWebSpeechRecording, stopVoskRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebSpeechRecording();
      stopVoskRecording();
      if (voskModelRef.current) {
        voskModelRef.current.terminate?.();
        voskModelRef.current = null;
      }
    };
  }, [stopRecording]);



  const handleVoiceTranscription = (transcription: string) => {
    setMessage(prev => prev + transcription);

    // Focus the textarea and adjust its height after adding transcription
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Cancel reply mode
  const cancelReply = () => {
    setReplyToMessage(null);
  };

  // Truncate reply preview text
  const truncateReplyText = (text: string, maxLength = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Auto resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [message]);

  return (
    <>
      <div className="flex flex-col w-full max-w-3xl mx-auto px-2 py-1">
        {/* Reply indicator */}
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

        {/* Attachment preview */}
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
          {/* File attachment button */}
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

          {/* Voice input button (Vosk offline transcription) */}
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
                disabled={disabled || awaitingResponse || isLoadingModel}
                aria-label={isLoadingModel ? "Loading speech model..." : isRecording ? "Stop recording" : "Start voice input"}
              >
                {isLoadingModel ? (
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
                  : isRecording
                    ? "Stop recording"
                    : modelLoaded
                      ? "Start voice input"
                      : "Start voice input (will load model)"}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Web search mode toggle button */}
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

          {/* Thinking mode toggle button */}
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

          {/* Engineering mode toggle button */}
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

          {/* Conditionally render either Send or Stop button */}
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

      {/* Voice input modal */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscription={handleVoiceTranscription}
      />
    </>
  );
} 
