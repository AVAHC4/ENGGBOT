/**
 * Interactive C/C++ Executor using intelligent output simulation
 * Since WASM cannot truly pause, we run programs and intelligently stream output
 */

let worker = null;
let isInitialized = false;
let initPromise = null;

export async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = new Worker('/workers/cWorker.js', { type: 'module' });

      const onMessage = (e) => {
        const msg = e.data || {};
        if (msg.type === 'BOOT') {
          worker.postMessage({ type: 'INIT' });
        } else if (msg.type === 'READY') {
          isInitialized = true;
          cleanup();
          resolve();
        } else if (msg.type === 'ERROR') {
          cleanup();
          reject(new Error(msg.error || 'C worker init error'));
        }
      };
      const onError = (ev) => {
        cleanup();
        reject(new Error('C worker failed to start'));
      };

      function cleanup() {
        try { worker?.removeEventListener('message', onMessage); } catch { }
        try { worker?.removeEventListener('error', onError); } catch { }
        if (initTimeout) clearTimeout(initTimeout);
      }

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);

      const initTimeout = setTimeout(() => {
        cleanup();
        initPromise = null;
        reject(new Error('C worker initialization timed out'));
      }, 15000);
    } catch (err) {
      initPromise = null;
      reject(err);
    }
  });

  return initPromise;
}

/**
 * Execute C code with simulated interactive input
 * This creates the illusion of line-by-line execution by intelligently streaming output
 */
export async function execute(code, stdin = '', onInputRequest, langId = 'c') {
  if (!isInitialized) {
    await init();
  }

  // Check if program needs input
  const needsInput = /\b(scanf|cin|getchar|gets|fgets|getline)\b/.test(code);

  if (needsInput && !stdin && onInputRequest) {
    // Run program TWICE:
    // 1st run: collect all output to find prompts
    // 2nd run: use collected input to get final results

    // First, try to extract prompts from code statically
    const prompts = extractPrompts(code);

    // Collect input for each prompt
    const inputs = [];
    for (const prompt of prompts) {
      try {
        const input = await onInputRequest(prompt);
        inputs.push(input);
      } catch (e) {
        inputs.push('');
      }
    }

    // If we didn't find prompts statically, just ask once
    if (prompts.length === 0) {
      try {
        const input = await onInputRequest('');
        stdin = input;
      } catch (e) {
        stdin = '';
      }
    } else {
      // Combine all inputs with newlines
      stdin = inputs.join('\n');
    }
  }

  // Now execute with collected stdin
  return new Promise((resolve) => {
    const handler = (e) => {
      const msg = e.data || {};
      if (msg.type === 'EXECUTION_RESULT') {
        try { worker?.removeEventListener('message', handler); } catch { }
        resolve({ output: msg.output || '', error: msg.error || '' });
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({
      type: 'EXECUTE',
      code: String(code),
      lang: langId === 'cpp' ? 'cpp' : 'c',
      stdin: stdin || ''
    });

    // Timeout
    setTimeout(() => {
      try { worker?.removeEventListener('message', handler); } catch { }
      try { worker?.terminate(); } catch { }
      isInitialized = false;
      worker = null;
      initPromise = null;
      resolve({ output: '', error: 'Execution timeout' });
    }, 60000);
  });
}

/**
 * Extract prompt messages from printf before scanf
 */
function extractPrompts(code) {
  const prompts = [];
  const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

  // Match printf("...") followed by scanf/cin/etc
  const regex = /printf\s*\(\s*"([^"]*?)"\s*[^)]*\)\s*;?\s*.*?\b(scanf|cin|getchar|gets|fgets)\b/g;

  let match;
  while ((match = regex.exec(cleanCode)) !== null) {
    prompts.push(match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
  }

  return prompts;
}

export function isReady() {
  return isInitialized;
}

export function getInfo() {
  return {
    name: 'C/C++ Interactive Executor',
    runtime: 'Wasmer SDK (Simulated Interactive)',
    version: 'sdk@0.8.0-beta.1',
    ready: isInitialized,
  };
}

export async function cancel() {
  try {
    if (worker) {
      try { worker.terminate(); } catch { }
    }
  } finally {
    isInitialized = false;
    worker = null;
    initPromise = null;
  }
}
