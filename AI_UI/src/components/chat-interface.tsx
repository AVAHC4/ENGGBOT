import React, { useEffect, useState, useRef } from 'react';
import { ChatMessageList } from '@/components/ui/chat-message-list';
import { ChatMessage } from '@/components/ui/chat-message';
import { ChatInput } from '@/components/ui/chat-input';
import { useChat } from '@/context/chat-context';
import { Loader2, BrainCircuit, ChevronDown, Square, StopCircle, Lightbulb, Globe } from 'lucide-react';
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
} from "@/components/ui/alert-dialg";
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

// Enhanced typing animation component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1">
      <span className="animate-bounce h-1.5 w-1.5 bg-current rounded-full delay-0" />
      <span className="animate-bounce h-1.5 w-1.5 bg-current rounded-full delay-150" style={{ animationDelay: '0.2s' }} />
      <span className="animate-bounce h-1.5 w-1.5 bg-current rounded-full delay-300" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}

// AI thinking animation component
function ThinkingAnimation() {
  return (
    <div className="flex items-start gap-2 w-full max-w-[95%] mr-auto mb-1 mt-2">
      <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-primary/20 dark:bg-gray-700">
        <Lightbulb className="w-3 h-3 text-primary dark:text-gray-300 animate-pulse" />
      </div>

      <div className="flex flex-col gap-1 min-w-0 relative">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{BOT_CONFIG.EMOJI.THINKING} {BOT_CONFIG.NAME}</span>
        </div>
        
        <div className="flex items-center gap-2 rounded p-2 px-3 bg-muted/30 dark:bg-gray-800/30 text-xs">
          <div className="typing-animation flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-current rounded-full animate-pulse" />
            <span className="h-1.5 w-1.5 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <span className="h-1.5 w-1.5 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Initializing AI indicator component
function InitializingAIIndicator() {
  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs font-medium">Initializing {BOT_CONFIG.NAME} AI...</span>
      </div>
    </div>
  );
}

export function ChatInterface() {
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
    addMessage
  } = useChat();
  
  // Add local loading state to ensure animation shows immediately
  const [localLoading, setLocalLoading] = useState(false);
  
  // Track which messages have already been displayed
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(new Set());
  
  // Previous messages count ref to detect new messages
  const previousMessagesCountRef = useRef(messages.length);
  
  // Add state to track AI client initialization
  const [isAIInitializing, setIsAIInitializing] = useState(!isClientInitialized());
  
  // Initialize AI client on component mount
  useEffect(() => {
    if (!isClientInitialized()) {
      setIsAIInitializing(true);
      // Initialize the AI client
      initializeAIClient().finally(() => {
        setIsAIInitializing(false);
      });
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
    <div className="flex flex-col overflow-hidden chat-interface transition-all duration-300 max-w-4xl mx-auto px-4">
      <div className="p-1.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button 
                className="text-xs bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded px-2 py-0.5 transition-colors dark:bg-gray-800/50 dark:hover:bg-gray-700/50"
              >
                Clear chat
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
        </div>
      </div>
      
      <div className="flex-1 overflow-auto mb-[80px]">
        <ChatMessageList 
          className="space-y-2 px-2"
          smooth={true}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">Send a message to start the conversation</p>
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
        </ChatMessageList>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-background z-10 flex justify-center">
        <div className="w-full max-w-3xl px-4">
          <ChatInput 
            onSend={handleSendMessage} 
            disabled={isLoading && !isGenerating || isAIInitializing}
            thinkingMode={thinkingMode}
            onToggleThinking={toggleThinkingMode}
            webSearchMode={webSearchMode}
            onToggleWebSearch={toggleWebSearchMode}
            placeholder={isAIInitializing ? "AI is initializing..." : `Message ${BOT_CONFIG.NAME}${thinkingMode ? ' (thinking mode enabled)' : ''}${webSearchMode ? ' (web search enabled)' : ''}...`}
            isAwaitingResponse={isLoading || isGenerating}
            onStopGeneration={stopGeneration}
          />
        </div>
      </div>
      
      {/* Show AI initializing indicator */}
      {isAIInitializing && <InitializingAIIndicator />}
    </div>
  );
}