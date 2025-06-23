import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, Paperclip, X, Lightbulb, Square, CornerUpLeft, Globe, SendHorizonal, MicIcon, PaperclipIcon, Eraser, ZapIcon } from "lucide-react";
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
        
        <div className="flex items-end gap-2 bg-background dark:bg-gray-800/30 rounded-full px-2 py-2 overflow-hidden">
          {/* File attachment button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-full" 
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
            <Paperclip className="h-5 w-5" />
          </Button>
          
          {/* Voice input button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-full" 
            onClick={() => setIsVoiceModalOpen(true)}
            disabled={disabled || awaitingResponse}
          >
            <Mic className="h-5 w-5" />
          </Button>
          
          {/* Web search mode toggle button */}
          {onToggleWebSearch && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-10 w-10 rounded-full dark:hover:bg-gray-800",
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
                    "h-10 w-10 rounded-full dark:hover:bg-gray-800",
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
                  {thinkingMode ? "Thinking mode enabled" : "Enable thinking mode"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Streaming toggle button */}
          {toggleStreaming && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full dark:hover:bg-gray-800",
                    contextUseStreaming && "text-primary hover:text-primary"
                  )}
                  onClick={toggleStreaming}
                  title={contextUseStreaming ? "Streaming Mode On" : "Streaming Mode Off"}
                >
                  <ZapIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {contextUseStreaming ? "Streaming Mode On" : "Streaming Mode Off"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          <div className="flex-1 overflow-hidden">
            <textarea
              ref={textareaRef}
              placeholder={replyToMessage ? "Type your reply..." : placeholder}
              className={cn(
                "w-full resize-none max-h-[150px] min-h-[45px] rounded-full border-0 bg-transparent px-4 py-3 text-sm",
                "ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-0",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:bg-transparent dark:border-0 dark:focus-visible:ring-0",
                "dark:placeholder:text-gray-500",
                "overflow-y-auto overflow-x-hidden"
              )}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || awaitingResponse}
              rows={1}
            />
          </div>
          
          {/* Conditionally render either Send or Stop button */}
          {awaitingResponse ? (
            <Button 
              onClick={handleStopGeneration} 
              size="icon" 
              variant="ghost"
              className="rounded-full h-10 w-10 dark:hover:bg-gray-800/30"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant={message.trim() || attachments.length > 0 ? "default" : "ghost"} 
              size="icon" 
              className={cn(
                "h-10 w-10 shrink-0 rounded-full",
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

      {/* Voice input modal */}
      <VoiceInputModal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscription={handleVoiceTranscription}
      />
    </>
  );
} 