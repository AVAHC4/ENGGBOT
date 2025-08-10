/**
 * JavaScript Code Executor using Sandboxed Iframe
 * 
 * This module provides secure JavaScript code execution in the browser using
 * a sandboxed iframe with postMessage API for communication.
 */

let executionIframe = null;
let isInitialized = false;

/**
 * Initialize the JavaScript executor
 * Creates a sandboxed iframe for secure code execution
 * @returns {Promise<void>}
 */
export async function init() {
  if (isInitialized) {
    return;
  }
  
  try {
    console.log('[JavaScriptExecutor] Initializing sandbox iframe...');
    
    // Create a sandboxed iframe for code execution
    executionIframe = document.createElement('iframe');
    executionIframe.style.display = 'none';
    executionIframe.sandbox = 'allow-scripts';
    
    // Create the sandbox HTML content
    const sandboxHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JavaScript Execution Sandbox</title>
</head>
<body>
  <script>
    // Override console methods to capture output
    let outputBuffer = [];
    let errorBuffer = [];
    
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    console.log = (...args) => {
      outputBuffer.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalConsole.log(...args);
    };
    
    console.error = (...args) => {
      errorBuffer.push(args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalConsole.error(...args);
    };
    
    console.warn = (...args) => {
      outputBuffer.push('WARNING: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalConsole.warn(...args);
    };
    
    console.info = (...args) => {
      outputBuffer.push('INFO: ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '));
      originalConsole.info(...args);
    };
    
    // Override window.alert, prompt, confirm to capture them
    window.alert = (message) => {
      outputBuffer.push('ALERT: ' + String(message));
    };
    
    window.prompt = (message, defaultValue) => {
      outputBuffer.push('PROMPT: ' + String(message));
      return defaultValue || '';
    };
    
    window.confirm = (message) => {
      outputBuffer.push('CONFIRM: ' + String(message));
      return true;
    };
    
    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      errorBuffer.push(\`Error at line \${lineno}: \${message}\`);
      return true;
    };
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      errorBuffer.push('Unhandled Promise Rejection: ' + String(event.reason));
    });
    
    // Listen for code execution requests
    window.addEventListener('message', (event) => {
      if (event.data.type === 'EXECUTE_CODE') {
        // Clear previous output
        outputBuffer = [];
        errorBuffer = [];
        
        try {
          // Execute the code
          const result = eval(event.data.code);
          
          // If the result is not undefined, add it to output
          if (result !== undefined) {
            outputBuffer.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
          }
          
          // Send results back
          event.source.postMessage({
            type: 'EXECUTION_RESULT',
            output: outputBuffer.join('\\n'),
            error: errorBuffer.join('\\n')
          }, '*');
          
        } catch (error) {
          errorBuffer.push(error.toString());
          event.source.postMessage({
            type: 'EXECUTION_RESULT',
            output: outputBuffer.join('\\n'),
            error: errorBuffer.join('\\n')
          }, '*');
        }
      }
    });
    
    // Signal that the sandbox is ready
    window.addEventListener('load', () => {
      parent.postMessage({ type: 'SANDBOX_READY' }, '*');
    });
  </script>
</body>
</html>
    `;
    
    // Set the iframe content
    executionIframe.srcdoc = sandboxHTML;
    document.body.appendChild(executionIframe);
    
    // Wait for the sandbox to be ready
    await new Promise((resolve) => {
      const messageHandler = (event) => {
        if (event.data.type === 'SANDBOX_READY') {
          window.removeEventListener('message', messageHandler);
          resolve();
        }
      };
      window.addEventListener('message', messageHandler);
    });
    
    isInitialized = true;
    console.log('[JavaScriptExecutor] Sandbox initialized successfully');
    
  } catch (error) {
    console.error('[JavaScriptExecutor] Failed to initialize sandbox:', error);
    throw new Error(`Failed to initialize JavaScript executor: ${error.message}`);
  }
}

/**
 * Execute JavaScript code in the sandboxed iframe
 * @param {string} code - The JavaScript code to execute
 * @returns {Promise<{output: string, error: string}>}
 */
export async function execute(code) {
  if (!isInitialized) {
    await init();
  }
  
  try {
    console.log('[JavaScriptExecutor] Executing JavaScript code...');
    
    return new Promise((resolve) => {
      const messageHandler = (event) => {
        if (event.data.type === 'EXECUTION_RESULT') {
          window.removeEventListener('message', messageHandler);
          resolve({
            output: event.data.output || '',
            error: event.data.error || ''
          });
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send code to sandbox for execution
      executionIframe.contentWindow.postMessage({
        type: 'EXECUTE_CODE',
        code: code
      }, '*');
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        resolve({
          output: '',
          error: 'Execution timeout: Code took too long to execute'
        });
      }, 10000); // 10 second timeout
    });
    
  } catch (error) {
    console.error('[JavaScriptExecutor] Execution error:', error);
    return {
      output: '',
      error: `JavaScript execution error: ${error.message}`
    };
  }
}

/**
 * Check if the JavaScript executor is ready
 * @returns {boolean}
 */
export function isReady() {
  return isInitialized;
}

/**
 * Get information about the JavaScript executor
 * @returns {object}
 */
export function getInfo() {
  return {
    name: 'JavaScript Executor',
    runtime: 'Sandboxed Iframe',
    version: 'ES2020+',
    ready: isInitialized
  };
}

/**
 * Clean up the executor (remove iframe)
 * @returns {void}
 */
export function cleanup() {
  if (executionIframe && executionIframe.parentNode) {
    executionIframe.parentNode.removeChild(executionIframe);
    executionIframe = null;
    isInitialized = false;
    console.log('[JavaScriptExecutor] Sandbox cleaned up');
  }
}
