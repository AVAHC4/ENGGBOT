

let isInitialized = true; // No init needed — Wandbox is a REST API
let dbPromise = null;


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


/**
 * Execute C/C++ code using the Wandbox API.
 * https://wandbox.org/api/compile.json — no API key required.
 */
async function executeWandbox(code, lang = 'c', stdin = '') {
  // Wandbox has separate compilers for C and C++
  const compiler = lang === 'c' ? 'gcc-head-c' : 'gcc-head';
  const options = 'warning';

  const payload = {
    compiler,
    code,
    options,
    stdin: stdin || '',
    save: false,
  };

  // For C, link math library
  if (lang === 'c') {
    payload['compiler-option-raw'] = '-lm';
  }

  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.warn('[cExecutor] Wandbox API returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();

    const compileError = data.compiler_error || '';
    const runError = data.program_error || '';
    const output = data.program_output || '';

    return {
      output: output,
      error: compileError || runError || (data.signal ? `Signal: ${data.signal}` : '') || (data.status !== '0' && data.status ? `Exit code: ${data.status}` : ''),
    };
  } catch (e) {
    console.warn('[cExecutor] Wandbox API failed:', e.message);
    return null;
  }
}


export async function init() {
  // No initialization needed for Wandbox REST API
  isInitialized = true;
}


function extractPrompts(code) {
  const prompts = [];

  const cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  const printfPromptMatches = cleanCode.matchAll(/printf\s*\(\s*"([^"]*?)"\s*\)\s*;[\s\n]*(?:scanf|fgets|gets|getchar)/g);
  for (const match of printfPromptMatches) {
    const prompt = match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    if (prompt.trim()) prompts.push(prompt);
  }

  const coutPromptMatches = cleanCode.matchAll(/(?:std::)?cout\s*<<\s*"([^"]+)"[^;]*;[\s\n]*(?:(?:std::)?(?:cin|getline))/g);
  for (const match of coutPromptMatches) {
    const prompt = match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    if (prompt.trim()) prompts.push(prompt);
  }

  return [...new Set(prompts)];
}


function stripProgramPrompts(text, prompts) {
  if (!text || !prompts || !prompts.length) return text;

  let output = String(text);

  for (const prompt of prompts) {
    if (!prompt) continue;

    const escapedPrompt = prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(escapedPrompt, 'g');
    output = output.replace(regex, '');
  }

  output = output.replace(/\n{3,}/g, '\n\n').trim();

  return output;
}


export async function execute(code, stdin = '', onInputRequest, langId = 'c') {
  const lang = langId === 'cpp' ? 'cpp' : 'c';

  // Check if program needs stdin
  const needsInput = /\b(scanf|cin|getchar|gets|fgets|getline)\b/.test(code);

  let collectedStdin = stdin;

  if (needsInput && !stdin && onInputRequest) {
    const prompts = extractPrompts(code);

    const inputs = [];
    for (const prompt of prompts) {
      try {
        const input = await onInputRequest(prompt);
        inputs.push(input);
      } catch (e) {
        inputs.push('');
      }
    }

    if (prompts.length === 0) {
      try {
        const input = await onInputRequest('');
        collectedStdin = input;
      } catch (e) {
        collectedStdin = '';
      }
    } else {
      collectedStdin = inputs.join('\n');
    }
  }

  const prompts = extractPrompts(code);

  // Use Wandbox API
  console.log('[cExecutor] Using Wandbox API...');
  const wandboxResult = await executeWandbox(code, lang, collectedStdin);
  if (wandboxResult) {
    console.log('[cExecutor] Wandbox API succeeded');
    if (prompts.length > 0) {
      wandboxResult.output = stripProgramPrompts(wandboxResult.output, prompts);
    }
    return wandboxResult;
  }

  // If Wandbox fails, return an error
  return { output: '', error: 'Code execution failed. Wandbox API is currently unavailable.' };
}

export function isReady() {
  return isInitialized;
}

export function getInfo() {
  return {
    name: 'C/C++ Executor (Wandbox)',
    runtime: 'Wandbox API (gcc-head)',
    version: '3.0.0',
    ready: isInitialized,
    strategy: 'Wandbox API',
  };
}

export async function cancel() {
  // No worker to cancel — Wandbox requests are fire-and-forget
}

export function preload() {
  // No preloading needed for REST API
}
