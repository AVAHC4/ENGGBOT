import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Avatar } from "@/components/ui/avatar";
import { User, Bot, File, Image, FileAudio, FileVideo, Download, CornerUpLeft, Reply, Wrench } from "lucide-react";
import { Attachment, ExtendedChatMessage, useChat } from "@/context/chat-context";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { BOT_CONFIG } from "@/lib/ai/response-middleware";

export interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  avatarSrc?: string;
  attachments?: Attachment[];
  skipGeneration?: boolean;
  messageData: ExtendedChatMessage;
}

export function ChatMessage({ 
  message, 
  isUser, 
  timestamp, 
  avatarSrc,
  attachments = [],
  skipGeneration = false,
  messageData
}: ChatMessageProps) {
  const { messages, setReplyToMessage, useStreaming } = useChat();
  
  // Get the message being replied to if replyToId exists
  const replyToMessage = messageData.replyToId 
    ? messages.find(msg => msg.id === messageData.replyToId) 
    : null;

  // Determine if this message is currently streaming
  const isStreaming = messageData.isStreaming === true;

  // Function to handle reply to this message
  const handleReply = () => {
    setReplyToMessage(messageData);
  };
  
  // Function to determine the appropriate icon based on file type
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    if (type.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Render attachments based on type
  const renderAttachments = () => {
    if (!attachments.length) return null;
    
    return (
      <div className="flex flex-col gap-2 mt-2">
        {attachments.map((attachment) => (
          <div 
            key={attachment.id}
            className="flex items-center gap-2 bg-background/50 rounded p-2 text-xs dark:bg-gray-800/50"
          >
            {attachment.type.startsWith("image/") ? (
              <div className="relative w-full max-w-[240px]">
                <img 
                  src={attachment.url} 
                  alt={attachment.name}
                  className="rounded object-cover max-h-[200px] w-full"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  {getFileIcon(attachment.type)}
                  <span className="font-medium truncate max-w-[150px]">{attachment.name}</span>
                </div>
                <a 
                  href={attachment.url} 
                  download={attachment.name}
                  className="p-1 hover:bg-background rounded-full dark:hover:bg-gray-700"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  // Truncate reply preview text to a reasonable length
  const truncateReplyText = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Render the reply quote if there's a replyToId
  const renderReplyQuote = () => {
    if (!replyToMessage) return null;
    
    return (
      <div className={cn(
        "flex items-start gap-1.5 rounded-l-md pl-2 py-1 mb-1 text-xs",
        "border-l-2 bg-muted/30 max-w-[90%]",
        isUser ? "ml-auto mr-1 border-primary/40" : "mr-auto ml-1 border-muted-foreground/40",
        "dark:bg-gray-800/30"
      )}>
        <CornerUpLeft className="h-3 w-3 mt-0.5 shrink-0" />
        <div className="overflow-hidden">
          <div className="font-medium text-[10px]">
            {replyToMessage.isUser ? "You" : BOT_CONFIG.NAME}
          </div>
          <div className="opacity-90 break-words whitespace-nowrap overflow-hidden text-ellipsis">
            {truncateReplyText(replyToMessage.content)}
          </div>
        </div>
      </div>
    );
  };
  
  // Render streaming indicator if message is being streamed
  const renderStreamingIndicator = () => {
    if (!isStreaming) return null;
    
    return (
      <div className="flex items-center gap-1.5 opacity-70 text-xs mt-1 ml-1">
        <div className="flex space-x-1 items-center">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150"></div>
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-300"></div>
        </div>
        <span>AI is typing...</span>
      </div>
    );
  };
  
  // Detect and process code blocks and headings in the message
  const processMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    // First process code blocks
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before the code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }
      
      // Add the code block
      const language = match[1] || 'text';
      const code = match[2];
      parts.push({
        type: 'code',
        language,
        content: code
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last code block
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }
    
    // If no code blocks were found, return the entire message as text
    if (parts.length === 0) {
      return [{
        type: 'text',
        content
      }];
    }
    
    return parts;
  };

  // Process headings in text content
  const processHeadings = (text: string) => {
    // Replace heading markdown with formatted headings
    // Match ### headings
    return text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
              // Match ## headings
              .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
              // Match # headings
              .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  };

  // Render the message content with code blocks
  const renderMessageContent = (content: string, skipAnim = skipGeneration || isUser) => {
    const parts = processMessageContent(content);
    
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div key={index} className="my-3">
            <CodeBlock 
              code={part.content} 
              language={part.language}
              showLineNumbers={true}
            />
          </div>
        );
      } else {
        // Process headings in text content
        const processedContent = processHeadings(part.content);
        
        // Use streaming effect or normal text based on settings and state
        const shouldUseStreamingEffect = !skipAnim && !isUser && useStreaming && !isStreaming;
        
        return shouldUseStreamingEffect ? (
          <div key={index} className="prose dark:prose-invert max-w-none">
            <TextGenerateEffect words={part.content} />
          </div>
        ) : (
          <div 
            key={index} 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: processedContent }} 
          />
        );
      }
    });
  };

  // If we should not animate, directly show the full message
  if (!isUser && skipGeneration) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 w-full max-w-[95%] group",
          "mr-auto"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
            "bg-primary/20 dark:bg-gray-700"
          )}
        >
          <Wrench className="w-3 h-3 text-primary dark:text-gray-300" />
        </div>

        <div className="flex flex-col gap-1 min-w-0 relative w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">
              {BOT_CONFIG.EMOJI.DEFAULT} {BOT_CONFIG.NAME}
            </span>
            {timestamp && (
              <span className="text-[10px] opacity-70 dark:opacity-50">{timestamp}</span>
            )}
          </div>
          
          {renderReplyQuote()}
          
          <div className="rounded-none p-0">
            {renderMessageContent(message, true)}
            {renderAttachments()}
          </div>
          
          {/* Reply button (visible on hover) */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -left-7 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5"
            onClick={handleReply}
          >
            <Reply className="h-3 w-3" />
          </Button>
          {renderStreamingIndicator()}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col max-w-full", 
      isUser ? "items-end" : "items-start"
    )}>
      {renderReplyQuote()}
      <div className={cn(
        "flex gap-3 max-w-[85%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <Avatar className={cn(
          "h-8 w-8 rounded-full ring-2 ring-offset-2 flex items-center justify-center",
          isUser 
            ? "bg-primary text-white ring-primary/10" 
            : "bg-muted text-muted-foreground ring-muted/20"
        )}>
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </Avatar>
        <div className="space-y-1 max-w-full">
          <div className={cn(
            "bg-muted rounded-lg p-3 text-sm relative flex flex-col",
            !isUser && "dark:bg-gray-800"
          )}>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/5" />
            <div className="relative">
              {renderMessageContent(message)}
              {renderAttachments()}
            </div>
          </div>
          {renderStreamingIndicator()}
          <div className="flex items-center gap-2 ml-1">
            {timestamp && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={handleReply} className="text-muted-foreground h-5 w-5">
                <Reply className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 