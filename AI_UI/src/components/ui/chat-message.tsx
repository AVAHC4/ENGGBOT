 
 
import React, { useEffect, useState } from "react";
import { cn, openInCompiler } from "@/lib/utils";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import dynamic from 'next/dynamic';

import { User, File, Image as ImageIcon, FileAudio, FileVideo, Download, CornerUpLeft, Copy, Check, RefreshCw, Play, ChevronDown, ChevronRight, Brain } from "lucide-react";
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
import * as pythonExecutor from '@/lib/executors/pythonExecutor';



export interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  attachments?: Attachment[];
  skipGeneration?: boolean;
  messageData: ExtendedChatMessage;
}

function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full px-3 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <Brain className="w-3 h-3 mr-2" />
        <span>Thinking Process</span>
        <div className="ml-auto">
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-t border-blue-200 dark:border-blue-900/50 bg-white/50 dark:bg-transparent">
          <div className="prose prose-xs dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
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
  const [codeExecutionResults, setCodeExecutionResults] = useState<Map<string, any>>(new Map());
  const [executingCode, setExecutingCode] = useState<Set<string>>(new Set());

   
  const replyToMessage = messageData.replyToId
    ? messages.find(msg => msg.id === messageData.replyToId)
    : null;

   
  const isStreaming = messageData.isStreaming === true;

   
  let thinkingContent = null;
  let mainContent = message;

   
   
  const thinkMatch = /^(<think>)([\s\S]*?)(?:<\/think>|$)/.exec(message);

  if (thinkMatch && !isUser) {
    thinkingContent = thinkMatch[2];
     
     
    if (message.includes('</think>')) {
      mainContent = message.split('</think>')[1] || '';
       
      mainContent = mainContent.replace(/^\n+/, '');
    } else {
      mainContent = '';  
    }
  }

   
  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);  
    });
  };

   
  const handleCopyCode = (code: string, blockId: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(blockId.toString());
      setTimeout(() => setCodeCopied(null), 2000);  
    });
  };

   
  const handleOpenInCompiler = (code: string, language: string) => {
     
     
    const compilerUrl = `/compiler?code=${encodeURIComponent(code)}&language=${encodeURIComponent(language)}`;
    window.open(compilerUrl, '_blank');
  };

   
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await regenerateLastResponse();
    setIsRegenerating(false);
  };

   
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4" />;
    if (type.startsWith("video/")) return <FileVideo className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };


   
  useEffect(() => {
    if (isUser) return;  

     
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let index = 0;

    while ((match = codeBlockRegex.exec(mainContent)) !== null) {
      const language = match[1] || 'text';
      const code = match[2];
      const codeKey = `${messageData.id}-${index}`;
      const isPython = language === 'python';
      const hasVisualization = isPython && (code.includes('plt.show'));
      const alreadyExecuted = codeExecutionResults.has(codeKey);
      const currentlyExecuting = executingCode.has(codeKey);

      if (hasVisualization && !alreadyExecuted && !currentlyExecuting) {
         
        const executeCode = async () => {
          setExecutingCode(prev => new Set(prev).add(codeKey));
          try {
            await pythonExecutor.init();
            const result = await pythonExecutor.execute(code, '', async () => '');
            setCodeExecutionResults(prev => new Map(prev).set(codeKey, result));
          } catch (error) {
            console.error('[ChatMessage] Python Execution Error:', error);
            setCodeExecutionResults(prev => new Map(prev).set(codeKey, { error: String(error) }));
          } finally {
            setExecutingCode(prev => {
              const newSet = new Set(prev);
              newSet.delete(codeKey);
              return newSet;
            });
          }
        };
        executeCode();
      }

      index++;
    }
  }, [mainContent, messageData.id, isUser, codeExecutionResults, executingCode]);


   
  const renderAttachments = () => {
    if (!attachments || !attachments.length) return null;

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

   
  const truncateReplyText = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

   
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

   
  const renderStreamingIndicator = () => {
    if (!isStreaming) return null;

    return (
      <div className="typing-indicator">
        <AITextLoading />
      </div>
    );
  };

   
  const processMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

     
    while ((match = codeBlockRegex.exec(content)) !== null) {
       
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

       
      const language = match[1] || 'text';
      const code = match[2];
      parts.push({
        type: 'code',
        language,
        content: code
      });

      lastIndex = match.index + match[0].length;
    }

     
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

     
    if (parts.length === 0) {
      return [{
        type: 'text',
        content
      }];
    }

    return parts;
  };

   
  const renderMessageContent = (content: string, skipAnim = skipGeneration || isUser) => {
    const parts = processMessageContent(content);

    return parts.map((part, index) => {
      if (part.type === 'code') {
        const isThisBlockCopied = codeCopied === `${index}`;
        const codeKey = `${messageData.id}-${index}`;
        const isPython = part.language === 'python';
        const hasVisualization = isPython && (part.content.includes('plt.show'));
        const executionResult = codeExecutionResults.get(codeKey);
        const isExecuting = executingCode.has(codeKey);

        const executeCode = async (code: string, key: string) => {
          setExecutingCode(prev => new Set(prev).add(key));
          try {
            await pythonExecutor.init();
            const result = await pythonExecutor.execute(code, '', async () => '');
            setCodeExecutionResults(prev => new Map(prev).set(key, result));
          } catch (error) {
            setCodeExecutionResults(prev => new Map(prev).set(key, { error: String(error) }));
          } finally {
            setExecutingCode(prev => {
              const newSet = new Set(prev);
              newSet.delete(key);
              return newSet;
            });
          }
        };

        return (
          <div key={index} className="code-block-container my-3">
            <div className="code-header">
              <div className="language-label">
                {part.language || 'text'}
              </div>
              <div className="code-actions">
                {isPython && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => executeCode(part.content, codeKey)}
                    disabled={isExecuting}
                    className="action-button"
                    aria-label="Run code"
                  >
                    <Play className="action-icon h-4 w-4 mr-1" />
                    <span>{isExecuting ? 'Running...' : 'Run'}</span>
                  </Button>
                )}
                <button
                  onClick={() => openInCompiler(part.content, part.language || 'javascript')}
                  className="action-button"
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

            { }
            {executionResult && (() => {
              console.log('[ChatMessage] Execution Result:', {
                hasOutput: !!executionResult.output,
                hasError: !!executionResult.error,
                hasPlots: !!executionResult.plots,
                plotsLength: executionResult.plots?.length || 0
              });
              return null;
            })()}
            {executionResult && (
              <div className="mt-2 p-3 bg-black rounded border border-gray-700">
                {executionResult.output && (
                  <pre className="text-sm text-green-400 whitespace-pre-wrap font-mono">
                    {executionResult.output}
                  </pre>
                )}
                {executionResult.error && (
                  <pre className="text-sm text-red-400 whitespace-pre-wrap font-mono">
                    {executionResult.error}
                  </pre>
                )}
                {executionResult.plots && executionResult.plots.map((plot: string, i: number) => (
                  <img key={i} src={`data:image/png;base64,${plot}`} alt="Plot" className="max-w-full h-auto my-2 rounded" />
                ))}
              </div>
            )}
          </div>
        );
      } else {
         
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

                  return null;  
                },
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                 
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
            {thinkingContent && <ThinkingBlock content={thinkingContent} />}
            {renderMessageContent(mainContent)}
            {renderAttachments()}
            {renderStreamingIndicator()}
          </div>
          {timestamp && <div className="message-timestamp mt-1 text-xs text-gray-400">{timestamp}</div>}

          { }
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
