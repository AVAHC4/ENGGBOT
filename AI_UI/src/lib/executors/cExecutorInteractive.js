/**
 * Interactive C Code Executor using JSCPP interpreter in a Module Worker.
 *
 * Worker script: /workers/cWorkerEmscripten.js (ESM)
 * Supports true interactive stdin/stdout with real-time execution.
 */

let worker = null;
let isInitialized = false;
let initPromise = null;
let currentResolve = null;
let currentOnInput = null;
let currentTimeoutId = null;
let currentOutput = '';

export async function init() {
    if (isInitialized) return;
    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
        try {
            worker = new Worker('/workers/cWorkerEmscripten.js');

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
                    reject(new Error(msg.error || 'Interactive C worker init error'));
                }
            };
            const onError = (ev) => {
                console.error('[InteractiveCExecutor] Worker error:', ev);
                cleanup();
                reject(new Error('Interactive C worker failed to start'));
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
                reject(new Error('Interactive C worker initialization timed out'));
            }, 15000);
        } catch (err) {
            initPromise = null;
            reject(err);
        }
    });

    return initPromise;
}

/**
 * Execute C code with interactive I/O
 * @param {string} code
 * @param {string} stdin - unused (interactive mode)
 * @param {(prompt: string) => Promise<string>} onInputRequest - callback for requesting input
 * @param {string} langId - 'c' | 'cpp'
 * @returns {Promise<{output: string, error: string}>}
 */
export async function execute(code, stdin = '', onInputRequest, langId = 'c') {
    if (!isInitialized) {
        await init();
    }

    return new Promise((resolve) => {
        currentOutput = '';
        currentOnInput = onInputRequest;

        const handler = (e) => {
            const msg = e.data || {};

            if (msg.type === 'STDOUT_CHUNK') {
                // Stream stdout in real-time
                currentOutput += msg.data || '';
            }

            if (msg.type === 'INPUT_REQUEST') {
                // Worker needs input - request from user
                if (currentOnInput) {
                    currentOnInput('').then((input) => {
                        worker.postMessage({ type: 'INPUT_RESPONSE', input });
                    }).catch(() => {
                        worker.postMessage({ type: 'INPUT_RESPONSE', input: '' });
                    });
                }
            }

            if (msg.type === 'EXECUTION_RESULT') {
                try { worker?.removeEventListener('message', handler); } catch { }
                if (currentTimeoutId) { clearTimeout(currentTimeoutId); currentTimeoutId = null; }
                currentOnInput = null;

                const res = {
                    output: msg.output || currentOutput || '',
                    error: msg.error || ''
                };
                resolve(res);
            }
        };

        worker.addEventListener('message', handler);
        currentResolve = resolve;

        worker.postMessage({
            type: 'EXECUTE',
            code: String(code)
        });

        // Execution timeout (60s)
        currentTimeoutId = setTimeout(() => {
            try { worker?.removeEventListener('message', handler); } catch { }
            try { worker?.terminate(); } catch { }
            isInitialized = false;
            worker = null;
            initPromise = null;
            resolve({ output: currentOutput, error: 'Execution timeout: Code took too long to execute' });
        }, 60000);
    });
}

export function isReady() {
    return isInitialized;
}

export function getInfo() {
    return {
        name: 'Interactive C Executor',
        runtime: 'JSCPP Interpreter',
        version: '2.0.9',
        ready: isInitialized,
    };
}

export async function cancel() {
    try {
        if (worker) {
            try { worker.terminate(); } catch { }
        }
    } finally {
        if (currentTimeoutId) { clearTimeout(currentTimeoutId); currentTimeoutId = null; }
        isInitialized = false;
        worker = null;
        initPromise = null;
        if (currentResolve) { currentResolve({ output: currentOutput, error: 'Execution stopped by user' }); }
        currentResolve = null;
        currentOnInput = null;
    }
}
