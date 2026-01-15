 
 

 
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

 
export const LANGUAGE_IDS = {
  python: 71,     
  javascript: 63,  
  java: 91,       
  c: 50,          
  cpp: 54,        
};

 
export function mapLanguageId(languageId: string): number {
  return LANGUAGE_IDS[languageId as keyof typeof LANGUAGE_IDS] || 71;  
}

 
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

 
function getApiHeaders() {
  const apiKey = process.env.JUDGE0_API_KEY || process.env.NEXT_PUBLIC_JUDGE0_API_KEY;
  if (!apiKey) {
    throw new Error('Judge0 API key not found. Please set JUDGE0_API_KEY in your environment variables.');
  }
  return {
    'Content-Type': 'application/json',
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
    'x-rapidapi-key': apiKey,
  };
}

 
export async function submitCode(code: string, languageId: string): Promise<Submission> {
  const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`;
  const body = JSON.stringify({
    source_code: code,
    language_id: mapLanguageId(languageId),
    stdin: '',
  });
  const apiHeaders = getApiHeaders();
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

 
export async function getSubmissionResult(token: string): Promise<SubmissionResult> {
  const url = `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`;
  const apiHeaders = getApiHeaders();
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

 
export function parseResult(result: SubmissionResult, language: string = 'default'): string {
  let output = '';
  
   
  if (result.status.id !== 3) {
    output += `Status: ${result.status.description}\n`;
    
     
    if (result.status.id === 6) {
      output += `\nCompilation Error:\n${result.compile_output || ''}`;
    } else if ([7, 8, 9, 10, 11, 12].includes(result.status.id)) {
      output += `\nRuntime Error:\n${result.stderr || result.message || ''}`;
    }
    
    return output;
  }
  
   
  if (result.stdout) {
    output += result.stdout;
  } else {
    output += "[No output]";
  }
  
   
  output += `\n\nExecution Time: ${result.time}s`;
  
  return output;
}

 
function processJavaCode(code: string): string {
   
  if (!/class\s+\w+/.test(code)) {
     
    return `
public class Main {
    public static void main(String[] args) {
${code}
    }
}`;
  }
  
   
  const classMatch = code.match(/class\s+(\w+)/);
  if (classMatch && !/public\s+static\s+void\s+main/.test(code)) {
    const className = classMatch[1];
     
    const hasOpenBrace = new RegExp(`class\\s+${className}\\s*\\{`).test(code);
    if (hasOpenBrace) {
       
      return code.replace(
        new RegExp(`(class\\s+${className}\\s*\\{)`), 
        `$1\n    public static void main(String[] args) {\n        // Auto-generated main method\n    }\n`
      );
    }
  }
  
  return code;
}

 
export async function executeCode(code: string, languageId: string, stdin: string = ''): Promise<string> {
  try {
     
    let processedCode = code;
    
     
    if (languageId === 'java' && !/class\s+\w+/.test(code)) {
      processedCode = `
public class Main {
    public static void main(String[] args) {
${code}
    }
}`;
    }
    
     
    try {
      const url = `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`;
      const language = languageId as keyof typeof LANGUAGE_IDS;
      
       
      let memoryLimit = 128000;  
      if (language === 'java') {
        memoryLimit = 256000;  
      }
      
       
      const compilerOptions = language in COMPILER_OPTIONS ? 
        COMPILER_OPTIONS[language as keyof typeof COMPILER_OPTIONS] : "";
        
      

      let commandLineArgs = language in COMMAND_LINE_ARGS ?
        COMMAND_LINE_ARGS[language as keyof typeof COMMAND_LINE_ARGS] : "";
       

      
      
      const body = JSON.stringify({
        source_code: processedCode,
        language_id: mapLanguageId(languageId),
        stdin: stdin,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArgs,
         
        cpu_time_limit: language === 'java' ? 5 : 2,
        cpu_extra_time: language === 'java' ? 1 : 0.5,
        wall_time_limit: language === 'java' ? 10 : 5,
        memory_limit: memoryLimit,
        stack_limit: 64000,
        max_processes_and_or_threads: 30,
        enable_per_process_and_thread_time_limit: false,
        enable_per_process_and_thread_memory_limit: false,
        max_file_size: 1024,
        ...(language === 'java' ? { } : {}),
      });
      
      console.log('[Judge0] Submitting code:', { url, language, memoryLimit, compilerOptions, body: JSON.parse(body) });
      const apiHeaders = getApiHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers: apiHeaders,
        body,
      });
      
      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText}\n${responseBody}`);
      }
      
       
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

 
export const COMPILER_OPTIONS = {
  c: "-Wall -std=gnu99 -O2 -o a.out source_file.c -lm",
  cpp: "-Wall -std=c++17 -O2 -o a.out source_file.cpp",
  python: "",
  javascript: "",
  java: "",  
}; 

 
export const COMMAND_LINE_ARGS = {
  c: "",
  cpp: "",
  java: "",
  javascript: "",
  python: ""
}; 