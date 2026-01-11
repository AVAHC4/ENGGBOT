"use client";

import React, { createContext, useState, useContext, useCallback, ReactNode, useRef, useEffect } from 'react';
import { AVAILABLE_MODELS } from '@/lib/ai/openrouter-client';
import { getAllConversationsMetadata, loadConversation, saveConversation, deleteConversation, getUserPrefix, getConversationList, clearConversationMessages } from "@/lib/storage";

export interface Attachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

// Local base chat message type to avoid importing from server route files
export interface ChatMessageBase {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface ExtendedChatMessage extends ChatMessageBase {
  isUser: boolean; // Explicit for build-time type safety
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
  regenerateLastResponse: () => Promise<void>;
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  engineeringMode: boolean;
  toggleEngineeringMode: () => void;
  setMessages: (messages: ExtendedChatMessage[]) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(true);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const currentModel = "openai/gpt-oss-120b:free";
  const [replyToMessage, setReplyToMessage] = useState<ExtendedChatMessage | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [engineeringMode, setEngineeringMode] = useState(false);

  // Track which message IDs have been fully displayed
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(new Set());

  // Add conversation management with a default ID that will be updated after client-side mount
  const [conversationId, setConversationId] = useState<string>(crypto.randomUUID());

  // Track if this is a project conversation (when set, skip regular save/load)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Create a ref to track the current request ID
  const currentRequestIdRef = useRef<string | null>(null);
  const isCanceledRef = useRef<boolean>(false);

  // Track the current conversation ID to prevent saving messages to wrong conversation
  const conversationIdRef = useRef<string>(conversationId);

  // Set isMounted flag on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize conversationId after mount
  useEffect(() => {
    if (isMounted) {
      // Get user-specific prefix
      const userPrefix = getUserPrefix();
      const storageKey = `${userPrefix}-activeConversation`;

      // Get the stored conversation ID or generate a new one
      const storedId = localStorage.getItem(storageKey);
      if (storedId) {
        setConversationId(storedId);
      } else {
        const newId = crypto.randomUUID();
        setConversationId(newId);
        localStorage.setItem(storageKey, newId);
      }
    }
  }, [isMounted]);

  // Load conversation on startup or when switching conversations
  // SKIP if we're in project mode (project page handles its own loading)
  useEffect(() => {
    console.log('[ChatContext] useEffect triggered:', { conversationId, isMounted, isPrivateMode, currentProjectId });
    if (isMounted && !isPrivateMode && !currentProjectId) {
      // Update the ref to match current conversationId
      conversationIdRef.current = conversationId;

      // Capture current ID to check for staleness after async load
      const loadingId = conversationId;

      // Load conversation asynchronously
      console.log('[ChatContext] Loading conversation:', conversationId);
      loadConversation(conversationId).then((savedMessages) => {
        // CRITICAL: Only set messages if we're still on the same conversation
        // This prevents race conditions when user switches conversations quickly
        if (conversationIdRef.current !== loadingId) {
          console.log('[ChatContext] Skipping stale load for:', loadingId.substring(0, 8));
          return;
        }

        console.log('[ChatContext] Loaded messages:', savedMessages?.length || 0, 'messages');
        if (savedMessages && savedMessages.length) {
          // Sort messages by timestamp first
          let sortedMessages = [...savedMessages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // HEURISTIC FIX: Detect and repair inverted message order (AI appearing before User due to clock skew)
          // Look for patterns where AI message is immediately followed by a User message with very close timestamp
          let hasModifications = false;

          for (let i = 0; i < sortedMessages.length - 1; i++) {
            const current = sortedMessages[i];
            const next = sortedMessages[i + 1];

            // If current is AI and next is User
            if (!current.isUser && next.isUser) {
              const currentTime = new Date(current.timestamp).getTime();
              const nextTime = new Date(next.timestamp).getTime();

              // If they are within 2 seconds of each other (typical race condition window)
              // We assume this is a flipped pair (User prompt -> AI response)
              if (nextTime - currentTime < 2000) {
                console.log('[ChatContext] Healing inverted message order:', {
                  ai: current.id, user: next.id, diff: nextTime - currentTime
                });

                // Fix: Move AI timestamp to be slighty after User timestamp
                // We construct a new Date object to avoid reference issues
                const fixedTimestamp = new Date(nextTime + 50).toISOString(); // User time + 50ms

                sortedMessages[i] = {
                  ...current,
                  timestamp: fixedTimestamp
                };

                hasModifications = true;
                // Don't increment i, so we can re-check this new AI message against the *next* one if needed? 
                // No, just swapping this pair is enough for now.
              }
            }
          }

          // If we modified timestamps, re-sort and save back to DB to make it permanent
          if (hasModifications) {
            sortedMessages.sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            // Verify order is now User -> AI
            console.log('[ChatContext] Saving healed conversation order');
            saveConversation(conversationId, sortedMessages);
          }

          setMessages(sortedMessages);
        } else {
          setMessages([]);
        }
      }).catch((error) => {
        console.error('Error loading conversation:', error);
        // Only clear if still on same conversation
        if (conversationIdRef.current === loadingId) {
          setMessages([]);
        }
      });

      // Get user-specific prefix
      const userPrefix = getUserPrefix();
      const storageKey = `${userPrefix}-activeConversation`;

      localStorage.setItem(storageKey, conversationId);
    }
  }, [conversationId, isMounted, isPrivateMode, currentProjectId]);

  // Save messages when they change (but NOT while AI is generating/streaming)
  // CRITICAL: Only save if messages belong to the current conversation
  // SKIP if we're in project mode (project page handles its own saving)
  useEffect(() => {
    // Skip saving while AI is generating - will save when streaming completes
    // Also skip if conversationId doesn't match ref (prevents saving old messages to new conversation)
    // Skip if in project mode
    if (isMounted && messages.length > 0 && !isPrivateMode && !isGenerating && !currentProjectId && conversationIdRef.current === conversationId) {
      saveConversation(conversationId, messages);
    }
  }, [messages, conversationId, isMounted, isPrivateMode, isGenerating, currentProjectId]);

  // Update the displayed message IDs when messages change
  useEffect(() => {
    setDisplayedMessageIds(new Set(messages.map(m => m.id)));
  }, [messages]);

  // Helper to hide appended technical context from the user message bubble
  const getUserDisplayContent = (text: string) => {
    const markers = ['\n\n[WEB SEARCH RESULTS', '\n\n[FILES CONTEXT]'];
    let cutoff = text.length;
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx >= 0 && idx < cutoff) cutoff = idx;
    }
    return text.slice(0, cutoff);
  };

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

