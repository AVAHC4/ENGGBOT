

let worker = null;
let isInitialized = false;
let initPromise = null;
let usePistonFirst = true;
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
      }, 20000);
    } catch (err) {
      initPromise = null;
      reject(err);
    }
  });

  return initPromise;
}


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
        const input = await onInputRequest('Enter input:');
        collectedStdin = input;
      } catch (e) {
        collectedStdin = '';
      }
    } else {

      collectedStdin = inputs.join('\n');
    }
  }


  const prompts = extractPrompts(code);


  if (usePistonFirst) {
    console.log('[cExecutor] Trying Piston API first...');
    const pistonResult = await executePiston(code, lang, collectedStdin);
    if (pistonResult) {
      console.log('[cExecutor] Piston API succeeded');

      if (prompts.length > 0) {
        pistonResult.output = stripProgramPrompts(pistonResult.output, prompts);
      }
      return pistonResult;
    }
    console.log('[cExecutor] Piston failed, falling back to Wasmer...');
  }


  console.log('[cExecutor] Using Wasmer SDK...');
  const wasmerResult = await executeWasmer(code, lang, collectedStdin);


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


export function setUsePistonFirst(value) {
  usePistonFirst = Boolean(value);
}


export function preload() {
  if (!isInitialized && !initPromise) {
    init().catch(() => { });
  }
}
