"use client"

import React from "react"
import { Bot, User } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { MultimodalInput } from "./multimodal-input"

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
      eventSourceRef.current = null
    }
    
    console.log("Starting manual streaming simulation")
    
    // Since the server streaming isn't working, let's simulate it client-side
    const simulateStreaming = () => {
      const responses = {
        hello: "Hello! I'm a streaming AI assistant. How can I help you today?",
        weather: "I don't have access to real-time weather data, but I can tell you how to check the forecast for your location.",
        help: "I'm here to help! You can ask me questions, and I'll respond in a streaming fashion, character by character.",
        default: `Thank you for your message: "${content}". This is a simulated streaming response from a pretend AI model. In a real implementation, this would connect to an actual AI service.`
      }
      
      // Select appropriate response
      let responseText = ""
      if (content.toLowerCase().includes("hello")) {
        responseText = responses.hello
      } else if (content.toLowerCase().includes("weather")) {
        responseText = responses.weather
      } else if (content.toLowerCase().includes("help")) {
        responseText = responses.help
      } else {
        responseText = responses.default
      }
      
      // Stream character by character
      const chars = responseText.split('')
      let charIndex = 0
      
      const streamNextChar = () => {
        if (charIndex < chars.length) {
          const char = chars[charIndex]
          // Determine if this is a natural pause point
          const isWordBreak = char === ' ' || char === '.' || char === ',' || char === '!'
          
          // Update the streaming message with new content
          setMessages(prev => 
            prev.map(m => 
              m.id === streamingMessageId 
                ? { ...m, content: m.content + char } 
                : m
            )
          )
          
          charIndex++
          
          // Vary timing for more natural reading
          const delay = isWordBreak ? 100 : 30
          setTimeout(streamNextChar, delay)
        } else {
          // End of stream
          setMessages(prev => 
            prev.map(m => 
              m.id === streamingMessageId 
                ? { ...m, isStreaming: false } 
                : m
            )
          )
          setIsLoading(false)
        }
      }
      
      // Start streaming
      streamNextChar()
    }
    
    // Start the simulation
    simulateStreaming()
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
        content: `This is a sample response from ${model} model. In a real implementation, this would be replaced with an actual API call to the selected model.`,
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
                  <p className="text-sm text-zinc-300">{message.content}</p>
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

