import fs from 'node:fs';
import path from 'node:path';
import { pyImportNamesFor, normalizePy } from './rules/phantom-import.js';

/**
 * What the project declares: npm dependencies, Python requirements, path
 * aliases and first-party module names. Everything is computed lazily and
 * cached, and errs toward "declared" so phantom-import stays precise.
 */
export class Project {
  constructor({ cwd, root = cwd, allFiles, config }) {
    this.cwd = cwd;
    this.root = root;
    this.allFiles = allFiles; // posix paths relative to cwd
    this.config = config;
    this.allow = new Set(config.allowImports ?? []);
    this._pkgCache = new Map();
    this._jsDeps = new Map();
  }

  // ---------- JavaScript / TypeScript ----------

  jsDepsFor(file) {
    const dir = path.dirname(path.resolve(this.cwd, file));
    if (this._jsDeps.has(dir)) return this._jsDeps.get(dir);
    const deps = new Set(this.allow);
    let found = false;
    for (const d of ancestors(dir, this.root)) {
      const pkg = this._readPkg(path.join(d, 'package.json'));
      if (!pkg) continue;
      found = true;
      if (pkg.name) deps.add(pkg.name);
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const name of Object.keys(pkg[key] ?? {})) deps.add(name);
      }
      for (const name of pkg.bundleDependencies ?? pkg.bundledDependencies ?? []) deps.add(name);
    }
    if (found) for (const name of this._workspaceNames()) deps.add(name);
    const result = found ? deps : null;
    this._jsDeps.set(dir, result);
    return result;
  }

  /**
   * Is `pkg` in a node_modules folder visible from this file?
   * true = installed (so it's a transitive dependency), false = node_modules
   * exists but the package isn't there, null = nothing installed, can't tell.
   */
  jsInstalled(file, pkg) {
    let sawNodeModules = false;
    for (const d of ancestors(path.dirname(path.resolve(this.cwd, file)), this.root)) {
      const nm = path.join(d, 'node_modules');
      if (!fs.existsSync(nm)) continue;
      sawNodeModules = true;
      if (fs.existsSync(path.join(nm, pkg))) return true;
    }
    return sawNodeModules ? false : null;
  }

  /** Same idea for Python: look in a project virtualenv's site-packages. */
  pyInstalled(file, mod) {
    const sp = this._sitePackages(path.dirname(path.resolve(this.cwd, file)));
    if (!sp) return null;
    return sp.has(mod.toLowerCase());
  }

  _sitePackages(dir) {
    this._spCache ??= new Map();
    if (this._spCache.has(dir)) return this._spCache.get(dir);
    let names = null;
    for (const d of ancestors(dir, this.root)) {
      for (const venv of ['.venv', 'venv', 'env']) {
        const base = path.join(d, venv);
        const candidates = [path.join(base, 'Lib', 'site-packages')];
        try {
          for (const py of fs.readdirSync(path.join(base, 'lib'))) candidates.push(path.join(base, 'lib', py, 'site-packages'));
        } catch {
          // no lib/ folder (Windows venv or not a venv)
        }
        for (const sp of candidates) {
          let entries;
          try {
            entries = fs.readdirSync(sp);
          } catch {
            continue; // not this layout
          }
          names ??= new Set();
          for (const e of entries) names.add(e.replace(/(\.cpython.*|\.cp\d+.*)?\.(py|pyd|so|pth)$/i, '').toLowerCase());
        }
      }
      if (names) break;
    }
    this._spCache.set(dir, names);
    return names;
  }

  jsAliased(file, spec) {
    for (const alias of this._aliases()) {
      if (alias.exact ? spec === alias.key : spec.startsWith(alias.key)) return true;
    }
    // `baseUrl: "src"` lets `import x from 'utils/x'` resolve to src/utils/x.
    const first = spec.split('/')[0];
    for (const base of this._baseUrls()) {
      const prefix = base ? `${base}/${first}` : first;
      if (this.allFiles.some((f) => f === prefix || f.startsWith(prefix + '/') || f.startsWith(prefix + '.'))) return true;
    }
    return false;
  }

  _workspaceNames() {
    if (!this._wsNames) {
      this._wsNames = new Set();
      for (const f of this.allFiles) {
        if (path.posix.basename(f) !== 'package.json') continue;
        const pkg = this._readPkg(path.resolve(this.cwd, f));
        if (pkg?.name) this._wsNames.add(pkg.name);
      }
    }
    return this._wsNames;
  }

  _tsconfigs() {
    if (!this._tsc) {
      this._tsc = [];
      const files = this.allFiles.filter((f) => /(^|\/)(tsconfig[\w.-]*|jsconfig)\.json$/.test(f));
      for (const f of files) {
        const json = readJsonc(path.resolve(this.cwd, f));
        const opts = json?.compilerOptions;
        if (opts) this._tsc.push({ dir: path.posix.dirname(f), opts });
      }
    }
    return this._tsc;
  }

  _aliases() {
    if (!this._alias) {
      this._alias = [];
      for (const { opts } of this._tsconfigs()) {
        for (const key of Object.keys(opts.paths ?? {})) {
          const star = key.indexOf('*');
          this._alias.push(star >= 0 ? { key: key.slice(0, star), exact: false } : { key, exact: true });
        }
      }
    }
    return this._alias;
  }

  _baseUrls() {
    if (!this._base) {
      this._base = [];
      for (const { dir, opts } of this._tsconfigs()) {
        if (typeof opts.baseUrl !== 'string') continue;
        const joined = path.posix.normalize(path.posix.join(dir, opts.baseUrl));
        this._base.push(joined === '.' ? '' : joined);
      }
    }
    return this._base;
  }

  _readPkg(file) {
    if (!this._pkgCache.has(file)) {
      let pkg = null;
      try {
        pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        pkg = null; // missing or invalid package.json: treat as absent
      }
      this._pkgCache.set(file, pkg);
    }
    return this._pkgCache.get(file);
  }

  // ---------- Python ----------

  pyDeps() {
    if (this._pyDeps !== undefined) return this._pyDeps;
    const manifests = this.allFiles.filter((f) =>
      /(^|\/)(requirements[\w.-]*\.(txt|in)|requirements\/[\w.-]+\.(txt|in)|pyproject\.toml|setup\.py|setup\.cfg|Pipfile|environment\.ya?ml|constraints[\w.-]*\.txt)$/.test(f),
    );
    // Manifests above cwd (running inside a subfolder of a Python project).
    for (const d of this.cwd === this.root ? [] : ancestors(path.dirname(this.cwd), this.root)) {
      for (const name of ['pyproject.toml', 'requirements.txt', 'setup.py', 'setup.cfg', 'Pipfile']) {
        const p = path.join(d, name);
        if (fs.existsSync(p)) manifests.push(p);
      }
    }
    if (!manifests.length) return (this._pyDeps = null);
    const names = new Set([...this.allow].map(normalizePy));
    for (const f of manifests) {
      let text;
      try {
        text = fs.readFileSync(path.resolve(this.cwd, f), 'utf8');
      } catch {
        continue; // unreadable manifest: skip it
      }
      for (const dist of parsePyManifest(f, text)) for (const n of pyImportNamesFor(dist)) names.add(n);
    }
    return (this._pyDeps = names);
  }

  pyLocalModules() {
    if (!this._pyLocal) {
      this._pyLocal = new Set();
      for (const f of this.allFiles) {
        if (!/\.(py|pyi|pyx|so|pyd)$/.test(f)) continue;
        const parts = f.split('/');
        for (const p of parts.slice(0, -1)) this._pyLocal.add(p);
        this._pyLocal.add(parts.at(-1).replace(/\..*$/, ''));
      }
    }
    return this._pyLocal;
  }
}

