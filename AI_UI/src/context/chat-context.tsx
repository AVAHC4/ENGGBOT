"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode, useRef, useEffect } from 'react';
import { ChatMessage } from '@/app/api/chat/route';
import { AVAILABLE_MODELS } from '@/lib/ai/chutes-client';
import { getAllConversationsMetadata, loadConversation, saveConversation, deleteConversation, getUserPrefix, getConversationList } from "@/lib/storage";

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface ExtendedChatMessage extends ChatMessage {
  attachments?: Attachment[];
  replyToId?: string; // ID of the message being replied to
  metadata?: Record<string, any>; // Add metadata field for additional data like search results
}

interface ChatContextType {
  messages: ExtendedChatMessage[];
  isLoading: boolean;
  isGenerating: boolean;
  stopGeneration: () => void;
  sendMessage: (content: string, files?: File[], replyToId?: string) => Promise<void>;
  clearMessages: () => void;
  thinkingMode: boolean;
  toggleThinkingMode: () => void;
  webSearchMode: boolean;
  toggleWebSearchMode: () => void;
  currentModel: string;
  conversationId: string;
  switchConversation: (id: string) => void;
  startNewConversation: () => void;
  deleteCurrentConversation: () => void;
  replyToMessage: ExtendedChatMessage | null;
  setReplyToMessage: (message: ExtendedChatMessage | null) => void;
  addMessage: (message: Partial<ExtendedChatMessage>) => void;
  displayedMessageIds: Set<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const currentModel = "deepseek-v3";
  const [replyToMessage, setReplyToMessage] = useState<ExtendedChatMessage | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Track which message IDs have been fully displayed
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(new Set());
  
  // Add conversation management with a default ID that will be updated after client-side mount
  const [conversationId, setConversationId] = useState<string>(crypto.randomUUID());
  
  // Create a ref to track the current request ID
  const currentRequestIdRef = useRef<string | null>(null);
  const isCanceledRef = useRef<boolean>(false);

  // Set isMounted flag on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize conversationId after mount
  useEffect(() => {
    if (isMounted) {
      // Get user-specific prefix
      const userPrefix = getUserPrefix();
      
      // Get the stored conversation ID or generate a new one
      const storedId = localStorage.getItem(`${userPrefix}-activeConversation`);
      if (storedId) {
        setConversationId(storedId);
      }
    }
  }, [isMounted]);

  // Load conversation on startup or when switching conversations
  useEffect(() => {
    if (isMounted) {
      const savedMessages = loadConversation(conversationId);
      if (savedMessages?.length) {
        setMessages(savedMessages);
      } else {
        setMessages([]);
      }
      
      // Get user-specific prefix
      const userPrefix = getUserPrefix();
      
      // Save active conversation ID with user-specific key
      localStorage.setItem(`${userPrefix}-activeConversation`, conversationId);
    }
  }, [conversationId, isMounted]);
  
  // Save messages when they change
  useEffect(() => {
    if (isMounted && messages.length > 0) {
      saveConversation(conversationId, messages);
    }
  }, [messages, conversationId, isMounted]);

  // Update the displayed message IDs when messages change
  useEffect(() => {
    setDisplayedMessageIds(new Set(messages.map(m => m.id)));
  }, [messages]);

