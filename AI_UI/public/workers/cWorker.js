
import { init, Wasmer, Directory } from "https://cdn.jsdelivr.net/npm/@wasmer/sdk@0.8.0-beta.1/dist/index.mjs";

let initialized = false;
let clangPkg = null;
const wasmCache = new Map();
async function ensureInit() {
  if (!initialized) {
    await init();
    initialized = true;
  }
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
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: String(err && err.message || err) });
    }
    return;
  }

  if (data.type === 'EXECUTE') {
    const { code = '', lang = 'c', stdin = '' } = data;
    try {
      await ensureInit();

      const clang = clangPkg || await Wasmer.fromRegistry("clang/clang");
      const project = new Directory();

      const filename = lang === 'cpp' ? 'main.cpp' : 'main.c';
      await project.writeFile(filename, String(code));

      const outName = 'program.wasm';
      const outPath = `/project/${outName}`;

      const args = [
        `/project/${filename}`,
        "-O0",
        "-o",
        outPath,
      ];
      if (lang === 'cpp') {
        // Attempt C++ mode; availability of libc++ depends on the clang package in the registry.
        args.splice(1, 0, "-x", "c++", "-std=c++17");
      }

      // Compute cache key and use cached wasm if available
      const key = await sha256(`${lang}|${code}`);
      let wasmBytes = wasmCache.get(key);
      if (!wasmBytes) {
        const compile = await clang.entrypoint.run({
          args,
          mount: { "/project": project },
        });
        const compileResult = await promiseWithTimeout(15000, compile.wait(), {
          ok: false, code: 124, stderr: 'C/C++ compile timeout', stdout: ''
        });
        if (!compileResult.ok) {
          const err = compileResult.stderr || `Clang failed with code ${compileResult.code}`;
          self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err) });
          return;
        }
        // Read produced wasm from the mounted directory (relative path)
        wasmBytes = await project.readFile(outName);
        wasmCache.set(key, wasmBytes);
      }
      const program = await Wasmer.fromFile(wasmBytes);
      // Pass stdin to the program
      const run = await program.entrypoint.run({
        stdin: stdin || ''
      });
      const runResult = await promiseWithTimeout(12000, run.wait(), { stdout: '', stderr: 'Program timeout', ok: false, code: 124 });

      const stdout = runResult.stdout || '';
      const stderr = runResult.stderr || '';
      self.postMessage({ type: 'EXECUTION_RESULT', output: stdout, error: stderr });
    } catch (err) {
      self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err && err.message || err) });
    }
  }
});

// Auto-init notification like other workers
self.postMessage({ type: 'BOOT' });

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}
