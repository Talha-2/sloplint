import { builtinModules } from 'node:module';
import { PYTHON_STDLIB } from '../data/python-stdlib.js';
import { PIP_IMPORT_NAMES } from '../data/pip-import-names.js';

const NODE_BUILTINS = new Set(builtinModules.flatMap((m) => [m, m.split('/')[0]]));

// Statement-anchored so JSX text like `from "x"` never matches:
//   import x from 'y'  /  import {\n a,\n} from 'y'  /  export * from 'y'  /  import 'y'
//   require('y')  /  import('y')
const SPEC = `(['"])([\\w@~#$.:/+-]+)\\1`;
const JS_IMPORT_RES = [
  new RegExp(`^[ \\t]*(?:import|export)\\b[^'";]*?\\bfrom\\s*${SPEC}`, 'gm'),
  new RegExp(`^[ \\t]*import\\s*${SPEC}`, 'gm'),
  new RegExp(`\\b(?:require|import)\\s*\\(\\s*${SPEC}\\s*\\)`, 'g'),
];

export default {
  id: 'phantom-import',
  severity: 'error',
  description: 'Imports a package that is not declared in the project manifest (often a hallucinated package name).',
  appliesTo: (file) => file.lang === 'js' || file.lang === 'py',
  check(file) {
    return file.lang === 'js' ? checkJs(file) : checkPy(file);
  },
};

function checkJs(file) {
  const deps = file.project.jsDepsFor(file.path);
  if (!deps) return []; // No package.json above this file: we can't judge.
  const found = [];
  const seen = new Set();
  const text = file.lines.join('\n');
  for (const re of JS_IMPORT_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const spec = m[2];
      const pkg = jsPackageName(spec);
      if (!pkg) continue;
      if (NODE_BUILTINS.has(pkg) || deps.has(pkg) || deps.has(`@types/${pkg.replace(/^@/, '').replace('/', '__')}`)) continue;
      if (file.project.jsAliased(file.path, spec)) continue;
      const line = text.slice(0, m.index + m[0].length).split('\n').length;
      if (seen.has(`${line}:${pkg}`) || isCommentedOut(file.lines[line - 1])) continue;
      seen.add(`${line}:${pkg}`);
      found.push(undeclared(pkg, line, 'npm', 'package.json', file.project.jsInstalled(file.path, pkg)));
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

// Undeclared + not installed is strong evidence; undeclared but installed is a
// transitive dependency (worth fixing, not alarming); otherwise we can't tell.
function undeclared(pkg, line, ecosystem, manifest, installed) {
  if (installed === true) {
    return { line, pkg, ecosystem, severity: 'warn', message: `"${pkg}" is installed but not declared in ${manifest}; declare it so installs don't depend on luck` };
  }
  if (installed === false) {
    return { line, pkg, ecosystem, severity: 'error', message: `"${pkg}" is not declared in ${manifest} and not installed: hallucinated or missing` };
  }
  return { line, pkg, ecosystem, severity: 'warn', message: `"${pkg}" is imported but not declared in ${manifest}` };
}

export function jsPackageName(spec) {
  if (/^[./]/.test(spec) || spec.startsWith('#')) return null; // relative, absolute, subpath import
  if (/^[\w-]+:/.test(spec)) return null; // node:, bun:, virtual:, https:, npm:
  if (/^[~$]/.test(spec) || spec.startsWith('@/')) return null; // common path aliases
  if (spec.startsWith('@')) {
    const [scope, name] = spec.split('/');
    return name ? `${scope}/${name}` : null;
  }
  return spec.split('/')[0];
}

function checkPy(file) {
  const declared = file.project.pyDeps();
  if (!declared) return []; // No requirements/pyproject: we can't judge.
  const local = file.project.pyLocalModules();
  const found = [];
  file.lines.forEach((line, i) => {
    let mods = [];
    let m = /^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/.exec(line);
    if (m) mods = [m[1]];
    else if ((m = /^\s*import\s+([A-Za-z_][\w.]*(?:\s+as\s+\w+)?(?:\s*,\s*[A-Za-z_][\w.]*(?:\s+as\s+\w+)?)*)\s*(?:#.*)?$/.exec(line))) {
      mods = m[1].split(',').map((s) => s.trim().split(/\s+/)[0]);
    }
    if (!mods.length) return;
    if (isOptionalImport(file.lines, i)) return;
    for (const mod of mods) {
      const top = mod.split('.')[0];
      if (top === '__future__' || PYTHON_STDLIB.has(top) || local.has(top)) continue;
      if (isDeclaredPy(declared, normalizePy(top))) continue;
      found.push(undeclared(top, i + 1, 'pypi', 'requirements/pyproject', file.project.pyInstalled(file.path, top)));
    }
  });
  return found;
}

// Namespace families: `livekit-agents` provides `livekit`, `google-cloud-storage` provides `google`.
function isDeclaredPy(declared, mod) {
  if (declared.has(mod)) return true;
  for (const d of declared) if (d.startsWith(mod + '_')) return true;
  return false;
}

export function normalizePy(name) {
  return name.toLowerCase().replace(/[-_.]+/g, '_');
}

/** Map a distribution name (as written in requirements.txt) to the module names it provides. */
export function pyImportNamesFor(dist) {
  const n = normalizePy(dist);
  const mapped = PIP_IMPORT_NAMES[n];
  return mapped ? [n, ...mapped.map(normalizePy)] : [n];
}

// `try: import ujson` / `except ImportError:` is a deliberate optional dependency.
function isOptionalImport(lines, i) {
  const indent = /^\s*/.exec(lines[i])[0].length;
  for (let j = i - 1; j >= 0 && j >= i - 6; j--) {
    const l = lines[j];
    if (!l.trim()) continue;
    const ind = /^\s*/.exec(l)[0].length;
    if (ind < indent) return /^\s*try\s*:/.test(l);
  }
  return false;
}

function isCommentedOut(line = '') {
  return /^\s*(\/\/|\*|\/\*)/.test(line);
}
