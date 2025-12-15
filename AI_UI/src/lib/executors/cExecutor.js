/**
 * Enhanced C/C++ Executor with hybrid approach:
 * - Primary: Fast Piston API for instant execution (free, no setup)
 * - Fallback: Wasmer SDK WASM for offline/API failure
 *
 * Strategy:
 * 1. Try Piston API first (<2s, free, no hosting needed)
 * 2. On failure/offline: use Wasmer SDK with IndexedDB caching
 *
 * Performance:
 * - Piston API: 500ms - 2s (always fast)
 * - Wasmer first: 5-10s (downloads clang, cached after)
 * - Wasmer cached: <500ms
 */

let worker = null;
let isInitialized = false;
let initPromise = null;
let usePistonFirst = true; // Try Piston API first for speed
let dbPromise = null;

// ============= IndexedDB for bytecode cache =============
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('CBytecodeCache', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('bytecode')) {
          db.createObjectStore('bytecode');
        }
      };
    } catch (err) {
      reject(err);
    }
  });
  return dbPromise;
}

async function getCachedBytecode(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('bytecode', 'readonly');
      const store = tx.objectStore('bytecode');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function cacheBytecode(key, data) {
  try {
    const db = await openDB();
    const tx = db.transaction('bytecode', 'readwrite');
    const store = tx.objectStore('bytecode');
    store.put(data, key);
  } catch { }
}

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============= Piston API (fast, free) =============
async function executePiston(code, lang = 'c', stdin = '') {
  const langMap = {
    'c': { language: 'c', version: '10.2.0' },
    'cpp': { language: 'c++', version: '10.2.0' }
  };

  const langConfig = langMap[lang] || langMap['c'];

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: lang === 'cpp' ? 'main.cpp' : 'main.c', content: code }],
        stdin: stdin || '',
        run_timeout: 10000,
        compile_timeout: 10000,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.warn('[cExecutor] Piston API returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    if (!data.run) {
      console.warn('[cExecutor] Piston returned no run result');
      return null;
    }

    const compileError = data.compile?.stderr || '';
    const runError = data.run.stderr || '';
    const output = data.run.stdout || '';

    return {
      output: output,
      error: compileError || runError || (data.run.code !== 0 ? `Exit code: ${data.run.code}` : ''),
    };
  } catch (e) {
    console.warn('[cExecutor] Piston API failed:', e.message);
    return null;
  }
}

// ============= Worker initialization for Wasmer SDK =============
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

      let initTimeout;
      function cleanup() {
        try { worker?.removeEventListener('message', onMessage); } catch { }
        try { worker?.removeEventListener('error', onError); } catch { }
        if (initTimeout) clearTimeout(initTimeout);
      }

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);

      initTimeout = setTimeout(() => {
        cleanup();
        initPromise = null;
        reject(new Error('C worker initialization timed out'));
      }, 20000); // Increased timeout for first-time clang download
    } catch (err) {
      initPromise = null;
      reject(err);
    }
  });

  return initPromise;
}

// ============= Execute via Wasmer Worker =============
async function executeWasmer(code, lang, stdin) {
  if (!isInitialized) {
    await init();
  }

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
      lang: lang === 'cpp' ? 'cpp' : 'c',
      stdin: stdin || ''
    });

    // Timeout
    setTimeout(() => {
      try { worker?.removeEventListener('message', handler); } catch { }
      try { worker?.terminate(); } catch { }
      isInitialized = false;
      worker = null;
      initPromise = null;
      resolve({ output: '', error: 'Execution timeout (Wasmer)' });
    }, 60000);
  });
}

/**
 * Extract prompt messages from printf before scanf/cin
 */
