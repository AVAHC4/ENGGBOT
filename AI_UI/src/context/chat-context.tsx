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
  isStreaming?: boolean; // Add streaming status indicator
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
  useStreaming: boolean; // Add streaming option
  toggleStreaming: () => void; // Add toggle function
  regenerateLastResponse: () => Promise<void>; // Add regenerate function
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
  const [useStreaming, setUseStreaming] = useState<boolean>(true); // Default to streaming

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
    // Set canceled flag
    isCanceledRef.current = true;
    
    // Reset states
    setIsLoading(false);
    setIsGenerating(false);
  }, []);

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

      // Check if streaming should be used
      if (useStreaming) {
        // Create a placeholder for the AI response
        const aiMessageId = crypto.randomUUID();
        const aiMessage: ExtendedChatMessage = {
          id: aiMessageId,
          content: "",
          isUser: false,
          timestamp: new Date().toISOString(),
          isStreaming: true
        };
        
        // Add the placeholder to messages
        const messagesWithPlaceholder = [...updatedMessages, aiMessage];
        setMessages(messagesWithPlaceholder);
        
        try {
          // Make a fetch request with streaming response instead of EventSource
          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: content,
              hasAttachments: !!attachments,
              model: currentModel,
              thinkingMode: thinkingMode,
              conversationId: conversationId,
              replyToId,
              conversationHistory: updatedMessages.slice(-10)
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("Stream reader could not be created");
          }
          
          const decoder = new TextDecoder();
          let buffer = "";
          
          // Process the stream chunks
          while (true) {
            // Check if the request was canceled
            if (isCanceledRef.current || currentRequestIdRef.current !== requestId) {
              reader.cancel();
              break;
            }
            
            const { done, value } = await reader.read();
            
            if (done) {
              // Update message to mark as no longer streaming
              setMessages(prev => prev.map(m => 
                m.id === aiMessageId ? { ...m, isStreaming: false } : m
              ));
              
              // Reset states
              setIsLoading(false);
              setIsGenerating(false);
              
              // Save conversation
              if (typeof window !== 'undefined') {
                saveConversation(
                  conversationId, 
                  messages.map(m => m.id === aiMessageId ? { ...m, isStreaming: false } : m)
                );
              }
              break;
            }
            
            // Decode and process the chunk
            buffer += decoder.decode(value, { stream: true });
            
            // Split buffer by lines and process each line
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last potentially incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim() === '') continue;
              if (!line.startsWith('data:')) continue;
              
              try {
                const eventData = line.slice(5).trim(); // Remove 'data: ' prefix
                
                if (eventData === "[DONE]") {
                  // End of stream, no need to parse as JSON
                  continue;
                }
                
                try {
                  const data = JSON.parse(eventData);
                  
                  // Update the streaming message
                  if (data.text) {
                    setMessages(prev => {
                      const updatedMessages = prev.map(m => 
                        m.id === aiMessageId 
                          ? { ...m, content: m.content + data.text } 
                          : m
                      );
                      
                      // Save intermediate state periodically
                      if (typeof window !== 'undefined') {
                        saveConversation(conversationId, updatedMessages);
                      }
                      
                      return updatedMessages;
                    });
                  }
                } catch (parseError) {
                  console.error("Error parsing JSON data:", parseError);
                }
              } catch (error) {
                console.error("Error processing stream line:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error in streaming:", error);
          
          // Update message to show error
          setMessages(prev => prev.map(m => 
            m.id === aiMessageId 
              ? { 
                  ...m, 
                  isStreaming: false, 
                  content: m.content || "Sorry, there was an error generating a response."
                } 
              : m
          ));
          
          // Reset states
          setIsLoading(false);
          setIsGenerating(false);
        }
        
        return;
      }
      
      // Non-streaming path (existing implementation)
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
  }, [conversationId, currentModel, messages, thinkingMode, useStreaming]);

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

  // Add regenerate function
  const regenerateLastResponse = useCallback(async () => {
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.isUser);
    
    if (lastUserMessageIndex === -1) {
      console.log("No user messages found to regenerate response for");
      return;
    }
    
    // Get the actual index in the messages array (from the end)
    const actualUserIndex = messages.length - 1 - lastUserMessageIndex;
    const lastUserMessage = messages[actualUserIndex];
    
    // Find the AI response that follows this user message (if any)
    const aiResponseIndex = actualUserIndex + 1;
    const hasAiResponse = aiResponseIndex < messages.length && !messages[aiResponseIndex].isUser;
    
    // Create a new request ID for this regeneration
    const requestId = crypto.randomUUID();
    currentRequestIdRef.current = requestId;
    
    // Reset the canceled state
    isCanceledRef.current = false;
    
    // Set loading states
    setIsLoading(true);
    setIsGenerating(true);
    
    // If streaming is enabled, update the existing AI message or create a new one
    if (useStreaming) {
      let aiMessageId;
      let updatedMessages;
      
      if (hasAiResponse) {
        // Use the existing AI message ID
        aiMessageId = messages[aiResponseIndex].id;
        
        // Update the existing AI message to show it's streaming again
        updatedMessages = [...messages];
        updatedMessages[aiResponseIndex] = {
          ...updatedMessages[aiResponseIndex],
          content: "",
          isStreaming: true
        };
      } else {
        // Create a new AI message
        aiMessageId = crypto.randomUUID();
        const aiMessage = {
          id: aiMessageId,
          content: "",
          isUser: false,
          timestamp: new Date().toISOString(),
          isStreaming: true
        };
        
        // Add the new AI message after the user message
        updatedMessages = [...messages.slice(0, actualUserIndex + 1), aiMessage];
      }
      
      // Update the messages state
      setMessages(updatedMessages);
      
      // Save the conversation state
      if (typeof window !== 'undefined') {
        saveConversation(conversationId, updatedMessages);
      }
      
      try {
        // Make a fetch request with streaming response
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: lastUserMessage.content,
            hasAttachments: !!lastUserMessage.attachments,
            model: currentModel,
            thinkingMode: thinkingMode,
            conversationId: conversationId,
            replyToId: lastUserMessage.replyToId,
            conversationHistory: messages.slice(0, actualUserIndex + 1).slice(-10)
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Stream reader could not be created");
        }
        
        const decoder = new TextDecoder();
        let buffer = "";
        
        // Process the stream chunks
        while (true) {
          // Check if the request was canceled
          if (isCanceledRef.current || currentRequestIdRef.current !== requestId) {
            reader.cancel();
            break;
          }
          
          const { done, value } = await reader.read();
          
          if (done) {
            // Update message to mark as no longer streaming
            setMessages(prev => {
              const updated = prev.map(m => 
                m.id === aiMessageId ? { ...m, isStreaming: false } : m
              );
              
              // Save conversation
              if (typeof window !== 'undefined') {
                saveConversation(conversationId, updated);
              }
              
              return updated;
            });
            
            // Reset states
            setIsLoading(false);
            setIsGenerating(false);
            break;
          }
          
          // Decode and process the chunk
          buffer += decoder.decode(value, { stream: true });
          
          // Split buffer by lines and process each line
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last potentially incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data:')) continue;
            
            try {
              const eventData = line.slice(5).trim(); // Remove 'data: ' prefix
              
              if (eventData === "[DONE]") {
                // End of stream, no need to parse as JSON
                continue;
              }
              
              try {
                const data = JSON.parse(eventData);
                
                // Update the streaming message
                if (data.text) {
                  setMessages(prev => {
                    // Find the message with the matching ID
                    const messageIndex = prev.findIndex(m => m.id === aiMessageId);
                    if (messageIndex === -1) return prev;
                    
                    // Create a new array with the updated message
                    const updated = [...prev];
                    updated[messageIndex] = {
                      ...updated[messageIndex],
                      content: updated[messageIndex].content + data.text
                    };
                    
                    // Save intermediate state periodically
                    if (typeof window !== 'undefined') {
                      saveConversation(conversationId, updated);
                    }
                    
                    return updated;
                  });
                }
              } catch (parseError) {
                console.error("Error parsing JSON data:", parseError);
              }
            } catch (error) {
              console.error("Error processing stream line:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error in streaming:", error);
        
        // Update message to show error
        setMessages(prev => {
          const messageIndex = prev.findIndex(m => m.id === aiMessageId);
          if (messageIndex === -1) return prev;
          
          const updated = [...prev];
          updated[messageIndex] = {
            ...updated[messageIndex],
            isStreaming: false,
            content: updated[messageIndex].content || "Sorry, there was an error generating a response."
          };
          
          return updated;
        });
        
        // Reset states
        setIsLoading(false);
        setIsGenerating(false);
      }
    } else {
      // Non-streaming implementation
      try {
        // If there's an AI response, keep only up to the user message
        if (hasAiResponse) {
          const updatedMessages = messages.slice(0, actualUserIndex + 1);
          setMessages(updatedMessages);
          
          // Save the conversation without the AI response
          if (typeof window !== 'undefined') {
            saveConversation(conversationId, updatedMessages);
          }
        }
        
        // Make a non-streaming request
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: lastUserMessage.content,
            hasAttachments: !!lastUserMessage.attachments,
            model: currentModel,
            thinkingMode: thinkingMode,
            conversationId: conversationId,
            replyToId: lastUserMessage.replyToId,
            conversationHistory: messages.slice(0, actualUserIndex + 1).slice(-10)
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
        const messagesWithResponse = [...messages.slice(0, actualUserIndex + 1), data.message];
        setMessages(messagesWithResponse);
        
        // Save conversation after adding AI response
        if (typeof window !== 'undefined') {
          saveConversation(conversationId, messagesWithResponse);
        }
      } catch (error) {
        console.error("Error regenerating response:", error);
        
        // Add error message if not canceled
        if (!isCanceledRef.current) {
          const errorMessage = {
            id: crypto.randomUUID(),
            content: 'Sorry, there was an error regenerating the response.',
            isUser: false,
            timestamp: new Date().toISOString(),
          };
          
          const messagesWithError = [...messages.slice(0, actualUserIndex + 1), errorMessage];
          setMessages(messagesWithError);
          
          // Save conversation with the error message
          if (typeof window !== 'undefined') {
            saveConversation(conversationId, messagesWithError);
          }
        }
      } finally {
        // Reset states
        setIsLoading(false);
        setIsGenerating(false);
      }
    }
  }, [messages, sendMessage, conversationId, currentModel, thinkingMode, useStreaming]);

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

  // Add toggle streaming function
  const toggleStreaming = useCallback(() => {
    setUseStreaming(prev => !prev);
  }, []);

  // Add useEffect to clean up resources on unmount
  useEffect(() => {
    return () => {
      // Nothing to clean up with the fetch-based approach
    };
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
    useStreaming,
    toggleStreaming,
    regenerateLastResponse, // Add regenerate function to context value
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