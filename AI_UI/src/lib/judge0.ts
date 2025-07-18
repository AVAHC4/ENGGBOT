// Judge0 API integration for code execution
// API docs: https://ce.judge0.com/

// Base URL for Judge0 API (using the public instance, should be replaced with your own for production)
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

// Language IDs for Judge0 API - Focused on the 5 required languages
export const LANGUAGE_IDS = {
  python: 71,    // Python 3.8.1
  javascript: 93, // JavaScript (Node.js 12.14.0)
  java: 62,      // Java (OpenJDK 13.0.1)
  c: 50,         // C (GCC 9.2.0)
  cpp: 54,       // C++ (GCC 9.2.0)
};

// Map our internal language IDs to Judge0 language IDs
export function mapLanguageId(languageId: string): number {
  return LANGUAGE_IDS[languageId as keyof typeof LANGUAGE_IDS] || 71; // Default to Python
}

// Type definitions for Judge0 API responses
export interface Submission {
  token: string;
}

export interface SubmissionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
  time: string;
  memory: number;
}

// Judge0 API headers
const apiHeaders = {
  'Content-Type': 'application/json',
  'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
  'x-rapidapi-key': '***REMOVED***',
};

// Language-specific compiler options
export const COMPILER_OPTIONS = {
  c: "-Wall -std=c11 -O2",
  cpp: "-Wall -std=c++17 -O2",
  java: "-Xmx256m -XX:MaxMetaspaceSize=64m",
  javascript: "",
  python: "-m"
};

// Language-specific command line arguments
export const COMMAND_LINE_ARGS = {
  c: "",
  cpp: "",
  java: "",
  javascript: "",
  python: ""
};

// Submit code for execution with language-specific options
export async function submitCode(code: string, languageId: string, stdin: string = ''): Promise<Submission> {
  const language = languageId as keyof typeof LANGUAGE_IDS;
  const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;
  
  // Set memory limits based on language
  let memoryLimit = 128000; // Default 128MB
  if (language === 'java') {
    memoryLimit = 256000; // 256MB for Java
  }
  
  const body = JSON.stringify({
    source_code: code,
    language_id: mapLanguageId(languageId),
    stdin: stdin,
    compiler_options: COMPILER_OPTIONS[language] || "",
    command_line_arguments: COMMAND_LINE_ARGS[language] || "",
    // Adding additional options for better execution
    cpu_time_limit: language === 'java' ? 10 : 5,       // 10 seconds for Java, 5 for others
    cpu_extra_time: language === 'java' ? 2 : 1,       // 2 seconds for Java, 1 for others
    wall_time_limit: language === 'java' ? 20 : 10,     // 20 seconds for Java, 10 for others
    memory_limit: memoryLimit,
    stack_limit: language === 'java' ? 128000 : 64000,  // 128MB for Java, 64MB for others
    max_processes_and_or_threads: 60,
    enable_per_process_and_thread_time_limit: false,
    enable_per_process_and_thread_memory_limit: true,
    max_file_size: 1024,     // 1KB
  });
  
  console.log('[Judge0] Submitting code:', { url, language, body });
  const response = await fetch(url, {
    method: 'POST',
    headers: apiHeaders,
    body,
  });
  
  const responseBody = await response.clone().text();
  console.log('[Judge0] Submission response:', { status: response.status, responseBody });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}\n${responseBody}`);
  }
  
  return response.json();
}

// Get a submission's result
export async function getSubmissionResult(token: string): Promise<SubmissionResult> {
  const url = `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`;
  console.log('[Judge0] Getting submission result:', { url, headers: apiHeaders });
  
  const response = await fetch(url, {
    method: 'GET',
    headers: apiHeaders,
  });
  
  const responseBody = await response.clone().text();
  console.log('[Judge0] Result response:', { status: response.status, responseBody });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}\n${responseBody}`);
  }
  
  return response.json();
}

// Status descriptions - expanded for better error reporting
const STATUS_DESCRIPTIONS = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV - Segmentation Fault)',
  8: 'Runtime Error (SIGXFSZ - File Size Limit Exceeded)',
  9: 'Runtime Error (SIGFPE - Floating Point Error)',
  10: 'Runtime Error (SIGABRT - Aborted)',
  11: 'Runtime Error (NZEC - Non-Zero Exit Code)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

