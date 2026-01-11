'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, StopCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadProjectConversation, saveProjectConversation } from '@/lib/storage';

interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: string;
    isStreaming?: boolean;
}

export default function ProjectConversationPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params?.projectId as string;
    const conversationId = params?.conversationId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isCanceledRef = useRef(false);

    // Load conversation messages
    useEffect(() => {
        if (!projectId || !conversationId) return;

        const loadMessages = async () => {
            const msgs = await loadProjectConversation(projectId, conversationId);
            setMessages(msgs);
        };

        loadMessages();
    }, [projectId, conversationId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Save messages when they change
    useEffect(() => {
        if (messages.length > 0 && !isGenerating) {
            saveProjectConversation(projectId, conversationId, messages);
        }
    }, [messages, projectId, conversationId, isGenerating]);

    // Stop generation
    const stopGeneration = useCallback(() => {
        isCanceledRef.current = true;
        setIsLoading(false);
        setIsGenerating(false);
        setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
    }, []);

    // Send message
    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            content: input.trim(),
            isUser: true,
            timestamp: new Date().toISOString(),
        };

        const aiMessageId = crypto.randomUUID();
        const aiMessage: Message = {
            id: aiMessageId,
            content: '',
            isUser: false,
            timestamp: new Date(Date.now() + 50).toISOString(),
            isStreaming: true,
        };

        setMessages(prev => [...prev, userMessage, aiMessage]);
        setInput('');
        setIsLoading(true);
        setIsGenerating(true);
        isCanceledRef.current = false;

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input.trim(),
                    model: 'openai/gpt-oss-120b:free',
                    thinkingMode: true,
                    conversationHistory: [...messages, userMessage].slice(-10),
                }),
            });

            if (!response.ok) throw new Error('Stream failed');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                if (isCanceledRef.current) {
                    reader.cancel();
                    break;
                }

                const { done, value } = await reader.read();
                if (done) {
                    setMessages(prev => prev.map(m =>
                        m.id === aiMessageId ? { ...m, isStreaming: false } : m
                    ));
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const data = line.slice(5).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            setMessages(prev => prev.map(m =>
                                m.id === aiMessageId ? { ...m, content: m.content + parsed.text } : m
                            ));
                        }
                    } catch { }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => prev.map(m =>
                m.id === aiMessageId
                    ? { ...m, content: m.content || 'Error generating response.', isStreaming: false }
                    : m
            ));
        }

        setIsLoading(false);
        setIsGenerating(false);
    }, [input, messages, isLoading]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-border">
                <Link href={`/project/${projectId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <span className="text-sm text-muted-foreground">Back to Project</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Start a conversation
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.isUser
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.isStreaming && (
                                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
                <div className="flex gap-2 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    {isGenerating ? (
                        <Button onClick={stopGeneration} variant="destructive">
                            <StopCircle className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                            <Send className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
