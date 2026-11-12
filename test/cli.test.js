// sloplint-ignore-file -- fixtures are deliberately sloppy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture, lines } from './helpers.js';
import { scan } from '../src/index.js';
import { parseDiff } from '../src/git.js';
import { summarize, formatMarkdown, COMMENT_MARKER } from '../src/report.js';
import { globToRegExp } from '../src/config.js';
import { runInit } from '../src/init.js';

const CLI = fileURLToPath(new URL('../bin/sloplint.js', import.meta.url));
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, stdio: 'pipe' });

test('--diff only reports lines added since the base branch', async () => {
  const cwd = fixture({
    'package.json': { name: 'x' },
    'a.js': lines("import old from 'old-undeclared';", 'export const a = 1;'),
  });
  git(cwd, 'init', '-q', '-b', 'main');
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-qm', 'init');
  git(cwd, 'checkout', '-qb', 'feature');
  fs.appendFileSync(path.join(cwd, 'a.js'), "\nimport neu from 'new-undeclared';\n");
  fs.writeFileSync(path.join(cwd, 'b.py'), 'try:\n    x()\nexcept:\n    pass\n');

  const full = await scan({ cwd });
  assert.deepEqual(full.findings.map((f) => `${f.file}:${f.line}`).sort(), ['a.js:1', 'a.js:3', 'b.py:3']);

  const diff = await scan({ cwd, diff: true });
  assert.equal(diff.base, 'main');
  assert.deepEqual(diff.findings.map((f) => `${f.file}:${f.line}`).sort(), ['a.js:3', 'b.py:3']);
  // a.js: line 2 (gained a newline) + line 3; b.py: 4 new lines
  assert.equal(diff.linesScanned, 6);
});

test('--staged only reports staged lines', async () => {
  const cwd = fixture({ 'package.json': { name: 'x' }, 'a.js': 'export const a = 1;\n' });
  git(cwd, 'init', '-q', '-b', 'main');
  git(cwd, 'add', '.');
  git(cwd, 'commit', '-qm', 'init');
  fs.writeFileSync(path.join(cwd, 'a.js'), "export const a = 1;\nimport s from 'staged-pkg';\n");
  git(cwd, 'add', 'a.js');
  fs.appendFileSync(path.join(cwd, 'a.js'), "import u from 'unstaged-pkg';\n");
  const res = await scan({ cwd, staged: true });
  assert.deepEqual(res.findings.map((f) => f.pkg), ['staged-pkg']);
});

test('parseDiff reads hunk headers', () => {
  const out = [
    'diff --git a/x.js b/x.js',
    '--- a/x.js',
    '+++ b/x.js',
    '@@ -1,0 +2,3 @@',
    '@@ -10 +14 @@',
    '@@ -20,2 +30,0 @@',
    '+++ b/"we ird.py"',
  ].join('\n');
  const map = parseDiff(out);
  assert.deepEqual([...map.get('x.js')], [2, 3, 4, 14]);
});

test('grade scales with severity and size', () => {
  const r = (findings, linesScanned) => summarize({ findings, linesScanned }).grade;
  const e = { severity: 'error', rule: 'x' };
  const i = { severity: 'info', rule: 'x' };
  assert.equal(r([], 100), 'A');
  assert.equal(r([i, i], 100), 'A');
  assert.equal(r([e], 100), 'C');
  assert.equal(r([e, e, e], 100), 'F');
  assert.equal(r([e], 5000), 'A');
});

test('markdown report has the marker and a table', () => {
  const md = formatMarkdown({ mode: 'diff', linesScanned: 40, findings: [{ file: 'a|b.js', line: 3, rule: 'phantom-import', severity: 'error', message: 'nope' }] }, { linkBase: 'https://github.com/o/r/blob/abc' });
  assert.ok(md.startsWith(COMMENT_MARKER));
  assert.match(md, /\[a\\\|b\.js:3\]\(https:\/\/github\.com\/o\/r\/blob\/abc\/a%7Cb\.js#L3\)/);
  assert.match(md, /1 error/);
});

test('globToRegExp', () => {
  assert.ok(globToRegExp('**/node_modules/**').test('node_modules/x/y.js'));
  assert.ok(globToRegExp('**/node_modules/**').test('a/node_modules/x.js'));
  assert.ok(globToRegExp('legacy/**').test('legacy/a/b.js'));
  assert.ok(!globToRegExp('legacy/**').test('src/legacy.js'));
  assert.ok(globToRegExp('*.min.js').test('public/a.min.js'));
  assert.ok(globToRegExp('src/*.ts').test('src/a.ts'));
  assert.ok(!globToRegExp('src/*.ts').test('src/x/a.ts'));
});

test('init installs the skill and an idempotent AGENTS.md section', () => {
  const cwd = fixture({ 'AGENTS.md': '# Project rules\n\nUse pnpm.\n' });
  const quiet = () => {};
  runInit({ cwd, ci: true, log: quiet });
  runInit({ cwd, ci: true, log: quiet });
  const agents = fs.readFileSync(path.join(cwd, 'AGENTS.md'), 'utf8');
  assert.ok(agents.startsWith('# Project rules\n\nUse pnpm.'));
  assert.equal(agents.split('<!-- sloplint:start -->').length, 2);
  assert.match(fs.readFileSync(path.join(cwd, '.claude/skills/sloplint/SKILL.md'), 'utf8'), /^---\nname: sloplint\n/);
  for (const name of ['sloplint-review', 'sloplint-tests', 'sloplint-deps']) {
    assert.match(fs.readFileSync(path.join(cwd, `.claude/skills/${name}/SKILL.md`), 'utf8'), new RegExp(`^---\\nname: ${name}\\n`));
  }
  assert.match(fs.readFileSync(path.join(cwd, '.github/workflows/sloplint.yml'), 'utf8'), /fetch-depth: 0/);
});

test('CLI exit codes and formats', () => {
  const cwd = fixture({ 'package.json': { name: 'x' }, 'node_modules/other/package.json': {}, 'a.js': "import z from 'zzz-not-real';\n" });
  const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });

  const text = run('--no-color');
  assert.equal(text.status, 1);
  assert.match(text.stdout, /a\.js/);
  assert.match(text.stdout, /zzz-not-real/);

  assert.equal(run('--fail-on', 'none').status, 0);

  const json = JSON.parse(run('--format', 'json').stdout);
  assert.equal(json.counts.error, 1);

  const out = path.join(cwd, 'r.json');
  run('--format', 'json', '--output', out);
  const md = run('--from-json', out, '--format', 'markdown');
  assert.match(md.stdout, /sloplint-report/);

  assert.equal(run('--fail-on', 'bogus').status, 2);
  assert.match(run('rules').stdout, /phantom-import/);
});