// Language-specific error messages and hints
export const LANGUAGE_HINTS = {
  c: {
    "segmentation fault": "Check for null pointer dereferences or array out-of-bounds access.",
    "undefined reference": "Function might be declared but not defined. Check your implementation.",
    "implicit declaration": "Function used without being declared. Include the appropriate header."
  },
  cpp: {
    "segmentation fault": "Check for null pointer dereferences or vector/array out-of-bounds access.",
    "undefined reference": "Function or class member might be declared but not defined.",
    "no matching function": "Function call doesn't match any available overloads. Check parameters."
  },
  java: {
    "ClassNotFoundException": "Ensure class name matches the file name exactly.",
    "NullPointerException": "An object reference is null when you're trying to use it.",
    "ArrayIndexOutOfBoundsException": "Trying to access an array element outside its bounds.",
    "could not allocate metaspace": "Java metaspace allocation error. Your class might be too complex or use too many dependencies.",
    "OutOfMemoryError": "Your program is using too much memory. Check for memory leaks or large data structures.",
    "main method not found": "Make sure your class has a 'public static void main(String[] args)' method.",
    "cannot find symbol": "Variable or method not found. Check for typos or missing declarations."
  },
  javascript: {
    "ReferenceError": "Variable or function is not defined. Check spelling and scope.",
    "TypeError": "Operation performed on an incompatible type.",
    "SyntaxError": "Code contains syntax errors. Check for missing brackets, semicolons, etc."
  },
  python: {
    "IndentationError": "Check your code's indentation - Python is whitespace-sensitive.",
    "ImportError": "Module could not be imported. Check if it's installed or if name is correct.",
    "NameError": "Variable or function name is not defined. Check spelling and scope."
  }
};

// Helper function to parse the result into a readable format with improved error messages
export function parseResult(result: SubmissionResult, languageId: string): string {
  let output = '';
  const language = languageId as keyof typeof LANGUAGE_IDS;
  
  // Handle different status codes
  if (result.status.id !== 3) {
    output += `Status: ${STATUS_DESCRIPTIONS[result.status.id as keyof typeof STATUS_DESCRIPTIONS] || result.status.description}\n`;
    
    // Add more details based on status
    if (result.status.id === 6) {
      output += `\nCompilation Error:\n${result.compile_output || ''}`;
      
      // Add language-specific hints for compilation errors
      if (language in LANGUAGE_HINTS) {
        const hints = LANGUAGE_HINTS[language];
        for (const [errorPattern, hint] of Object.entries(hints)) {
          if ((result.compile_output || '').toLowerCase().includes(errorPattern.toLowerCase())) {
            output += `\n\nHint: ${hint}`;
            break;
          }
        }
      }
    } else if ([7, 8, 9, 10, 11, 12].includes(result.status.id)) {
      output += `\nRuntime Error:\n${result.stderr || result.message || ''}`;
      
      // Add language-specific hints for runtime errors
      if (language in LANGUAGE_HINTS) {
        const hints = LANGUAGE_HINTS[language];
        for (const [errorPattern, hint] of Object.entries(hints)) {
          if ((result.stderr || result.message || '').toLowerCase().includes(errorPattern.toLowerCase())) {
            output += `\n\nHint: ${hint}`;
            break;
          }
        }
      }
    }
    
    return output;
  }
  
  // If execution was successful, show stdout
  if (result.stdout) {
    output += result.stdout;
  } else {
    output += "[No output]";
  }
  
  // Add execution details
  output += `\n\nExecution Time: ${result.time}s`;
  output += `\nMemory Used: ${Math.round(result.memory / 1024)} KB`;
  
  return output;
}

// Execute code and get the result (polls until completion)
export async function executeCode(code: string, languageId: string, stdin: string = ''): Promise<string> {
  try {
    // Special handling for Java code
    let processedCode = code;
    if (languageId === 'java') {
      processedCode = processJavaCode(code);
    }
    
    // Submit the code
    const submission = await submitCode(processedCode, languageId, stdin);
    
    // Poll for results
    let result: SubmissionResult | null = null;
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the result
      result = await getSubmissionResult(submission.token);
      
      // If processing is complete, break the loop
      if (result.status.id !== 1 && result.status.id !== 2) {
        break;
      }
      
      retries++;
    }
    
    if (!result) {
      return "Error: Failed to get execution result.";
    }
    
    return parseResult(result, languageId);
  } catch (error) {
    console.error('Code execution error:', error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Helper function to process Java code before submission
function processJavaCode(code: string): string {
  // Check if the code already has a class definition
  if (!/class\s+\w+/.test(code)) {
    // Wrap the code in a Main class if it doesn't have one
    return `
public class Main {
    public static void main(String[] args) {
        ${code}
    }
}`;
  }
  
  // If there's a class but no main method, try to detect the class name and add a main method
  const classMatch = code.match(/class\s+(\w+)/);
  if (classMatch && !/public\s+static\s+void\s+main/.test(code)) {
    const className = classMatch[1];
    // Check if the class has opening brace
    const hasOpenBrace = new RegExp(`class\\s+${className}\\s*\\{`).test(code);
    if (hasOpenBrace) {
      // Insert main method after the opening brace
      return code.replace(
        new RegExp(`(class\\s+${className}\\s*\\{)`), 
        `$1\n    public static void main(String[] args) {\n        // Auto-generated main method\n        System.out.println("Running " + ${className}.class.getName());\n    }\n`
      );
    }
  }
  
  return code;
} 