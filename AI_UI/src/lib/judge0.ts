// Judge0 API integration for code execution
// API docs: https://ce.judge0.com/

// Base URL for Judge0 API (using the RapidAPI endpoint)
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

// Language IDs for Judge0 API - Focused on the 5 required languages
export const LANGUAGE_IDS = {
  python: 71,    // Python 3.8.1
  javascript: 63, // JavaScript (Node.js 12.14.0)
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

// Submit code for execution
export async function submitCode(code: string, languageId: string): Promise<Submission> {
  const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;
  const body = JSON.stringify({
    source_code: code,
    language_id: mapLanguageId(languageId),
    stdin: '',
  });
  console.log('[Judge0] Submitting code:', { url, headers: apiHeaders, body });
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

// Status descriptions
const STATUS_DESCRIPTIONS = {
  1: 'In Queue',
  2: 'Processing',
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error (SIGXFSZ)',
  9: 'Runtime Error (SIGFPE)',
  10: 'Runtime Error (SIGABRT)',
  11: 'Runtime Error (NZEC)',
  12: 'Runtime Error (Other)',
  13: 'Internal Error',
  14: 'Exec Format Error',
};

// Helper function to parse the result into a readable format
export function parseResult(result: SubmissionResult, language: string = 'default'): string {
  let output = '';
  
  // Handle different status codes
  if (result.status.id !== 3) {
    output += `Status: ${result.status.description}\n`;
    
    // Add more details based on status
    if (result.status.id === 6) {
      output += `\nCompilation Error:\n${result.compile_output || ''}`;
    } else if ([7, 8, 9, 10, 11, 12].includes(result.status.id)) {
      output += `\nRuntime Error:\n${result.stderr || result.message || ''}`;
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
  
  return output;
}

// Helper function to process Java code before submission
function processJavaCode(code: string): string {
  // Check if the code already has a class definition
  if (!/class\s+\w+/.test(code)) {
    // Wrap the code in a very simple Main class to minimize memory usage
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
      // Insert a simple main method after the opening brace
      return code.replace(
        new RegExp(`(class\\s+${className}\\s*\\{)`), 
        `$1\n    public static void main(String[] args) {\n        // Auto-generated main method\n    }\n`
      );
    }
  }
  
  return code;
}

// Execute code and get the result (polls until completion)
export async function executeCode(code: string, languageId: string, stdin: string = ''): Promise<string> {
  try {
    // Process the code if needed
    let processedCode = code;
    
    // For Java, ensure we have a proper class structure
    if (languageId === 'java' && !/class\s+\w+/.test(code)) {
      processedCode = `
public class Main {
    public static void main(String[] args) {
${code}
    }
}`;
    }
    
    // Submit the code with wait=true to get the result immediately
    try {
      const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`;
      const language = languageId as keyof typeof LANGUAGE_IDS;
      
      // Set memory limits based on language
      let memoryLimit = 128000; // Default 128MB
      if (language === 'java') {
        memoryLimit = 256000; // 256MB for Java
      }
      
      // Check if the language exists in our compiler options
      const compilerOptions = language in COMPILER_OPTIONS ? 
        COMPILER_OPTIONS[language as keyof typeof COMPILER_OPTIONS] : "";
        
      const commandLineArgs = language in COMMAND_LINE_ARGS ?
        COMMAND_LINE_ARGS[language as keyof typeof COMMAND_LINE_ARGS] : "";
      
      const body = JSON.stringify({
        source_code: processedCode,
        language_id: mapLanguageId(languageId),
        stdin: stdin,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArgs,
        // Resource limits
        cpu_time_limit: language === 'java' ? 10 : 5,
        cpu_extra_time: language === 'java' ? 2 : 1,
        wall_time_limit: language === 'java' ? 20 : 10,
        memory_limit: memoryLimit,
        stack_limit: language === 'java' ? 128000 : 64000,
        max_processes_and_or_threads: 60,
        enable_per_process_and_thread_time_limit: false,
        enable_per_process_and_thread_memory_limit: true,
        max_file_size: 1024,
      });
      
      console.log('[Judge0] Submitting code:', { url, language });
      const response = await fetch(url, {
        method: 'POST',
        headers: apiHeaders,
        body,
      });
      
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${responseBody}`);
      }
      
      // Since we're using wait=true, the result should be included in the response
      const result = await response.json();
      return parseResult(result, languageId);
      
    } catch (error) {
      console.error('Code execution error:', error);
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
    
  } catch (error) {
    console.error('Code execution error:', error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
} 

// Language-specific compiler options
export const COMPILER_OPTIONS = {
  c: "-Wall -std=c11 -O2",
  cpp: "-Wall -std=c++17 -O2",
  java: "-Xms64m -Xmx128m -XX:MetaspaceSize=32m -XX:MaxMetaspaceSize=64m",
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