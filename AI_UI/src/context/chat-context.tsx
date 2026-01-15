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

 
export interface ChatMessageBase {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

export interface ExtendedChatMessage extends ChatMessageBase {
  isUser: boolean;  
  attachments?: Attachment[];
  replyToId?: string;  
  metadata?: Record<string, any>;  
  isStreaming?: boolean;  
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

   
  const [displayedMessageIds, setDisplayedMessageIds] = useState<Set<string>>(new Set());

   
  const conversationsCacheRef = useRef<Record<string, ExtendedChatMessage[]>>({});

   
  const [conversationId, setConversationId] = useState<string>(crypto.randomUUID());

   
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

   
  const currentRequestIdRef = useRef<string | null>(null);
  const isCanceledRef = useRef<boolean>(false);

   
  const conversationIdRef = useRef<string>(conversationId);

   
  const currentProjectIdRef = useRef<string | null>(currentProjectId);

   
  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

   
  useEffect(() => {
    setIsMounted(true);
  }, []);

   
  useEffect(() => {
    if (isMounted) {
       
      const userPrefix = getUserPrefix();
      const storageKey = `${userPrefix}-activeConversation`;

       
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

   
   
  useEffect(() => {
    console.log('[ChatContext] useEffect triggered:', { conversationId, isMounted, isPrivateMode, currentProjectId });
    if (isMounted && !isPrivateMode && !currentProjectId) {
       
      conversationIdRef.current = conversationId;

       
      const loadingId = conversationId;

       
      console.log('[ChatContext] Loading conversation:', conversationId);
      loadConversation(conversationId).then((savedMessages) => {
         
         
        if (conversationIdRef.current !== loadingId) {
          console.log('[ChatContext] Skipping stale load for:', loadingId.substring(0, 8));
          return;
        }

         
         
        if (currentProjectIdRef.current) {
          console.log('[ChatContext] Skipping load - now in project mode:', currentProjectIdRef.current.substring(0, 8));
          return;
        }

        console.log('[ChatContext] Loaded messages:', savedMessages?.length || 0, 'messages');
        if (savedMessages && savedMessages.length) {
           
          let sortedMessages = [...savedMessages].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

           
           
          let hasModifications = false;

          for (let i = 0; i < sortedMessages.length - 1; i++) {
            const current = sortedMessages[i];
            const next = sortedMessages[i + 1];

             
            if (!current.isUser && next.isUser) {
              const currentTime = new Date(current.timestamp).getTime();
              const nextTime = new Date(next.timestamp).getTime();

               
               
              if (nextTime - currentTime < 2000) {
                console.log('[ChatContext] Healing inverted message order:', {
                  ai: current.id, user: next.id, diff: nextTime - currentTime
                });

                 
                 
                const fixedTimestamp = new Date(nextTime + 50).toISOString();  

                sortedMessages[i] = {
                  ...current,
                  timestamp: fixedTimestamp
                };

                hasModifications = true;
                 
                 
              }
            }
          }

           
          if (hasModifications) {
            sortedMessages.sort((a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

             
            console.log('[ChatContext] Saving healed conversation order');
            saveConversation(conversationId, sortedMessages);
          }

          setMessages(sortedMessages);
           
          conversationsCacheRef.current[conversationId] = sortedMessages;
        } else {
          setMessages([]);
        }
      }).catch((error) => {
        console.error('Error loading conversation:', error);
         
        if (conversationIdRef.current === loadingId && !currentProjectIdRef.current) {
          setMessages([]);
        }
      });

       
      const userPrefix = getUserPrefix();
      const storageKey = `${userPrefix}-activeConversation`;

      localStorage.setItem(storageKey, conversationId);
    }
  }, [conversationId, isMounted, isPrivateMode, currentProjectId]);

   
   
   
  useEffect(() => {
     
     
     
    if (isMounted && messages.length > 0 && !isPrivateMode && !isGenerating && !currentProjectId && conversationIdRef.current === conversationId) {
      saveConversation(conversationId, messages);
       
      conversationsCacheRef.current[conversationId] = [...messages];
    }
  }, [messages, conversationId, isMounted, isPrivateMode, isGenerating, currentProjectId]);

   
  useEffect(() => {
    setDisplayedMessageIds(new Set(messages.map(m => m.id)));
  }, [messages]);

   
  const getUserDisplayContent = (text: string) => {
    const markers = ['\n\n[WEB SEARCH RESULTS', '\n\n[FILES CONTEXT]'];
    let cutoff = text.length;
    for (const m of markers) {
      const idx = text.indexOf(m);
      if (idx >= 0 && idx < cutoff) cutoff = idx;
    }
    return text.slice(0, cutoff);
  };

   
  const processAttachments = (files: File[]): Attachment[] => {
    return files.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
       
      url: URL.createObjectURL(file)
    }));
  };

  const stopGeneration = useCallback(() => {
     
    isCanceledRef.current = true;

     
    setIsLoading(false);
    setIsGenerating(false);

     
    setMessages(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    ));
  }, []);

  const sendMessage = useCallback(async (content: string, files: File[] = [], replyToId?: string) => {
    try {
       
      const requestId = crypto.randomUUID();
      currentRequestIdRef.current = requestId;

       
      isCanceledRef.current = false;

       
      const attachments = files.length > 0 ? processAttachments(files) : undefined;

       
       
      const userDisplayContent = getUserDisplayContent(content);

       
      const now = new Date();
      const userTimestamp = now.toISOString();
       
      const aiTimestamp = new Date(now.getTime() + 50).toISOString();

      const userMessage: ExtendedChatMessage = {
        id: crypto.randomUUID(),
        content: userDisplayContent,  
        isUser: true,
        timestamp: userTimestamp,
        attachments,
        replyToId  
      };

       
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

       
      setReplyToMessage(null);

       
      if (typeof window !== 'undefined' && !isPrivateMode) {
        saveConversation(conversationId, updatedMessages);
      }

      setIsLoading(true);
       
      setIsGenerating(true);

       
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

       
      const aiMessageId = crypto.randomUUID();
      const aiMessage: ExtendedChatMessage = {
        id: aiMessageId,
        content: "",
        isUser: false,
        timestamp: aiTimestamp,  
        isStreaming: true
      };

       
      const messagesWithPlaceholder = [...updatedMessages, aiMessage];
      setMessages(messagesWithPlaceholder);

      try {
         
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

         
        while (true) {
           
          if (isCanceledRef.current || currentRequestIdRef.current !== requestId) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();

          if (done) {
             
            setMessages(prev => {
              const finalMessages = prev.map(m =>
                m.id === aiMessageId ? { ...m, isStreaming: false } : m
              );

               
              if (typeof window !== 'undefined' && !isPrivateMode) {
                saveConversation(conversationId, finalMessages);
              }

              return finalMessages;
            });

             
            setIsLoading(false);
            setIsGenerating(false);
            break;
          }

           
          buffer += decoder.decode(value, { stream: true });

           
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';  

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data:')) continue;

            try {
              const eventData = line.slice(5).trim();  

              if (eventData === "[DONE]") {
                 
                continue;
              }

              try {
                const data = JSON.parse(eventData);

                 
                if (data.error) {
                  console.error("Error from server:", data.error);
                  setMessages(prev => {
                    const updatedMessages = prev.map(m =>
                      m.id === aiMessageId
                        ? { ...m, content: `Error: ${data.error}`, isStreaming: false }
                        : m
                    );

                     
                    if (typeof window !== 'undefined' && !isPrivateMode) {
                      saveConversation(conversationId, updatedMessages);
                    }

                    return updatedMessages;
                  });

                   
                  setIsLoading(false);
                  setIsGenerating(false);
                  continue;
                }

                 
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

         
        setMessages(prev => prev.map(m =>
          m.id === aiMessageId
            ? {
              ...m,
              isStreaming: false,
              content: m.content || "Sorry, there was an error generating a response."
            }
            : m
        ));

         
        setIsLoading(false);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);

       
      if (isCanceledRef.current) {
        console.log('Error occurred, but request was canceled');
        return;
      }

       
      const errorMessage: ExtendedChatMessage = {
        id: crypto.randomUUID(),
        content: 'Sorry, there was an error processing your request.',
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      const messagesWithError = [...messages, errorMessage];
      setMessages(messagesWithError);

       
      if (typeof window !== 'undefined' && !isPrivateMode) {
        saveConversation(conversationId, messagesWithError);
      }

       
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [conversationId, currentModel, messages, thinkingMode, engineeringMode, isPrivateMode]);

  const clearMessages = useCallback(() => {
    console.log('[ChatContext] clearMessages called:', { conversationId, isPrivateMode });
    setMessages([]);
     
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
       
      if (typeof window !== 'undefined' && !isPrivateMode) {
        saveConversation(conversationId, updatedMessages);
      }
      return updatedMessages;
    });
  }, [conversationId, isPrivateMode]);

   
  const regenerateLastResponse = useCallback(async () => {
     
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.isUser);

    if (lastUserMessageIndex === -1) {
      console.log("No user messages found to regenerate response for");
      return;
    }

     
    const actualUserIndex = messages.length - 1 - lastUserMessageIndex;
    const lastUserMessage = messages[actualUserIndex];

     
    const aiResponseIndex = actualUserIndex + 1;
    const hasAiResponse = aiResponseIndex < messages.length && !messages[aiResponseIndex].isUser;

     
    const requestId = crypto.randomUUID();
    currentRequestIdRef.current = requestId;

     
    isCanceledRef.current = false;

     
    setIsLoading(true);
    setIsGenerating(true);

    let aiMessageId;
    let updatedMessages;

    if (hasAiResponse) {
       
      aiMessageId = messages[aiResponseIndex].id;

       
      updatedMessages = [...messages];
      updatedMessages[aiResponseIndex] = {
        ...updatedMessages[aiResponseIndex],
        content: "",
        isStreaming: true
      };
    } else {
       
      aiMessageId = crypto.randomUUID();
      const aiMessage = {
        id: aiMessageId,
        content: "",
        isUser: false,
        timestamp: new Date().toISOString(),
        isStreaming: true
      };

       
      updatedMessages = [...messages.slice(0, actualUserIndex + 1), aiMessage];
    }

     
    setMessages(updatedMessages);

     
    if (typeof window !== 'undefined' && !isPrivateMode) {
      saveConversation(conversationId, updatedMessages);
    }

    try {
       
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

       
      while (true) {
         
        if (isCanceledRef.current || currentRequestIdRef.current !== requestId) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
           
          setMessages(prev => {
            const updated = prev.map(m =>
              m.id === aiMessageId ? { ...m, isStreaming: false } : m
            );

             
            if (typeof window !== 'undefined' && !isPrivateMode) {
              saveConversation(conversationId, updated);
            }

            return updated;
          });

           
          setIsLoading(false);
          setIsGenerating(false);
          break;
        }

         
        buffer += decoder.decode(value, { stream: true });

         
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';  

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data:')) continue;

          try {
            const eventData = line.slice(5).trim();  

            if (eventData === "[DONE]") {
               
              continue;
            }

            try {
              const data = JSON.parse(eventData);

               
              if (data.text) {
                setMessages(prev => {
                   
                  const messageIndex = prev.findIndex(m => m.id === aiMessageId);
                  if (messageIndex === -1) return prev;

                   
                  const updated = [...prev];
                  updated[messageIndex] = {
                    ...updated[messageIndex],
                    content: updated[messageIndex].content + data.text
                  };

                   
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

       
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [messages, conversationId, currentModel, thinkingMode, engineeringMode, isPrivateMode]);

   
  const getTimestamp = (timestamp: any): string => {
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    return new Date().toISOString();
  };

   
  const switchConversation = useCallback((id: string) => {
     
    if (id === conversationIdRef.current) {
      return;
    }

     
    if (isGenerating || isLoading) {
      stopGeneration();
    }

     
    if (conversationIdRef.current && messages.length > 0) {
      conversationsCacheRef.current[conversationIdRef.current] = [...messages];
    }

     
    conversationIdRef.current = id;

     
    const cachedMessages = conversationsCacheRef.current[id];
    if (cachedMessages && cachedMessages.length > 0) {
       
      setMessages(cachedMessages);
      setConversationId(id);
      return;
    }

     
    setMessages([]);
    setConversationId(id);
  }, [isGenerating, isLoading, stopGeneration, messages]);

   
  const startNewConversation = useCallback(() => {
     
    if (isGenerating || isLoading) {
      stopGeneration();
    }

    const newId = crypto.randomUUID();

     
    setMessages([]);
    conversationIdRef.current = newId;
    setConversationId(newId);

    if (isMounted) {
      const userPrefix = getUserPrefix();
      const storageKey = `${userPrefix}-activeConversation`;

      localStorage.setItem(storageKey, newId);
       
    }
  }, [isGenerating, isLoading, stopGeneration, isMounted]);

   
  const deleteCurrentConversation = useCallback(() => {
    if (isMounted) {
      const deletingConversationId = conversationId;

       
      setMessages([]);

       
      const newId = crypto.randomUUID();
      conversationIdRef.current = newId;
      setConversationId(newId);

       
      (async () => {
        try {
           
          const conversations = await getConversationList();

           
          await deleteConversation(deletingConversationId);

           
          delete conversationsCacheRef.current[deletingConversationId];

           
          const remainingConversations = conversations.filter((id: string) => id !== deletingConversationId);

          if (remainingConversations.length > 0) {
             
            switchConversation(remainingConversations[0]);
          }
           
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

   
  const togglePrivateMode = useCallback(() => {
    setIsPrivateMode(prev => {
      const newValue = !prev;

      if (newValue) {
         
        setMessages([]);
      } else {
         
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

   
  useEffect(() => {
    return () => {
       
    };
  }, []);

   
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