  // Helper function to process file attachments
  const processAttachments = (files: File[]): Attachment[] => {
    return files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      // Create a local object URL for the file
      url: URL.createObjectURL(file)
    }));
  };

  const stopGeneration = useCallback(() => {
    // Mark the current request as canceled
    isCanceledRef.current = true;
    
    setIsGenerating(false);
    setIsLoading(false);
    
    // Optionally add a message indicating generation was stopped
    setMessages(prev => {
      // Check if the last message is from the AI and incomplete
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && !lastMessage.isUser) {
        // Add an indicator that generation was stopped
        const updatedMessages = [...prev.slice(0, -1), {
          ...lastMessage,
          content: lastMessage.content + " [Generation stopped]"
        }];
        
        // Save the updated messages
        if (typeof window !== 'undefined') {
          saveConversation(conversationId, updatedMessages);
        }
        
        return updatedMessages;
      }
      return prev;
    });
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, files: File[] = [], replyToId?: string) => {
    try {
      // Generate a new request ID
      const requestId = crypto.randomUUID();
      currentRequestIdRef.current = requestId;
      
      // Reset the canceled state
      isCanceledRef.current = false;
      
      // Process any attachments
      const attachments = files.length > 0 ? processAttachments(files) : undefined;
      
      // Add user message - remove any web search data for user display
      // The web search data will be appended after [WEB SEARCH RESULTS] marker
      const userDisplayContent = content.split('\n\n[WEB SEARCH RESULTS')[0];
      
      const userMessage: ExtendedChatMessage = {
        id: crypto.randomUUID(),
        content: userDisplayContent, // Only show the user's original message, not the web search data
        isUser: true,
        timestamp: new Date().toISOString(),
        attachments,
        replyToId // Add the reply reference if present
      };
      
      // Update messages state with the new user message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // Clear any reply state
      setReplyToMessage(null);
      
      // Save conversation after adding user message
      if (typeof window !== 'undefined') {
        saveConversation(conversationId, updatedMessages);
      }
      
      setIsLoading(true);
      // Set generating state to true immediately when sending message
      setIsGenerating(true);

      // Send to API with model, thinking mode preferences, and conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: content, // Send full content including web search data to the API
          hasAttachments: !!attachments,
          model: currentModel,
          thinkingMode: thinkingMode,
          conversationId: conversationId,
          replyToId, // Add the reply reference if present
          // Send recent message history for context (last 10 messages)
          conversationHistory: updatedMessages.slice(-10)
        }),
      });

      // Check if this request was canceled before continuing
      if (isCanceledRef.current || currentRequestIdRef.current !== requestId) {
        console.log('Request was canceled or superseded');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Check again if the request was canceled during json parsing
      if (isCanceledRef.current || currentRequestIdRef.current !== requestId) {
        console.log('Request was canceled or superseded after response');
        return;
      }
      
      // Add AI response to messages
      const messagesWithResponse = [...updatedMessages, data.message];
      setMessages(messagesWithResponse);
      
      // Save conversation after adding AI response
      if (typeof window !== 'undefined') {
        saveConversation(conversationId, messagesWithResponse);
      }
      
      // Reset states after successful response
      setIsLoading(false);
      setIsGenerating(false);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Ignore errors for canceled requests
      if (isCanceledRef.current) {
        console.log('Error occurred, but request was canceled');
        return;
      }
      
      // Add error message
      const errorMessage: ExtendedChatMessage = {
        id: crypto.randomUUID(),
        content: 'Sorry, there was an error processing your request.',
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      
      const messagesWithError = [...messages, errorMessage];
      setMessages(messagesWithError);
      
      // Save conversation with the error message
      if (typeof window !== 'undefined') {
        saveConversation(conversationId, messagesWithError);
      }
      
      // Reset both states on error
      setIsGenerating(false);
      setIsLoading(false);
    } finally {
      // We've handled state resetting in both success and error cases
      // No additional state handling needed here
    }
  }, [conversationId, currentModel, messages, thinkingMode]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    // Clear the conversation from storage
    if (typeof window !== 'undefined') {
      saveConversation(conversationId, []);
    }
  }, [conversationId]);
  
  const addMessage = useCallback((message: Partial<ExtendedChatMessage>) => {
    const newMessage: ExtendedChatMessage = {
      id: message.id || crypto.randomUUID(),
      content: message.content || '',
      isUser: message.isUser || false,
      timestamp: getTimestamp(message.timestamp),
      attachments: message.attachments,
      replyToId: message.replyToId,
      metadata: message.metadata
    };
    
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      // Save conversation after adding message
      if (typeof window !== 'undefined') {
        saveConversation(conversationId, updatedMessages);
      }
      return updatedMessages;
    });
  }, [conversationId]);

  // Helper function to handle timestamp conversion
  const getTimestamp = (timestamp: any): string => {
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    return new Date().toISOString();
  };

  // Switch to an existing conversation
  const switchConversation = useCallback((id: string) => {
    // Stop any ongoing generation
    if (isGenerating || isLoading) {
      stopGeneration();
    }
    
    setConversationId(id);
  }, [isGenerating, isLoading, stopGeneration]);
  
  // Start a new conversation
  const startNewConversation = useCallback(() => {
    // Stop any ongoing generation
    if (isGenerating || isLoading) {
      stopGeneration();
    }
    
    const newId = crypto.randomUUID();
    setConversationId(newId);
    setMessages([]);
    
    if (isMounted) {
      const userPrefix = getUserPrefix();
      localStorage.setItem(`${userPrefix}-activeConversation`, newId);
      saveConversation(newId, []);
    }
  }, [isGenerating, isLoading, stopGeneration, isMounted]);
  
  // Delete the current conversation
  const deleteCurrentConversation = useCallback(() => {
    if (isMounted) {
      // Get conversation list before deletion
      const conversations = getConversationList();
      
      // Delete current conversation
      deleteConversation(conversationId);
      
      // If there are other conversations, switch to the most recent one
      // Otherwise, create a new conversation
      const remainingConversations = conversations.filter((id: string) => id !== conversationId);
      
      if (remainingConversations.length > 0) {
        // Switch to the first conversation in the list
        switchConversation(remainingConversations[0]);
      } else {
        // Create a new conversation if no others exist
        startNewConversation();
      }
    }
  }, [conversationId, startNewConversation, switchConversation, isMounted]);

  const toggleThinkingMode = useCallback(() => {
    setThinkingMode(prev => !prev);
  }, []);

  const toggleWebSearchMode = useCallback(() => {
    setWebSearchMode(prev => !prev);
  }, []);

  // Return context value
  const value = {
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
    switchConversation,
    startNewConversation,
    deleteCurrentConversation,
    replyToMessage,
    setReplyToMessage,
    addMessage,
    displayedMessageIds,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 