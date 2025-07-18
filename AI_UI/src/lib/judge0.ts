// Judge0 API integration for code execution
// API docs: https://ce.judge0.com/

// Base URL for Judge0 API (using the public instance, should be replaced with your own for production)
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

// Language IDs for Judge0 API - Focused on the 5 required languages
export const LANGUAGE_IDS = {
  python: 71,    // Python 3.8.1
  javascript: 93, // JavaScript (Node.js 12.14.0)
  java: 89,      // Java (OpenJDK 8) - Changed to use Java 8 which has lower memory requirements
  c: 50,         // C (GCC 9.2.0)
  cpp: 54,       // C++ (GCC 9.2.0)
};

// Fallback language IDs if the primary ones fail
export const FALLBACK_LANGUAGE_IDS = {
  java: [90, 62]  // Try JDK 11, then OpenJDK 13
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
  java: "-XX:CompressedClassSpaceSize=64m -XX:MaxMetaspaceSize=100m -Xmx128m",
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
  
  // For Java, we'll skip sending compiler options as they might be causing issues
  const compilerOptions = language === 'java' ? "" : COMPILER_OPTIONS[language] || "";
  
  const body = JSON.stringify({
    source_code: code,
    language_id: mapLanguageId(languageId),
    stdin: stdin,
    compiler_options: compilerOptions,
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
    
    // Special handling for Java memory errors
    if (language === 'java' && result.compile_output) {
      if (result.compile_output.includes("Could not allocate")) {
        output += "\nJava Memory Allocation Error: The code requires too much memory to compile.\n";
        output += "Try simplifying your code or reducing the number of classes and methods.\n";
        return output;
      }
    }
    
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
    
    // For Java, we'll use a completely different approach
    if (languageId === 'java') {
      return executeJavaCode(code, stdin);
    }
    
    // Submit the code with primary language ID
    let submission: Submission;
    let error: Error | null = null;
    
    try {
      submission = await submitCode(processedCode, languageId, stdin);
    } catch (e) {
      error = e as Error;
      
      // If all attempts failed, throw the original error
      if (error) {
        throw error;
      }
    }
    
    // Poll for results
    let result: SubmissionResult | null = null;
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      // Wait before polling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the result
      result = await getSubmissionResult(submission!.token);
      
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

// Special function just for Java execution
async function executeJavaCode(code: string, stdin: string = ''): Promise<string> {
  try {
    // Process Java code to ensure it has a proper class and main method
    const processedCode = processJavaCode(code);
    
    // Try with Java 8 first (ID 89)
    const javaVersions = [89, 90, 62, 91];
    
    for (const javaId of javaVersions) {
      try {
        console.log(`[Judge0] Trying Java with ID ${javaId}`);
        
        // Create a minimal submission with no compiler options
        const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;
        const body = JSON.stringify({
          source_code: processedCode,
          language_id: javaId,
          stdin: stdin,
          // No compiler options
          // Minimal resource limits
          cpu_time_limit: 5,
          memory_limit: 128000,
          stack_limit: 64000,
        });
        
        console.log('[Judge0] Submitting Java code:', { url, javaId, body });
        const response = await fetch(url, {
          method: 'POST',
          headers: apiHeaders,
          body,
        });
        
        if (!response.ok) {
          const responseBody = await response.text();
          console.error(`[Judge0] Java submission failed with ID ${javaId}:`, responseBody);
          continue; // Try next version
        }
        
        const submission = await response.json();
        
        // Poll for results
        let result: SubmissionResult | null = null;
        let retries = 0;
        const maxRetries = 10;
        
        while (retries < maxRetries) {
          // Wait before polling
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the result
          const resultResponse = await fetch(
            `${JUDGE0_API_URL}/submissions/${submission.token}?base64_encoded=false`,
            {
              method: 'GET',
              headers: apiHeaders,
            }
          );
          
          if (!resultResponse.ok) {
            const responseBody = await resultResponse.text();
            console.error(`[Judge0] Java result fetch failed:`, responseBody);
            break;
          }
          
          result = await resultResponse.json();
          
          // If processing is complete, break the loop
          if (result.status.id !== 1 && result.status.id !== 2) {
            break;
          }
          
          retries++;
        }
        
        if (!result) {
          console.log(`[Judge0] No result received for Java ID ${javaId}, trying next version`);
          continue; // Try next version
        }
        
        // Check for compilation errors related to memory
        if (result.status.id === 6 && result.compile_output && 
            result.compile_output.includes("Could not allocate")) {
          console.log(`[Judge0] Java ID ${javaId} had memory allocation error, trying next version`);
          continue; // Try next version
        }
        
        // If we got here, we have a valid result (success or other error)
        const finalResult = result; // Create a non-null reference
        return parseResult(finalResult, 'java');
        
      } catch (error) {
        console.error(`[Judge0] Error with Java ID ${javaId}:`, error);
        // Continue to next version
      }
    }
    
    // If all versions failed
    return "Error: Failed to compile Java code with any available Java version. Please simplify your code.";
    
  } catch (error) {
    console.error('Java code execution error:', error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
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