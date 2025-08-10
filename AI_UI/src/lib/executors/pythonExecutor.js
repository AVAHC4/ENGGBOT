/**
 * Python Code Executor using Pyodide
 * 
 * This module provides Python code execution in the browser using Pyodide,
 * a Python distribution for the browser and Node.js based on WebAssembly.
 */

let pyodide = null;
let isInitialized = false;
let isInitializing = false;

/**
 * Initialize the Pyodide runtime
 * This function loads Pyodide and should only be called once
 * @returns {Promise<void>}
 */
export async function init() {
  if (isInitialized) {
    return;
  }
  
  if (isInitializing) {
    // Wait for the current initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }
  
  try {
    isInitializing = true;
    console.log('[PythonExecutor] Initializing Pyodide...');
    
    // Load Pyodide from CDN
    const pyodideScript = document.createElement('script');
    pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
    
    await new Promise((resolve, reject) => {
      pyodideScript.onload = resolve;
      pyodideScript.onerror = reject;
      document.head.appendChild(pyodideScript);
    });
    
    // Initialize Pyodide
    pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
    });
    
    // Set up output capture
    await pyodide.runPython(`
import sys
import io
from contextlib import redirect_stdout, redirect_stderr

# Create string buffers for capturing output
_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()

def get_output():
    """Get captured stdout and stderr"""
    stdout_content = _stdout_buffer.getvalue()
    stderr_content = _stderr_buffer.getvalue()
    return stdout_content, stderr_content

def clear_output():
    """Clear the output buffers"""
    global _stdout_buffer, _stderr_buffer
    _stdout_buffer = io.StringIO()
    _stderr_buffer = io.StringIO()
`);
    
    isInitialized = true;
    console.log('[PythonExecutor] Pyodide initialized successfully');
    
  } catch (error) {
    console.error('[PythonExecutor] Failed to initialize Pyodide:', error);
    throw new Error(`Failed to initialize Python executor: ${error.message}`);
  } finally {
    isInitializing = false;
  }
}

/**
 * Execute Python code and capture output
 * @param {string} code - The Python code to execute
 * @returns {Promise<{output: string, error: string}>}
 */
export async function execute(code, stdin = '') {
  if (!isInitialized) {
    await init();
  }
  
  try {
    console.log('[PythonExecutor] Executing Python code...');
    
    // Clear previous output
    await pyodide.runPython('clear_output()');

    // Base64-encode the code and stdin to avoid escaping issues
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const encodedStdin = btoa(unescape(encodeURIComponent(stdin)));

    // Execute the user code with output redirection and return JSON of outputs
    const jsonResult = await pyodide.runPython(`
import base64, json, sys, io
_orig_stdin = sys.stdin
try:
    # Prepare stdin
    _stdin_str = base64.b64decode("${encodedStdin}").decode('utf-8')
    sys.stdin = io.StringIO(_stdin_str)

    with redirect_stdout(_stdout_buffer), redirect_stderr(_stderr_buffer):
        _code_str = base64.b64decode("${encoded}").decode('utf-8')
        # Execute in the global namespace so built-ins like print are available
        exec(_code_str, globals())
except Exception as e:
    import traceback
    _stderr_buffer.write(traceback.format_exc())
finally:
    sys.stdin = _orig_stdin
stdout_content, stderr_content = get_output()
json.dumps({'stdout': stdout_content, 'stderr': stderr_content})
`);
    
    // Parse the JSON result
    let stdout = '', stderr = '';
    try {
      const parsed = JSON.parse(jsonResult);
      stdout = parsed.stdout || '';
      stderr = parsed.stderr || '';
    } catch (e) {
      stderr = `Failed to parse Python output: ${e.message}`;
    }
    
    console.log('[PythonExecutor] Execution completed');
    
    return {
      output: stdout || '',
      error: stderr || ''
    };
    
  } catch (error) {
    console.error('[PythonExecutor] Execution error:', error);
    return {
      output: '',
      error: `Python execution error: ${error.message}`
    };
  }
}

/**
 * Check if the Python executor is ready
 * @returns {boolean}
 */
export function isReady() {
  return isInitialized;
}

/**
 * Get information about the Python executor
 * @returns {object}
 */
export function getInfo() {
  return {
    name: 'Python Executor',
    runtime: 'Pyodide',
    version: isInitialized ? pyodide.version : 'Not initialized',
    ready: isInitialized
  };
}
