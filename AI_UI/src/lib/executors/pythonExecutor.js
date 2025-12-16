/**
 * Python Code Executor using Pyodide (Web Worker)
 *
 * Runs Pyodide inside a Worker and supports interactive input via a
 * SharedArrayBuffer handoff. Falls back to pre-supplied stdin if provided.
 * 
 * OPTIMIZED: Preloads Pyodide on module import for faster execution.
 */

let worker = null;
let isInitialized = false;
let initPromise = null;
let initStartTime = null;
// Track in-flight execution so we can cancel
let currentResolve = null;
let currentMsgHandler = null;
let currentExecTimeoutId = null;
let currentInputWaitTimeoutId = null;
// Progress callbacks
let onProgressCallback = null;

/**
 * Set a callback to receive initialization progress updates
 * @param {(stage: string, progress: number) => void} callback
 */
export function setProgressCallback(callback) {
  onProgressCallback = callback;
}

function notifyProgress(stage, progress) {
  if (typeof onProgressCallback === 'function') {
    try { onProgressCallback(stage, progress); } catch { }
  }
}

export async function init() {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initStartTime = Date.now();
  notifyProgress('Starting Python runtime...', 0);

  initPromise = new Promise((resolve, reject) => {
    try {
      // Create worker from public path to avoid bundler issues
      worker = new Worker('/workers/pythonWorker.js', { type: 'classic' });

      const onMessage = (e) => {
        const msg = e.data || {};
        if (msg.type === 'BOOT') {
          notifyProgress('Loading Pyodide...', 10);
          // Worker loaded; kick off init inside worker
          worker.postMessage({ type: 'INIT' });
        } else if (msg.type === 'PROGRESS') {
          // Forward progress updates from worker
          notifyProgress(msg.stage || 'Loading...', msg.progress || 0);
        } else if (msg.type === 'READY') {
          const loadTime = ((Date.now() - initStartTime) / 1000).toFixed(1);
          console.log(`[PythonExecutor] Ready in ${loadTime}s`);
          notifyProgress('Python ready!', 100);
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
        // Surface details to help diagnose (e.g., 404 on /workers/pythonWorker.js)
        try {
          // Some browsers expose message/filename/lineno/colno on error events
          // eslint-disable-next-line no-console
          console.error('[PythonExecutor] Worker error:', {
            message: ev?.message,
            filename: ev?.filename,
            lineno: ev?.lineno,
            colno: ev?.colno,
            error: ev?.error,
          });
        } catch { }
        try { worker.removeEventListener('message', onMessage); } catch { }
        try { worker.removeEventListener('error', onError); } catch { }
        clearTimeout(initTimeout);
        initPromise = null;
        reject(new Error('Python worker failed to start'));
      };
      worker.addEventListener('error', onError);

      const initTimeout = setTimeout(() => {
        try { worker.removeEventListener('message', onMessage); } catch { }
        try { worker.removeEventListener('error', onError); } catch { }
        initPromise = null;
        reject(new Error('Python worker initialization timed out'));
      }, 90000); // 90 seconds to load Pyodide + all scientific packages
    } catch (err) {
      reject(err);
    }
  });

  return initPromise;
}

/**
 * Preload Python runtime in the background without waiting
 * Call this early (e.g., on page load) to reduce lag when user runs code
 */
export function preload() {
  if (!isInitialized && !initPromise) {
    init().catch(() => {
      // Silently ignore preload failures; user will see error when they actually run code
    });
  }
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

    // Timers
    let execTimeoutId = null;        // main execution timeout
    let inputWaitTimeoutId = null;   // longer timeout when waiting for user input

    const handler = async (e) => {
      const msg = e.data || {};
      if (msg.type === 'REQUEST_INPUT') {
        // Pause main execution timeout while waiting for input
        if (execTimeoutId) { clearTimeout(execTimeoutId); execTimeoutId = null; }

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

        // Clear any input-wait timer and resume main execution timeout
        if (inputWaitTimeoutId) { clearTimeout(inputWaitTimeoutId); inputWaitTimeoutId = null; }
        execTimeoutId = setTimeout(() => {
          try {
            worker.removeEventListener('message', handler);
            worker.terminate();
          } catch { }
          isInitialized = false;
          worker = null;
          initPromise = null;
          if (currentResolve) { currentResolve({ output: '', error: 'Execution timeout: Code took too long to execute' }); }
          currentResolve = null;
          currentMsgHandler = null;
          currentExecTimeoutId = null;
          currentInputWaitTimeoutId = null;
        }, 60000);

        return;
      }
      if (msg.type === 'EXECUTION_RESULT') {
        worker.removeEventListener('message', handler);
        if (execTimeoutId) clearTimeout(execTimeoutId);
        if (inputWaitTimeoutId) clearTimeout(inputWaitTimeoutId);
        currentExecTimeoutId = null;
        currentInputWaitTimeoutId = null;
        currentMsgHandler = null;
        const res = { output: msg.output || '', error: msg.error || '', plots: msg.plots || [], plotly: msg.plotly || [] };
        if (currentResolve) { currentResolve(res); }
        currentResolve = null;
      }
    };
    worker.addEventListener('message', handler);
    // expose to cancel()
    currentMsgHandler = handler;
    currentResolve = resolve;

    worker.postMessage({
      type: 'EXECUTE',
      codeB64: encoded,
      stdinB64: encodedStdin,
      interactive,
      sabSignal,
      sabBuffer,
    });

    // Start timers: if interactive, allow long wait for the initial input
    if (interactive) {
      // While waiting for first input, don't kill the worker too soon
      inputWaitTimeoutId = setTimeout(() => {
        try {
          worker.removeEventListener('message', handler);
          worker.terminate();
        } catch { }
        isInitialized = false;
        worker = null;
        initPromise = null;
        if (currentResolve) { currentResolve({ output: '', error: 'Input timeout: no input received' }); }
        currentResolve = null;
        currentMsgHandler = null;
        currentExecTimeoutId = null;
        currentInputWaitTimeoutId = null;
      }, 5 * 60 * 1000); // 5 minutes
    } else {
      // Non-interactive run: regular execution timeout
      execTimeoutId = setTimeout(() => {
        try {
          worker.removeEventListener('message', handler);
          worker.terminate();
        } catch { }
        isInitialized = false;
        worker = null;
        initPromise = null;
        if (currentResolve) { currentResolve({ output: '', error: 'Execution timeout: Code took too long to execute' }); }
        currentResolve = null;
        currentMsgHandler = null;
        currentExecTimeoutId = null;
        currentInputWaitTimeoutId = null;
      }, 60000);
    }

    // Clear timers if we get a result (handled in main handler as well)
    const clearOnResult = (e) => {
      const msg = e.data || {};
      if (msg.type === 'EXECUTION_RESULT') {
        if (execTimeoutId) clearTimeout(execTimeoutId);
        if (inputWaitTimeoutId) clearTimeout(inputWaitTimeoutId);
        worker?.removeEventListener('message', clearOnResult);
      }
    };
    worker.addEventListener('message', clearOnResult);

    // keep timer refs globally for cancel()
    currentExecTimeoutId = execTimeoutId;
    currentInputWaitTimeoutId = inputWaitTimeoutId;
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

export async function cancel() {
  // Terminate running execution and resolve pending promise
  try {
    if (worker && currentMsgHandler) {
      try { worker.removeEventListener('message', currentMsgHandler); } catch { }
    }
    if (worker) {
      try { worker.terminate(); } catch { }
    }
  } finally {
    if (currentExecTimeoutId) { clearTimeout(currentExecTimeoutId); currentExecTimeoutId = null; }
    if (currentInputWaitTimeoutId) { clearTimeout(currentInputWaitTimeoutId); currentInputWaitTimeoutId = null; }
    isInitialized = false;
    worker = null;
    initPromise = null;
    if (currentResolve) { currentResolve({ output: '', error: 'Execution stopped by user' }); }
    currentResolve = null;
    currentMsgHandler = null;
  }
}