export function parsePyManifest(file, text) {
  const base = path.basename(file);
  const out = new Set();
  const add = (s) => {
    const m = /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/.exec(s);
    if (m) out.add(m[1]);
  };
  if (/\.(txt|in)$/.test(base)) {
    for (let line of text.split(/\r?\n/)) {
      line = line.replace(/\s#.*$|^#.*$/, '').trim();
      if (!line) continue;
      const egg = /#egg=([\w.-]+)/.exec(line);
      if (egg) out.add(egg[1]);
      else if (!line.startsWith('-') && !/^\w+:\/\//.test(line)) add(line);
    }
    return out;
  }
  if (/\.ya?ml$/.test(base)) {
    for (const m of text.matchAll(/^\s*-\s*([A-Za-z0-9][\w.-]*)/gm)) out.add(m[1]);
    return out;
  }
  // pyproject.toml, setup.py, setup.cfg, Pipfile: take every quoted requirement-looking
  // string and every `name =` key inside a *dependencies*/*packages* section.
  for (const m of text.matchAll(/["']([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*(?:[<>=!~;@ ][^"']*)?["']/g)) out.add(m[1]);
  let inDeps = false;
  for (const line of text.split(/\r?\n/)) {
    const header = /^\s*\[([^\]]+)\]/.exec(line);
    if (header) {
      inDeps = /dependencies|packages|requires/i.test(header[1]);
      continue;
    }
    if (inDeps) {
      const key = /^\s*([A-Za-z0-9][\w.-]*)\s*=/.exec(line);
      if (key) out.add(key[1]);
      // setup.cfg: install_requires =\n    requests\n    numpy
      else if (/^\s+[A-Za-z0-9]/.test(line)) add(line);
    }
  }
  if (base === 'setup.cfg') {
    for (const m of text.matchAll(/^\s+([A-Za-z0-9][\w.-]*)\s*(?:[<>=!~;\[]|$)/gm)) out.add(m[1]);
  }
  return out;
}

// dir, its parent, ... up to and including `stop`.
function* ancestors(dir, stop) {
  let d = path.resolve(dir);
  const end = path.resolve(stop);
  while (true) {
    yield d;
    if (d === end || !d.startsWith(end)) return;
    const parent = path.dirname(d);
    if (parent === d) return;
    d = parent;
  }
}

function readJsonc(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const stripped = raw
      .replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str ?? '')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(stripped);
  } catch {
    return null; // tsconfig with `extends`-only or invalid JSON: no aliases from it
  }
}
