/**
 * Wandbox API client for C, C++, and Java code execution.
 *
 * Wandbox is a free online compiler service that requires no API key.
 * API docs: https://github.com/melpon/wandbox
 */

const WANDBOX_API_URL = 'https://wandbox.org/api/compile.json';

/**
 * Mapping from our internal language identifiers to Wandbox compiler names.
 */
export const WANDBOX_COMPILERS: Record<string, string> = {
  c: 'gcc-head',
  cpp: 'gcc-head',
  java: 'openjdk-head',
};

/**
 * Default compiler options per language.
 */
const COMPILER_OPTIONS: Record<string, string> = {
  c: 'warning,c17',
  cpp: 'warning,c++2b',
  java: '',
};

/**
 * Wandbox compile response shape.
 */
interface WandboxResponse {
  status?: string;
  signal?: string;
  compiler_output?: string;
  compiler_error?: string;
  compiler_message?: string;
  program_output?: string;
  program_error?: string;
  program_message?: string;
  permlink?: string;
  url?: string;
}

// ---------------------------------------------------------------------------
// Java helpers
// ---------------------------------------------------------------------------

/**
 * If the Java source doesn't contain a class declaration, wrap it inside
 * `public class Main { public static void main(String[] args) { ... } }`.
 */
function processJavaCode(code: string): string {
  if (!/class\s+\w+/.test(code)) {
    return `public class Main {\n    public static void main(String[] args) {\n${code}\n    }\n}`;
  }

  // If there's a class but no main method, inject one
  const classMatch = code.match(/class\s+(\w+)/);
  if (classMatch && !/public\s+static\s+void\s+main/.test(code)) {
    const className = classMatch[1];
    const braceRegex = new RegExp(`(class\\s+${className}\\s*\\{)`);
    if (braceRegex.test(code)) {
      return code.replace(
        braceRegex,
        `$1\n    public static void main(String[] args) {\n        // Auto-generated main method\n    }\n`
      );
    }
  }

  return code;
}

// ---------------------------------------------------------------------------
// Core execution
// ---------------------------------------------------------------------------

/**
 * Execute code using the Wandbox API.
 *
 * @param code      Source code string
 * @param language  One of 'c', 'cpp', 'java' (falls back to 'c')
 * @param stdin     Standard input for the program (optional)
 * @returns         Human-readable result string (stdout + error info)
 */
export async function executeCode(
  code: string,
  language: string,
  stdin: string = ''
): Promise<string> {
  try {
    const lang = language.toLowerCase();
    const compiler = WANDBOX_COMPILERS[lang] || WANDBOX_COMPILERS['c'];
    const options = COMPILER_OPTIONS[lang] || '';

    // Pre-process Java code to ensure it has a proper class + main
    let processedCode = code;
    if (lang === 'java') {
      processedCode = processJavaCode(code);
    }

    const payload: Record<string, unknown> = {
      compiler,
      code: processedCode,
      options,
      stdin: stdin || '',
      save: false,
    };

    // For C we need to tell gcc to treat the source as C (not C++)
    // gcc-head defaults to C++; passing -x c forces C mode
    if (lang === 'c') {
      payload['compiler-option-raw'] = '-x c\n-lm';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(WANDBOX_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      return `Error: Wandbox API returned ${response.status} ${response.statusText}\n${body}`;
    }

    const result: WandboxResponse = await response.json();
    return formatResult(result);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'Error: Execution timed out (30s limit)';
    }
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// ---------------------------------------------------------------------------
// Result formatting
// ---------------------------------------------------------------------------

function formatResult(result: WandboxResponse): string {
  let output = '';

  // Compilation errors
  if (result.compiler_error) {
    output += `Compilation Error:\n${result.compiler_error}\n`;
  }

  // Program output
  if (result.program_output) {
    output += result.program_output;
  }

  // Program errors (runtime stderr)
  if (result.program_error) {
    if (output) output += '\n';
    output += `Runtime Error:\n${result.program_error}`;
  }

  // Signal (e.g. SIGSEGV)
  if (result.signal) {
    if (output) output += '\n';
    output += `Signal: ${result.signal}`;
  }

  // If we got nothing at all
  if (!output.trim()) {
    if (result.status === '0') {
      output = '[No output]';
    } else {
      output = `Exit code: ${result.status || 'unknown'}`;
    }
  }

  return output;
}
