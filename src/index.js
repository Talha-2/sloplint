import fs from 'node:fs';
import path from 'node:path';
import { RULES } from './rules/index.js';
import { detectLang, isTestFile, lineComment, stripMarkdownCode } from './lang.js';
import { Project } from './project.js';
import { loadConfig, makeIgnore } from './config.js';
import { isGitRepo, listFiles, addedLines, topLevel } from './git.js';
import { verifyPackages } from './registry.js';

export { RULES };

const MAX_BYTES = 1024 * 1024;
const SEVERITIES = ['off', 'info', 'warn', 'error'];

/**
 * Scan a project.
 * @param {object} opts
 * @param {string} [opts.cwd]
 * @param {string[]} [opts.paths]   limit to these files/folders
 * @param {boolean|string} [opts.diff]  only lines added vs this ref (true = default branch)
 * @param {boolean} [opts.staged]   only lines in the git index (pre-commit)
 * @param {boolean} [opts.online]   check flagged imports against npm / PyPI
 * @param {string} [opts.configPath]
 */
export async function scan(opts = {}) {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const config = loadConfig(cwd, opts.configPath);
  const ignored = makeIgnore(config);
  const inGit = isGitRepo(cwd);
  const allFiles = (inGit ? listFiles(cwd) : walk(cwd)).filter((f) => !ignored(f));
  // Manifests are looked up no higher than the repo root (or cwd outside git).
  const root = inGit ? path.resolve(topLevel(cwd)) : cwd;
  const project = new Project({ cwd, root, allFiles, config });

  let targets = allFiles;
  let lineFilter = null;
  let base = null;
  if (opts.diff || opts.staged) {
    if (!inGit) throw new Error('--diff and --staged need a git repository.');
    const res = addedLines(cwd, { base: typeof opts.diff === 'string' ? opts.diff : undefined, staged: opts.staged });
    lineFilter = res.map;
    base = res.base;
    targets = [...lineFilter.keys()].filter((f) => !ignored(f));
  }
  if (opts.paths?.length) {
    const wanted = opts.paths.map((p) => path.relative(cwd, path.resolve(cwd, p)).replace(/\\/g, '/'));
    targets = targets.filter((f) => wanted.some((w) => w === '' || f === w || f.startsWith(w.replace(/\/$/, '') + '/')));
  }
  targets = targets.filter((f) => detectLang(f));

  const ruleLevels = config.rules ?? {};
  const rules = RULES.filter((r) => ruleLevels[r.id] !== 'off');
  const findings = [];
  let linesScanned = 0;
  let filesScanned = 0;

  for (const rel of targets) {
    const file = loadFile(cwd, rel, project);
    if (!file || file.ignoreAll) continue;
    const only = lineFilter ? lineFilter.get(rel) : null;
    filesScanned++;
    linesScanned += only ? only.size : file.lines.length - (file.lines.at(-1) === '' ? 1 : 0);
    for (const rule of rules) {
      if (!rule.appliesTo(file)) continue;
      for (const f of rule.check(file)) {
        if (only && !only.has(f.line)) continue;
        if (file.ignoredLine(f.line)) continue;
        const level = ruleLevels[rule.id];
        const severity = SEVERITIES.includes(level) ? level : f.severity ?? rule.severity;
        findings.push({ file: rel, line: f.line, rule: rule.id, severity, message: f.message, pkg: f.pkg, ecosystem: f.ecosystem });
      }
    }
  }

  if (opts.online) await verifyPackages(findings);

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { cwd, base, mode: opts.staged ? 'staged' : opts.diff ? 'diff' : 'full', filesScanned, linesScanned, findings };
}

function loadFile(cwd, rel, project) {
  const abs = path.join(cwd, rel);
  let buf;
  try {
    const stat = fs.statSync(abs);
    if (!stat.isFile() || stat.size > MAX_BYTES) return null;
    buf = fs.readFileSync(abs);
  } catch {
    return null; // deleted or unreadable since listing
  }
  if (buf.includes(0)) return null; // binary
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/);
  const lang = detectLang(rel);
  const head = lines.slice(0, 10).join('\n');
  if (/sloplint-ignore-file/.test(head)) return { ignoreAll: true };

  // Long single-line files are generated or minified.
  if (lines.some((l) => l.length > 2000)) return null;

  const comments = [];
  const commentLines = new Set();
  if (lang !== 'md') {
    let inBlock = false;
    lines.forEach((line, i) => {
      if (lang === 'js' || lang === 'cstyle') {
        if (!inBlock && /^\s*\/\*/.test(line)) inBlock = true;
        if (inBlock) {
          if (/\*\//.test(line.replace(/^\s*\/\*/, ''))) inBlock = false;
          const t = line.replace(/^\s*\/?\*+\/?/, '').replace(/\*\/\s*$/, '').trim();
          if (t) comments.push({ line: i + 1, text: t, own: true, block: true });
          commentLines.add(i + 1);
          return;
        }
      }
      const c = lineComment(line, lang);
      if (c) {
        comments.push({ line: i + 1, ...c });
        if (c.own) commentLines.add(i + 1);
      }
    });
  }
  const proseLines =
    lang === 'md'
      ? stripMarkdownCode(lines)
      : (() => {
          const arr = new Array(lines.length).fill('');
          for (const c of comments) arr[c.line - 1] = c.text;
          return arr;
        })();

  return {
    path: rel,
    lang,
    lines,
    comments,
    commentLines,
    proseLines,
    isTest: isTestFile(rel),
    project,
    ignoredLine(n) {
      return /sloplint-ignore-line/.test(lines[n - 1] ?? '') || /sloplint-ignore-next-line/.test(lines[n - 2] ?? '');
    },
  };
}

const WALK_SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', 'venv', '__pycache__', '.next', 'coverage', 'target', 'vendor']);

function walk(root) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
    } catch {
      continue; // permission denied etc.
    }
    for (const e of entries) {
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!WALK_SKIP.has(e.name) && !e.name.startsWith('.')) stack.push(rel);
      } else if (e.isFile()) out.push(rel);
    }
  }
  return out;
}
