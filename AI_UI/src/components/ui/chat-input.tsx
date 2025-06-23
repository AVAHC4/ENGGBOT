import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, Paperclip, X, Lightbulb, Square, CornerUpLeft, Globe, SendHorizonal, MicIcon, PaperclipIcon, Eraser, ZapIcon, Plus } from "lucide-react";
import { VoiceInputModal } from "@/components/ui/voice-input-modal";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChat } from "@/context/chat-context";

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
  useStreaming?: boolean;
  toggleStreaming?: () => void;
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
  useStreaming,
  toggleStreaming,
}: ChatInputProps) {
  const { replyToMessage, setReplyToMessage, useStreaming: contextUseStreaming } = useChat();
  const [message, setMessage] = useState("");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Clear reply state after sending
      setReplyToMessage(null);
      // Reset expanded state
      setIsExpanded(false);
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
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleVoiceClick = () => {
    setIsVoiceModalOpen(true);
  };

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

  // Auto resize textarea and check if expanded
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const newHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(newHeight, 400)}px`;
    
    // Set expanded state based on content height or content length
    setIsExpanded(true); // Always show expanded mode
  }, [message]);

  // Render control buttons for compact mode
  const renderControlButtons = () => (
    <>
      {/* File attachment button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9 shrink-0 rounded-full" 
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || awaitingResponse}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || awaitingResponse}
        />
        <Plus className="h-5 w-5" />
      </Button>
      
      {/* Web search mode toggle button */}
      {onToggleWebSearch && (
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-9 w-9 rounded-full dark:hover:bg-gray-800",
            webSearchMode && "text-green-500 dark:text-green-400"
          )}
          onClick={onToggleWebSearch}
          disabled={awaitingResponse}
        >
          <Globe className="h-5 w-5" />
        </Button>
      )}
      
      {/* Voice input button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9 shrink-0 rounded-full" 
        onClick={() => setIsVoiceModalOpen(true)}
        disabled={disabled || awaitingResponse}
      >
        <Mic className="h-5 w-5" />
      </Button>

      {/* Send or Stop button */}
      {awaitingResponse ? (
        <Button 
          onClick={handleStopGeneration} 
          size="icon" 
          variant="ghost"
          className="rounded-full h-9 w-9 dark:hover:bg-gray-800/30"
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button 
          variant={message.trim() || attachments.length > 0 ? "default" : "ghost"} 
          size="icon" 
          className={cn(
            "h-9 w-9 shrink-0 rounded-full",
            message.trim() || attachments.length > 0 
              ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
              : "text-muted-foreground"
          )}
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || disabled || awaitingResponse}
        >
          <Send className="h-5 w-5" />
        </Button>
      )}
    </>
  );

  return (
    <>
      <div className="flex flex-col w-full max-w-3xl mx-auto px-2 pb-1">
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
        
        {/* Main input area */}
        <div className={cn(
          "flex flex-col bg-background dark:bg-gray-800/30 relative w-full",
          "rounded-lg px-4 py-3"
        )}>
          <textarea
            ref={textareaRef}
            placeholder={replyToMessage ? "Type your reply..." : placeholder}
            className={cn(
              "flex-1 resize-none max-h-[400px] min-h-[180px] border-0 bg-transparent px-3 py-2 text-sm w-full",
              "ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "dark:bg-transparent dark:border-0 dark:focus-visible:ring-0",
              "dark:placeholder:text-gray-500",
              "rounded-md pb-3"
            )}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || awaitingResponse}
            rows={8}
          />
          
          {/* Control buttons - always at the bottom */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-border dark:border-gray-700">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {/* Left side buttons */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 shrink-0 rounded-full" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || awaitingResponse}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disabled || awaitingResponse}
                  />
                  <Plus className="h-5 w-5" />
                </Button>
                
                {onToggleWebSearch && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-9 w-9 rounded-full dark:hover:bg-gray-800",
                      webSearchMode && "text-green-500 dark:text-green-400"
                    )}
                    onClick={onToggleWebSearch}
                    disabled={awaitingResponse}
                  >
                    <Globe className="h-5 w-5" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3 mr-1">
                {/* Right side buttons */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 shrink-0 rounded-full" 
                  onClick={() => setIsVoiceModalOpen(true)}
                  disabled={disabled || awaitingResponse}
                >
                  <Mic className="h-5 w-5" />
                </Button>
                
                {awaitingResponse ? (
                  <Button 
                    onClick={handleStopGeneration} 
                    size="icon" 
                    variant="ghost"
                    className="rounded-full h-9 w-9 dark:hover:bg-gray-800/30"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    variant={message.trim() || attachments.length > 0 ? "default" : "ghost"} 
                    size="icon" 
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-full",
                      message.trim() || attachments.length > 0 
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                        : "text-muted-foreground"
                    )}
                    onClick={handleSend}
                    disabled={(!message.trim() && attachments.length === 0) || disabled || awaitingResponse}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
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