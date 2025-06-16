"use client"

import React from "react"
import { Bot, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { MultimodalInput } from "./multimodal-input"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Mock implementations for missing modules
// Utility function to replace missing cn
const cn = (...classes) => classes.filter(Boolean).join(" ")

// Motion div component replacement
const motion = {
  div: ({ initial, animate, transition, className, children }) => (
    <div className={className}>
      {children}
    </div>
  ),
}

// Message type definition
type Message = {
  id: string
  content: string
  role: "user" | "assistant"
  model: string
  timestamp: Date
  isStreaming?: boolean
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Clean up event source on component unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // Function to handle streaming response
  const handleStreamResponse = (content: string, model: string) => {
    // Create a placeholder for the streaming response
    const streamingMessageId = Date.now().toString()
    const streamingMessage: Message = {
      id: streamingMessageId,
      content: "",
      role: "assistant",
      model: model || "streaming",
      timestamp: new Date(),
      isStreaming: true
    }
    
    // Add the streaming message placeholder to the messages
    setMessages(prev => [...prev, streamingMessage])
    
    // Close any existing EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    
    // Connect to the streaming chat endpoint with timestamp to prevent caching
    const timestamp = Date.now()
    const eventSource = new EventSource(`/api/chat/stream?message=${encodeURIComponent(content)}&model=${encodeURIComponent(model)}&t=${timestamp}`)
    eventSourceRef.current = eventSource
    
    // Listen for connection open event
    eventSource.onopen = () => {
      console.log("EventSource connection opened")
    }
    
    // Listen for message events
    eventSource.onmessage = (event) => {
      console.log("Received event data:", event.data)
      
      if (event.data === "[DONE]") {
        // End of stream
        console.log("Stream complete")
        setMessages(prev => 
          prev.map(m => 
            m.id === streamingMessageId 
              ? { ...m, isStreaming: false } 
              : m
          )
        )
        eventSource.close()
        eventSourceRef.current = null
        setIsLoading(false)
        return
      }
      
      try {
        const data = JSON.parse(event.data)
        console.log("Parsed data:", data)
        
        // Update the streaming message with new content
        setMessages(prev => {
          // Find the current message
          const currentMessage = prev.find(m => m.id === streamingMessageId)
          // Only append if the content is new
          if (currentMessage) {
            return prev.map(m => 
              m.id === streamingMessageId 
                ? { ...m, content: m.content + data.text } 
                : m
            )
          }
          return prev
        })
      } catch (error) {
        console.error("Error parsing stream data:", error)
      }
    }
    
    // Handle errors
    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      // Try to reconnect a few times before giving up
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          eventSource.close()
          eventSourceRef.current = null
          setIsLoading(false)
          
          // Mark the message as no longer streaming
          setMessages(prev => 
            prev.map(m => 
              m.id === streamingMessageId 
                ? { ...m, isStreaming: false, content: m.content + " [Stream error - connection lost]" } 
                : m
            )
          )
        }
      }, 2000)
    }
  }

  // Function to handle new message submission
  const handleSubmit = (content: string, model: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: "user",
      model,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    // Check if the user wants to use streaming response
    if (content.toLowerCase().includes("stream") || model === "streaming") {
      handleStreamResponse(content, model)
      return
    }
    
    // Simulate AI response after a delay (non-streaming)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `# Response from ${model} model

**Thank you** for your message! Here's a sample response with *Markdown* formatting:

## Key Features
- **Bold text** for emphasis
- *Italics* for highlighting terms
- \`inline code\` for code snippets

### Code Example
\`\`\`javascript
// This is a code block
function greet(name) {
  return \`Hello, ${name}!\`;
}
\`\`\`

> This is a blockquote for important notes

In a real implementation, this would be replaced with an actual API call to the selected model.`,
        role: "assistant",
        model,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, aiMessage])
      setIsLoading(false)
    }, 1500)
    
    // In a real implementation, you would call your AI backend here
    // const response = await fetch('/api/chat', { 
    //   method: 'POST',
    //   body: JSON.stringify({ message: content, model })
    // })
    // const data = await response.json()
    // setMessages(prev => [...prev, { ...data.message }])
    // setIsLoading(false)
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-black via-zinc-900 to-black dark:from-black dark:via-zinc-800/40 dark:to-black px-4 py-8">
      <div className="w-full p-4 flex flex-col items-center justify-between h-screen mx-auto">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            className={cn("text-center mb-10", "opacity-100 scale-100")}
          >
            <h1 className="text-5xl md:text-6xl font-medium mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              Welcome Traveler
            </h1>
            <p className="text-xl text-zinc-400">What can I do for you today?</p>
            <p className="text-md text-zinc-500 mt-2">Try typing "show me streaming" to see streaming responses in action!</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className={cn(
            "w-full max-w-3xl rounded-2xl relative overflow-y-auto",
            messages.length > 0 ? "flex-1 mb-6" : "h-0",
            "scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
          )}
        >
          <div className="relative p-4 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg",
                  message.role === "user" 
                    ? "bg-zinc-800/50 ml-6" 
                    : "bg-zinc-900/70 border border-zinc-800 mr-6"
                )}
              >
                <div className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "user" ? "bg-zinc-700" : "bg-indigo-600"
                )}>
                  {message.role === "user" ? (
                    <User size={16} className="text-white" />
                  ) : (
                    <Bot size={16} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </p>
                    {message.role === "assistant" && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {message.model}
                      </span>
                    )}
                    {message.isStreaming && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 animate-pulse">
                        streaming...
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-300 prose dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && !messages.some(m => m.isStreaming) && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-900/70 border border-zinc-800 mr-6">
                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <p className="text-sm font-medium text-zinc-200">AI Assistant</p>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-3xl px-4 md:px-0 mt-auto"
        >
          <div className="relative backdrop-blur-xl rounded-xl">
            <MultimodalInput onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

