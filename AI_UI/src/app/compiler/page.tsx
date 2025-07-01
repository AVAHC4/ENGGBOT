"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PlayCircle, Download, Copy, Trash, Check, Loader2, Terminal, Send, BookOpen, FileText, FileDown, BookText } from "lucide-react";
import { useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { executeCode } from '@/lib/judge0';
import { generateWordDocument, generatePdfDocument, isCodeContent } from '@/lib/document-generator';
import { createAIDocument, AIDocumentRequest } from '@/lib/ai-document-generator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Add CSS for blinking cursor
const cursorStyles = `
  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0; }
    100% { opacity: 1; }
  }
  
  .terminal-cursor {
    display: inline-block;
    width: 8px;
    height: 15px;
    background-color: #00ff00;
    margin-left: 2px;
    animation: blink 1s infinite;
    vertical-align: middle;
  }
  
  .terminal-input-wrapper {
    display: flex;
    align-items: center;
  }
  
  .terminal-output {
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
  }
  
  .console-container {
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .code-block {
    max-width: 100%;
    overflow-x: auto;
    background-color: #1e1e1e;
    border-radius: 4px;
    padding: 8px;
    margin: 4px 0;
  }
  
  .chat-safe-output {
    max-width: 100%;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

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

// Input examples to showcase console capabilities
const inputExamples = [
  { 
    name: "Basic Input", 
    language: "python", 
    code: "# Basic input example\nname = input('Enter your name: ')\nprint(f'Hello, {name}! Welcome to the interactive console.')" 
  },
  { 
    name: "Calculator", 
    language: "python", 
    code: "# Simple calculator\nnum1 = float(input('Enter first number: '))\nnum2 = float(input('Enter second number: '))\n\nprint(f'Sum: {num1 + num2}')\nprint(f'Difference: {num1 - num2}')\nprint(f'Product: {num1 * num2}')\nif num2 != 0:\n    print(f'Division: {num1 / num2}')\nelse:\n    print('Division: Cannot divide by zero')" 
  },
  { 
    name: "Quiz Game", 
    language: "python", 
    code: "# Simple quiz game\nscore = 0\n\nprint('Welcome to the Python Quiz!')\n\n# Question 1\nprint('\\nQuestion 1: What is the output of 3 * 4?')\nanswer = input('Your answer: ')\nif answer == '12':\n    print('Correct!')\n    score += 1\nelse:\n    print('Wrong! The correct answer is 12.')\n\n# Question 2\nprint('\\nQuestion 2: What function is used to get input from the user in Python?')\nanswer = input('Your answer: ')\nif answer.lower() == 'input':\n    print('Correct!')\n    score += 1\nelse:\n    print('Wrong! The correct answer is input.')\n\n# Final score\nprint(f'\\nQuiz complete! Your score: {score}/2')" 
  },
  {
    name: "Java Input",
    language: "java",
    code: "// Java input example\nimport java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    \n    System.out.println(\"Enter your name:\");\n    String name = scanner.nextLine();\n    \n    System.out.println(\"Enter your age:\");\n    int age = scanner.nextInt();\n    \n    System.out.println(\"Hello, \" + name + \"! You are \" + age + \" years old.\");\n    \n    if (age < 18) {\n      System.out.println(\"You are a minor.\");\n    } else {\n      System.out.println(\"You are an adult.\");\n    }\n  }\n}"
  },
  {
    name: "C Input",
    language: "c",
    code: "// C input example\n#include <stdio.h>\n\nint main() {\n  char name[50];\n  int age;\n  \n  printf(\"Enter your name: \");\n  scanf(\"%s\", name);\n  \n  printf(\"Enter your age: \");\n  scanf(\"%d\", &age);\n  \n  printf(\"Hello, %s! You are %d years old.\\n\", name, age);\n  \n  if (age < 18) {\n    printf(\"You are a minor.\\n\");\n  } else {\n    printf(\"You are an adult.\\n\");\n  }\n  \n  return 0;\n}"
  },
  {
    name: "C++ Input",
    language: "cpp",
    code: "// C++ input example\n#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string name;\n  int age;\n  \n  cout << \"Enter your name: \";\n  cin >> name;\n  \n  cout << \"Enter your age: \";\n  cin >> age;\n  \n  cout << \"Hello, \" << name << \"! You are \" << age << \" years old.\" << endl;\n  \n  if (age < 18) {\n    cout << \"You are a minor.\" << endl;\n  } else {\n    cout << \"You are an adult.\" << endl;\n  }\n  \n  return 0;\n}"
  }
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

// Console message type
type ConsoleMessage = {
  type: 'input' | 'output' | 'error' | 'info' | 'system';
  content: string;
};

export default function CompilerPage() {
  const searchParams = useSearchParams();
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [code, setCode] = useState(languages[0].template);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Console related states
  const [showConsole, setShowConsole] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([
    { type: 'info', content: 'Interactive Console - Enter commands here' }
  ]);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [inputResolver, setInputResolver] = useState<((value: string) => void) | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  // State for WebAssembly engines
  const [engines, setEngines] = useState<EngineStates>({
    python: { loading: false, loaded: false, instance: null },
    javascript: { loading: false, loaded: true, instance: null }, // JS always available
    java: { loading: false, loaded: false, instance: null },
    c: { loading: false, loaded: false, instance: null },
    cpp: { loading: false, loaded: false, instance: null },
    csharp: { loading: false, loaded: false, instance: null }
  });

  // AI document generation state
  const [aiDocOpen, setAiDocOpen] = useState(false);
  const [aiDocPrompt, setAiDocPrompt] = useState("");
  const [aiDocTitle, setAiDocTitle] = useState("");
  const [aiDocType, setAiDocType] = useState<AIDocumentRequest['type']>("essay");
  const [aiDocLength, setAiDocLength] = useState<AIDocumentRequest['length']>("medium");
  const [aiDocFormat, setAiDocFormat] = useState<AIDocumentRequest['format']>("word");
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

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

  // Auto scroll to bottom of console when messages update
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleMessages]);

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
      
      addConsoleMessage('info', "Python engine loaded successfully! You can now run Python code.");
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
    
    // Reset console state when changing language
    setConsoleMessages([{ type: 'info', content: `${lang.name} Console - Ready for execution` }]);
  };

  // Execute Python code with real Pyodide
  const executePythonWithPyodide = async (code: string): Promise<string> => {
    const pyodide = engines.python.instance;
    if (!pyodide) {
      addConsoleMessage('error', "Python engine not loaded. Please reload the page and try again.");
      return "Python engine not loaded. Please reload the page and try again.";
    }
    
    let output = "";
    
    try {
      // Create a custom stdout to capture output and provide input function
      await pyodide.runPythonAsync(`
        import sys
        from io import StringIO
        sys.stdout = StringIO()
        sys.stderr = StringIO()
        
        # Define custom input function that will call back to JS
        def input(prompt=''):
            # First flush any pending output to display the prompt
            print(prompt, end='')
            sys.stdout.flush()
            return __js__.requestInputFromUser(prompt)
      `);
      
      // Create a JavaScript function to request input from the user
      pyodide.globals.set('requestInputFromUser', (prompt: string) => {
        return new Promise((resolve) => {
          // Display the prompt in the console
          addConsoleMessage('output', prompt);
          setWaitingForInput(true);
          setInputResolver(() => resolve);
        });
      });
      
      // Run the actual code
      await pyodide.runPythonAsync(code);
      
      // Get stdout content
      const stdout = await pyodide.runPythonAsync(`sys.stdout.getvalue()`);
      const stderr = await pyodide.runPythonAsync(`sys.stderr.getvalue()`);
      
      // Combine output
      if (stdout) {
        output += stdout;
        addConsoleMessage('output', stdout);
      }
      if (stderr) {
        output += "\n" + stderr;
        addConsoleMessage('error', stderr);
      }
      
      // Reset stdout
      await pyodide.runPythonAsync(`
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__
      `);
      
      return output || "[No output]";
    } catch (error) {
      console.error('Python execution error:', error);
      const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
      addConsoleMessage('error', errorMsg);
      return errorMsg;
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
      
      // Create a custom input function
      const originalPrompt = window.prompt;
      
      // We're overriding prompt for our code execution environment only
      // Using any to bypass type checking since we're only using it in controlled context
      (window as any).customPrompt = (message: string) => {
        return new Promise<string>((resolve) => {
          // Display the prompt in the console
          addConsoleMessage('output', message || 'Input:');
          setWaitingForInput(true);
          setInputResolver(() => resolve);
        }).then(input => {
          return input;
        });
      };
      
      // Override console.log
      console.log = (...args) => {
        const logMessage = args.map(arg => String(arg)).join(' ');
        logs.push(logMessage);
        addConsoleMessage('output', logMessage);
      };
      
      // Execute the code
      try {
        // Enable console
        setShowConsole(true);
        
        // Wrap in try/catch and restrict code execution time
        const wrappedCode = `
          "use strict";
          
          // Use our custom prompt within this execution context
          const prompt = window.customPrompt;
          
          async function executeUserCode() {
            try {
              ${code}
            } catch (e) {
              console.log("Runtime error:", e.message);
            }
          }
          
          executeUserCode();
        `;
        
        // Execute with Function constructor for better isolation
        Function(wrappedCode)();
        
        // Add logs to output
        output += logs.join('\n');
      } catch (e) {
        const errorMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
        output += errorMsg;
        addConsoleMessage('error', errorMsg);
      } finally {
        // Restore original console.log and cleanup
        console.log = originalLog;
        delete (window as any).customPrompt;
      }
      
      // If no output was generated, add a message
      if (output === "Node.js v18.12.1\n") {
        output += "[No output]";
      }
    } catch (e) {
      const errorMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      output += errorMsg;
      addConsoleMessage('error', errorMsg);
    }
    
    return output;
  };

  // Parse Java code and generate a realistic output
  const executeJava = (code: string): string => {
    let output = "OpenJDK 11.0.12\n";
    setShowConsole(true);
    
    try {
      // Look for Scanner usage which indicates input may be needed
      const hasScannerUsage = code.includes("Scanner") && code.includes(".next");
      
      if (hasScannerUsage) {
        addConsoleMessage('info', "Java code with input detected. Interactive mode enabled.");
      }
      
      // Check if the code contains a main method
      if (code.includes("public static void main")) {
        // Handle Scanner input simulation for interactive code
        if (hasScannerUsage) {
          // Extract all scanner.next* calls to simulate them
          const scannerNextRegex = /(\w+)\.next(\w*)\(\)/g;
          const inputCalls = Array.from(code.matchAll(scannerNextRegex));
          
          if (inputCalls.length > 0) {
            // Process the code and handle inputs asynchronously
            processJavaWithInput(code, inputCalls).then(result => {
              setOutput(prev => prev + result);
            }).catch(error => {
              const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
              addConsoleMessage('error', errorMsg);
            });
            
            // Return initial message while async processing happens
            return output + "Running Java code with input...\nCheck console for interaction.";
          }
        }
        
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
              addConsoleMessage('output', content.slice(1, -1));
              hasPrinted = true;
            } 
            // Handle simple expressions
            else if (/^\d+(\s*[\+\-\*\/]\s*\d+)*$/.test(content)) {
              try {
                // Safe evaluation for simple arithmetic
                const result = Function(`"use strict"; return (${content.replace(/[\n\r]/g, '')})`)();
                output += result + '\n';
                addConsoleMessage('output', String(result));
                hasPrinted = true;
              } catch (e) {
                output += "[Error evaluating expression]\n";
                addConsoleMessage('error', "[Error evaluating expression]");
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
        addConsoleMessage('error', "Error: public static void main(String[] args) method not found");
      }
    } catch (e) {
      const errorMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      output += errorMsg;
      addConsoleMessage('error', errorMsg);
    }
    
    return output;
  };

  // Process Java code with input handling
  const processJavaWithInput = async (code: string, inputCalls: RegExpMatchArray[]): Promise<string> => {
    let output = "";
    let variables: Record<string, any> = {};
    
    // Extract print statements to process
    const printlnRegex = /System\.out\.println\((.*?)\);/g;
    const printMatches = Array.from(code.matchAll(printlnRegex));
    
    // Process the code line by line (simplified simulation)
    const lines = code.split('\n');
    
    // Track which input call we're currently processing
    let currentInputIndex = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments, empty lines, and class/method declarations
      if (trimmedLine.startsWith('//') || !trimmedLine || 
          trimmedLine.startsWith('public class') || 
          trimmedLine.startsWith('public static void main')) {
        continue;
      }
      
      // Check for print statements
      if (trimmedLine.includes("System.out.println")) {
        const match = trimmedLine.match(/System\.out\.println\((.*?)\);/);
        if (match && match[1]) {
          const content = match[1].trim();
          
          // Handle string literals
          if ((content.startsWith('"') && content.endsWith('"'))) {
            const text = content.slice(1, -1);
            output += text + '\n';
            addConsoleMessage('output', text);
          } 
          // Handle variables
          else if (variables[content]) {
            output += variables[content] + '\n';
            addConsoleMessage('output', String(variables[content]));
          }
          // Handle simple expressions
          else if (/^\d+(\s*[\+\-\*\/]\s*\d+)*$/.test(content)) {
            try {
              const result = Function(`"use strict"; return (${content.replace(/[\n\r]/g, '')})`)();
              output += result + '\n';
              addConsoleMessage('output', String(result));
            } catch (e) {
              output += "[Error evaluating expression]\n";
              addConsoleMessage('error', "[Error evaluating expression]");
            }
          }
        }
      }
      
      // Handle variable assignments
      else if (trimmedLine.includes("=") && !trimmedLine.includes("==")) {
        // Very simplified variable assignment handling
        const parts = trimmedLine.split('=').map(p => p.trim());
        if (parts.length === 2) {
          const varName = parts[0].split(' ').pop() || '';
          const value = parts[1].replace(';', '').trim();
          
          // Store the value in our variables map
          if (value.startsWith('"') && value.endsWith('"')) {
            variables[varName] = value.slice(1, -1);
          } else if (!isNaN(Number(value))) {
            variables[varName] = Number(value);
          } else {
            variables[varName] = value;
          }
        }
      }
      
      // Handle Scanner input
      else if (trimmedLine.includes(".next")) {
        const match = inputCalls[currentInputIndex];
        if (match) {
          const inputType = match[2] || "Line"; // nextLine, nextInt, next, etc.
          const varName = trimmedLine.split('=')[0].trim();
          
          // Prompt for input
          addConsoleMessage('output', `Waiting for input (${inputType})...`);
          
          // Get actual user input
          const userInput = await new Promise<string>((resolve) => {
            setWaitingForInput(true);
            setInputResolver(() => resolve);
          });
          
          // Process the input based on type
          let processedInput = userInput;
          if (inputType.toLowerCase() === 'int') {
            processedInput = parseInt(userInput, 10).toString();
            variables[varName] = parseInt(userInput, 10);
          } else if (inputType.toLowerCase() === 'double' || inputType.toLowerCase() === 'float') {
            processedInput = parseFloat(userInput).toString();
            variables[varName] = parseFloat(userInput);
          } else {
            variables[varName] = userInput;
          }
          
          // Move to next input
          currentInputIndex++;
        }
      }
    }
    
    return output || "[Program executed with no output]";
  };

  // Parse C/C++ code and generate a realistic output
  const executeCFamily = (code: string, compiler: string): string => {
    let output = `${compiler}\n`;
    setShowConsole(true);
    
    try {
      // Check if the code contains input functions (scanf, cin)
      const hasScanf = code.includes("scanf");
      const hasCin = code.includes("cin >>");
      
      if (hasScanf || hasCin) {
        addConsoleMessage('info', "C/C++ code with input detected. Interactive mode enabled.");
      }
      
      // Check if the code contains a main function
      if (code.includes("int main")) {
        // Handle input for interactive code
        if (hasScanf || hasCin) {
          // Extract all input calls
          let inputCalls: RegExpMatchArray[] = [];
          
          if (hasScanf) {
            const scanfRegex = /scanf\s*\(\s*"([^"]*)"/g;
            const scanfMatches = Array.from(code.matchAll(scanfRegex));
            inputCalls = [...inputCalls, ...scanfMatches];
          }
          
          if (hasCin) {
            const cinRegex = /cin\s*>>\s*(\w+)/g;
            const cinMatches = Array.from(code.matchAll(cinRegex));
            inputCalls = [...inputCalls, ...cinMatches];
          }
          
          if (inputCalls.length > 0) {
            // Process the code and handle inputs asynchronously
            processCFamilyWithInput(code, inputCalls, compiler === "G++ 11.2.0").then(result => {
              setOutput(prev => prev + result);
            }).catch(error => {
              const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
              addConsoleMessage('error', errorMsg);
            });
            
            // Return initial message while async processing happens
            return output + "Running C/C++ code with input...\nCheck console for interaction.";
          }
        }
        
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
                const formattedOutput = formatStr[1].replace(/\\n/g, '\n');
                output += formattedOutput;
                addConsoleMessage('output', formattedOutput.replace(/\n/g, ''));
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
              addConsoleMessage('output', content.slice(1, -1));
              hasPrinted = true;
            } 
            // Handle endl
            else if (content === "endl") {
              output += '\n';
              addConsoleMessage('output', '');
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
        addConsoleMessage('error', "Error: int main() function not found");
      }
    } catch (e) {
      const errorMsg = `Error: ${e instanceof Error ? e.message : String(e)}`;
      output += errorMsg;
      addConsoleMessage('error', errorMsg);
    }
    
    return output;
  };

  // Process C/C++ code with input handling
  const processCFamilyWithInput = async (code: string, inputCalls: RegExpMatchArray[], isCpp: boolean): Promise<string> => {
    let output = "";
    let variables: Record<string, any> = {};
    
    // Process the code line by line (simplified simulation)
    const lines = code.split('\n');
    
    // Track which input call we're currently processing
    let currentInputIndex = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments, empty lines, and function declarations
      if (trimmedLine.startsWith('//') || !trimmedLine || 
          trimmedLine.startsWith('int main') || 
          trimmedLine.startsWith('#include')) {
        continue;
      }
      
      // Check for printf statements (C)
      if (trimmedLine.includes("printf")) {
        const match = trimmedLine.match(/printf\((.*?)\);/);
        if (match && match[1]) {
          const content = match[1].trim();
          
          // Handle string literals
          if (content.startsWith('"')) {
            const formatStr = content.match(/"([^"]*)"/);
            if (formatStr && formatStr[1]) {
              const text = formatStr[1].replace(/\\n/g, '\n');
              output += text;
              addConsoleMessage('output', text.replace(/\n/g, ''));
            }
          }
        }
      }
      
      // Check for cout statements (C++)
      else if (trimmedLine.includes("cout")) {
        const coutParts = trimmedLine.split('<<');
        
        for (let i = 1; i < coutParts.length; i++) {
          const part = coutParts[i].trim().replace(/;$/, '');
          
          if (part.startsWith('"') && part.endsWith('"')) {
            const text = part.slice(1, -1);
            output += text;
            addConsoleMessage('output', text);
          } else if (part === "endl") {
            output += '\n';
            addConsoleMessage('output', '');
          } else if (variables[part]) {
            output += variables[part];
            addConsoleMessage('output', String(variables[part]));
          }
        }
      }
      
      // Handle variable assignments
      else if (trimmedLine.includes("=") && !trimmedLine.includes("==")) {
        // Very simplified variable assignment handling
        const parts = trimmedLine.split('=').map(p => p.trim());
        if (parts.length === 2) {
          const varName = parts[0].split(' ').pop() || '';
          const value = parts[1].replace(';', '').trim();
          
          // Store the value in our variables map
          if (value.startsWith('"') && value.endsWith('"')) {
            variables[varName] = value.slice(1, -1);
          } else if (!isNaN(Number(value))) {
            variables[varName] = Number(value);
          } else {
            variables[varName] = value;
          }
        }
      }
      
      // Handle scanf input (C)
      else if (trimmedLine.includes("scanf")) {
        const match = trimmedLine.match(/scanf\s*\(\s*"([^"]*)"/);
        if (match && match[1]) {
          const formatStr = match[1];
          const varName = trimmedLine.match(/&(\w+)\)/)?.[1];
          
          if (varName) {
            // Determine input type from format string
            let inputType = "string";
            if (formatStr.includes("%d")) inputType = "int";
            else if (formatStr.includes("%f")) inputType = "float";
            
            // Prompt for input
            addConsoleMessage('output', `Input for scanf("${formatStr}"):`);
            
            // Get actual user input
            const userInput = await new Promise<string>((resolve) => {
              setWaitingForInput(true);
              setInputResolver(() => resolve);
            });
            
            // Process the input based on type
            if (inputType === "int") {
              variables[varName] = parseInt(userInput, 10);
            } else if (inputType === "float") {
              variables[varName] = parseFloat(userInput);
            } else {
              variables[varName] = userInput;
            }
            
            // Move to next input
            currentInputIndex++;
          }
        }
      }
      
      // Handle cin input (C++)
      else if (trimmedLine.includes("cin >>")) {
        const match = trimmedLine.match(/cin\s*>>\s*(\w+)/);
        if (match && match[1]) {
          const varName = match[1];
          
          // Prompt for input
          addConsoleMessage('output', `Input for ${varName}:`);
          
          // Get actual user input
          const userInput = await new Promise<string>((resolve) => {
            setWaitingForInput(true);
            setInputResolver(() => resolve);
          });
          
          // Try to determine variable type from declarations (simplified)
          let varType = "string";
          for (const line of lines) {
            if (line.includes(varName) && line.includes(";") && !line.includes("cin") && !line.includes("cout")) {
              if (line.includes("int")) varType = "int";
              else if (line.includes("float") || line.includes("double")) varType = "float";
              break;
            }
          }
          
          // Process the input based on type
          if (varType === "int") {
            variables[varName] = parseInt(userInput, 10);
          } else if (varType === "float") {
            variables[varName] = parseFloat(userInput);
          } else {
            variables[varName] = userInput;
          }
          
          // Move to next input
          currentInputIndex++;
        }
      }
    }
    
    return output || "[Program executed with no output]";
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
    setConsoleMessages([{ type: 'info', content: 'Console cleared' }]);
    addConsoleMessage('info', "Running code...");
    
    try {
      let result = "";
      
      // Handle based on language
      switch (selectedLanguage.id) {
        case "html":
          result = executeHtml(code);
          break;
        
        case "css":
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
          break;
        
        case "python":
          // If Pyodide is loaded, use it for Python execution
          if (engines.python.loaded) {
            result = await executePythonWithPyodide(code);
            setShowConsole(true);
            addProgramExitMessage();
          } else {
            // Otherwise use the fallback Python interpreter
            result = executePython(code);
            addConsoleMessage('output', result);
            setShowConsole(true);
            addProgramExitMessage();
          }
          break;
        
        case "javascript":
          result = executeJavaScript(code);
          addProgramExitMessage();
          break;
        
        case "java":
          result = executeJava(code);
          addProgramExitMessage();
          break;
        
        case "c":
          result = executeCFamily(code, "GCC 11.2.0");
          addProgramExitMessage();
          break;
        
        case "cpp":
          result = executeCFamily(code, "G++ 11.2.0");
          addProgramExitMessage();
          break;
        
        case "csharp":
          // For C#, use the Judge0 API for now
          result = await executeCode(code, selectedLanguage.id);
          addConsoleMessage('output', result);
          setShowConsole(true);
          addProgramExitMessage();
          break;
          
        default:
          // For any other language, use Judge0 API
          result = await executeCode(code, selectedLanguage.id);
          addConsoleMessage('output', result);
          addProgramExitMessage();
      }
      
      setOutput(result);
    } catch (error) {
      const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
      setOutput(errorMsg);
      addConsoleMessage('error', errorMsg);
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

  // Helper function to add a message to the console
  const addConsoleMessage = (type: 'input' | 'output' | 'error' | 'info' | 'system', content: string) => {
    // Check if content might contain code
    const hasCodeBlock = content.includes('{') || 
                         content.includes('}') || 
                         content.includes('(') || 
                         content.includes(')') || 
                         content.includes('=') ||
                         content.includes('function') ||
                         content.includes('class') ||
                         content.includes('def ') ||
                         content.includes('import ') ||
                         content.includes('return ');
    
    // Process content to ensure it doesn't break layout
    let formattedContent = content;
    
    if (hasCodeBlock) {
      // For code blocks, we'll ensure they're properly formatted
      formattedContent = content
        .split('\n')
        .map(line => {
          // If line is too long, add soft breaks
          if (line.length > 80) {
            // Insert zero-width spaces every 80 characters to allow breaking
            return line.replace(/(.{80})/g, '$1\u200B');
          }
          return line;
        })
        .join('\n');
    } else {
      // For regular text, we can be more aggressive with line breaking
      formattedContent = content
        .split('\n')
        .map(line => {
          if (line.length > 100) {
            return line.replace(/(.{100})/g, '$1\u200B');
          }
          return line;
        })
        .join('\n');
    }
      
    setConsoleMessages(prev => [...prev, { type, content: formattedContent }]);
  };

  // Add program exit message
  const addProgramExitMessage = () => {
    addConsoleMessage('system', '...Program finished with exit code 0');
    addConsoleMessage('system', 'Press ENTER to exit console.');
  };

  // Handle user input submission
  const handleInputSubmit = () => {
    if (!waitingForInput && consoleInput.trim() === '') return;
    
    // Add user input to console messages
    addConsoleMessage('input', consoleInput);
    
    // Resolve the promise with the user input
    if (inputResolver) {
      inputResolver(consoleInput);
      setInputResolver(null);
      
      // Reset state
      setWaitingForInput(false);
      setConsoleInput('');
    } else if (consoleInput.trim() === '') {
      // If user presses enter after program is done, clear console
      setConsoleMessages([{ type: 'info', content: 'Console cleared' }]);
      setConsoleInput('');
    } else {
      // Just echo the command if not waiting for input
      setConsoleInput('');
    }
  };

  // Handle user pressing Enter in the input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    }
  };

  // Load an example code snippet
  const loadExample = (exampleId: string) => {
    const example = inputExamples.find(ex => ex.name === exampleId);
    if (example) {
      // Set language if needed
      if (example.language !== selectedLanguage.id) {
        const lang = languages.find(l => l.id === example.language) || selectedLanguage;
        setSelectedLanguage(lang);
      }
      
      // Set the code
      setCode(example.code);
      
      // Clear output and prepare console
      setOutput("");
      setConsoleMessages([{ type: 'info', content: `Example loaded: ${example.name}` }]);
      setShowConsole(true);
    }
  };

  // Add a head element with the cursor styles
  useEffect(() => {
    // Add the cursor styles to the document head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = cursorStyles;
    document.head.appendChild(styleElement);
    
    // Clean up the style element when the component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Format code output for display in chat context
  const formatCodeOutput = (output: string): JSX.Element => {
    // Detect if output contains code blocks (lines with indentation or special characters)
    const lines = output.split('\n');
    const formattedLines: JSX.Element[] = [];
    
    let inCodeBlock = false;
    let currentCodeBlock: string[] = [];
    
    lines.forEach((line, index) => {
      // Check if line looks like code
      const isCodeLine = 
        // Indentation or common code characters
        line.startsWith('  ') || 
        line.startsWith('\t') || 
        line.match(/^[{}\[\]<>]/) ||
        
        // Common programming patterns
        line.match(/^[a-zA-Z0-9_]+\(/) ||
        line.includes(' = ') ||
        line.includes('=>') ||
        line.includes('->') ||
        line.includes(';') ||
        
        // Keywords
        /\b(function|class|def|if|else|for|while|return|import|from|var|let|const)\b/.test(line) ||
        
        // Table-like structures
        (line.includes('|') && line.includes('-'));
      
      if (isCodeLine && !inCodeBlock) {
        // Start a new code block
        inCodeBlock = true;
        currentCodeBlock = [line];
      } else if (isCodeLine && inCodeBlock) {
        // Continue the code block
        currentCodeBlock.push(line);
      } else if (!isCodeLine && inCodeBlock) {
        // End the code block and add it
        formattedLines.push(
          <div key={`code-${index}`} className="code-block">
            {currentCodeBlock.join('\n')}
          </div>
        );
        inCodeBlock = false;
        currentCodeBlock = [];
        formattedLines.push(<div key={`text-${index}`} className="chat-safe-output">{line}</div>);
      } else {
        // Regular text line
        formattedLines.push(<div key={`text-${index}`} className="chat-safe-output">{line}</div>);
      }
    });
    
    // Add any remaining code block
    if (inCodeBlock && currentCodeBlock.length > 0) {
      formattedLines.push(
        <div key="code-final" className="code-block">
          {currentCodeBlock.join('\n')}
        </div>
      );
    }
    
    return <>{formattedLines}</>;
  };

  // Additional functions for document export
  const exportAsDocument = async (format: 'word' | 'pdf') => {
    // Skip if no output
    if (!output) {
      addConsoleMessage('error', 'No content to export. Run the code first.');
      return;
    }
    
    // Default title based on language
    const defaultTitle = `Code_${selectedLanguage.name}`;
    
    // Prompt for document title
    const title = window.prompt('Enter document title:', defaultTitle) || defaultTitle;
    
    // Determine if content is code or regular text
    const isCode = isCodeContent(output, selectedLanguage.id);
    
    try {
      const docOptions = {
        title,
        content: output,
        codeLanguage: isCode ? selectedLanguage.id : undefined,
      };
      
      if (format === 'word') {
        await generateWordDocument(docOptions);
        addConsoleMessage('info', `Word document "${title}.docx" has been generated.`);
      } else {
        generatePdfDocument(docOptions);
        addConsoleMessage('info', `PDF document "${title}.pdf" has been generated.`);
      }
    } catch (error) {
      console.error('Failed to generate document:', error);
      addConsoleMessage('error', `Failed to generate ${format.toUpperCase()} document: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle AI document generation
  const handleAIDocumentGeneration = async () => {
    if (!aiDocPrompt) {
      addConsoleMessage('error', 'Please enter a document prompt.');
      return;
    }
    
    setIsGeneratingDoc(true);
    addConsoleMessage('info', `Generating ${aiDocFormat.toUpperCase()} document with prompt: "${aiDocPrompt}"`);
    
    try {
      const request: AIDocumentRequest = {
        prompt: aiDocPrompt,
        title: aiDocTitle || undefined,
        type: aiDocType,
        length: aiDocLength,
        format: aiDocFormat
      };
      
      await createAIDocument(request);
      
      addConsoleMessage('info', `${aiDocFormat.toUpperCase()} document "${aiDocTitle || 'AI Generated Document'}" has been generated.`);
      setAiDocOpen(false);
    } catch (error) {
      console.error('Failed to generate AI document:', error);
      addConsoleMessage('error', `Failed to generate ${aiDocFormat.toUpperCase()} document: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8 compiler-page overflow-auto" style={{ height: '100vh' }}>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Code Compiler</h1>
        <p className="text-muted-foreground">Write, compile and run code in multiple languages</p>
      </header>

      {/* AI Document Generation Dialog */}
      <Dialog open={aiDocOpen} onOpenChange={setAiDocOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate AI Document</DialogTitle>
            <DialogDescription>
              Enter a prompt to generate a document using AI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-prompt" className="text-right">
                Prompt
              </Label>
              <Textarea
                id="doc-prompt"
                value={aiDocPrompt}
                onChange={(e) => setAiDocPrompt(e.target.value)}
                placeholder="Enter a detailed document prompt..."
                className="col-span-3 h-20"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doc-title" className="text-right">
                Title
              </Label>
              <Input
                id="doc-title"
                value={aiDocTitle}
                onChange={(e) => setAiDocTitle(e.target.value)}
                placeholder="Document title (optional)"
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Type
              </Label>
              <RadioGroup 
                value={aiDocType} 
                onValueChange={(value) => setAiDocType(value as AIDocumentRequest['type'])}
                className="col-span-3 flex space-x-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="essay" id="essay" />
                  <Label htmlFor="essay">Essay</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="report" id="report" />
                  <Label htmlFor="report">Report</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="letter" id="letter" />
                  <Label htmlFor="letter">Letter</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="resume" id="resume" />
                  <Label htmlFor="resume">Resume</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Length
              </Label>
              <RadioGroup 
                value={aiDocLength} 
                onValueChange={(value) => setAiDocLength(value as AIDocumentRequest['length'])}
                className="col-span-3 flex space-x-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="short" id="short" />
                  <Label htmlFor="short">Short</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium">Medium</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="long" id="long" />
                  <Label htmlFor="long">Long</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Format
              </Label>
              <RadioGroup 
                value={aiDocFormat} 
                onValueChange={(value) => setAiDocFormat(value as AIDocumentRequest['format'])}
                className="col-span-3 flex space-x-2"
              >
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="word" id="word" />
                  <Label htmlFor="word">Word (.docx)</Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf">PDF</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAiDocOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAIDocumentGeneration}
              disabled={isGeneratingDoc || !aiDocPrompt}
            >
              {isGeneratingDoc ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Document'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {/* Examples dropdown - show for languages with examples */}
              {inputExamples.some(ex => ex.language === selectedLanguage.id) && (
                <Select onValueChange={loadExample}>
                  <SelectTrigger className="w-[180px]">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Input Examples" />
                  </SelectTrigger>
                  <SelectContent>
                    {inputExamples
                      .filter(example => example.language === selectedLanguage.id)
                      .map(example => (
                        <SelectItem key={example.name} value={example.name}>
                          {example.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              )}
              
              {/* AI Document Generator button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAiDocOpen(true)}
                title="Generate AI Document"
              >
                <BookText className="h-4 w-4" />
              </Button>
              
              {/* Document export dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    title="Export as document"
                    disabled={!output}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportAsDocument('word')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export as Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAsDocument('pdf')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConsole(!showConsole)}
              title="Toggle console"
            >
              <Terminal className="h-4 w-4 mr-2" />
              {showConsole ? "Hide Console" : "Show Console"}
            </Button>
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
          ) : showConsole ? (
            <div className="flex flex-col h-[500px] border rounded-md overflow-hidden">
              <div className="bg-[#1e1e1e] px-4 py-2 border-b text-xs flex justify-between items-center text-white">
                <span>Terminal</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setConsoleMessages([{ type: 'info', content: 'Console cleared' }])}
                  className="text-white hover:text-white hover:bg-[#333]"
                >
                  Clear
                </Button>
              </div>
              
              {/* Console output area */}
              <div className="flex-1 bg-black text-[#00ff00] p-4 font-mono text-sm overflow-y-auto console-container">
                {consoleMessages.map((msg, index) => {
                  // Check if the message content might contain code
                  const hasCode = msg.content.includes('{') || 
                                 msg.content.includes('}') || 
                                 msg.content.includes('function') || 
                                 msg.content.includes('class') ||
                                 msg.content.includes('def ');
                  
                  return (
                    <div 
                      key={index}
                      className={`mb-1 ${hasCode ? 'code-block terminal-output' : 'terminal-output'} ${
                        msg.type === 'input' ? 'text-[#00ff00]' : 
                        msg.type === 'error' ? 'text-red-400' : 
                        msg.type === 'info' ? 'text-blue-400' : 
                        msg.type === 'system' ? 'text-[#00ff00]' :
                        'text-[#00ff00]'
                      }`}
                    >
                      {msg.type === 'input' && '> '}
                      {msg.content}
                    </div>
                  );
                })}
                <div ref={consoleEndRef} />
                
                {/* Show blinking cursor at the end of console if waiting for input */}
                {waitingForInput && (
                  <div className="terminal-input-wrapper terminal-output">
                    <span>{"> " + consoleInput}</span>
                    <div className="terminal-cursor"></div>
                  </div>
                )}
              </div>
              
              {/* Console input area */}
              <div className="flex items-center border-t bg-black p-2">
                <div className="relative flex-1">
                  <Input
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={waitingForInput ? "Enter input..." : "Press ENTER to clear console"}
                    className="flex-1 bg-black text-[#00ff00] border-none focus:ring-0 placeholder-gray-500"
                    disabled={!waitingForInput && !['python', 'javascript', 'java', 'c', 'cpp'].includes(selectedLanguage.id)}
                  />
                </div>
                <Button 
                  size="sm" 
                  disabled={!waitingForInput && !['python', 'javascript', 'java', 'c', 'cpp'].includes(selectedLanguage.id)}
                  onClick={handleInputSubmit} 
                  className="ml-2 bg-[#333] hover:bg-[#444] text-[#00ff00]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted font-mono text-sm rounded-md p-4 min-h-[500px] border overflow-auto">
              {output ? (
                <div className="whitespace-pre-wrap overflow-wrap-break-word">
                  {formatCodeOutput(output)}
                </div>
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