    // Mark any streaming messages as complete to hide the animation
    setMessages(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    ));
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

      // Add user message - remove any appended context for user display
      // We hide [WEB SEARCH RESULTS] and [FILES CONTEXT] blocks
      const userDisplayContent = getUserDisplayContent(content);

      // Ensure timestamps are monotonic
      const now = new Date();
      const userTimestamp = now.toISOString();
      // Ensure AI message timestamp is strictly after user message
      const aiTimestamp = new Date(now.getTime() + 50).toISOString();

      const userMessage: ExtendedChatMessage = {
        id: crypto.randomUUID(),
        content: userDisplayContent, // Only show the user's original message, not the web search data
        isUser: true,
        timestamp: userTimestamp,
        attachments,
        replyToId // Add the reply reference if present
      };

      // Update messages state with the new user message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Clear any reply state
      setReplyToMessage(null);

      // Save conversation after adding user message
      if (typeof window !== 'undefined' && !isPrivateMode) {
        saveConversation(conversationId, updatedMessages);
      }

      setIsLoading(true);
      // Set generating state to true immediately when sending message
      setIsGenerating(true);

      // Build content for API, optionally enriched with processed files context
      let contentForAPI = content;

      if (files.length > 0) {
        try {
          const formData = new FormData();
          files.forEach((f, i) => formData.append(`file${i}`, f));

          const fpRes = await fetch('/api/files/process', {
            method: 'POST',
            body: formData
          });

          if (fpRes.ok) {
            const data = await fpRes.json();
            const fileLines = (data.files || []).map((f: any) => `- ${f.name}${f.truncated ? ' (truncated)' : ''}`).join('\n');
            const filesContext = `\n\n[FILES CONTEXT]\nThe user attached ${(data.files || []).length || files.length} file(s):\n${fileLines}\n\n[FILES TEXT]\n${data.combinedText || ''}\n[/FILES TEXT]\n`;
            const followUpDirective = `\nPlease use the files context above to answer the user's request. If appropriate, ask one concise follow-up question to confirm intent or propose next steps.`;
            contentForAPI = content + filesContext + followUpDirective;
          } else {
            console.error('File processing failed with status:', fpRes.status);
          }
        } catch (e) {
          console.error('File processing error:', e);
        }
      }

      // Create a placeholder for the AI response
      const aiMessageId = crypto.randomUUID();
      const aiMessage: ExtendedChatMessage = {
        id: aiMessageId,
        content: "",
        isUser: false,
        timestamp: aiTimestamp, // Use the strictly ordered timestamp
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
            message: contentForAPI,
            rawMessage: content,
            hasAttachments: files.length > 0,
            model: currentModel,
            thinkingMode: thinkingMode,
            engineeringMode: engineeringMode,
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
            // Update message to mark as no longer streaming AND save complete conversation
            setMessages(prev => {
              const finalMessages = prev.map(m =>
                m.id === aiMessageId ? { ...m, isStreaming: false } : m
              );

              // Save the COMPLETE conversation with the full AI response
              if (typeof window !== 'undefined' && !isPrivateMode) {
                saveConversation(conversationId, finalMessages);
              }

              return finalMessages;
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

                // Handle error from server
                if (data.error) {
                  console.error("Error from server:", data.error);
                  setMessages(prev => {
                    const updatedMessages = prev.map(m =>
                      m.id === aiMessageId
                        ? { ...m, content: `Error: ${data.error}`, isStreaming: false }
                        : m
                    );

                    // Save conversation
                    if (typeof window !== 'undefined' && !isPrivateMode) {
                      saveConversation(conversationId, updatedMessages);
                    }

                    return updatedMessages;
                  });

                  // Reset states
                  setIsLoading(false);
                  setIsGenerating(false);
                  continue;
                }

                // Update the streaming message (don't save yet - wait for completion)
                if (data.text) {
                  setMessages(prev => prev.map(m =>
                    m.id === aiMessageId
                      ? { ...m, content: m.content + data.text }
                      : m
                  ));
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
      if (typeof window !== 'undefined' && !isPrivateMode) {
        saveConversation(conversationId, messagesWithError);
      }

      // Reset both states on error
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [conversationId, currentModel, messages, thinkingMode, engineeringMode, isPrivateMode]);

  const clearMessages = useCallback(() => {
    console.log('[ChatContext] clearMessages called:', { conversationId, isPrivateMode });
    setMessages([]);
    // Clear the conversation messages from database
    if (typeof window !== 'undefined' && !isPrivateMode) {
      console.log('[ChatContext] Calling clearConversationMessages...');
      clearConversationMessages(conversationId).then(success => {
        console.log('[ChatContext] clearConversationMessages result:', success);
      });
    }
  }, [conversationId, isPrivateMode]);

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
      if (typeof window !== 'undefined' && !isPrivateMode) {
        saveConversation(conversationId, updatedMessages);
      }
      return updatedMessages;
    });
  }, [conversationId, isPrivateMode]);

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
    if (typeof window !== 'undefined' && !isPrivateMode) {
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
          rawMessage: lastUserMessage.content,
          hasAttachments: !!lastUserMessage.attachments,
          model: currentModel,
          thinkingMode: thinkingMode,
          engineeringMode: engineeringMode,
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
            if (typeof window !== 'undefined' && !isPrivateMode) {
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
                  if (typeof window !== 'undefined' && !isPrivateMode) {
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
  }, [messages, conversationId, currentModel, thinkingMode, engineeringMode, isPrivateMode]);

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

    // Clear messages immediately BEFORE changing conversationId
    // This prevents the save effect from saving old messages to the new conversation
    setMessages([]);

    // Update the ref BEFORE setting state to prevent race conditions
    conversationIdRef.current = id;
    setConversationId(id);
  }, [isGenerating, isLoading, stopGeneration]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    // Stop any ongoing generation
    if (isGenerating || isLoading) {
      stopGeneration();
    }

    const newId = crypto.randomUUID();

    // Clear messages and update ref BEFORE changing conversationId
    setMessages([]);
    conversationIdRef.current = newId;
    setConversationId(newId);

    if (isMounted) {
      const userPrefix = getUserPrefix();
      const storageKey = `${userPrefix}-activeConversation`;

      localStorage.setItem(storageKey, newId);
      saveConversation(newId, []);
    }
  }, [isGenerating, isLoading, stopGeneration, isMounted]);

  // Delete the current conversation
  const deleteCurrentConversation = useCallback(() => {
    if (isMounted) {
      const deletingConversationId = conversationId;

      // Immediately clear messages and switch to new conversation (optimistic update)
      setMessages([]);

      // Start a new conversation immediately
      const newId = crypto.randomUUID();
      conversationIdRef.current = newId;
      setConversationId(newId);

      // Delete from backend in background
      (async () => {
        try {
          // Get conversation list
          const conversations = await getConversationList();

          // Delete conversation from backend
          await deleteConversation(deletingConversationId);

          // Check if there are other conversations to switch to
          const remainingConversations = conversations.filter((id: string) => id !== deletingConversationId);

          if (remainingConversations.length > 0) {
            // Switch to the first remaining conversation
            switchConversation(remainingConversations[0]);
          }
          // If no remaining, we already created a new one above
        } catch (error) {
          console.error('Error deleting conversation:', error);
        }
      })();
    }
  }, [conversationId, switchConversation, isMounted]);

  const toggleThinkingMode = useCallback(() => {
    setThinkingMode(prev => !prev);
  }, []);

  const toggleWebSearchMode = useCallback(() => {
    setWebSearchMode(prev => !prev);
  }, []);

  // Toggle private mode
  const togglePrivateMode = useCallback(() => {
    setIsPrivateMode(prev => {
      const newValue = !prev;

      if (newValue) {
        // When enabling private mode, clear the current conversation
        setMessages([]);
      } else {
        // When disabling private mode, load the saved conversation
        loadConversation(conversationId).then((savedMessages) => {
          if (savedMessages?.length) {
            setMessages(savedMessages);
          }
        });
      }

      return newValue;
    });
  }, [conversationId]);

  const toggleEngineeringMode = useCallback(() => {
    setEngineeringMode(prev => !prev);
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
    regenerateLastResponse,
    isPrivateMode,
    togglePrivateMode,
    engineeringMode,
    toggleEngineeringMode,
    setMessages,
    currentProjectId,
    setCurrentProjectId,
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
