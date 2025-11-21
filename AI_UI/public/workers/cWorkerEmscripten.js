// Emscripten-based C Worker with Interactive stdin/stdout
// Uses JSCPP interpreter for true interactive execution with real-time I/O

// Input buffer and state
let inputBuffer = [];
let pendingInputResolve = null;

// JSCPP library instance
let JSCPP = null;

// Handle messages from main thread
self.addEventListener('message', async (e) => {
    const data = e.data || {};

    if (data.type === 'INIT') {
        try {
            // Load JSCPP library using importScripts (proper way for workers)
            importScripts('https://cdn.jsdelivr.net/npm/JSCPP@2.0.9/dist/JSCPP.min.js');
            JSCPP = self.JSCPP;

            if (!JSCPP) {
                throw new Error('JSCPP failed to load');
            }

            self.postMessage({ type: 'READY' });
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: String(err.message || err) });
        }
        return;
    }

    if (data.type === 'INPUT_RESPONSE') {
        // User provided input
        const input = (data.input || '') + '\n';
        for (let i = 0; i < input.length; i++) {
            inputBuffer.push(input.charCodeAt(i));
        }

        // Resolve pending input request
        if (pendingInputResolve) {
            pendingInputResolve();
            pendingInputResolve = null;
        }
        return;
    }

    if (data.type === 'EXECUTE') {
        const { code = '' } = data;

        if (!JSCPP) {
            self.postMessage({
                type: 'EXECUTION_RESULT',
                output: '',
                error: 'JSCPP not initialized'
            });
            return;
        }

        try {
            // Reset state
            inputBuffer = [];
            pendingInputResolve = null;
            let stdoutBuffer = '';

            // Define custom I/O config for JSCPP
            const config = {
                stdio: {
                    write: (s) => {
                        // Stream stdout to main thread in real-time
                        stdoutBuffer += s;
                        self.postMessage({ type: 'STDOUT_CHUNK', data: s });
                    },
                    read: () => {
                        // Synchronous read with async request mechanism
                        // JSCPP expects synchronous read, so we use a blocking approach
                        return new Promise(async (resolve) => {
                            // If buffer is empty, request input from user
                            while (inputBuffer.length === 0) {
                                await new Promise((res) => {
                                    pendingInputResolve = res;
                                    self.postMessage({ type: 'INPUT_REQUEST' });
                                    // Wait for INPUT_RESPONSE message to resolve this
                                });
                            }

                            // Read one character from buffer
                            if (inputBuffer.length > 0) {
                                const char = inputBuffer.shift();
                                resolve(String.fromCharCode(char));
                            } else {
                                resolve('');
                            }
                        });
                    }
                }
            };

            // Run C code with JSCPP
            await JSCPP.run(code, '', config);

            self.postMessage({
                type: 'EXECUTION_RESULT',
                output: stdoutBuffer,
                error: ''
            });

        } catch (err) {
            self.postMessage({
                type: 'EXECUTION_RESULT',
                output: '',
                error: String(err.message || err)
            });
        }
    }
});

// Notify that worker is ready to initialize
self.postMessage({ type: 'BOOT' });
