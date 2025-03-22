"use client"

import React from "react"
import { Bot, FileText, RotateCw, Search, SendIcon } from "lucide-react"
import { useState } from "react"

// Mock component replacements for missing modules
const Button = ({ className, disabled, onClick, children }) => (
  <button className={className} disabled={disabled} onClick={onClick}>
    {children}
  </button>
)

const Textarea = ({ placeholder, value, onChange, onKeyDown, className }) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    onKeyDown={onKeyDown}
    className={className}
  />
)

const Select = ({ value, onValueChange, children }) => (
  <div className="relative">
    {children}
  </div>
)

const SelectTrigger = ({ className, children }) => (
  <div className={className}>{children}</div>
)

const SelectValue = ({ placeholder }) => <span>{placeholder}</span>

const SelectContent = ({ className, children }) => (
  <div className={className}>{children}</div>
)

const SelectItem = ({ value, className, children }) => (
  <div className={className}>{children}</div>
)

// Utility function to replace missing cn
const cn = (...classes) => classes.filter(Boolean).join(" ")

// Motion div component replacement
const motion = {
  div: ({ initial, animate, exit, transition, className, key, children }) => (
    <div className={className} key={key}>
      {children}
    </div>
  ),
}

const AIModels = [
  { name: "GPT-4", id: "gpt4" },
  { name: "Claude", id: "claude" },
  { name: "Gemini", id: "gemini" },
  { name: "DeepSeek", id: "deepseek" },
]

const QuickActions = [
  {
    action: "Search knowledge base",
    icon: Search,
    gradient: "from-zinc-900/50 to-black/50",
    hoverGradient: "hover:from-zinc-800/50 hover:to-zinc-900/50",
  },
  {
    action: "Analyze document",
    icon: FileText,
    gradient: "from-zinc-900/50 to-black/50",
    hoverGradient: "hover:from-zinc-800/50 hover:to-zinc-900/50",
  },
  {
    action: "Generate content",
    icon: Bot,
    gradient: "from-zinc-900/50 to-black/50",
    hoverGradient: "hover:from-zinc-800/50 hover:to-zinc-900/50",
  },
]

export function MultimodalInput({ onSubmit, isLoading }) {
  const [input, setInput] = useState("")
  const [selectedModel, setSelectedModel] = useState(AIModels[0].id)

  function handleSubmit() {
    if (input.length > 0) {
      onSubmit(input, selectedModel)
    }
    setInput("")
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <div className="relative bg-zinc-900 rounded-xl border border-zinc-800">
        <Textarea
          placeholder="What would you like to do?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
          className={cn(
            "w-full px-4 py-3",
            "resize-none",
            "bg-transparent",
            "border-none",
            "text-zinc-100 text-base",
            "focus:outline-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "placeholder:text-zinc-500 placeholder:text-base",
            "min-h-[60px]",
          )}
        />
        <div className="flex items-center justify-between p-3">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[140px] h-8 px-3 bg-zinc-800 border-zinc-700 text-zinc-100 text-xs">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
              {AIModels.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            className={cn(
              "px-1.5 py-1.5 h-6 rounded-lg text-sm transition-colors hover:bg-zinc-800 flex items-center justify-between gap-1",
              "text-zinc-800",
              "disabled:opacity-50 disabled:cursor-not-allowed bg-white",
            )}
            disabled={input.length === 0 || isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 w-full">
        {QuickActions.map((item, index) => {
          const Icon = item.icon
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                delay: 0.1 * index,
                duration: 0.4,
                ease: "easeOut",
              }}
              key={index}
              className={`${index > 1 ? "hidden sm:block" : "block"} h-full`}
            >
              <button
                type="button"
                onClick={() => {
                  setInput(item.action)
                  setTimeout(() => handleSubmit(), 100)
                }}
                className="group w-full h-full text-left rounded-lg p-2.5
                                    bg-zinc-900 hover:bg-zinc-800
                                    border border-zinc-800 hover:border-zinc-700
                                    transition-colors duration-300
                                    flex flex-col justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700">
                    <Icon size={14} className="text-zinc-100" />
                  </div>
                  <div className="text-xs text-zinc-100 font-medium">{item.action}</div>
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

