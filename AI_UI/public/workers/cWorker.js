// Module Worker: C/C++ compile & run via Wasmer JS SDK (clang)
// Requires COOP/COEP on the top-level page and this worker path.
// Headers are already configured in next.config.js and root vercel.json.

import { init, Wasmer, Directory } from "https://cdn.jsdelivr.net/npm/@wasmer/sdk@0.8.0-beta.1/dist/index.mjs";

let initialized = false;
let clangPkg = null;
async function ensureInit() {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

self.addEventListener('message', async (e) => {
  const data = e.data || {};

  if (data.type === 'INIT') {
    try {
      await ensureInit();
      // Pre-warm clang package from the Wasmer registry to surface any CORS/COEP issues early
      clangPkg = await Wasmer.fromRegistry("clang/clang");
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: String(err && err.message || err) });
    }
    return;
  }

  if (data.type === 'EXECUTE') {
    const { code = '', lang = 'c' } = data;
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

      const compile = await clang.entrypoint.run({
        args,
        mount: { "/project": project },
      });
      const compileResult = await compile.wait();
      if (!compileResult.ok) {
        const err = compileResult.stderr || `Clang failed with code ${compileResult.code}`;
        self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err) });
        return;
      }

      // Read produced wasm from the mounted directory (relative path)
      const wasmBytes = await project.readFile(outName);
      const program = await Wasmer.fromFile(wasmBytes);
      const run = await program.entrypoint.run();
      const runResult = await run.wait();

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
