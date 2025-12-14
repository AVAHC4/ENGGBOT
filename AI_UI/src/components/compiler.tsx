"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Play, Square, Trash2, Terminal, Maximize2, Minimize2, Code2, Settings, Keyboard } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
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
  const shouldIgnoreLanguageChange = useRef(false);

  // Default to JavaScript (index 2)
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[2]);
  const initialLanguageRef = useRef(LANGUAGES[2]);
  const [code, setCode] = useState(LANGUAGES[2].defaultCode);

  type ConsoleLine = string | { type: 'plotly', data: string };
  const [consoleOutput, setConsoleOutput] = useState<ConsoleLine[]>([]);

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

  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const isLightMode = resolvedTheme === 'light';

  // Initialize bundler after component mounts to prevent hydration issues
  useEffect(() => {
    isMounted.current = true;

    // Check for pending code/language in localStorage
    const pendingCode = localStorage.getItem('compiler_pending_code');
    const pendingLanguage = localStorage.getItem('compiler_pending_language');

    // Clear localStorage immediately to avoid re-using old code on refresh if not desired
    // But keeping it might be better for refresh. Let's keep it for now or clear it?
    // If we clear it, refreshing the page will lose the code.
    // Let's clear it to avoid "stuck" code if the user opens the compiler manually later.
    // Actually, let's NOT clear it immediately, so refresh works.
    // But we should probably clear it when the component unmounts? No, because we might want to come back.
    // Let's leave it.

    let initialLanguage = initialLanguageRef.current;
    let initialCode = initialLanguage.defaultCode;

    if (pendingLanguage) {
      const foundLang = LANGUAGES.find(l => l.id === pendingLanguage || l.name.toLowerCase() === pendingLanguage.toLowerCase());
      if (foundLang) {
        initialLanguage = foundLang;
        setSelectedLanguage(foundLang);
        initialCode = foundLang.defaultCode;
        shouldIgnoreLanguageChange.current = true;
      }
    }

    if (pendingCode) {
      initialCode = pendingCode;
      setCode(initialCode);
    } else {
      setCode(initialCode);
    }

    bundlerRef.current = new Bundler({
      [`/main${initialLanguage.extension}`]: initialCode
    });

    // Pre-warm ONLY the selected language executor to speed up initial load
    // Lazy load others later or on demand
    (async () => {
      try {
        if (initialLanguage.id === 'python') {
          setPythonBooting(true);
          await pythonExecutor.init();
          setPythonBooting(false);
        } else if (initialLanguage.id === 'c' || initialLanguage.id === 'cpp') {
          try { await cExecutor.init(); } catch (e) { console.warn('[Compiler] C/C++ init failed:', e); }
        } else if (initialLanguage.id === 'java') {
          try { await javaExecutor.init(); } catch (e) { console.warn('[Compiler] Java init failed:', e); }
        }

        // We can optionally warm up others in the background after a delay
        // but for "fast as hell", let's skip aggressive pre-warming of unused languages
      } catch (e) {
        console.warn('[Compiler] Executor init failed:', e);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, []); // Run once on mount

  // Update bundler when language changes
  useEffect(() => {
    if (isMounted.current && bundlerRef.current) {
      // If we just set the language from localStorage during init, don't reset the code
      if (shouldIgnoreLanguageChange.current) {
        shouldIgnoreLanguageChange.current = false;
        return;
      }

      // Check if we have pending code for this language in localStorage
      // This handles the case where we might have switched languages and want to see if there's code waiting
      // But primarily, we just want to set the default code if it's a manual switch

      const pendingCode = localStorage.getItem('compiler_pending_code');
      const pendingLanguage = localStorage.getItem('compiler_pending_language');

      // If the selected language matches the pending language, use the pending code
      if (pendingLanguage && pendingCode &&
        (selectedLanguage.id === pendingLanguage || selectedLanguage.name.toLowerCase() === pendingLanguage.toLowerCase())) {

        // Only use pending code if we haven't already modified the code? 
        // Or just assume if we switched back to this language we want the pending code?
        // Let's be safe: if the current code is the default for the language, replace it.
        // Or just always replace it?

        // Actually, simpler: just set the file in bundler.
        // But we need to update the editor content (code state) too.

        // If code state is already pendingCode, we are good.
        if (code === pendingCode) {
          bundlerRef.current.setFiles({
            [`/main${selectedLanguage.extension}`]: code
          });
          return;
        }
      }

      // Default behavior: reset to template on language switch
      // UNLESS we are in the initial load phase which is handled by the first useEffect.
      // But this effect runs on mount too if selectedLanguage changes?
      // No, initial state is set. If we call setSelectedLanguage in the first useEffect, this runs.

      // We need to avoid overwriting the code we just set in the first useEffect.
      // The first useEffect runs, sets selectedLanguage (triggering this effect), AND sets code.
      // This effect runs. We need to know if we should reset.

      // If we just mounted, we shouldn't reset.
      // But we can't easily detect "just mounted" inside this effect vs "user changed dropdown".

      // Let's use a ref to skip the first run if it was triggered by mount?
      // Or just check if the code matches the default code.

      // Actually, if we set code in the first useEffect, `code` state will be updated.
      // In this effect, `code` will be the new value.
      // So if we reset it here, we undo the first useEffect.

      // Fix: Don't reset code here if it already matches pendingCode for this language.
      if (pendingLanguage && pendingCode &&
        (selectedLanguage.id === pendingLanguage || selectedLanguage.name.toLowerCase() === pendingLanguage.toLowerCase()) &&
        code === pendingCode) {

        bundlerRef.current.setFiles({
          [`/main${selectedLanguage.extension}`]: code
        });
        return;
      }

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
          if (!result.plots || result.plots.length === 0) {
            setConsoleOutput(prev => [...prev, `[No output]`]);
          }
        }

        // Handle plots
        if (result.plots && result.plots.length > 0) {
          const plotImages = result.plots.map((p: string) => `data:image/png;base64,${p}`);
          setConsoleOutput(prev => [...prev, ...plotImages]);
        }

        // Handle Plotly charts
        if (result.plotly && result.plotly.length > 0) {
          setConsoleOutput(prev => [...prev, ...result.plotly.map((json: string) => ({ type: 'plotly', data: json }))]);
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
        if (arr.length > 0) {
          const lastLine = arr[arr.length - 1];
          if (typeof lastLine === 'string') {
            arr[arr.length - 1] = lastLine + toSend;
          }
        }
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
    <div className={cn("flex flex-col h-screen", isLightMode ? "bg-white text-black" : "bg-[#1e1e1e] text-white")}>
      {/* Header */}
      <div className={cn("relative flex items-center px-4 py-2 border-b", isLightMode ? "bg-gray-100 border-gray-200" : "bg-[#252526] border-[#3c3c3c]")}>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Online Compiler</span>
          <select
            value={selectedLanguage.id}
            onChange={handleLanguageChange}
            className={cn("text-sm rounded px-2 py-1 border focus:outline-none focus:ring-1 focus:ring-blue-500", isLightMode ? "bg-white text-black border-gray-300" : "bg-[#333333] text-white border-[#3c3c3c]")}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2">
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 flex items-center"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (isCompiling ? 'Compiling...' : 'Running...') : 'Run'}
          </button>
          <button
            className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
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
        <div className={cn("h-1/3 border-t flex flex-col", isLightMode ? "bg-gray-50 border-gray-200" : "bg-black border-[#3c3c3c]")}>
          <div className={cn("flex items-center justify-between px-4 py-1 border-b", isLightMode ? "bg-gray-100 border-gray-200" : "bg-[#252526] border-[#3c3c3c]")}>
            <span className="text-xs font-medium">Console</span>
            <button
              className={cn("text-xs hover:opacity-80", isLightMode ? "text-gray-600 hover:text-black" : "text-gray-400 hover:text-white")}
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

                if (typeof line === 'string') {
                  const display = isPromptLine ? (line + inlineInput) : line;
                  const cls = line.startsWith('Error') ? 'text-red-500' :
                    (line.trim() === 'Program exited with code 0' ? 'text-green-500' : (isLightMode ? 'text-black' : 'text-white'));

                  if (line.startsWith('data:image/png;base64,')) {
                    return (
                      <div key={i} className="py-2">
                        <img src={line} alt="Plot" className="max-w-full h-auto rounded border border-gray-700" />
                      </div>
                    );
                  }

                  return (
                    <div key={i} className={cls}>
                      {display || '\u00A0'}
                      {isPromptLine && (
                        <span className="relative inline-block ml-1 w-[6px] h-[1.1em] bg-green-500 align-text-bottom animate-pulse top-[1px]" />
                      )}
                    </div>
                  );
                }

                if (typeof line === 'object' && line.type === 'plotly') {
                  try {
                    const plotData = JSON.parse(line.data);
                    return (
                      <div key={i} className="py-2 w-full h-[400px] bg-white rounded border border-gray-700 overflow-hidden">
                        <Plot
                          data={plotData.data}
                          layout={{
                            ...plotData.layout,
                            autosize: true,
                            margin: { t: 30, r: 20, l: 40, b: 40 },
                            paper_bgcolor: 'rgba(0,0,0,0)',
                            plot_bgcolor: 'rgba(0,0,0,0)',
                            font: { color: '#fff' }
                          }}
                          config={{ responsive: true }}
                          style={{ width: '100%', height: '100%' }}
                          useResizeHandler={true}
                        />
                      </div>
                    );
                  } catch (e) {
                    return <div key={i} className="text-red-400">Error rendering plot</div>;
                  }
                }

                return null;
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
