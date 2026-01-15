 

import { init, Wasmer, Directory } from "https://cdn.jsdelivr.net/npm/@wasmer/sdk@0.8.0-beta.1/dist/index.mjs";

let initialized = false;
let clangPkg = null;
let dbPromise = null;

 
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('CWorkerBytecodeCache', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('bytecode')) {
          const store = db.createObjectStore('bytecode');
           
          store.createIndex('timestamp', 'timestamp', { unique: false });
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
      req.onsuccess = () => {
        const result = req.result;
         
        if (result && result.timestamp && (Date.now() - result.timestamp < 24 * 60 * 60 * 1000)) {
          resolve(result.bytes);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function cacheBytecode(key, bytes) {
  try {
    const db = await openDB();
    const tx = db.transaction('bytecode', 'readwrite');
    const store = tx.objectStore('bytecode');
    store.put({ bytes, timestamp: Date.now() }, key);

     
    cleanupOldCache(store);
  } catch (e) {
    console.warn('[cWorker] Cache write failed:', e);
  }
}

async function cleanupOldCache(store) {
  try {
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > 50) {
         
        const index = store.index('timestamp');
        const cursorReq = index.openCursor();
        let deleted = 0;
        const toDelete = countReq.result - 40;  

        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };
  } catch {   }
}

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

 
async function ensureInit() {
  if (!initialized) {
    console.log('[cWorker] Initializing Wasmer SDK...');
    await init();
    initialized = true;
    console.log('[cWorker] Wasmer SDK initialized');
  }
}

async function ensureClang() {
  if (!clangPkg) {
    console.log('[cWorker] Loading Clang package from registry...');
    clangPkg = await Wasmer.fromRegistry("clang/clang");
    console.log('[cWorker] Clang package loaded');
  }
  return clangPkg;
}

async function promiseWithTimeout(ms, promise, timeoutValue) {
  let to;
  try {
    return await Promise.race([
      promise,
      new Promise((res) => { to = setTimeout(() => res(timeoutValue), ms); }),
    ]);
  } finally {
    if (to) clearTimeout(to);
  }
}

 
self.addEventListener('message', async (e) => {
  const data = e.data || {};

  if (data.type === 'INIT') {
    try {
      await ensureInit();
       
      ensureClang().catch(() => {   });
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: String(err && err.message || err) });
    }
    return;
  }

  if (data.type === 'PRELOAD_CLANG') {
    try {
      await ensureInit();
      await ensureClang();
      self.postMessage({ type: 'CLANG_READY' });
    } catch (err) {
      self.postMessage({ type: 'CLANG_ERROR', error: String(err && err.message || err) });
    }
    return;
  }

  if (data.type === 'EXECUTE') {
    const { code = '', lang = 'c', stdin = '' } = data;
    try {
      await ensureInit();

      const clang = await ensureClang();
      const project = new Directory();

      const filename = lang === 'cpp' ? 'main.cpp' : 'main.c';
      await project.writeFile(filename, String(code));

      const outName = 'program.wasm';
      const outPath = `/project/${outName}`;

      const args = [
        `/project/${filename}`,
        "-O2",  
        "-o",
        outPath,
      ];

      if (lang === 'cpp') {
         
        args.splice(1, 0, "-x", "c++", "-std=c++17");
      } else {
         
        args.splice(1, 0, "-std=c11");
      }

       
      const key = await sha256(`${lang}|${code}`);

       
      let wasmBytes = await getCachedBytecode(key);

      if (!wasmBytes) {
        console.log('[cWorker] Cache miss, compiling...');
        const compile = await clang.entrypoint.run({
          args,
          mount: { "/project": project },
        });

        const compileResult = await promiseWithTimeout(20000, compile.wait(), {
          ok: false, code: 124, stderr: 'C/C++ compile timeout (20s)', stdout: ''
        });

        if (!compileResult.ok) {
          const err = compileResult.stderr || `Clang failed with code ${compileResult.code}`;
          self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err) });
          return;
        }

         
        wasmBytes = await project.readFile(outName);

         
        await cacheBytecode(key, wasmBytes);
        console.log('[cWorker] Compiled and cached');
      } else {
        console.log('[cWorker] Cache hit, using cached bytecode');
      }

       
      const program = await Wasmer.fromFile(wasmBytes);
      const run = await program.entrypoint.run({
        stdin: stdin || ''
      });

      const runResult = await promiseWithTimeout(15000, run.wait(), {
        stdout: '', stderr: 'Program timeout (15s)', ok: false, code: 124
      });

      const stdout = runResult.stdout || '';
      const stderr = runResult.stderr || '';

      self.postMessage({ type: 'EXECUTION_RESULT', output: stdout, error: stderr });
    } catch (err) {
      console.error('[cWorker] Execution error:', err);
      self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err && err.message || err) });
    }
  }
});

 
self.postMessage({ type: 'BOOT' });
console.log('[cWorker] Worker booted');
