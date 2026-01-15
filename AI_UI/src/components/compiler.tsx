"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Play, Square, Trash2, Terminal, Maximize2, Minimize2, Code2, Settings, Keyboard } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

 
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
import { Bundler } from '@/lib/bundler';
import { ClientCodeEditor } from './client-code-editor';
import * as pythonExecutor from '@/lib/executors/pythonExecutor';
import * as javascriptExecutor from '@/lib/executors/javascriptExecutor';
import * as cExecutor from '@/lib/executors/cExecutor';
import * as rustExecutor from '@/lib/executors/rustExecutor';
import * as javaExecutor from '@/lib/executors/javaExecutor';

 
const LANGUAGES = [
  { id: 'c', name: 'C', extension: '.c', defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: 'cpp', name: 'C++', extension: '.cpp', defaultCode: '#include <cstdio>\n\nint main() {\n    std::printf("Hello, World!\\n");\n    return 0;\n}' },
  { id: 'javascript', name: 'JavaScript', extension: '.js', defaultCode: 'console.log("Hello, World!");' },
  { id: 'python', name: 'Python', extension: '.py', defaultCode: 'print("Hello, World!")' },
  { id: 'java', name: 'Java', extension: '.java', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
];

 
const EXECUTORS: Record<string, any> = {
  javascript: javascriptExecutor,
  python: pythonExecutor,
  c: cExecutor,
  cpp: cExecutor,
  java: javaExecutor,
  rust: rustExecutor,
};

 
export function Compiler() {
   
  const isMounted = useRef(false);
  const shouldIgnoreLanguageChange = useRef(false);

   
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
  const inputRef = useRef<HTMLInputElement>(null);  
  const bundlerRef = useRef<Bundler | null>(null);
  const pendingInputResolve = useRef<((v: string) => void) | null>(null);
  const [pythonBooting, setPythonBooting] = useState(false);
  const [pythonLoadingProgress, setPythonLoadingProgress] = useState({ stage: '', progress: 0 });
   
  const echoPromptsRef = useRef<string[]>([]);
  const echoInputsRef = useRef<string[]>([]);

  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const isLightMode = resolvedTheme === 'light';

   
  useEffect(() => {
    isMounted.current = true;

     
    const pendingCode = localStorage.getItem('compiler_pending_code');
    const pendingLanguage = localStorage.getItem('compiler_pending_language');

     
     
     
     
     
     
     

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

     
     
    (async () => {
      try {
        if (initialLanguage.id === 'python') {
          setPythonBooting(true);
           
          pythonExecutor.setProgressCallback((stage: string, progress: number) => {
            setPythonLoadingProgress({ stage, progress });
          });
          await pythonExecutor.init();
          setPythonBooting(false);
        } else if (initialLanguage.id === 'c' || initialLanguage.id === 'cpp') {
          try { await cExecutor.init(); } catch (e) { console.warn('[Compiler] C/C++ init failed:', e); }
        } else if (initialLanguage.id === 'java') {
          try { await javaExecutor.init(); } catch (e) { console.warn('[Compiler] Java init failed:', e); }
        }

         
         
        setTimeout(() => {
          if (initialLanguage.id !== 'python') {
            pythonExecutor.setProgressCallback((stage: string, progress: number) => {
              setPythonLoadingProgress({ stage, progress });
            });
            pythonExecutor.preload();
          }
        }, 2000);

         
         
      } catch (e) {
        console.warn('[Compiler] Executor init failed:', e);
      }
    })();

    return () => {
      isMounted.current = false;
    };
  }, []);  

   
  useEffect(() => {
    if (isMounted.current && bundlerRef.current) {
       
      if (shouldIgnoreLanguageChange.current) {
        shouldIgnoreLanguageChange.current = false;
        return;
      }

       
       
       

      const pendingCode = localStorage.getItem('compiler_pending_code');
      const pendingLanguage = localStorage.getItem('compiler_pending_language');

       
      if (pendingLanguage && pendingCode &&
        (selectedLanguage.id === pendingLanguage || selectedLanguage.name.toLowerCase() === pendingLanguage.toLowerCase())) {

         
         
         
         

         
         

         
        if (code === pendingCode) {
          bundlerRef.current.setFiles({
            [`/main${selectedLanguage.extension}`]: code
          });
          return;
        }
      }

       
       
       
       

       
       
       

       
       

       
       

       
       
       

       
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

   
  const runCode = async () => {
    if (!bundlerRef.current) return;

    setIsRunning(true);
    setIsCompiling(true);
    setConsoleOutput([]);
    setIsWaitingForInput(false);

     

    try {
      setIsCompiling(false);
       

      const executor = EXECUTORS[selectedLanguage.id];
      if (!executor || typeof executor.execute !== 'function') {
        setConsoleOutput(prev => [...prev, `Error: No executor available for ${selectedLanguage.name}`]);
        return;
      }

       
      if (selectedLanguage.id === 'c' || selectedLanguage.id === 'cpp') {
        setConsoleOutput(prev => [...prev, '[C/C++] First run can take a few seconds please wait...']);
      } else if (selectedLanguage.id === 'java') {
        setConsoleOutput(prev => [...prev, '[Java] Compiling and executing...']);
      }

      const result = await executor.execute(
        code,
        '',
        async (prompt: string) => {
           
          const p = String(prompt || '');

           
           
          if (p) {
            setConsoleOutput(prev => [...prev, p.replace(/\n$/, '')]);
          }

          echoPromptsRef.current.push(p);
          setInlineInput('');
          setInputPrompt(p);
          setIsWaitingForInput(true);
           
          setTimeout(() => consoleRef.current?.focus(), 0);
          return await new Promise<string>((resolve) => {
            (pendingInputResolve.current as any) = resolve;
          });
        },
         
        selectedLanguage.id
      );

      const out = (result.output ?? '').toString();
      const err = (result.error ?? '').toString();

      if (err.trim().length > 0) {
         
        const errLines = err.split('\n').filter((l: string) => l !== '');
        setConsoleOutput(prev => [...prev, ...errLines.map((l: string) => `Error: ${l}`)]);
        setConsoleOutput(prev => [...prev, `Program exited with code 1`]);
      } else {
        if (out.trim().length > 0) {
          let lines = out.split('\n');

           
           
          lines = lines.flatMap((line: string) => {
             
             
            const pattern = /([a-z0-9])([A-Z][a-z]*:)/g;
            if (pattern.test(line)) {
               
              const parts = line.split(/(?=[A-Z][a-z]*:\s)/);
              return parts;
            }
            return [line];
          });

           
          if (echoPromptsRef.current.length > 0) {
            const promptSet = new Set(echoPromptsRef.current.map((p: string) => p.trim()));

            lines = lines.filter((line: string) => {
              const trimmed = line.trim();

               
              if (trimmed === '') {
                return true;
              }

               
              if (promptSet.has(trimmed)) {
                return false;
              }

               
              return true;
            });
          }

          setConsoleOutput(prev => [...prev, ...lines]);
        } else {
          if (!result.plots || result.plots.length === 0) {
            setConsoleOutput(prev => [...prev, `[No output]`]);
          }
        }

         
        if (result.plots && result.plots.length > 0) {
          const plotImages = result.plots.map((p: string) => `data:image/png;base64,${p}`);
          setConsoleOutput(prev => [...prev, ...plotImages]);
        }

         
        if (result.plotly && result.plotly.length > 0) {
          setConsoleOutput(prev => [...prev, ...result.plotly.map((json: string) => ({ type: 'plotly', data: json }))]);
        }

        setConsoleOutput(prev => [...prev, `Program exited with code 0`]);
      }
    } catch (error) {
      setConsoleOutput(prev => [...prev, `Error: ${String(error)}`]);
    } finally {
      setIsRunning(false);
       
      echoPromptsRef.current = [];
      echoInputsRef.current = [];

       
      if (consoleRef.current) {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      }
    }

     
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  };

   
  const stopExecution = async () => {
    try {
      const ex = EXECUTORS[selectedLanguage.id];
      if (ex && typeof ex.cancel === 'function') {
        await ex.cancel();
      }
    } catch (e) {
       
    } finally {
      setIsWaitingForInput(false);
      setInlineInput('');
      setInputPrompt('');
      setIsRunning(false);
      setConsoleOutput(prev => [...prev, 'Program stopped by user']);
    }
  };

   
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const langId = e.target.value;
    const language = LANGUAGES.find(lang => lang.id === langId) || LANGUAGES[0];
    setSelectedLanguage(language);
  };

   
  const getLanguageFromExtension = (extension: string): string => {
    switch (extension) {
      case '.js': return 'js';
      case '.cpp': case '.c': return 'cpp';
      case '.py': return 'python';
      case '.java': return 'java';
      default: return 'js';
    }
  };

   
  const handleCursorPositionChange = (line: number, column: number) => {
    setCursorPosition({ line, column });
  };

   
   
  const handleConsoleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isWaitingForInput) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const toSend = inlineInput;
       
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
      { }
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
            disabled={isRunning || pythonBooting}
          >
            {pythonBooting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {pythonLoadingProgress.stage || 'Loading Python...'}
              </span>
            ) : isRunning ? (isCompiling ? 'Compiling...' : 'Running...') : 'Run'}
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

      { }

      { }
      <div className="flex-1 flex flex-col overflow-hidden">
        { }
        <div className="flex-1 overflow-auto">
          <ClientCodeEditor
            value={code}
            onChange={setCode}
            language={getLanguageFromExtension(selectedLanguage.extension)}
            onCursorPositionChange={handleCursorPositionChange}
          />
        </div>

        { }
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
                        { }
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

          { }
        </div>
      </div>

      { }
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
