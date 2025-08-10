/**
 * Java Code Executor (Browser → Piston API)
 *
 * This executor uses the public Piston API (https://emkc.org/api/v2/piston)
 * to compile and run Java code. No API key is required. If CORS is blocked
 * by the environment, consider adding a Next.js API proxy.
 *
 * Notes:
 * - File is named Main.java; user code should define `class Main`.
 * - Interactive input is not supported; only pre-supplied stdin.
 * - Stop button aborts the network request via AbortController.
 */

let isInitialized = false;
let isExecuting = false;
let currentAbortController = null;

/**
 * Initialize the Java executor (placeholder)
 * @returns {Promise<void>}
 */
export async function init() {
  if (isInitialized) {
    return;
  }
  // No pre-init needed for Piston; keep flag true for UI probing
  isInitialized = true;
}

/**
 * Execute Java code (placeholder)
 * @param {string} code - The Java code to execute
 * @returns {Promise<{output: string, error: string}>}
 */
export async function execute(code, stdin = '', onInputRequest) {
  // Warn if code likely won't compile due to mismatched class/file name
  const hasMainClass = /\bclass\s+Main\b/.test(code);
  if (!hasMainClass) {
    // We still attempt to run, but inform user in output
    // (UI shows both output and error strings)
  }

  // Discover Java version (optional). If it fails, we'll use a default.
  let javaVersion = '17.0.0';
  try {
    const langsRes = await fetch('https://emkc.org/api/v2/piston/runtimes');
    if (langsRes.ok) {
      const runtimes = await langsRes.json();
      const javaRuntimes = Array.isArray(runtimes) ? runtimes.filter(r => r.language === 'java') : [];
      if (javaRuntimes.length > 0) {
        // pick the first (usually latest)
        javaVersion = javaRuntimes[0].version || javaVersion;
      }
    }
  } catch (_) {
    // ignore, fallback to default
  }

  const body = {
    language: 'java',
    version: javaVersion,
    files: [{ name: 'Main.java', content: code }],
    stdin: stdin || '',
    compile_timeout: 10000,
    run_timeout: 60000,
    // memory limits left as defaults
  };

  const controller = new AbortController();
  currentAbortController = controller;
  isExecuting = true;

  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { output: '', error: `Java execution failed: HTTP ${res.status} ${text}` };
    }

    const data = await res.json();
    // Piston response structure: { run: { stdout, stderr, code, signal }, compile?: { stdout, stderr, code } }
    const compileErr = data?.compile?.stderr || '';
    const compileOut = data?.compile?.stdout || '';
    const runOut = data?.run?.stdout || '';
    const runErr = data?.run?.stderr || '';

    // Combine outputs; keep errors prioritized
    let output = '';
    let error = '';
    if (compileOut) output += compileOut;
    if (runOut) output += runOut;
    if (compileErr) error += compileErr;
    if (runErr) error += (error ? '\n' : '') + runErr;
    if (!hasMainClass) {
      const warn = '\n[Warning] Expected a class named `Main` to match Main.java for execution.';
      output += warn;
    }
    return { output, error };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { output: '', error: 'Execution stopped by user' };
    }
    // Likely CORS/network issues
    return { output: '', error: `Java execution error: ${String(e)}` };
  } finally {
    isExecuting = false;
    if (currentAbortController === controller) currentAbortController = null;
  }
}

/**
 * Check if the Java executor is ready
 * @returns {boolean}
 */
export function isReady() {
  return isInitialized;
}

/**
 * Get information about the Java executor
 * @returns {object}
 */
export function getInfo() {
  return {
    name: 'Java Executor',
    runtime: 'Piston (remote)',
    version: 'dynamic',
    ready: isInitialized,
    futureImplementation: 'Consider DoppioJVM or WASM-based JVM'
  };
}

/**
 * Cancel current Java execution (placeholder)
 * Provided for API compatibility with other executors.
 */
export async function cancel() {
  try {
    if (currentAbortController) {
      currentAbortController.abort();
    }
  } finally {
    isExecuting = false;
    currentAbortController = null;
  }
}
