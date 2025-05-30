"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle, Download, Copy, Trash, Check, Loader2, MessageSquare } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { executeCode } from '@/lib/judge0';
import compilerChatService from '@/lib/compiler-chat-service';

const languages = [
  { id: "python", name: "Python", extension: ".py", template: "# Python code here\nprint('Hello, World!')" },
  { id: "javascript", name: "JavaScript", extension: ".js", template: "// JavaScript code here\nconsole.log('Hello, World!');" },
  { id: "java", name: "Java", extension: ".java", template: "// Java code here\npublic class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, World!\");\n  }\n}" },
  { id: "c", name: "C", extension: ".c", template: "// C code here\n#include <stdio.h>\n\nint main() {\n  printf(\"Hello, World!\\n\");\n  return 0;\n}" },
  { id: "cpp", name: "C++", extension: ".cpp", template: "// C++ code here\n#include <iostream>\n\nint main() {\n  std::cout << \"Hello, World!\" << std::endl;\n  return 0;\n}" },
  { id: "csharp", name: "C#", extension: ".cs", template: "// C# code here\nusing System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine(\"Hello, World!\");\n  }\n}" },
  { id: "html", name: "HTML", extension: ".html", template: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Hello World</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>" },
  { id: "css", name: "CSS", extension: ".css", template: "/* CSS code here */\nbody {\n  font-family: Arial, sans-serif;\n  background-color: #f0f0f0;\n}\n\nh1 {\n  color: #333;\n  text-align: center;\n}" },
];

// Define types for global WebAssembly engines
declare global {
  interface Window {
    // Python
    loadPyodide: any;
    pyodide: any;
    
    // JavaScript
    monaco: any;
    
    // C/C++
    Module: any;
    EmscriptenModule: any;
    
    // Java
    initCheerpJ: any;
    CheerpJ: any;
    
    // C#
    Blazor: any;
  }
}

// Language engine states
type EngineState = {
  loading: boolean;
  loaded: boolean;
  instance: any;
};

type EngineStates = {
  python: EngineState;
  javascript: EngineState;
  java: EngineState;
  c: EngineState;
  cpp: EngineState;
  csharp: EngineState;
};

export default function CompilerPage() {
  const searchParams = useSearchParams();
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [code, setCode] = useState(languages[0].template);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // State for WebAssembly engines
  const [engines, setEngines] = useState<EngineStates>({
    python: { loading: false, loaded: false, instance: null },
    javascript: { loading: false, loaded: true, instance: null }, // JS always available
    java: { loading: false, loaded: false, instance: null },
    c: { loading: false, loaded: false, instance: null },
    cpp: { loading: false, loaded: false, instance: null },
    csharp: { loading: false, loaded: false, instance: null }
  });

  // Process URL parameters when the component mounts
  useEffect(() => {
    const langParam = searchParams?.get('language');
    const codeParam = searchParams?.get('code');
    
    if (langParam) {
      const lang = languages.find(l => l.id === langParam);
      if (lang) {
        setSelectedLanguage(lang);
        
        // Only use the template if no code is provided
        if (!codeParam) {
          setCode(lang.template);
        }
      }
    }
    
    if (codeParam) {
      try {
        const decodedCode = decodeURIComponent(codeParam);
        setCode(decodedCode);
      } catch (e) {
        console.error("Failed to decode code parameter:", e);
      }
    }
  }, [searchParams]);

  // Helper to update engine state
  const updateEngineState = (language: keyof EngineStates, update: Partial<EngineState>) => {
    setEngines(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        ...update
      }
    }));
  };

  // Load appropriate engine when language is selected
  useEffect(() => {
    const langId = selectedLanguage.id as keyof EngineStates;
    
    // Only load if it's a supported WASM language and not already loaded/loading
    if (
      ['python', 'java', 'c', 'cpp', 'csharp'].includes(langId) && 
      !engines[langId].loaded && 
      !engines[langId].loading
    ) {
      loadEngine(langId);
    }
  }, [selectedLanguage.id, engines]);

  // Function to load the appropriate engine based on selected language
  const loadEngine = async (language: keyof EngineStates) => {
    // If engine is already loading or loaded, do nothing
    if (engines[language].loading || engines[language].loaded) return;
    
    // Set loading state
    updateEngineState(language, { loading: true });
    setOutput(`Loading ${language} engine...\nThis might take a moment for the first load.`);
    
    try {
      switch (language) {
        case 'python':
          await loadPyodideEngine();
          break;
        case 'java':
          await loadJavaEngine();
          break;
        case 'c':
        case 'cpp':
          await loadCCppEngine();
          break;
        case 'csharp':
          await loadCSharpEngine();
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${language} engine:`, error);
      setOutput(`Failed to load ${language} engine: ${error instanceof Error ? error.message : String(error)}`);
      updateEngineState(language, { loading: false });
    }
  };

  // Load Pyodide (Python) engine
  const loadPyodideEngine = async () => {
    try {
      // Load the Pyodide script
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        script.async = true;
        
        // Wait for the script to load
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      // Initialize Pyodide
      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
      });
      
      // Store the Pyodide instance
      updateEngineState('python', { 
        loading: false, 
        loaded: true, 
        instance: pyodide 
      });
      
      setOutput("Python engine loaded successfully! You can now run Python code.");
    } catch (error) {
      console.error('Failed to load Pyodide:', error);
      throw error;
    }
  };

  // Load CheerpJ (Java) engine
  const loadJavaEngine = async () => {
    try {
      setOutput("Java WebAssembly support is being implemented. Currently using simulation mode.");
      
      // For now, just mark as loaded to avoid loading spinner
      updateEngineState('java', { loading: false, loaded: true, instance: null });
      
      // TODO: Implement actual Java WASM runtime when we add it
      
      /* Full implementation would be something like:
      if (!window.initCheerpJ) {
        const script = document.createElement('script');
        script.src = 'path/to/cheerpj.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      await window.initCheerpJ();
      const javaInstance = window.CheerpJ;
      
      updateEngineState('java', { 
        loading: false, 
        loaded: true, 
        instance: javaInstance 
      });
      */
    } catch (error) {
      console.error('Failed to load Java engine:', error);
      throw error;
    }
  };

  // Load Emscripten (C/C++) engine
  const loadCCppEngine = async () => {
    try {
      setOutput("C/C++ WebAssembly support is being implemented. Currently using simulation mode.");
      
      // For now, just mark as loaded to avoid loading spinner
      updateEngineState('c', { loading: false, loaded: true, instance: null });
      updateEngineState('cpp', { loading: false, loaded: true, instance: null });
      
      // TODO: Implement actual C/C++ WASM runtime when we add it
      
      /* Full implementation would be something like:
      if (!window.Module) {
        const script = document.createElement('script');
        script.src = 'path/to/emscripten.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      const module = await window.Module();
      
      updateEngineState('c', { 
        loading: false, 
        loaded: true, 
        instance: module 
      });
      updateEngineState('cpp', { 
        loading: false, 
        loaded: true, 
        instance: module 
      });
      */
    } catch (error) {
      console.error('Failed to load C/C++ engine:', error);
      throw error;
    }
  };

  // Load Blazor WebAssembly (C#) engine
  const loadCSharpEngine = async () => {
    try {
      setOutput("C# WebAssembly support is being implemented. Currently using simulation mode.");
      
      // For now, just mark as loaded to avoid loading spinner
      updateEngineState('csharp', { loading: false, loaded: true, instance: null });
      
      // TODO: Implement actual C# WASM runtime when we add it
      
      /* Full implementation would be something like:
      if (!window.Blazor) {
        const script = document.createElement('script');
        script.src = 'path/to/blazor.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      
      await window.Blazor.start();
      
      updateEngineState('csharp', { 
        loading: false, 
        loaded: true, 
        instance: window.Blazor
      });
      */
    } catch (error) {
      console.error('Failed to load C# engine:', error);
      throw error;
    }
  };

  const handleLanguageChange = (langId: string) => {
    const lang = languages.find(l => l.id === langId) || languages[0];
    setSelectedLanguage(lang);
    setCode(lang.template);
    setOutput("");
  };

  // Execute Python code with real Pyodide
  const executePythonWithPyodide = async (code: string): Promise<string> => {
    const pyodide = engines.python.instance;
    if (!pyodide) {
      return "Python engine not loaded. Please reload the page and try again.";
    }
    
    let output = "";
    
    try {
      // Create a custom stdout to capture output
      await pyodide.runPythonAsync(`
        import sys
        from io import StringIO
        sys.stdout = StringIO()
        sys.stderr = StringIO()
      `);
      
      // Run the actual code
      await pyodide.runPythonAsync(code);
      
      // Get stdout content
      const stdout = await pyodide.runPythonAsync(`sys.stdout.getvalue()`);
      const stderr = await pyodide.runPythonAsync(`sys.stderr.getvalue()`);
      
      // Combine output
      if (stdout) output += stdout;
      if (stderr) output += "\n" + stderr;
      
      // Reset stdout
      await pyodide.runPythonAsync(`
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__
      `);
      
      return output || "[No output]";
    } catch (error) {
      console.error('Python execution error:', error);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  };

  // Fallback Python interpreter
  const executePython = (code: string): string => {
    let output = "Python 3.10.0\n";
    
    try {
      // Split the code into lines for analysis
      const lines = code.split('\n');
      
      // Track variables for simple execution simulation
      const variables: Record<string, any> = {};
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('#') || !trimmedLine) continue;
        
        // Handle print statements
        if (trimmedLine.startsWith('print(')) {
          // Extract content within print()
          const match = trimmedLine.match(/print\((.*)\)/);
          if (match && match[1]) {
            const content = match[1].trim();
            
            // Check if it's a string literal
            if ((content.startsWith("'") && content.endsWith("'")) || 
                (content.startsWith('"') && content.endsWith('"'))) {
              output += content.slice(1, -1) + '\n';
            } 
            // Check if it's a variable
            else if (variables[content] !== undefined) {
              output += String(variables[content]) + '\n';
            }
            // Evaluate simple expressions
            else if (/^\d+(\s*[\+\-\*\/]\s*\d+)*$/.test(content)) {
              try {
                // Safe evaluation for simple arithmetic
                const result = Function(`"use strict"; return (${content.replace(/[\n\r]/g, '')})`)();
                output += result + '\n';
              } catch (e) {
                output += "[Error evaluating expression]\n";
              }
            } else {
              output += `[Variable '${content}' not defined]\n`;
            }
          }
        }
        // Handle basic variable assignment
        else if (trimmedLine.includes('=')) {
          const [varName, varValue] = trimmedLine.split('=').map(s => s.trim());
          
          // Simple number assignment
          if (/^\d+$/.test(varValue)) {
            variables[varName] = parseInt(varValue, 10);
          } 
          // Simple string assignment
          else if ((varValue.startsWith("'") && varValue.endsWith("'")) || 
                  (varValue.startsWith('"') && varValue.endsWith('"'))) {
            variables[varName] = varValue.slice(1, -1);
          }
          // Simple arithmetic
          else if (/^\d+(\s*[\+\-\*\/]\s*\d+)*$/.test(varValue)) {
            try {
              // Safe evaluation for simple arithmetic
              variables[varName] = Function(`"use strict"; return (${varValue.replace(/[\n\r]/g, '')})`)();
            } catch (e) {
              output += `SyntaxError: invalid syntax in assignment\n`;
            }
          }
        }
        // If code contains logic we can't handle, add a placeholder
        else if (
          trimmedLine.startsWith('if ') || 
          trimmedLine.startsWith('for ') || 
          trimmedLine.startsWith('while ') || 
          trimmedLine.startsWith('def ') || 
          trimmedLine.endsWith(':')
        ) {
          output += "[Complex code execution simulated]\n";
        }
      }
      
      // If no output was generated, add a message
      if (output === "Python 3.10.0\n") {
        output += "[No output]";
      }
    } catch (e) {
      output += `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    return output;
  };

  // Execute JavaScript code safely
  const executeJavaScript = (code: string): string => {
    let output = "Node.js v18.12.1\n";
    
    try {
      // Create a sandbox to capture console.log output
      const originalLog = console.log;
      const logs: string[] = [];
      
      // Override console.log
      console.log = (...args) => {
        logs.push(args.map(arg => String(arg)).join(' '));
      };
      
      // Execute the code
      try {
        // Wrap in try/catch and restrict code execution time
        const wrappedCode = `
          "use strict";
          try {
            ${code}
          } catch (e) {
            console.log("Runtime error:", e.message);
          }
        `;
        
        // Execute with Function constructor for better isolation
        Function(wrappedCode)();
        
        // Add logs to output
        output += logs.join('\n');
      } catch (e) {
        output += `Error: ${e instanceof Error ? e.message : String(e)}`;
      } finally {
        // Restore original console.log
        console.log = originalLog;
      }
      
      // If no output was generated, add a message
      if (output === "Node.js v18.12.1\n") {
        output += "[No output]";
      }
    } catch (e) {
      output += `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    return output;
  };

  // Parse Java code and generate a realistic output
  const executeJava = (code: string): string => {
    let output = "OpenJDK 11.0.12\n";
    
    try {
      // Check if the code contains a main method
      if (code.includes("public static void main")) {
        // Look for println statements
        const printlnRegex = /System\.out\.println\((.*?)\);/g;
        const printMatches = code.matchAll(printlnRegex);
        
        let hasPrinted = false;
        
        for (const match of printMatches) {
          if (match[1]) {
            let content = match[1].trim();
            
            // Handle string literals
            if ((content.startsWith('"') && content.endsWith('"'))) {
              output += content.slice(1, -1) + '\n';
              hasPrinted = true;
            } 
            // Handle simple expressions
            else if (/^\d+(\s*[\+\-\*\/]\s*\d+)*$/.test(content)) {
              try {
                // Safe evaluation for simple arithmetic
                const result = Function(`"use strict"; return (${content.replace(/[\n\r]/g, '')})`)();
                output += result + '\n';
                hasPrinted = true;
              } catch (e) {
                output += "[Error evaluating expression]\n";
                hasPrinted = true;
              }
            }
          }
        }
        
        // If there are no println statements
        if (!hasPrinted) {
          output += "[Program executed with no output]";
        }
      } else {
        output += "Error: public static void main(String[] args) method not found";
      }
    } catch (e) {
      output += `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    return output;
  };

  // Parse C/C++ code and generate a realistic output
  const executeCFamily = (code: string, compiler: string): string => {
    let output = `${compiler}\n`;
    
    try {
      // Check if the code contains a main function
      if (code.includes("int main")) {
        // Look for printf statements in C
        const printfRegex = /printf\((.*?)\);/g;
        const printfMatches = code.matchAll(printfRegex);
        
        // Look for cout statements in C++
        const coutRegex = /cout\s*<<\s*(.*?)(<<|;)/g;
        const coutMatches = code.matchAll(coutRegex);
        
        let hasPrinted = false;
        
        // Process printf matches
        for (const match of printfMatches) {
          if (match[1]) {
            const content = match[1].trim();
            
            // Handle simple string format
            if (content.startsWith('"')) {
              // Extract the format string
              const formatStr = content.match(/"([^"]*)"/);
              if (formatStr && formatStr[1]) {
                // Replace \n with actual newlines
                output += formatStr[1].replace(/\\n/g, '\n');
                hasPrinted = true;
              }
            }
          }
        }
        
        // Process cout matches
        for (const match of coutMatches) {
          if (match[1]) {
            let content = match[1].trim();
            
            // Handle string literals
            if ((content.startsWith('"') && content.endsWith('"'))) {
              output += content.slice(1, -1);
              hasPrinted = true;
            } 
            // Handle endl
            else if (content === "endl") {
              output += '\n';
              hasPrinted = true;
            }
          }
        }
        
        // If there are no print statements
        if (!hasPrinted) {
          output += "[Program executed with no output]";
        }
      } else {
        output += "Error: int main() function not found";
      }
    } catch (e) {
      output += `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    return output;
  };

  // Render HTML output
  const executeHtml = (htmlCode: string): string => {
    // Instead of just returning a string, we'll set the iframe content
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlCode);
        iframeDoc.close();
        return "HTML rendered in preview";
      }
    }
    
    return "Error: Could not render HTML";
  };

  // Run the code using Judge0 API or locally for HTML/CSS
  const runCode = async () => {
    setIsRunning(true);
    setOutput("Running code...");
    
    try {
      let result = "";
      
      // HTML and CSS are handled locally
      if (selectedLanguage.id === "html") {
        result = executeHtml(code);
      } else if (selectedLanguage.id === "css") {
        // For CSS, we create a simple HTML with the CSS applied
        const htmlWithCss = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>${code}</style>
          </head>
          <body>
            <h1>Sample Heading</h1>
            <p>This paragraph demonstrates the CSS styling.</p>
            <div class="container">
              <button>Button Element</button>
              <a href="#">Link Element</a>
            </div>
          </body>
          </html>
        `;
        result = executeHtml(htmlWithCss);
      } else {
        // For all other languages, use Judge0 API
        result = await executeCode(code, selectedLanguage.id);
      }
      
      setOutput(result);
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearCode = () => {
    setCode(selectedLanguage.template);
    setOutput("");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopySuccess(true);
      
      // Reset the success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      setOutput(prev => `${prev}\nFailed to copy code to clipboard. Your browser might not support this feature.`);
    }
  };

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `code${selectedLanguage.extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Check if current language engine is loading
  const isEngineLoading = () => {
    const langId = selectedLanguage.id as keyof EngineStates;
    return engines[langId]?.loading || false;
  };

  // Check if current language engine is loaded
  const isEngineLoaded = () => {
    const langId = selectedLanguage.id as keyof EngineStates;
    return engines[langId]?.loaded || false;
  };

  return (
    <div className="container max-w-6xl py-8 compiler-page">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Code Compiler</h1>
        <p className="text-muted-foreground">Write, compile and run code in multiple languages</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="w-48">
              <Select 
                value={selectedLanguage.id} 
                onValueChange={handleLanguageChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.id} value={lang.id}>{lang.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={copyCode}
                title="Copy code"
                className="relative"
              >
                {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={downloadCode}
                title="Download code"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearCode}
                title="Clear code"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[500px] resize-none"
            placeholder="Enter your code here..."
          />
          
          <Button 
            onClick={runCode} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Run Code
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground mt-1">
            Using Judge0 compiler API - supports all language features
          </div>
          

        </div>
        
        {/* Output Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Output</h2>
            {output && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  compilerChatService.sendOutputToInputField(code, selectedLanguage.id, output);
                  alert('Output sent to chat input field!');
                }}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Send to Chat
              </Button>
            )}
          </div>
          
          {(selectedLanguage.id === "html" || selectedLanguage.id === "css") ? (
            <div className="bg-white border border-border rounded-md overflow-hidden min-h-[500px] flex flex-col">
              <div className="bg-muted px-4 py-2 border-b text-xs">Preview</div>
              <iframe 
                ref={iframeRef}
                className="flex-1 w-full"
                title="HTML Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="bg-muted font-mono text-sm rounded-md p-4 min-h-[500px] border overflow-auto">
              {output ? (
                <pre className="whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="text-muted-foreground">
                  Run your code to see the output here
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 