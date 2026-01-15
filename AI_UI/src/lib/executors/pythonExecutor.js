 

let worker = null;
let isInitialized = false;
let initPromise = null;
let initStartTime = null;

let currentResolve = null;
let currentMsgHandler = null;
let currentExecTimeoutId = null;
let currentInputWaitTimeoutId = null;
 
let onProgressCallback = null;

 
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
       
      worker = new Worker('/workers/pythonWorker.js', { type: 'classic' });

      const onMessage = (e) => {
        const msg = e.data || {};
        if (msg.type === 'BOOT') {
          notifyProgress('Loading Pyodide...', 10);
           
          worker.postMessage({ type: 'INIT' });
        } else if (msg.type === 'PROGRESS') {
           
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
         
        try {
           
           
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
      }, 90000);  
    } catch (err) {
      reject(err);
    }
  });

  return initPromise;
}

 
export function preload() {
  if (!isInitialized && !initPromise) {
    init().catch(() => {
       
    });
  }
}

 
export async function execute(code, stdin = '', onInputRequest) {
  if (!isInitialized) {
    await init();
  }

  return new Promise((resolve) => {
    const encoded = btoa(unescape(encodeURIComponent(code)));
    const encodedStdin = btoa(unescape(encodeURIComponent(stdin)));
    const coi = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
    const interactive = !stdin && coi;

     
    const sabSignal = interactive ? new SharedArrayBuffer(8) : null;  
    const signal = sabSignal ? new Int32Array(sabSignal) : null;
    const sabBuffer = interactive ? new SharedArrayBuffer(64 * 1024) : null;  
    const bufView = sabBuffer ? new Uint8Array(sabBuffer) : null;

     
    let execTimeoutId = null;         
    let inputWaitTimeoutId = null;    

    const handler = async (e) => {
      const msg = e.data || {};
      if (msg.type === 'REQUEST_INPUT') {
         
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

     
    if (interactive) {
       
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
      }, 5 * 60 * 1000);  
    } else {
       
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

     
    const clearOnResult = (e) => {
      const msg = e.data || {};
      if (msg.type === 'EXECUTION_RESULT') {
        if (execTimeoutId) clearTimeout(execTimeoutId);
        if (inputWaitTimeoutId) clearTimeout(inputWaitTimeoutId);
        worker?.removeEventListener('message', clearOnResult);
      }
    };
    worker.addEventListener('message', clearOnResult);

     
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
