 
 

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

 
class InteractiveStdin {
    constructor() {
        this.buffer = '';
        this.pendingResolve = null;
        this.position = 0;
    }

     
    read(maxBytes) {
         
        if (this.position < this.buffer.length) {
            const chunk = this.buffer.slice(this.position, this.position + maxBytes);
            this.position += chunk.length;
            return new TextEncoder().encode(chunk);
        }

         
         
         
        return new Uint8Array(0);
    }

    addInput(text) {
        this.buffer += text + '\n';
    }

    reset() {
        this.buffer = '';
        this.position = 0;
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

    if (data.type === 'EXECUTE_INTERACTIVE') {
        const { code = '', lang = 'c', initialStdin = '' } = data;

        try {
            await ensureInit();

             
            const clang = clangPkg || await Wasmer.fromRegistry("clang/clang");
            if (!clangPkg) clangPkg = clang;

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
                args.splice(1, 0, "-x", "c++", "-std=c++17");
            }

             
            const compileStart = Date.now();
            const compile = await clang.entrypoint.run({
                args,
                mount: { "/project": project },
            });

            const compileResult = await Promise.race([
                compile.wait(),
                new Promise((res) => setTimeout(() => res({ ok: false, code: 124, stderr: 'Compile timeout' }), 15000))
            ]);

            if (!compileResult.ok) {
                const err = compileResult.stderr || `Clang failed with code ${compileResult.code}`;
                self.postMessage({ type: 'ERROR', error: String(err) });
                return;
            }

             
            const wasmBytes = await project.readFile(outName);
            const program = await Wasmer.fromFile(wasmBytes);

             
            let stdoutBuffer = '';
            let stdinBuffer = initialStdin || '';
            let stdinPosition = 0;
            let waitingForInput = false;

             
            const stdin = {
                read: (maxBytes) => {
                    if (stdinPosition < stdinBuffer.length) {
                        const chunk = stdinBuffer.slice(stdinPosition, Math.min(stdinPosition + maxBytes, stdinBuffer.length));
                        stdinPosition += chunk.length;
                        return new TextEncoder().encode(chunk);
                    }

                     
                    if (!waitingForInput) {
                        waitingForInput = true;
                         
                        self.postMessage({
                            type: 'NEED_INPUT',
                            output: stdoutBuffer
                        });
                    }

                     
                    return new Uint8Array(0);
                }
            };

             
            const run = await program.entrypoint.run({
                stdin: stdinBuffer
            });

             
            const runResult = await Promise.race([
                run.wait(),
                new Promise((res) => setTimeout(() => res({ stdout: '', stderr: 'Timeout', ok: false }), 30000))
            ]);

            const stdout = runResult.stdout || '';
            const stderr = runResult.stderr || '';

            self.postMessage({
                type: 'EXECUTION_COMPLETE',
                output: stdout,
                error: stderr,
                code: runResult.code || 0
            });

        } catch (err) {
            self.postMessage({
                type: 'ERROR',
                error: String(err && err.message || err)
            });
        }
    }

    if (data.type === 'PROVIDE_INPUT') {
         
         
         
        self.postMessage({ type: 'INPUT_RECEIVED' });
    }
});

self.postMessage({ type: 'BOOT' });
