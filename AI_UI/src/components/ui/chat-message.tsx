/* eslint-disable @next/next/no-img-element */
// We intentionally use native <img> tags for markdown content to preserve default browser behaviors (right-click/save, blob URLs).
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

import { User, File, Image as ImageIcon, FileAudio, FileVideo, Download, CornerUpLeft, Copy, Check, RefreshCw } from "lucide-react";
import { Attachment, ExtendedChatMessage, useChat } from "@/context/chat-context";
import { Button } from "@/components/ui/button";
import NextImage from "next/image";

import { BOT_CONFIG } from "@/lib/ai/response-middleware";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { EnggBotLogo } from './enggbot-logo';
import AITextLoading from '@/components/ui/ai-text-loading';

export interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  attachments?: Attachment[];
  skipGeneration?: boolean;
  messageData: ExtendedChatMessage;
}

export function ChatMessage({
  message,
  isUser,
  timestamp,
  attachments = [],
  skipGeneration = false,
  messageData
}: ChatMessageProps) {
  const { messages, regenerateLastResponse } = useChat();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Get the message being replied to if replyToId exists
  const replyToMessage = messageData.replyToId
    ? messages.find(msg => msg.id === messageData.replyToId)
    : null;

  // Determine if this message is currently streaming
  const isStreaming = messageData.isStreaming === true;



  // Function to copy message content to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    });
  };

  // Function to copy code block content
  const handleCopyCode = (code: string, blockId: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(blockId.toString());
      setTimeout(() => setCodeCopied(null), 2000); // Reset after 2 seconds
    });
  };

  // Function to open code in compiler
  const handleOpenInCompiler = (code: string, language: string) => {
    // Replace '/compiler' with the actual path to your compiler page
    // Include the language parameter in the URL
    const compilerUrl = `/compiler?code=${encodeURIComponent(code)}&language=${encodeURIComponent(language)}`;
    window.open(compilerUrl, '_blank');
  };

  // Function to handle regeneration of AI response
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await regenerateLastResponse();
    setIsRegenerating(false);
  };

  // Function to determine the appropriate icon based on file type
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    if (type.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Render attachments based on type
  const renderAttachments = () => {
    if (!attachments.length) return null;

    return (
      <div className="attachments-container">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="attachment-item"
          >
            {attachment.type.startsWith("image/") ? (
              <div className="image-attachment">
                <NextImage
                  src={attachment.url}
                  alt={attachment.name || "Attachment"}
                  width={240}
                  height={200}
                  unoptimized
                  className="attachment-image"
                />
              </div>
            ) : (
              <div className="file-attachment">
                <div className="file-info">
                  {getFileIcon(attachment.type)}
                  <span className="file-name">{attachment.name}</span>
                </div>
                <a
                  href={attachment.url}
                  download={attachment.name}
                  className="download-button"
                >
                  <Download className="download-icon" />
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
        "reply-quote",
        isUser ? "user-reply" : "assistant-reply"
      )}>
        <CornerUpLeft className="reply-icon" />
        <div className="reply-content">
          <div className="reply-author">
            {replyToMessage.isUser ? "You" : BOT_CONFIG.NAME}
          </div>
          <div className="reply-text">
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
      <div className="typing-indicator">
        <AITextLoading />
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

  // Render the message content with code blocks
  const renderMessageContent = (content: string, skipAnim = skipGeneration || isUser) => {
    const parts = processMessageContent(content);

    return parts.map((part, index) => {
      if (part.type === 'code') {
        const isThisBlockCopied = codeCopied === index.toString();
        return (
          <div key={index} className="code-block-wrapper">
            <div className="code-block">
              <div className="code-header">
                <span className="code-language">{part.language}</span>
                <div className="code-actions">
                  <button
                    onClick={() => handleOpenInCompiler(part.content, part.language || 'text')}
                    className="code-action-button"
                    aria-label="Open in Compiler"
                  >
                    <svg fill="currentColor" width="14" height="14" viewBox="0 0 24 24">
                      <path d="M8.5,8.64L13.5,12L8.5,15.36V8.64M6.5,5V19L17.5,12" />
                    </svg>
                    <span>Open in Compiler</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(part.content, index)}
                    className="action-button"
                    aria-label="Copy code"
                  >
                    {isThisBlockCopied ? (
                      <>
                        <Check className="action-icon h-4 w-4 mr-1" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="action-icon h-4 w-4 mr-1" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <SyntaxHighlighter
                language={part.language}
                style={vscDarkPlus}
                className="code-content"
              >
                {part.content}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      } else {
        // Use streaming effect for AI messages that aren't being skipped or streaming
        const shouldUseStreamingEffect = !skipAnim && !isUser && !isStreaming;

        return shouldUseStreamingEffect ? (
          <div key={index} className="markdown-content">
            <TextGenerateEffect words={part.content} />
          </div>
        ) : (
          <div key={index} className="markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = !match && children;

                  if (inline) {
                    return (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    );
                  }

                  return null; // Non-inline code blocks are handled separately
                },
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                // Handle images in markdown content
                img: ({ node, alt, ...props }) => (
                  <img
                    {...props}
                    alt={alt || 'Embedded image'}
                    className="max-w-full h-auto rounded-lg my-2 shadow-sm"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      console.error('Failed to load image:', target.src);
                    }}
                  />
                ),
                // Add explicit table components to ensure proper rendering
                table: ({ node, ...props }) => (
                  <table {...props} />
                ),
                thead: ({ node, ...props }) => (
                  <thead {...props} />
                ),
                tbody: ({ node, ...props }) => (
                  <tbody {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td {...props} />
                )
              }}
            >
              {part.content}
            </ReactMarkdown>
          </div>
        );
      }
    });
  };

  return (
    <div className={cn(
      "message-container group",
      isUser ? "user-message" : "assistant-message"
    )}>
      <div className="message-wrapper">
        <div className={cn(
          "message-avatar",
          isUser ? "user-avatar" : "assistant-avatar"
        )}>
          {isUser ? <User size={20} /> : <EnggBotLogo />}
        </div>

        <div className="message-content">
          {renderReplyQuote()}

          <div className="message-body">
            {renderMessageContent(message)}
            {renderAttachments()}
            {renderStreamingIndicator()}
          </div>
          {timestamp && <div className="message-timestamp mt-1 text-xs text-gray-400">{timestamp}</div>}

          {/* Action buttons (visible on hover) */}
          <div className="message-actions flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
            {!isUser && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="action-button"
                >
                  {copied ? <Check className="action-icon h-4 w-4 mr-1" /> : <Copy className="action-icon h-4 w-4 mr-1" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  className="action-button"
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`action-icon h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>{isRegenerating ? "Regenerating..." : "Regenerate"}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
