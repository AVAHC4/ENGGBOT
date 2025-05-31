"use client"

import React from "react"
import compilerChatService from "./AI_UI/src/lib/compiler-chat-service"
import { Bot, User } from "lucide-react"
import { useState, useEffect } from "react"
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
  role: "user" | "assistant" | "system"
  model: string
  timestamp: Date
  isCompilerOutput?: boolean
  language?: string
  code?: string
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Subscribe to compiler output events
  useEffect(() => {
    const unsubscribe = compilerChatService.subscribeToOutput((compilerOutput) => {
      // Create a system message with compiler output
      const compilerMessage: Message = {
        id: Date.now().toString(),
        content: `Code output from ${compilerOutput.language}:

${compilerOutput.output}`,
        role: "system",
        model: "compiler",
        timestamp: compilerOutput.timestamp,
        isCompilerOutput: true,
        language: compilerOutput.language,
        code: compilerOutput.code
      }
      
      setMessages(prev => [...prev, compilerMessage])
    })
    
    // Cleanup subscription on component unmount
    return () => unsubscribe()
  }, [])

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
    
    // Simulate AI response after a delay
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
                    : message.role === "system" && message.isCompilerOutput
                    ? "bg-amber-900/20 border border-amber-800/50 mr-6"
                    : "bg-zinc-900/70 border border-zinc-800 mr-6"
                )}
              >
                <div className={cn(
                  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === "user" 
                    ? "bg-zinc-700" 
                    : message.role === "system" && message.isCompilerOutput
                    ? "bg-amber-600"
                    : "bg-indigo-600"
                )}>
                  {message.role === "user" ? (
                    <User size={16} className="text-white" />
                  ) : message.role === "system" && message.isCompilerOutput ? (
                    <span className="text-white font-mono text-xs">{"{ }"}</span>
                  ) : (
                    <Bot size={16} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {message.role === "user" 
                        ? "You" 
                        : message.role === "system" && message.isCompilerOutput 
                        ? "Compiler Output" 
                        : "AI Assistant"}
                    </p>
                    {(message.role === "assistant" || (message.role === "system" && message.isCompilerOutput)) && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded text-zinc-400",
                        message.isCompilerOutput ? "bg-amber-900/40" : "bg-zinc-800"
                      )}>
                        {message.isCompilerOutput ? message.language : message.model}
                      </span>
                    )}
                  </div>
                  {message.isCompilerOutput ? (
                    <div>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{message.content}</p>
                      {message.code && (
                        <div className="mt-2 p-2 bg-zinc-900 rounded border border-zinc-800">
                          <p className="text-xs text-zinc-500 mb-1">Original code:</p>
                          <pre className="text-xs text-zinc-400 overflow-x-auto">{message.code}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-300">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
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

