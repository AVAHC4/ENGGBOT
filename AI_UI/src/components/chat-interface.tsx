import React, { useEffect, useState, useRef } from 'react';
import AITextLoading from '@/components/ui/ai-text-loading';
import { ChatMessageListCompact } from '@/components/ui/chat-message-list';
import { ChatMessage } from '@/components/ui/chat-message';
import { ChatInput } from '@/components/ui/chat-input';
import { useChat } from '@/context/chat-context';
import { BrainCircuit, ChevronDown, Square, StopCircle, Lightbulb, Globe, EyeOff, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BOT_CONFIG } from '@/lib/ai/response-middleware';
import { performWebSearch, SearchResult } from '@/lib/web-search';
import { EnggBotLogo } from '@/components/ui/enggbot-logo';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";



function ThinkingAnimation() {
  return (
    <div className="message-container assistant-message">
      <div className="message-wrapper">
        <div className="message-avatar assistant-avatar">
          <EnggBotLogo />
        </div>
        <div className="message-content">
          <AITextLoading />
        </div>
      </div>
    </div>
  );
}



interface ChatInterfaceProps {
  className?: string;
  customHeader?: React.ReactNode;
}

export function ChatInterface({ className, customHeader }: ChatInterfaceProps) {
  const {
    messages,
    isLoading,
    isGenerating,
    stopGeneration,
    sendMessage,
    clearMessages,
    thinkingMode,
    toggleThinkingMode,
    webSearchMode,
    toggleWebSearchMode,
    currentModel,
    conversationId,
    addMessage,
    isPrivateMode,
    togglePrivateMode,
    engineeringMode,
    toggleEngineeringMode
  } = useChat();

  console.log('[ChatInterface] Render - messages:', messages.length, 'conversationId:', conversationId);


  const [localLoading, setLocalLoading] = useState(false);



  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const previousMessagesCountRef = useRef(messages.length);


  useEffect(() => {

    if (messages.length > previousMessagesCountRef.current) {

      const newDisplayedIds = new Set(displayedMessageIds);


      const existingMessages = messages.slice(0, -1);
      existingMessages.forEach(msg => {
        if (!msg.isUser) {
          newDisplayedIds.add(msg.id);
        }
      });

      setDisplayedMessageIds(newDisplayedIds);
    }


    previousMessagesCountRef.current = messages.length;


    if (!isGenerating && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage.isUser && !displayedMessageIds.has(lastMessage.id)) {
        setDisplayedMessageIds(prev => new Set(prev).add(lastMessage.id));
      }
    }
  }, [messages, isGenerating, displayedMessageIds]);


  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedMessageIds(new Set());
    }
  }, [messages.length]);





  useEffect(() => {

  }, [messages.length]);


  useEffect(() => {
    if (isLoading) {
      setLocalLoading(true);
    } else {

      const timeout = setTimeout(() => {
        setLocalLoading(false);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);



  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasWebSpeech = window.SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (hasWebSpeech) {
      console.log("Web Speech API available - skipping Whisper preload");
      return;
    }


    console.log("No Web Speech API - preloading Whisper for offline speech recognition");
    const timer = setTimeout(() => {


      console.log("Whisper preload disabled for debugging");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);


  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  useEffect(() => {
    const checkSidebarState = () => {
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      setIsSidebarCollapsed(isCollapsed);
    };


    checkSidebarState();


    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkSidebarState();
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => {
      observer.disconnect();
    };
  }, []);


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };


  const handleSendMessage = async (content: string, files?: File[], replyToId?: string) => {
    setLocalLoading(true);


    if (webSearchMode && content.trim()) {
      try {




        const results = await performWebSearch(content);


        let messageWithContext = content;

        if (results.length > 0) {

          const currentDate = new Date().toLocaleDateString();
          let searchContext = `\n\n[WEB SEARCH RESULTS FROM ${currentDate}]\n`;

          results.forEach((result, index) => {
            searchContext += `\nSource ${index + 1}: ${result.title}\n`;
            searchContext += `Content: ${result.snippet}\n`;
            searchContext += `URL: ${result.url}\n`;
          });


          messageWithContext = content + "\n\n" + searchContext;
        }


        await sendMessage(messageWithContext, files, replyToId);
      } catch (error) {
        console.error("Web search failed:", error);

        await sendMessage(content, files, replyToId);
      }
    } else {

      await sendMessage(content, files, replyToId);
    }
  };



  const shouldShowThinking = () => {
    return isGenerating && messages.length > 0 && messages[messages.length - 1].isUser;
  };



  return (
    <div
      className={cn(
        "chatgpt-container fixed top-0 bottom-0 right-0 left-0 overflow-hidden transition-all duration-300 ease-in-out",
        isSidebarCollapsed ? "lg:left-[80px]" : "lg:left-[280px]",
        className
      )}
    >
      <div className="flex flex-col h-full bg-transparent">
        {customHeader ? (
          <div className="flex items-center justify-between">
            <div className="flex-1">{customHeader}</div>
            <div className="header-actions pr-[20%]">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="clear-chat-button inline-flex items-center gap-2" aria-label="Clear chat">
                    <Trash2 className="h-4 w-4 md:hidden inline" aria-hidden="true" />
                    <span className="hidden md:inline">Clear chat</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action will permanently delete all messages in the current conversation. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearMessages} className="bg-red-600 hover:bg-red-700 text-white">
                      Clear Chat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "ml-2 h-8 w-8 rounded-full",
                      isPrivateMode && "text-red-500 dark:text-red-400"
                    )}
                    onClick={togglePrivateMode}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {isPrivateMode ? "Private mode enabled" : "Enable private mode"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : null}
        <div className="relative grid flex-1 grid-rows-[auto_1fr_auto] min-h-0 bg-transparent">
          {!customHeader && (
            <div className="chatgpt-header p-2 md:p-4 lg:p-6 bg-transparent">
              <div className="header-actions">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="clear-chat-button inline-flex items-center gap-2" aria-label="Clear chat">
                      <Trash2 className="h-4 w-4 md:hidden inline" aria-hidden="true" />
                      <span className="hidden md:inline">Clear chat</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will permanently delete all messages in the current conversation. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearMessages} className="bg-red-600 hover:bg-red-700 text-white">
                        Clear Chat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "ml-2 h-8 w-8 rounded-full",
                        isPrivateMode && "text-red-500 dark:text-red-400"
                      )}
                      onClick={togglePrivateMode}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {isPrivateMode ? "Private mode enabled" : "Enable private mode"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="chat-messages-container relative overflow-hidden min-h-0" style={{ background: 'transparent' }}>
            <ChatMessageListCompact
              className="message-list relative z-10 pb-24 md:pb-28 lg:pb-32"
              smooth={false}
            >
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <p>Send a message to start the conversation</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg.content}
                      isUser={msg.isUser}
                      timestamp={formatTime(msg.timestamp)}
                      attachments={msg.attachments}
                      skipGeneration={msg.isUser || displayedMessageIds.has(msg.id) || (!isGenerating && !isLoading)}
                      messageData={msg}
                    />
                  ))}

                  { }
                  {shouldShowThinking() && <ThinkingAnimation />}
                </>
              )}
            </ChatMessageListCompact>
          </div>

          <div className="chatgpt-input-container p-2 md:p-4 lg:p-6">
            <div className="chatgpt-input-wrapper">
              <ChatInput
                onSend={handleSendMessage}
                disabled={isLoading && !isGenerating}
                thinkingMode={thinkingMode}
                onToggleThinking={toggleThinkingMode}
                webSearchMode={webSearchMode}
                onToggleWebSearch={toggleWebSearchMode}
                engineeringMode={engineeringMode}
                onToggleEngineering={toggleEngineeringMode}
                placeholder={`Message ${BOT_CONFIG.NAME}${thinkingMode ? ' (thinking mode enabled)' : ''}${webSearchMode ? ' (web search enabled)' : ''}${engineeringMode ? ' (engineering mode enabled)' : ''}${isPrivateMode ? ' (private mode enabled)' : ''}...`}
                isAwaitingResponse={isLoading || isGenerating}
                onStopGeneration={stopGeneration}
              />
            </div>
          </div>

          { }

          { }
          {isPrivateMode && (
            <div className="private-mode-indicator">
              <span className="private-mode-text">Private Mode</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}