// Judge0 API integration for code execution
// API docs: https://ce.judge0.com/

// Base URL for Judge0 API (using the public instance, should be replaced with your own for production)
const JUDGE0_API_URL = 'https://ce.judge0.com';

// Language IDs for Judge0 API
export const LANGUAGE_IDS = {
  python: 71, // Python 3
  javascript: 93, // Node.js
  java: 62, // Java (OpenJDK 13)
  c: 50, // C (GCC 9.2.0)
  cpp: 54, // C++ (GCC 9.2.0)
  csharp: 51, // C# (Mono 6.6.0)
  html: 42, // HTML/JS/CSS
  css: 42, // CSS uses the same as HTML (runs in a browser environment)
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
};

// Submit code for execution
export async function submitCode(code: string, languageId: string): Promise<Submission> {
  const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({
      source_code: code,
      language_id: mapLanguageId(languageId),
      stdin: '',
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get a submission's result
export async function getSubmissionResult(token: string): Promise<SubmissionResult> {
  const response = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`, {
    method: 'GET',
    headers: apiHeaders,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
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
export function parseResult(result: SubmissionResult): string {
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

// Execute code and get the result (polls until completion)
export async function executeCode(code: string, languageId: string): Promise<string> {
  try {
    // Submit the code
    const submission = await submitCode(code, languageId);
    
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
    
    return parseResult(result);
  } catch (error) {
    console.error('Code execution error:', error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
} 