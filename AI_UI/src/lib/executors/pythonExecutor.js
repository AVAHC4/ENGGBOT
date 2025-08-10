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
      // Create worker from public path to avoid bundler issues
      worker = new Worker('/workers/pythonWorker.js', { type: 'classic' });

      const onMessage = (e) => {
        const msg = e.data || {};
        if (msg.type === 'BOOT') {
          // Worker loaded; kick off init inside worker
          worker.postMessage({ type: 'INIT' });
        } else if (msg.type === 'READY') {
          isInitialized = true;
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          clearTimeout(initTimeout);
          resolve();
        } else if (msg.type === 'ERROR') {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
          clearTimeout(initTimeout);
          reject(new Error(msg.error || 'Worker init error'));
        }
      };
      worker.addEventListener('message', onMessage);

      const onError = (ev) => {
        try { worker.removeEventListener('message', onMessage); } catch {}
        try { worker.removeEventListener('error', onError); } catch {}
        clearTimeout(initTimeout);
        initPromise = null;
        reject(new Error('Python worker failed to start'));
      };
      worker.addEventListener('error', onError);

      const initTimeout = setTimeout(() => {
        try { worker.removeEventListener('message', onMessage); } catch {}
        try { worker.removeEventListener('error', onError); } catch {}
        initPromise = null;
        reject(new Error('Python worker initialization timed out'));
      }, 10000);
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
    const coi = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
    const interactive = !stdin && coi;

    // Create shared buffers for interactive input only if COI
    const sabSignal = interactive ? new SharedArrayBuffer(8) : null; // Int32[2]: [flag, length]
    const signal = sabSignal ? new Int32Array(sabSignal) : null;
    const sabBuffer = interactive ? new SharedArrayBuffer(64 * 1024) : null; // 64KB input
    const bufView = sabBuffer ? new Uint8Array(sabBuffer) : null;

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
        if (signal && bufView) {
          const bytes = new TextEncoder().encode(answer);
          bufView.set(bytes, 0);
          Atomics.store(signal, 1, bytes.length);
          Atomics.store(signal, 0, 1);
          Atomics.notify(signal, 0);
        }
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
      interactive,
      sabSignal,
      sabBuffer,
    });

    // Add a safety timeout (same as JS executor)
    const timeoutId = setTimeout(() => {
      try {
        worker.removeEventListener('message', handler);
        // Terminate worker to stop any pending waits
        worker.terminate();
      } catch {}
      // Force re-init on next run
      isInitialized = false;
      worker = null;
      initPromise = null;
      resolve({ output: '', error: 'Execution timeout: Code took too long to execute' });
    }, 10000);

    // Clear timeout if we get a result
    const clearOnResult = (e) => {
      const msg = e.data || {};
      if (msg.type === 'EXECUTION_RESULT') {
        clearTimeout(timeoutId);
        worker?.removeEventListener('message', clearOnResult);
      }
    };
    worker.addEventListener('message', clearOnResult);
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
