"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Bundler } from '@/lib/bundler';
import { ClientCodeEditor } from './client-code-editor';
import * as pythonExecutor from '@/lib/executors/pythonExecutor';
import * as javascriptExecutor from '@/lib/executors/javascriptExecutor';
import * as cExecutor from '@/lib/executors/cExecutor';
import * as rustExecutor from '@/lib/executors/rustExecutor';
import * as javaExecutor from '@/lib/executors/javaExecutor';

// Supported languages
const LANGUAGES = [
  { id: 'c', name: 'C', extension: '.c', defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: 'cpp', name: 'C++', extension: '.cpp', defaultCode: '#include <cstdio>\n\nint main() {\n    std::printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: 'javascript', name: 'JavaScript', extension: '.js', defaultCode: 'console.log("Hello, World!");' },
  { id: 'python', name: 'Python', extension: '.py', defaultCode: 'print("Hello, World!")' },
  { id: 'java', name: 'Java', extension: '.java', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
];

// Map languages to their executors
const EXECUTORS: Record<string, any> = {
  javascript: javascriptExecutor,
  python: pythonExecutor,
  c: cExecutor,
  cpp: cExecutor,
  java: javaExecutor,
  rust: rustExecutor,
};

// Main component for the GDB-like compiler
export function Compiler() {
  // Use a ref to track if component is mounted to prevent hydration issues
  const isMounted = useRef(false);

  // Default to JavaScript (index 2)
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[2]);
  const initialLanguageRef = useRef(LANGUAGES[2]);
  const [code, setCode] = useState(LANGUAGES[2].defaultCode);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [inlineInput, setInlineInput] = useState('');
  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // legacy, unused for inline input
  const bundlerRef = useRef<Bundler | null>(null);
  const pendingInputResolve = useRef<((v: string) => void) | null>(null);
  const [pythonBooting, setPythonBooting] = useState(false);
  // Track prompts and user inputs to merge into final stdout
  const echoPromptsRef = useRef<string[]>([]);
  const echoInputsRef = useRef<string[]>([]);

  // Initialize bundler after component mounts to prevent hydration issues
  useEffect(() => {
    isMounted.current = true;
    const initialLanguage = initialLanguageRef.current;
    bundlerRef.current = new Bundler({
      [`/main${initialLanguage.extension}`]: initialLanguage.defaultCode
    });
    // Pre-warm Python, C/C++, and Java executors to avoid first-run delay perception
    (async () => {
      try {
        setPythonBooting(true);
        await pythonExecutor.init();
        // Warm C/C++ executor (loads Wasmer SDK & clang in worker)
        try { await cExecutor.init(); } catch (e) { console.warn('[Compiler] C/C++ init failed:', e); }
        // Warm Java executor (loads CheerpJ runtime)
        try { await javaExecutor.init(); } catch (e) { console.warn('[Compiler] Java init failed:', e); }
      } catch (e) {
        console.warn('[Compiler] Python init failed:', e);
      } finally {
        setPythonBooting(false);
      }
    })();

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

    // Do not print extra compilation/runtime logs

    try {
      setIsCompiling(false);
      // Do not print extra runtime logs

      const executor = EXECUTORS[selectedLanguage.id];
      if (!executor || typeof executor.execute !== 'function') {
        setConsoleOutput(prev => [...prev, `Error: No executor available for ${selectedLanguage.name}`]);
        return;
      }

      // Show a status hint for heavy toolchains on first run
      if (selectedLanguage.id === 'c' || selectedLanguage.id === 'cpp') {
        setConsoleOutput(prev => [...prev, '[C/C++] First run can take a few seconds please wait...']);
      } else if (selectedLanguage.id === 'java') {
        setConsoleOutput(prev => [...prev, '[Java] Compiling and executing...']);
      }

      const result = await executor.execute(
        code,
        '',
        async (prompt: string) => {
          // Show prompt as a console line and capture keystrokes inline
          const p = String(prompt || '');

          // For C programs, the prompt already comes from the code
          // Add it to console output so it appears before input request
          if (p) {
            setConsoleOutput(prev => [...prev, p.replace(/\n$/, '')]);
          }

          echoPromptsRef.current.push(p);
          setInlineInput('');
          setInputPrompt(p);
          setIsWaitingForInput(true);
          // Focus the console for typing
          setTimeout(() => consoleRef.current?.focus(), 0);
          return await new Promise<string>((resolve) => {
            (pendingInputResolve.current as any) = resolve;
          });
        },
        // Language hint for executors that support multiple langs (e.g., c vs cpp)
        selectedLanguage.id
      );

      const out = (result.output ?? '').toString();
      const err = (result.error ?? '').toString();

      if (err.trim().length > 0) {
        // Print error first
        const errLines = err.split('\n').filter((l: string) => l !== '');
        setConsoleOutput(prev => [...prev, ...errLines.map((l: string) => `Error: ${l}`)]);
        setConsoleOutput(prev => [...prev, `Program exited with code 1`]);
      } else {
        if (out.trim().length > 0) {
          let lines = out.split('\n');

          // Split lines that have concatenated outputs (WASM fgets doesn't capture newlines properly)
          // Pattern: "Name: valueGender: M" should become two lines
          lines = lines.flatMap((line: string) => {
            // Match pattern: text ends with a lowercase/digit, then immediately starts with uppercase letter + colon
            // This catches "jkjGender:" or "valueWord:"
            const pattern = /([a-z0-9])([A-Z][a-z]*:)/g;
            if (pattern.test(line)) {
              // Split at the boundary
              const parts = line.split(/(?=[A-Z][a-z]*:\s)/);
              return parts;
            }
            return [line];
          });

          // For C programs, only remove lines that are EXACTLY one of the prompts we showed
          if (echoPromptsRef.current.length > 0) {
            const promptSet = new Set(echoPromptsRef.current.map((p: string) => p.trim()));

            lines = lines.filter((line: string) => {
              const trimmed = line.trim();

              // Keep empty lines - they're important for formatting
              if (trimmed === '') {
                return true;
              }

              // Remove if it's exactly a prompt we displayed
              if (promptSet.has(trimmed)) {
                return false;
              }

              // Keep everything else
              return true;
            });
          }

          setConsoleOutput(prev => [...prev, ...lines]);
        } else {
          setConsoleOutput(prev => [...prev, `[No output]`]);
        }
        setConsoleOutput(prev => [...prev, `Program exited with code 0`]);
      }
    } catch (error) {
      setConsoleOutput(prev => [...prev, `Error: ${String(error)}`]);
    } finally {
      setIsRunning(false);
      // Reset echo trackers for next run
      echoPromptsRef.current = [];
      echoInputsRef.current = [];

      // Scroll to bottom of console
      if (consoleRef.current) {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      }
    }

    // Scroll to bottom of console
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  };

  // Stop current execution (generic)
  const stopExecution = async () => {
    try {
      const ex = EXECUTORS[selectedLanguage.id];
      if (ex && typeof ex.cancel === 'function') {
        await ex.cancel();
      }
    } catch (e) {
      // ignore
    } finally {
      setIsWaitingForInput(false);
      setInlineInput('');
      setInputPrompt('');
      setIsRunning(false);
      setConsoleOutput(prev => [...prev, 'Program stopped by user']);
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
  // Inline key handling for terminal-like input
  const handleConsoleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isWaitingForInput) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const toSend = inlineInput;
      // Commit typed text to the last console line next to the prompt
      setConsoleOutput(prev => {
        const arr = [...prev];
        if (arr.length > 0) arr[arr.length - 1] = (arr[arr.length - 1] || '') + toSend;
        return arr;
      });
      echoInputsRef.current.push(toSend);
      setIsWaitingForInput(false);
      setInputPrompt('');
      setInlineInput('');
      if (pendingInputResolve.current) {
        pendingInputResolve.current(toSend);
        pendingInputResolve.current = null;
      }
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      setInlineInput((s) => s.slice(0, -1));
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setInlineInput((s) => s + e.key);
    }
  };

  const handleConsolePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isWaitingForInput) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (text) setInlineInput((s) => s + text.replace(/\r/g, ''));
  };

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      {/* Header */}
      <div className="relative flex items-center px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
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
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2">
          <button
            className="px-4 py-2 text-sm font-medium bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (isCompiling ? 'Compiling...' : 'Running...') : 'Run'}
          </button>
          <button
            className="px-3 py-2 text-sm font-medium bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            onClick={stopExecution}
            disabled={!isRunning}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Floating Run/Stop removed to avoid duplication; use header buttons above */}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Code editor */}
        <div className="flex-1 overflow-auto">
          <ClientCodeEditor
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
            className="flex-1 overflow-auto p-2 font-mono text-sm outline-none"
            tabIndex={0}
            onKeyDown={handleConsoleKeyDown}
            onPaste={handleConsolePaste}
          >
            {consoleOutput.length > 0 ? (
              consoleOutput.map((line, i) => {
                const isPromptLine = isWaitingForInput && i === consoleOutput.length - 1;
                const display = isPromptLine ? (line + inlineInput) : line;
                const cls = line.startsWith('Error') ? 'text-red-400' :
                  (line.trim() === 'Program exited with code 0' ? 'text-green-400' : 'text-white');
                return (
                  <div key={i} className={cls}>
                    {display || '\u00A0'}
                    {isPromptLine && (
                      <span className="relative inline-block ml-1 w-[6px] h-[1.1em] bg-green-500 align-text-bottom animate-pulse top-[1px]" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 italic">Run your code to see output here</div>
            )}
          </div>

          {/* No separate input box; typing happens inline in the console */}
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
