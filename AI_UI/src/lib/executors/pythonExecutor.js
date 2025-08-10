/**
 * Python Code Executor using Pyodide (Web Worker)
 *
 * Runs Pyodide inside a Worker and supports interactive input via a
 * SharedArrayBuffer handoff. Falls back to pre-supplied stdin if provided.
 */

let worker = null;
let isInitialized = false;
let initPromise = null;

export async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      // Create worker referencing the bundled file
      const workerUrl = new URL('./pythonWorker.js', import.meta.url);
      worker = new Worker(workerUrl, { type: 'classic' });

      const onMessage = (e) => {
        const msg = e.data || {};
        if (msg.type === 'BOOT') {
          // Worker loaded; kick off init inside worker
          worker.postMessage({ type: 'INIT' });
        } else if (msg.type === 'READY') {
          isInitialized = true;
          worker.removeEventListener('message', onMessage);
          resolve();
        } else if (msg.type === 'ERROR') {
          worker.removeEventListener('message', onMessage);
          reject(new Error(msg.error || 'Worker init error'));
        }
      };
      worker.addEventListener('message', onMessage);
    } catch (err) {
      reject(err);
    }
  });

  return initPromise;
}

/**
 * Execute Python code and capture output
 * @param {string} code
 * @param {string} stdin
 * @param {(prompt: string) => Promise<string>} onInputRequest optional callback for interactive input
 * @returns {Promise<{output: string, error: string}>}
 */
export async function execute(code, stdin = '', onInputRequest) {
  if (!isInitialized) {
    await init();
  }

  return new Promise((resolve) => {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const encodedStdin = btoa(unescape(encodeURIComponent(stdin)));

    // Create shared buffers for interactive input
    const sabSignal = new SharedArrayBuffer(8); // Int32[2]: [flag, length]
    const signal = new Int32Array(sabSignal);
    const sabBuffer = new SharedArrayBuffer(64 * 1024); // 64KB input
    const bufView = new Uint8Array(sabBuffer);

    const handler = async (e) => {
      const msg = e.data || {};
      if (msg.type === 'REQUEST_INPUT') {
        let answer = '';
        try {
          if (typeof onInputRequest === 'function') {
            answer = await onInputRequest(String(msg.prompt || ''));
          } else {
            answer = window.prompt(String(msg.prompt || '')) || '';
          }
        } catch {
          answer = '';
        }
        const bytes = new TextEncoder().encode(answer);
        bufView.set(bytes, 0);
        Atomics.store(signal, 1, bytes.length);
        Atomics.store(signal, 0, 1);
        Atomics.notify(signal, 0);
      }
      if (msg.type === 'EXECUTION_RESULT') {
        worker.removeEventListener('message', handler);
        resolve({ output: msg.output || '', error: msg.error || '' });
      }
    };
    worker.addEventListener('message', handler);

    worker.postMessage({
      type: 'EXECUTE',
      codeB64: encoded,
      stdinB64: encodedStdin,
      interactive: !stdin,
      sabSignal,
      sabBuffer,
    });

    // Add a safety timeout (same as JS executor)
    setTimeout(() => {
      worker.removeEventListener('message', handler);
      resolve({ output: '', error: 'Execution timeout: Code took too long to execute' });
    }, 10000);
  });
}

export function isReady() {
  return isInitialized;
}

export function getInfo() {
  return {
    name: 'Python Executor',
    runtime: 'Pyodide (Worker)',
    version: 'v0.24.1',
    ready: isInitialized,
  };
}
