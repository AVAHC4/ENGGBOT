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
import { initializeAIClient, isClientInitialized } from '@/lib/ai/preload-client';
import { performWebSearch, SearchResult } from '@/lib/web-search';
import { EnggBotLogo } from '@/components/ui/enggbot-logo';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


// AI thinking animation component
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

// Removed the Initializing AI indicator overlay for cleaner UX

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

  // Add local loading state to ensure animation shows immediately
  const [localLoading, setLocalLoading] = useState(false);


  // Track which messages have already been displayed
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Previous messages count ref to detect new messages
  const previousMessagesCountRef = useRef(messages.length);

  // Initialize AI client on component mount (silent, no overlay)
  useEffect(() => {
    if (!isClientInitialized()) {
      initializeAIClient().catch(() => { });
    }
  }, []);

  // Keep track of displayed messages
  useEffect(() => {
    // If we have a new message
    if (messages.length > previousMessagesCountRef.current) {
      // Mark any existing messages as displayed
      const newDisplayedIds = new Set(displayedMessageIds);

      // Get all messages except the most recent one
      const existingMessages = messages.slice(0, -1);
      existingMessages.forEach(msg => {
        if (!msg.isUser) {
          newDisplayedIds.add(msg.id);
        }
      });

      setDisplayedMessageIds(newDisplayedIds);
    }

    // Update the ref for the next comparison
    previousMessagesCountRef.current = messages.length;

    // When generation completes, mark the last message as displayed
    if (!isGenerating && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage.isUser && !displayedMessageIds.has(lastMessage.id)) {
        setDisplayedMessageIds(prev => new Set(prev).add(lastMessage.id));
      }
    }
  }, [messages, isGenerating, displayedMessageIds]);

  // Reset displayed messages when conversation is cleared
  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedMessageIds(new Set());
    }
  }, [messages.length]);

  // Avoid smooth scrolling on each token update to prevent jitter
  // ChatMessageList handles keeping view pinned to bottom when appropriate
  // If we ever need to force-jump, do it instantly (no smooth)
  // Chat list manages auto-scroll; no need to force-scroll here
  useEffect(() => {
    // no-op
  }, [messages.length]);

  // Update local loading state
  useEffect(() => {
    if (isLoading) {
      setLocalLoading(true);
    } else {
      // Add a small delay before hiding the loading indicator
      const timeout = setTimeout(() => {
        setLocalLoading(false);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  // Add state to track if sidebar and conversation sidebar are collapsed
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Check if sidebar is collapsed
  useEffect(() => {
    const checkSidebarState = () => {
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      setIsSidebarCollapsed(isCollapsed);
    };

    // Check on initial load
    checkSidebarState();

    // Create a mutation observer to watch for changes to body class
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

  // Format date for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to create a wrapped sendMessage that also triggers local loading
  const handleSendMessage = async (content: string, files?: File[], replyToId?: string) => {
    setLocalLoading(true);

    // If web search mode is enabled, perform a search before sending the message
    if (webSearchMode && content.trim()) {
      try {
        // No need to set searching state visibly anymore
        // setIsSearching(true);

        // Perform the web search (now returns almost immediately)
        const results = await performWebSearch(content);

        // Add search context to the message that will be passed to the API
        let messageWithContext = content;

        if (results.length > 0) {
          // Format search results as context
          const currentDate = new Date().toLocaleDateString();
          let searchContext = `\n\n[WEB SEARCH RESULTS FROM ${currentDate}]\n`;

          results.forEach((result, index) => {
            searchContext += `\nSource ${index + 1}: ${result.title}\n`;
            searchContext += `Content: ${result.snippet}\n`;
            searchContext += `URL: ${result.url}\n`;
          });

          // Append search results to the message sent to the API
          messageWithContext = content + "\n\n" + searchContext;
        }

        // Send the message with search context
        await sendMessage(messageWithContext, files, replyToId);
      } catch (error) {
        console.error("Web search failed:", error);
        // Fall back to sending the original message
        await sendMessage(content, files, replyToId);
      }
    } else {
      // Normal message sending without web search
      await sendMessage(content, files, replyToId);
    }
  };

  // Helper to check if showing the thinking animation is appropriate
  const shouldShowThinking = () => {
    return (
      // Either the context loading state or our local loading state is active
      (isLoading || localLoading) &&
      // We have at least one message
      messages.length > 0 &&
      // Last message is from the user
      messages[messages.length - 1].isUser
    );
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
        {customHeader}
        <div className="relative grid flex-1 grid-rows-[auto_1fr_auto] min-h-0 bg-transparent">
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

              {/* Private Mode Toggle Button in Header */}
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

                  {/* Show thinking animation when waiting for AI response */}
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

          {/* Removed AI initializing indicator */}

          {/* Show private mode indicator */}
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