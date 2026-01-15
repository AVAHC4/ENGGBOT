 
 

let pyodide = null;
let isReady = false;
let inputSignal = null;  
let inputBuffer = null;  

self.onmessage = async (e) => {
  const data = e.data || {};
  if (data.type === 'INIT') {
    try {
       
      self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
      pyodide = await self.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });

       
      await pyodide.runPython(`
import sys, io
from contextlib import redirect_stdout, redirect_stderr
_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()

def get_output():
    return _stdout_buffer.getvalue(), _stderr_buffer.getvalue()

def clear_output():
    global _stdout_buffer, _stderr_buffer
    _stdout_buffer = io.StringIO()
    _stderr_buffer = io.StringIO()
`);

      isReady = true;
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: String(err && err.message || err) });
    }
    return;
  }

  if (data.type === 'EXECUTE') {
    if (!isReady) {
      self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: 'Pyodide not initialized' });
      return;
    }

    try {
      await pyodide.runPython('clear_output()');

      const { codeB64, stdinB64, interactive, sabSignal, sabBuffer } = data;

       
      if (interactive) {
        inputSignal = new Int32Array(sabSignal);
        inputBuffer = sabBuffer;  
         
        self.getInputSync = (prompt) => {
           
          self.postMessage({ type: 'REQUEST_INPUT', prompt: String(prompt || '') });
           
          Atomics.store(inputSignal, 0, 0);
           
          Atomics.wait(inputSignal, 0, 0);
          const len = Atomics.load(inputSignal, 1);
          const bytes = new Uint8Array(inputBuffer, 0, len);
          const text = new TextDecoder().decode(bytes);
          return text;
        };
      } else {
        self.getInputSync = null;
      }

      const py = `
import base64, json, sys, io, builtins
from contextlib import redirect_stdout, redirect_stderr

# Prepare stdin
_stdin_str = base64.b64decode("${stdinB64}").decode('utf-8') if "${stdinB64}" else ''
_orig_stdin = sys.stdin
_orig_input = getattr(builtins, 'input', None)
__interactive__ = ${interactive ? 'True' : 'False'}
try:
    if _stdin_str:
        sys.stdin = io.StringIO(_stdin_str)
    else:
        if __interactive__:
            # Interactive input bridged to JS worker via SharedArrayBuffer
            from js import getInputSync as _getInputSync
            def _enggbot_input(prompt=''):
                if prompt:
                    _stdout_buffer.write(str(prompt))
                _stdout_buffer.write('Waiting for input...\n')
                val = _getInputSync(prompt)
                _stdout_buffer.write('> ' + str(val) + '\n')
                return str(val)
            builtins.input = _enggbot_input
        else:
            # No interactive input available in this environment; prevent blocking
            def _no_input(prompt=''):
                if prompt:
                    _stdout_buffer.write(str(prompt))
                _stderr_buffer.write('Input requested but interactive input is unavailable. Provide stdin before running.\n')
                raise EOFError('No input available')
            builtins.input = _no_input

    with redirect_stdout(_stdout_buffer), redirect_stderr(_stderr_buffer):
        _code_str = base64.b64decode("${codeB64}").decode('utf-8')
        exec(_code_str, globals())
except Exception as e:
    import traceback
    _stderr_buffer.write(traceback.format_exc())
finally:
    sys.stdin = _orig_stdin
    if _orig_input is not None:
        builtins.input = _orig_input
stdout_content, stderr_content = get_output()
json.dumps({'stdout': stdout_content, 'stderr': stderr_content})
`;

      const jsonResult = await pyodide.runPython(py);
      let stdout = '', stderr = '';
      try {
        const parsed = JSON.parse(jsonResult);
        stdout = parsed.stdout || '';
        stderr = parsed.stderr || '';
      } catch (e) {
        stderr = 'Failed to parse Python output: ' + (e && e.message || String(e));
      }

      self.postMessage({ type: 'EXECUTION_RESULT', output: stdout, error: stderr });
    } catch (err) {
      self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err && err.message || err) });
    }
  }
};

 
self.postMessage({ type: 'BOOT' });
