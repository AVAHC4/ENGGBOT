"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Bundler } from '@/lib/bundler';
import { CodeEditor } from './code-editor';

// Supported languages
const LANGUAGES = [
  { id: 'c', name: 'C', extension: '.c', defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: 'cpp', name: 'C++', extension: '.cpp', defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
  { id: 'javascript', name: 'JavaScript', extension: '.js', defaultCode: 'console.log("Hello, World!");' },
  { id: 'python', name: 'Python', extension: '.py', defaultCode: 'print("Hello, World!")' },
  { id: 'java', name: 'Java', extension: '.java', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
];

// Main component for the GDB-like compiler
export function CodeSandboxCompiler() {
  // Use a ref to track if component is mounted to prevent hydration issues
  const isMounted = useRef(false);
  
  // Default to JavaScript (index 2)
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[2]);
  const [code, setCode] = useState(LANGUAGES[2].defaultCode);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bundlerRef = useRef<Bundler | null>(null);
  
  // Initialize bundler after component mounts to prevent hydration issues
  useEffect(() => {
    isMounted.current = true;
    bundlerRef.current = new Bundler({
      [`/main${selectedLanguage.extension}`]: selectedLanguage.defaultCode
    });
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Update bundler when language changes
  useEffect(() => {
    if (isMounted.current && bundlerRef.current) {
      setCode(selectedLanguage.defaultCode);
      bundlerRef.current.setFiles({
        [`/main${selectedLanguage.extension}`]: selectedLanguage.defaultCode
      });
    }
  }, [selectedLanguage]);

  // Function to run the code
  const runCode = async () => {
    if (!bundlerRef.current) return;
    
    setIsRunning(true);
    setIsCompiling(true);
    setConsoleOutput([]);
    setIsWaitingForInput(false);
    
    // Add compilation message
    setConsoleOutput(prev => [...prev, `Compiling ${selectedLanguage.name} code...`]);
    
    try {
      // Simulate compilation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsCompiling(false);
      
      // Add execution message
      setConsoleOutput(prev => [...prev, `Running ${selectedLanguage.name} code...`]);
      
      // For JavaScript, we can actually run the code in the browser
      if (selectedLanguage.id === 'javascript') {
        try {
          // Create a function from the code to capture console.log output
          const originalConsoleLog = console.log;
          const logs: string[] = [];
          
          console.log = (...args) => {
            const message = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            logs.push(message);
            originalConsoleLog.apply(console, args);
          };
          
          // Execute the code
          try {
            // eslint-disable-next-line no-new-func
            const fn = new Function(code);
            fn();
            
            // Add the output to the console
            setConsoleOutput(prev => [...prev, ...logs]);
          } catch (error) {
            if (error instanceof Error) {
              setConsoleOutput(prev => [...prev, `Error: ${error.message}`]);
            } else {
              setConsoleOutput(prev => [...prev, `Error: ${String(error)}`]);
            }
          }
          
          // Restore console.log
          console.log = originalConsoleLog;
        } catch (error) {
          setConsoleOutput(prev => [...prev, `Error: ${String(error)}`]);
        }
      } else {
        // For other languages, use the API
        try {
          const response = await fetch('/api/compile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              language: selectedLanguage.id,
            }),
          });
          
          const result = await response.json();
          
          if (result.error) {
            setConsoleOutput(prev => [...prev, result.error]);
          } else if (result.output) {
            setConsoleOutput(prev => [...prev, result.output]);
          }
          
          // Simulate waiting for input if code contains input functions
          if (
            (selectedLanguage.id === 'c' && code.includes('scanf')) ||
            (selectedLanguage.id === 'cpp' && code.includes('cin')) ||
            (selectedLanguage.id === 'python' && code.includes('input')) ||
            (selectedLanguage.id === 'java' && code.includes('Scanner'))
          ) {
            setConsoleOutput(prev => [...prev, 'Waiting for input...']);
            setIsWaitingForInput(true);
            // Focus the input field
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 0);
            return; // Don't show program exit yet
          }
          
          // Add exit code
          setConsoleOutput(prev => [...prev, `Program exited with code ${result.exitCode || 0}`]);
        } catch (error) {
          setConsoleOutput(prev => [...prev, `Error: ${String(error)}`]);
        }
      }
    } catch (error) {
      setConsoleOutput(prev => [...prev, `Error: ${String(error)}`]);
    } finally {
      setIsRunning(false);
    }
    
    // Scroll to bottom of console
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  };

  // Handle language change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const langId = e.target.value;
    const language = LANGUAGES.find(lang => lang.id === langId) || LANGUAGES[0];
    setSelectedLanguage(language);
  };

  // Get language from file extension
  const getLanguageFromExtension = (extension: string): string => {
    switch (extension) {
      case '.js': return 'js';
      case '.cpp': case '.c': return 'cpp';
      case '.py': return 'python';
      case '.java': return 'java';
      default: return 'js';
    }
  };

  // Handle cursor position change
  const handleCursorPositionChange = (line: number, column: number) => {
    setCursorPosition({ line, column });
  };

  // Handle user input submission
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    // Add the input to the console
    setConsoleOutput(prev => [...prev, `> ${userInput}`]);
    
    // Simulate processing the input
    setConsoleOutput(prev => [...prev, `Processing input: ${userInput}`]);
    
    // Reset input field
    setUserInput('');
    
    // End the program
    setIsWaitingForInput(false);
    setConsoleOutput(prev => [...prev, `Program exited with code 0`]);
    
    // Scroll to bottom of console
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Online Compiler</span>
          <select 
            value={selectedLanguage.id}
            onChange={handleLanguageChange}
            className="bg-[#333333] text-white text-sm rounded px-2 py-1 border border-[#3c3c3c] focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (isCompiling ? 'Compiling...' : 'Running...') : 'Run'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Code editor */}
        <div className="flex-1 overflow-auto">
          <CodeEditor 
            value={code}
            onChange={setCode}
            language={getLanguageFromExtension(selectedLanguage.extension)}
            onCursorPositionChange={handleCursorPositionChange}
          />
        </div>

        {/* Console output */}
        <div className="h-1/3 bg-black border-t border-[#3c3c3c] flex flex-col">
          <div className="flex items-center justify-between px-4 py-1 bg-[#252526] border-b border-[#3c3c3c]">
            <span className="text-xs font-medium">Console</span>
            <button 
              className="text-xs text-gray-400 hover:text-white"
              onClick={() => setConsoleOutput([])}
            >
              Clear
            </button>
          </div>
          <div 
            ref={consoleRef}
            className="flex-1 overflow-auto p-2 font-mono text-sm"
          >
            {consoleOutput.length > 0 ? (
              consoleOutput.map((line, i) => (
                <div key={i} className={
                  line.startsWith('Error') ? 'text-red-400' : 
                  line.startsWith('Waiting') ? 'text-yellow-300' :
                  line.startsWith('>') ? 'text-blue-300' :
                  'text-green-300'
                }>
                  {line}
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">Run your code to see output here</div>
            )}
          </div>
          
          {/* Input area */}
          {isWaitingForInput && (
            <form onSubmit={handleInputSubmit} className="flex items-center px-2 py-2 border-t border-[#3c3c3c] bg-[#1a1a1a]">
              <span className="text-yellow-300 mr-2">stdin&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-1 bg-[#252526] text-white px-2 py-1 rounded border border-[#3c3c3c] focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter input..."
                autoFocus
              />
              <button 
                type="submit"
                className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Submit
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-white text-xs">
        <div className="flex items-center space-x-4">
          <span>{selectedLanguage.name}</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
} 