import { execFileSync } from 'node:child_process';

function git(cwd, args) {
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
}

export function isGitRepo(cwd) {
  try {
    return git(cwd, ['rev-parse', '--is-inside-work-tree']).trim() === 'true';
  } catch {
    return false;
  }
}

export function topLevel(cwd) {
  return git(cwd, ['rev-parse', '--show-toplevel']).trim();
}

/** Tracked + untracked-but-not-ignored files under cwd, as posix paths relative to cwd. */
export function listFiles(cwd) {
  return git(cwd, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0')
    .filter(Boolean);
}

/** Pick the branch to compare against when the user didn't name one. */
export function defaultBase(cwd) {
  try {
    const ref = git(cwd, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']).trim();
    if (ref) return ref.replace(/^refs\/remotes\//, '');
  } catch {
    // no origin/HEAD; fall through to the usual names
  }
  for (const b of ['origin/main', 'origin/master', 'main', 'master']) {
    try {
      git(cwd, ['rev-parse', '--verify', '--quiet', b]);
      return b;
    } catch {
      // try the next candidate
    }
  }
  return 'HEAD';
}

/**
 * Lines added relative to `base` (or the index when `staged`), as
 * Map<path, Set<lineNumber>>; a value of `null` means the whole file is new.
 */
export function addedLines(cwd, { base, staged }) {
  let args;
  let resolvedBase = null;
  if (staged) {
    args = ['diff', '--cached', '-U0', '--no-color', '--no-ext-diff', '--relative', '--diff-filter=AMR'];
  } else {
    resolvedBase = base || defaultBase(cwd);
    let from = resolvedBase;
    try {
      from = git(cwd, ['merge-base', resolvedBase, 'HEAD']).trim() || resolvedBase;
    } catch {
      // no common ancestor (shallow clone?): diff against the ref itself
    }
    args = ['diff', '-U0', '--no-color', '--no-ext-diff', '--relative', '--diff-filter=AMR', from];
  }
  let out;
  try {
    out = git(cwd, args);
  } catch {
    throw new Error(
      `Could not diff against "${resolvedBase}". In CI, check out with full history (actions/checkout fetch-depth: 0) or pass --diff <ref>.`,
    );
  }
  const map = parseDiff(out);
  if (!staged) {
    for (const f of git(cwd, ['ls-files', '-z', '--others', '--exclude-standard']).split('\0').filter(Boolean)) {
      map.set(f, null);
    }
  }
  return { map, base: resolvedBase };
}

export function parseDiff(out) {
  const map = new Map();
  let current = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).trim();
      current = p === '/dev/null' ? null : unquote(p).replace(/^b\//, '');
      if (current && !map.has(current)) map.set(current, new Set());
      continue;
    }
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m && current) {
      const start = Number(m[1]);
      const count = m[2] === undefined ? 1 : Number(m[2]);
      const set = map.get(current);
      for (let i = 0; i < count; i++) set.add(start + i);
    }
  }
  return map;
}

function unquote(p) {
  if (!p.startsWith('"')) return p;
  return p.slice(1, -1).replace(/\\(.)/g, '$1');
}