function extractPrompts(code) {
  const prompts = [];
  const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

  // Match printf("...") followed by scanf/cin/etc
  const regex = /printf\s*\(\s*"([^"]*?)"\s*[^)]*\)\s*;?\s*.*?\b(scanf|cin|getchar|gets|fgets|getline)\b/g;

  let match;
  while ((match = regex.exec(cleanCode)) !== null) {
    prompts.push(match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
  }

  // Also check for cout << "..." followed by cin >>
  const cppRegex = /cout\s*<<\s*"([^"]*?)"\s*[^;]*;\s*.*?\bcin\s*>>/g;
  while ((match = cppRegex.exec(cleanCode)) !== null) {
    prompts.push(match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
  }

  return prompts;
}

/**
 * Strip duplicate program prompts from output
 * Keeps the first occurrence of each prompt but removes subsequent ones
 */
function stripProgramPrompts(text, prompts) {
  if (!text || !prompts || !prompts.length) return text;

  let output = String(text);

  for (const prompt of prompts) {
    if (!prompt) continue;

    // Escape special regex characters in the prompt
    const escapedPrompt = prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find all occurrences of the prompt
    const regex = new RegExp(escapedPrompt, 'g');
    const matches = [...output.matchAll(regex)];

    // Keep the first occurrence, remove all subsequent ones
    if (matches.length > 1) {
      // Remove all but the first occurrence
      let count = 0;
      output = output.replace(regex, (match) => {
        count++;
        return count === 1 ? match : '';
      });
    }
  }

  // Clean up any resulting double newlines or leading whitespace issues
  output = output.replace(/\n{3,}/g, '\n\n').trim();

  return output;
}

/**
 * Execute C/C++ code with hybrid approach:
 * 1. Try Piston API first (fast, free)
 * 2. Fall back to Wasmer SDK if Piston fails
 */
export async function execute(code, stdin = '', onInputRequest, langId = 'c') {
  const lang = langId === 'cpp' ? 'cpp' : 'c';

  // Check if program needs input
  const needsInput = /\b(scanf|cin|getchar|gets|fgets|getline)\b/.test(code);

  let collectedStdin = stdin;

  if (needsInput && !stdin && onInputRequest) {
    // Extract prompts from code statically
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
        const input = await onInputRequest('Enter input:');
        collectedStdin = input;
      } catch (e) {
        collectedStdin = '';
      }
    } else {
      // Combine all inputs with newlines
      collectedStdin = inputs.join('\n');
    }
  }

  // Extract prompts for stripping from output
  const prompts = extractPrompts(code);

  // Strategy 1: Try Piston API first (fast)
  if (usePistonFirst) {
    console.log('[cExecutor] Trying Piston API first...');
    const pistonResult = await executePiston(code, lang, collectedStdin);
    if (pistonResult) {
      console.log('[cExecutor] Piston API succeeded');
      // Strip duplicate prompts from output
      if (prompts.length > 0) {
        pistonResult.output = stripProgramPrompts(pistonResult.output, prompts);
      }
      return pistonResult;
    }
    console.log('[cExecutor] Piston failed, falling back to Wasmer...');
  }

  // Strategy 2: Fall back to Wasmer SDK
  console.log('[cExecutor] Using Wasmer SDK...');
  const wasmerResult = await executeWasmer(code, lang, collectedStdin);

  // Strip duplicate prompts from output
  if (prompts.length > 0) {
    wasmerResult.output = stripProgramPrompts(wasmerResult.output, prompts);
  }

  return wasmerResult;
}

export function isReady() {
  return isInitialized;
}

export function getInfo() {
  return {
    name: 'C/C++ Hybrid Executor',
    runtime: 'Piston API + Wasmer SDK (WASM)',
    version: '2.0.0',
    ready: isInitialized,
    strategy: usePistonFirst ? 'Piston first, Wasmer fallback' : 'Wasmer only',
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

/**
 * Toggle whether to try Piston API first
 */
export function setUsePistonFirst(value) {
  usePistonFirst = Boolean(value);
}

/**
 * Preload the Wasmer worker in the background
 * Call this early to reduce first-time latency
 */
export function preload() {
  if (!isInitialized && !initPromise) {
    init().catch(() => { /* ignore preload errors */ });
  }
}
