/**
 * Java Code Executor with hybrid approach:
 * - Primary: Fast Piston API for instant execution
 * - Fallback: CheerpJ if offline or API fails
 *
 * Strategy:
 * 1. Try Piston API first (< 2s, free, no hosting)
 * 2. On failure/offline: use CheerpJ with caching
 *
 * Performance:
 * - Piston API: 500ms - 2s (always fast)
 * - CheerpJ first: 5-10s (downloads, cached after)
 * - CheerpJ cached: < 500ms
 */

let isInitialized = false;
let scriptLoaded = false;
let loadingPromise = null;
let currentResolve = null;
let cancelled = false;
let dbPromise = null;
let usePistonFirst = true; // Try Piston API first for speed

// IndexedDB for bytecode cache
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('JavaBytecodeCache', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('bytecode')) {
        db.createObjectStore('bytecode');
      }
    };
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
  } catch {}
}

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Lightweight transpiler to Java 8/15-compatible subset ---
function escapeNonAsciiWhole(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code && code > 0x7f) {
      if (code <= 0xffff) {
        out += `\\u${code.toString(16).padStart(4, '0')}`;
      } else {
        // surrogate pair
        const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
        const low = ((code - 0x10000) % 0x400) + 0xdc00;
        out += `\\u${high.toString(16)}\\u${low.toString(16)}`;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function transpilePatternMatching(src) {
  // if (expr instanceof Type var) { -> if (expr instanceof Type) { Type var = (Type) expr;
  return src.replace(/if\s*\(\s*([^\)]+?)\s+instanceof\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*\{/g,
    (m, expr, type, varname) => `if (${expr} instanceof ${type}) { ${type} ${varname} = (${type}) ${expr};`);
}

function transpileRecords(src) {
  // Supports simple 'record Name(type1 f1, type2 f2) { }' => final class
  return src.replace(/\brecord\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{[^}]*\}/g, (m, name, params) => {
    const fields = params.split(',').map(s => s.trim()).filter(Boolean);
    const decls = fields.map(f => {
      const parts = f.split(/\s+/);
      const varName = parts.pop();
      const type = parts.join(' ');
      return { type, name: varName };
    });
    const fieldDecls = decls.map(d => `  private final ${d.type} ${d.name};`).join('\n');
    const ctorParams = decls.map(d => `${d.type} ${d.name}`).join(', ');
    const assigns = decls.map(d => `    this.${d.name} = ${d.name};`).join('\n');
    const accessors = decls.map(d => `  public ${d.type} ${d.name}() { return this.${d.name}; }`).join('\n');
    const toStr = `  @Override public String toString() { return "${name}[" + ${decls.map(d => d.name).join(' + ", " + ')} + "]"; }`;
    return `final class ${name} {\n${fieldDecls}\n  public ${name}(${ctorParams}) {\n${assigns}\n  }\n${accessors}\n${toStr}\n}`;
  });
}

function transpileForCompat(source) {
  let src = String(source || '');
  // Replace common unicode identifier pi
  src = src.replace(/\u03C0/g, 'pi'); // π -> pi
  // Downlevel preview features
  src = transpilePatternMatching(src);
  src = transpileRecords(src);
  // Escape any remaining non-ASCII chars to \uXXXX to avoid encoding issues in javac
  src = escapeNonAsciiWhole(src);
  return src;
}

function needsStdin(src) {
  try {
    const s = String(src || '');
    return /new\s+Scanner\s*\(\s*System\.in\s*\)|System\.console\(\)\.readLine\(|new\s+BufferedReader\s*\(\s*new\s+InputStreamReader\s*\(\s*System\.in\s*\)/.test(s);
  } catch { return false; }
}

function loadCheerpJScript() {
  if (scriptLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise((resolve, reject) => {
    try {
      const id = 'cheerpj-loader';
      if (document.getElementById(id)) {
        scriptLoaded = true;
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://cjrtnc.leaningtech.com/4.2/loader.js';
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = () => { scriptLoaded = true; resolve(); };
      s.onerror = (e) => reject(new Error('Failed to load CheerpJ loader.js'));
      document.head.appendChild(s);
    } catch (err) {
      reject(err);
    }
  });
  return loadingPromise;
}

export async function init() {
  if (isInitialized) return;
  
  // Register Service Worker for CheerpJ asset caching
  if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('[JavaExecutor] SW registration failed:', e);
    }
  }
  
  await loadCheerpJScript();
  if (typeof window === 'undefined' || !('cheerpjInit' in window)) {
    throw new Error('CheerpJ not available in this environment');
  }
  // Initialize runtime and create a tiny display
  // @ts-ignore
  await window.cheerpjInit();
  try {
    // @ts-ignore
    await window.cheerpjCreateDisplay(1, 1);
  } catch {}
  isInitialized = true;
}

function ensureJavaLikeClassName(name) {
  // Very simple sanitizer: letters, digits, underscore only
  return (name || 'MainUser').replace(/[^A-Za-z0-9_]/g, '_');
}

async function executePiston(code, stdin = '') {
  const versions = ['17.0.1', '17.0.0', '16.0.1', '15.0.2'];
  for (const v of versions) {
    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: 'java',
          version: v,
          files: [{ name: 'Main', content: code, encoding: 'utf8' }],
          stdin: stdin || '',
          // Prefer short timeouts; we fall back to CheerpJ if needed
          run_timeout: 8000,
          compile_timeout: 8000,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (!data.run) continue;
      return {
        output: data.run.stdout || '',
        error: data.run.stderr || (data.run.code !== 0 ? data.run.output : ''),
      };
    } catch (e) {
      // try next version or fall back to CheerpJ
      console.warn(`[JavaExecutor] Piston attempt with Java ${v} failed:`, e);
      continue;
    }
  }
  return null;
}

async function collectStdinIfNeeded(source, stdin, onInputRequest) {
  let provided = String(stdin || '');
  if (provided) return provided;
  if (!onInputRequest) return '';
  if (!needsStdin(source)) return '';
  const lines = [];
  // Ask user to provide lines until they submit an empty line
  for (let i = 0; i < 64; i++) { // hard cap
    const line = await onInputRequest(`Java program is waiting for input. Enter line ${i + 1} (empty line to run):`);
    if (line == null) break;
    const t = String(line);
    if (t === '') break;
    lines.push(t);
  }
  return lines.join('\n');
}

export async function execute(code, stdin = '', onInputRequest) {
  cancelled = false;
  
  // Try Piston API first for speed
  if (usePistonFirst) {
    const transpiled = transpileForCompat(code);
    const collected = await collectStdinIfNeeded(transpiled, stdin, onInputRequest);
    const pistonResult = await executePiston(transpiled, collected);
    if (pistonResult) {
      return pistonResult;
    }
    // Piston failed, fall back to CheerpJ
    console.log('[JavaExecutor] Falling back to CheerpJ');
  }
  
  if (!isInitialized) {
    await init();
  }

  return new Promise(async (resolve) => {
    currentResolve = resolve;
    try {
      // Determine class name; if user didn't provide a class, wrap into MainUser
      let userSource = String(transpileForCompat(code) || '');
      let detected = null;
      try {
        const m = userSource.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
        if (m) detected = ensureJavaLikeClassName(m[1]);
      } catch {}
      let className = detected || 'MainUser';
      if (!detected) {
        // Auto-wrap snippet into a minimal class with main()
        userSource = `public class ${className} {\n  public static void main(String[] args) throws Exception {\n    ${userSource}\n  }\n}`;
      }
      
      // Check cache
      const cacheKey = await sha256(userSource);
      const cached = await getCachedBytecode(cacheKey);
      
      const userFile = `/str/${className}.java`;
      const runnerClass = 'Runner';
      const runnerFile = `/str/${runnerClass}.java`;
      const outDir = '/files/bin';
      const stdoutFile = '/files/stdout.txt';
      const stderrFile = '/files/stderr.txt';

      const runnerSource = `import java.io.*;\npublic class ${runnerClass} {\n  public static void main(String[] args) {\n    try {\n      PrintStream out = new PrintStream(new FileOutputStream("${stdoutFile}"));\n      PrintStream err = new PrintStream(new FileOutputStream("${stderrFile}"));\n      PrintStream origOut = System.out;\n      PrintStream origErr = System.err;\n      InputStream origIn = System.in;\n      System.setOut(out);\n      System.setErr(err);\n      try {\n        // Feed System.in from pre-populated file to support Scanner input\n        try { System.setIn(new FileInputStream("/files/stdin.txt")); } catch (Throwable __e) { /* ignore if no stdin */ }\n        Class<?> cls = Class.forName("${className}");\n        java.lang.reflect.Method m = cls.getMethod("main", String[].class);\n        String[] a = new String[0];\n        m.invoke(null, (Object)a);\n      } catch (Throwable t) {\n        t.printStackTrace();\n      } finally {\n        System.out.flush();\n        System.err.flush();\n        try { System.setIn(origIn); } catch (Throwable __e2) {}\n        System.setOut(origOut);\n        System.setErr(origErr);\n        out.close();\n        err.close();\n      }\n    } catch (Exception e) {\n      e.printStackTrace();\n    }\n  }\n}`;


      // Write sources into /str/ (read-only from Java; populated by JS)
      // @ts-ignore
      window.cheerpOSAddStringFile(userFile, userSource);
      // @ts-ignore
      window.cheerpOSAddStringFile(runnerFile, runnerSource);

      // If stdin is expected, pre-populate /files/stdin.txt so Scanner(System.in) reads it
      const preStdin = await collectStdinIfNeeded(userSource, stdin, onInputRequest);
      if (preStdin) {
        // @ts-ignore
        window.cheerpOSAddStringFile('/files/stdin.txt', preStdin + "\n");
      }

      let compileExit = 0;
      if (!cached) {
        // Compile sources with javac (com.sun.tools.javac.Main) into /files/bin
        // @ts-ignore
        compileExit = await Promise.race([
          // @ts-ignore
          window.cheerpjRunMain(
            'com.sun.tools.javac.Main',
            '/app',
            '-d', outDir,
            runnerFile,
            userFile
          ),
          new Promise((res) => setTimeout(() => res(124), 90000)), // 90s for first-time CheerpJ download
        ]);
        if (cancelled) return resolve({ output: '', error: 'Execution stopped by user' });
        if (compileExit !== 0) {
          const errMsg = compileExit === 124 ? 'Java compilation timeout (CheerpJ may be downloading assets on first run)' : `Java compilation failed (exit code ${compileExit}).`;
          return resolve({ output: '', error: errMsg });
        }
        // Cache compiled bytecode (simplified: just cache success)
        await cacheBytecode(cacheKey, { compiled: true, timestamp: Date.now() });
      }

      // Run the compiled Runner class from /files/bin with timeout
      const execPromise = (async () => {
        // @ts-ignore
        const exitCode = await window.cheerpjRunMain(runnerClass, outDir);
        return exitCode;
      })();
      const runExit = await Promise.race([
        execPromise,
        new Promise((res) => setTimeout(() => res(124), 45000)),
      ]);
      if (cancelled) return resolve({ output: '', error: 'Execution stopped by user' });
      // Read stdout/stderr files back
      // @ts-ignore
      const outBlob = await window.cjFileBlob(stdoutFile).catch(() => null);
      // @ts-ignore
      const errBlob = await window.cjFileBlob(stderrFile).catch(() => null);
      const output = outBlob ? await outBlob.text() : '';
      let error = errBlob ? await errBlob.text() : '';
      if (!error && runExit !== 0) {
        error = runExit === 124 ? 'Java execution timeout' : `Program exited with code ${runExit}`;
      }
      return resolve({ output, error });
    } catch (e) {
      return resolve({ output: '', error: String(e && e.message || e) });
    } finally {
      currentResolve = null;
    }
  });
}

export function isReady() {
  return isInitialized;
}

export function getInfo() {
  return {
    name: 'Java Executor',
    runtime: 'CheerpJ (OpenJDK in WASM/JS)',
    version: '4.2 loader',
    ready: isInitialized,
  };
}

export async function cancel() {
  cancelled = true;
  if (currentResolve) {
    currentResolve({ output: '', error: 'Execution stopped by user' });
  }
  currentResolve = null;
}
