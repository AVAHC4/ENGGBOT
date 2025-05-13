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
  const { messages, setReplyToMessage } = useChat();
  
  // Get the message being replied to if replyToId exists
  const replyToMessage = messageData.replyToId 
    ? messages.find(msg => msg.id === messageData.replyToId) 
    : null;

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
    return text
      // Match ### headings
      .replace(/^###\s+(.+)$/gm, '<h3 class="text-base font-semibold my-3">$1</h3>')
      // Match ## headings
      .replace(/^##\s+(.+)$/gm, '<h2 class="text-lg font-semibold my-4">$1</h2>')
      // Match # headings
      .replace(/^#\s+(.+)$/gm, '<h1 class="text-xl font-bold my-4">$1</h1>');
  };

  // Process lists and tables
  const processLists = (text: string) => {
    // Process bullet lists
    let processed = text.replace(/^(?:- (.+))$/gm, '<li class="ml-6 list-disc my-1">$1</li>');
    
    // Process numbered lists
    processed = processed.replace(/^(?:\d+\.\s+(.+))$/gm, '<li class="ml-6 list-decimal my-1">$1</li>');
    
    // Group list items into ul/ol elements
    // Use non-s flag compatible regex for grouping list items
    processed = processed.replace(
      /(<li class="ml-6 list-disc my-1">.*?<\/li>)(\s*<li class="ml-6 list-disc my-1">)/gm, 
      '<ul class="my-2">$1$2'
    );
    processed = processed.replace(
      /(<li class="ml-6 list-decimal my-1">.*?<\/li>)(\s*<li class="ml-6 list-decimal my-1">)/gm, 
      '<ol class="my-2">$1$2'
    );
    
    // Close the lists - simplified approach without 's' flag
    processed = processed.replace(/<ul class="my-2">(.*?<\/li>)(\s*)(?!<li)/gm, '<ul class="my-2">$1$2</ul>');
    processed = processed.replace(/<ol class="my-2">(.*?<\/li>)(\s*)(?!<li)/gm, '<ol class="my-2">$1$2</ol>');
    
    // Process tables
    const tableRegex = /\|\s*(.*?)\s*\|\s*\n\|\s*[-:]+\s*\|\s*[-:]+\s*\|(?:\s*[-:]+\s*\|)*\s*\n((?:\|\s*.*?\s*\|\s*\n?)+)/g;
    processed = processed.replace(tableRegex, (match, headerRow, bodyRows) => {
      // Process header
      const headers: string[] = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);
      
      // Process body rows
      const rows: string[][] = bodyRows.trim().split('\n').map((row: string) => {
        const cells: string[] = row.split('|').map((c: string) => c.trim()).filter((c: string) => c);
        return cells;
      });
      
      // Build table HTML
      let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-border">';
      
      // Add header
      tableHtml += '<thead><tr>';
      headers.forEach((header: string) => {
        tableHtml += `<th class="bg-muted/50 px-4 py-2 text-left font-semibold border border-border">${header}</th>`;
      });
      tableHtml += '</tr></thead>';
      
      // Add body
      tableHtml += '<tbody>';
      rows.forEach((row: string[]) => {
        tableHtml += '<tr>';
        row.forEach((cell: string) => {
          tableHtml += `<td class="px-4 py-2 border border-border">${cell}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div>';
      
      return tableHtml;
    });
    
    return processed;
  };

  // Enhanced renderer for message content with better formatting
  const renderMessageContent = (content: string, skipAnim = false) => {
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
        // Process headings, lists, and tables in text content
        let processedContent = processHeadings(part.content);
        processedContent = processLists(processedContent);
        
        // Process horizontal rules
        processedContent = processedContent.replace(/^---+$/gm, '<hr class="my-4 border-t border-border" />');
        
        // Process bold and italic text
        processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        processedContent = processedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        return skipAnim ? (
          <div 
            key={index} 
            className="text-sm leading-relaxed whitespace-pre-wrap break-words markdown-content"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        ) : (
          <TextGenerateEffect 
            key={index}
            words={part.content} 
            className="!font-normal !text-sm leading-relaxed !text-current !mt-0" 
            duration={0.4}
            filter={true}
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
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 w-full max-w-[95%] group",
        isUser ? "ml-auto" : "mr-auto"
      )}
    >
      {isUser ? (
        <div className="flex flex-col items-end w-full">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">You</span>
            {timestamp && (
              <span className="text-[10px] opacity-70 dark:opacity-50">{timestamp}</span>
            )}
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
                "bg-primary text-primary-foreground"
              )}
            >
              <User className="w-3 h-3" />
            </div>
          </div>
          
          {renderReplyQuote()}
          
          <div className="rounded-none p-0 relative group">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message}
            </p>
            {renderAttachments()}
            
            {/* Reply button (visible on hover) */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 -ml-7 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5"
              onClick={handleReply}
            >
              <Reply className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <>
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
                {`${BOT_CONFIG.EMOJI.DEFAULT} ${BOT_CONFIG.NAME}`}
              </span>
              {timestamp && (
                <span className="text-[10px] opacity-70 dark:opacity-50">{timestamp}</span>
              )}
            </div>
            
            {renderReplyQuote()}
            
            <div className="rounded-none p-0 relative">
              {renderMessageContent(message)}
              {renderAttachments()}
              
              {/* Reply button (visible on hover) */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -left-7 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5"
                onClick={handleReply}
              >
                <Reply className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 