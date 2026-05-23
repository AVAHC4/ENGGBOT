

let isInitialized = true; // No init needed — Wandbox is a REST API
let cancelled = false;


function escapeNonAsciiWhole(text) {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code && code > 0x7f) {
      if (code <= 0xffff) {
        out += `\\u${code.toString(16).padStart(4, '0')}`;
      } else {
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
  return src.replace(/if\s*\(\s*([^\)]+?)\s+instanceof\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*\{/g,
    (m, expr, type, varname) => `if (${expr} instanceof ${type}) { ${type} ${varname} = (${type}) ${expr};`);
}

function transpileRecords(src) {
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

  src = src.replace(/\u03C0/g, 'pi');

  src = transpilePatternMatching(src);
  src = transpileRecords(src);

  src = escapeNonAsciiWhole(src);
  return src;
}

function needsStdin(src) {
  try {
    const s = String(src || '');
    return /new\s+Scanner\s*\(\s*System\.in\s*\)|System\.console\(\)\.readLine\(|new\s+BufferedReader\s*\(\s*new\s+InputStreamReader\s*\(\s*System\.in\s*\)/.test(s);
  } catch { return false; }
}


function stripComments(code) {
  let s = String(code || '');
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

function findScannerVars(code) {
  const vars = new Set();
  const re = /Scanner\s+([A-Za-z_]\w*)\s*=\s*new\s+Scanner\s*\(\s*System\.in\s*\)/g;
  for (const m of code.matchAll(re)) vars.add(m[1]);
  return Array.from(vars);
}

function findInputCalls(code, scannerVars) {
  const calls = [];
  const methods = '(nextLine|next|nextInt|nextDouble|nextFloat|nextLong|nextShort|nextByte)';
  for (const v of scannerVars) {
    const re = new RegExp(`${v}\\s*\\.\\s*${methods}\\s*\\(`, 'g');
    for (const m of code.matchAll(re)) {
      calls.push({ idx: m.index || 0, method: m[1], var: v });
    }
  }

  for (const m of code.matchAll(/System\.console\(\)\.readLine\s*\(/g))
    calls.push({ idx: m.index || 0, method: 'readLine', var: 'console' });

  for (const m of code.matchAll(/\.readLine\s*\(/g))
    calls.push({ idx: m.index || 0, method: 'readLine', var: 'reader' });
  calls.sort((a, b) => a.idx - b.idx);
  return calls;
}

function findPromptBefore(code, pos) {
  const windowSize = 400;
  const start = Math.max(0, pos - windowSize);
  const snippet = code.slice(start, pos);
  const matches = [...snippet.matchAll(/System\.out\.(println|print)\s*\(\s*("(?:[^"\\]|\\.)*")/g)];
  if (!matches.length) return '';
  const last = matches[matches.length - 1][2];
  try { return JSON.parse(last); } catch { return last.replace(/^"|"$/g, ''); }
}

function analyzeInputPrompts(originalSource) {
  const clean = stripComments(String(originalSource || ''));
  const scannerVars = findScannerVars(clean);
  const calls = findInputCalls(clean, scannerVars);
  const prompts = calls.map(c => findPromptBefore(clean, c.idx) || 'Enter value:');
  return prompts;
}

function stripProgramPrompts(text, prompts) {
  try {
    let out = String(text || '');
    for (const p of prompts || []) {
      if (!p) continue;
      const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'g');
      out = out.replace(re, '');
    }
    return out.trimStart();
  } catch {
    return text;
  }
}

/**
 * Ensure Java code has a proper public class with main method.
 */
function processJavaCode(code) {
  let src = String(code || '');

  // If no class declaration, wrap in Main class (non-public for Wandbox compatibility)
  if (!/class\s+\w+/.test(src)) {
    return `class Main {\n    public static void main(String[] args) {\n${src}\n    }\n}`;
  }

  // Wandbox saves Java to prog.java, so 'public class' won't compile
  // unless the class name matches the file. Strip 'public' from class declarations.
  src = src.replace(/public\s+class\b/g, 'class');

  return src;
}

/**
 * Execute Java code using the Wandbox API.
 * https://wandbox.org/api/compile.json — no API key required.
 */
async function executeWandbox(code, stdin = '') {
  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler: 'openjdk-jdk-22+36',
        code: code,
        options: '',
        stdin: stdin || '',
        save: false,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      console.warn('[JavaExecutor] Wandbox API returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      output: data.program_output || '',
      error: data.compiler_error || data.program_error || (data.signal ? `Signal: ${data.signal}` : '') || (data.status !== '0' && data.status ? `Exit code: ${data.status}` : ''),
    };
  } catch (e) {
    console.warn('[JavaExecutor] Wandbox API failed:', e.message);
    return null;
  }
}

async function collectStdinIfNeeded(sourceForAnalysis, stdin, onInputRequest) {
  let provided = String(stdin || '');
  if (provided) return provided;
  if (!onInputRequest) return '';
  if (!needsStdin(sourceForAnalysis)) return '';
  // Try to detect exact number of inputs and prompts
  const prompts = analyzeInputPrompts(sourceForAnalysis);
  const lines = [];
  if (prompts.length > 0) {
    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i] || `Enter value ${i + 1}:`;
      const ans = await onInputRequest(p);
      if (ans == null) break;
      lines.push(String(ans));
    }
    // Ensure each answer ends with a newline so Scanner tokenization is correct
    return lines.map(l => l + '\n').join('');
  }
  // Fallback: collect until empty line, but limit to 10
  for (let i = 0; i < 10; i++) {
    const ans = await onInputRequest(`Enter line ${i + 1} (leave empty to run):`);
    if (ans == null) break;
    const t = String(ans);
    if (t === '') break;
    lines.push(t);
  }
  return lines.map(l => l + '\n').join('');
}

export async function init() {
  // No initialization needed for Wandbox REST API
  isInitialized = true;
}

export async function execute(code, stdin = '', onInputRequest) {
  cancelled = false;

  const transpiled = transpileForCompat(code);
  const processed = processJavaCode(transpiled);
  const prompts = analyzeInputPrompts(code);
  const collected = await collectStdinIfNeeded(code, stdin, onInputRequest);

  // Use Wandbox API
  console.log('[JavaExecutor] Using Wandbox API...');
  const wandboxResult = await executeWandbox(processed, collected);
  if (wandboxResult) {
    console.log('[JavaExecutor] Wandbox API succeeded');
    if (prompts && prompts.length) {
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
    name: 'Java Executor (Wandbox)',
    runtime: 'Wandbox API (openjdk-head)',
    version: '3.0.0',
    ready: isInitialized,
  };
}

export async function cancel() {
  cancelled = true;
}
