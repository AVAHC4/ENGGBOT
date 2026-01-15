"use client"

import React from "react"
import { Bot, User, FileText } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { MultimodalInput } from "./multimodal-input"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import DocumentGenerator from './client/components/DocumentGenerator'


const cn = (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(" ")


const motion = {
  div: ({ initial, animate, transition, className, children }: {
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    className?: string;
    children?: React.ReactNode;
  }) => (
    <div className={className}>
      {children}
    </div>
  ),
}


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
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [input, setInput] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('default')
  const [thinkingMode, setThinkingMode] = useState<boolean>(false)


  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const handleStreamResponse = (content: string, model: string) => {

    const streamingMessageId = Date.now().toString()
    const streamingMessage: Message = {
      id: streamingMessageId,
      content: "",
      role: "assistant",
      model: model || "streaming",
      timestamp: new Date(),
      isStreaming: true
    }


    setMessages(prev => [...prev, streamingMessage])


    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }


    const timestamp = Date.now()
    const eventSource = new EventSource(`/api/chat/stream?message=${encodeURIComponent(content)}&model=${encodeURIComponent(model)}&t=${timestamp}`)
    eventSourceRef.current = eventSource


    eventSource.onopen = () => {
      console.log("EventSource connection opened")
    }


    eventSource.onmessage = (event) => {
      console.log("Received event data:", event.data)

      if (event.data === "[DONE]") {

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


        setMessages(prev => {

          const currentMessage = prev.find(m => m.id === streamingMessageId)

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

    eventSource.onerror = (error) => {
      console.error("EventSource error:", error)
      setTimeout(() => {
        if (eventSourceRef.current === eventSource) {
          eventSource.close()
          eventSourceRef.current = null
          setIsLoading(false)

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

  const handleDocumentGeneration = (content: string) => {
    setDocumentContent(content)
    setShowDocumentGenerator(true)
  }


  const detectDocumentIntent = (message: string): boolean => {
    const documentKeywords = [
      'create a document', 'generate a document', 'make a document',
      'create a pdf', 'generate a pdf', 'make a pdf',
      'create a word document', 'generate a word document',
      'create a report', 'generate a report',
      'create a resume', 'generate a resume',
      'create a letter', 'generate a letter'
    ]

    const lowercaseMessage = message.toLowerCase()
    return documentKeywords.some(keyword => lowercaseMessage.includes(keyword))
  }


  const getAIResponse = async (message: string, thinking: boolean, model: string): Promise<string> => {

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`# Response to: "${message}"
        
Thank you for your message! Here's a sample response with Markdown formatting:

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

In a real implementation, this would be replaced with an actual API call to the selected model.`)
      }, 1500)
    })
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return


    const isDocumentRequest = detectDocumentIntent(input)


    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      model: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)


    if (input.toLowerCase().includes("stream") || "streaming" === "streaming") {
      handleStreamResponse(input, "streaming")
      return
    }

    try {

      const response = await getAIResponse(input, thinkingMode, selectedModel)


      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        model: "user",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage, aiMessage])


      if (isDocumentRequest) {

        setTimeout(() => {
          handleDocumentGeneration(response)
        }, 500)
      }
    } catch (error) {
      console.error("Error getting AI response:", error)

      setMessages(prev => [
        ...prev,
        userMessage,
        {
          id: (Date.now() + 2).toString(),
          content: "Sorry, I encountered an error. Please try again.",
          role: "assistant",
          model: "user",
          timestamp: new Date()
        }
      ])
    } finally {
      setIsLoading(false)
    }
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
            <MultimodalInput
              onSubmit={(content: string) => {
                setInput(content)
                handleSubmit(new Event('submit') as any)
              }}
              isLoading={isLoading}
            />
          </div>
        </motion.div>
      </div>

      {/* Document Generator Modal */}
      {showDocumentGenerator && (
        <DocumentGenerator
          aiOutput={documentContent}
          onClose={() => setShowDocumentGenerator(false)}
        />
      )}
    </div>
  )
}

