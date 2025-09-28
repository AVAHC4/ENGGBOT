/**
 * C/C++ Code Executor using Wasmer SDK (Clang) in a Module Worker.
 *
 * Worker script: /workers/cWorker.js (ESM)
 * Requires COOP/COEP to be set (already configured in next.config.js and root vercel.json).
 */

let worker = null;
let isInitialized = false;
let initPromise = null;
let currentResolve = null;
let currentHandler = null;
let currentTimeoutId = null;

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
        try {
          // eslint-disable-next-line no-console
          console.error('[CExecutor] Worker error:', {
            message: ev?.message,
            filename: ev?.filename,
            lineno: ev?.lineno,
            colno: ev?.colno,
            error: ev?.error,
          });
        } catch {}
        cleanup();
        reject(new Error('C worker failed to start'));
      };

      function cleanup() {
        try { worker?.removeEventListener('message', onMessage); } catch {}
        try { worker?.removeEventListener('error', onError); } catch {}
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
 * Execute C or C++ code and capture output
 * @param {string} code
 * @param {string} stdin - unused for now (no interactive input support)
 * @param {(prompt: string) => Promise<string>} onInputRequest - unused
 * @param {string} langId - 'c' | 'cpp'
 * @returns {Promise<{output: string, error: string}>}
 */
export async function execute(code, stdin = '', onInputRequest, langId = 'c') {
  if (!isInitialized) {
    await init();
  }

  return new Promise((resolve) => {
    const handler = (e) => {
      const msg = e.data || {};
      if (msg.type === 'EXECUTION_RESULT') {
        try { worker?.removeEventListener('message', handler); } catch {}
        if (currentTimeoutId) { clearTimeout(currentTimeoutId); currentTimeoutId = null; }
        currentHandler = null;
        const res = { output: msg.output || '', error: msg.error || '' };
        resolve(res);
      }
    };
    worker.addEventListener('message', handler);
    currentHandler = handler;
    currentResolve = resolve;

    worker.postMessage({ type: 'EXECUTE', code: String(code), lang: langId === 'cpp' ? 'cpp' : 'c' });

    // Execution timeout (60s)
    currentTimeoutId = setTimeout(() => {
      try { worker?.removeEventListener('message', handler); } catch {}
      try { worker?.terminate(); } catch {}
      isInitialized = false;
      worker = null;
      initPromise = null;
      resolve({ output: '', error: 'Execution timeout: Code took too long to execute' });
    }, 60000);
  });
}

export function isReady() {
  return isInitialized;
}

export function getInfo() {
  return {
    name: 'C/C++ Executor',
    runtime: 'Wasmer SDK (Clang)',
    version: 'sdk@0.8.0-beta.1',
    ready: isInitialized,
  };
}

export async function cancel() {
  try {
    if (worker && currentHandler) {
      try { worker.removeEventListener('message', currentHandler); } catch {}
    }
    if (worker) {
      try { worker.terminate(); } catch {}
    }
  } finally {
    if (currentTimeoutId) { clearTimeout(currentTimeoutId); currentTimeoutId = null; }
    isInitialized = false;
    worker = null;
    initPromise = null;
    if (currentResolve) { currentResolve({ output: '', error: 'Execution stopped by user' }); }
    currentResolve = null;
    currentHandler = null;
  }
}
