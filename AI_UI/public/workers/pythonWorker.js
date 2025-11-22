// Python execution worker with interactive stdin using Pyodide
// Classic worker script served from /public to avoid bundler issues

let pyodide = null;
let isReady = false;
let inputSignal = null; // Int32Array on SharedArrayBuffer [flag, length]
let inputBuffer = null; // SharedArrayBuffer for UTF-8 bytes

self.onmessage = async (e) => {
  const data = e.data || {};
  if (data.type === 'INIT') {
    try {
      // Load Pyodide in worker (use credentialless-friendly COEP)
      self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js');
      pyodide = await self.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });

      // Load scientific packages
      await pyodide.loadPackage(['micropip', 'numpy', 'pandas', 'scipy', 'matplotlib', 'sympy']);

      // Prepare stdout/stderr capture helpers and matplotlib hook
      await pyodide.runPython(`
import sys, io, base64
from contextlib import redirect_stdout, redirect_stderr
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()
_plots_buffer = []

def get_output():
    return _stdout_buffer.getvalue(), _stderr_buffer.getvalue()

def get_plots():
    return list(_plots_buffer)

def clear_output():
    global _stdout_buffer, _stderr_buffer, _plots_buffer
    _stdout_buffer = io.StringIO()
    _stderr_buffer = io.StringIO()
    _plots_buffer = []

def _show_hook(*args, **kwargs):
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    _plots_buffer.append(img_str)
    plt.close()

plt.show = _show_hook
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

      // Setup interactive plumbing if requested
      if (interactive) {
        inputSignal = new Int32Array(sabSignal);
        inputBuffer = sabBuffer; // Uint8Array will be created on demand
        // Expose a synchronous JS function to Python
        self.getInputSync = (prompt) => {
          // Notify main thread we need input
          self.postMessage({ type: 'REQUEST_INPUT', prompt: String(prompt || '') });
          // Reset flag to 0 and wait
          Atomics.store(inputSignal, 0, 0);
          // Wait until main thread writes and notifies
          Atomics.wait(inputSignal, 0, 0);
          const len = Atomics.load(inputSignal, 1);
          // TextDecoder cannot decode a SharedArrayBuffer view directly; copy to a normal buffer
          const sharedView = new Uint8Array(inputBuffer, 0, len);
          const bytes = new Uint8Array(len);
          bytes.set(sharedView);
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
                # no extra waiting or echo lines; behave like stdin
                val = _getInputSync(prompt)
                # add a newline after user submits so prompt is its own line
                _stdout_buffer.write('\\n')
                return str(val)
            builtins.input = _enggbot_input
        else:
            # No interactive input available in this environment; prevent blocking
            def _no_input(prompt=''):
                if prompt:
                    _stdout_buffer.write(str(prompt))
                _stderr_buffer.write('Input requested but interactive input is unavailable. Provide stdin before running.')
                _stderr_buffer.write('\\n')
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
plots_content = get_plots()
json.dumps({'stdout': stdout_content, 'stderr': stderr_content, 'plots': plots_content})
`;

      const jsonResult = await pyodide.runPython(py);
      let stdout = '', stderr = '', plots = [];
      try {
        const parsed = JSON.parse(jsonResult);
        stdout = parsed.stdout || '';
        stderr = parsed.stderr || '';
        plots = parsed.plots || [];
      } catch (e) {
        stderr = 'Failed to parse Python output: ' + (e && e.message || String(e));
      }

      self.postMessage({ type: 'EXECUTION_RESULT', output: stdout, error: stderr, plots: plots });
    } catch (err) {
      self.postMessage({ type: 'EXECUTION_RESULT', output: '', error: String(err && err.message || err) });
    }
  }
};

// Auto-init on load
self.postMessage({ type: 'BOOT' });
