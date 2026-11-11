// sloplint-ignore-file -- fixtures are deliberately sloppy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flaggedLines, findings, lines } from './helpers.js';
import { isNarration } from '../src/rules/narrating-comment.js';

test('placeholder-code: catches stubs, ignores real comments', async () => {
  const got = await flaggedLines(
    'src/a.ts',
    lines(
      'function a() {',
      '  // ... rest of the code',
      '  // ...existing code...',
      '  // Add your validation logic here',
      '  // TODO: implement',
      '  // Implementation goes here',
      '  // For brevity, we skip error handling',
      '  // Return early when the cache is warm so we skip the network round trip',
      '  // TODO: implement retries once the API exposes Retry-After',
      '  // rest of the request is streamed below',
      '}',
    ),
    'placeholder-code',
  );
  assert.deepEqual(got, [2, 3, 4, 5, 6, 7]);
});

test('placeholder-code: Python', async () => {
  const got = await flaggedLines(
    'svc.py',
    lines('def f():', '    # your code here', '    pass', '', 'def g():', '    # ... remaining methods', '    # parse ISO dates; the API sends both formats'),
    'placeholder-code',
  );
  assert.deepEqual(got, [2, 6]);
});

test('chat-artifact: comments and markdown prose, not strings or code samples', async () => {
  const code = await flaggedLines(
    'a.js',
    lines(
      "// Certainly! Here's the updated code with error handling",
      "const msg = 'As an AI language model I cannot';",
      '/* I hope this helps */',
      'const x = 1; // let me know if you need anything else',
    ),
    'chat-artifact',
  );
  assert.deepEqual(code, [1, 3, 4]);

  const md = await flaggedLines(
    'README.md',
    lines('# Tool', '', 'Install it. I hope this helps!', '', '```', 'As an AI language model', '```', 'Run `I hope this helps` here.'),
    'chat-artifact',
  );
  assert.deepEqual(md, [3]);
});

test('hollow-test: JS tests without assertions or with tautologies', async () => {
  const res = await findings(
    {
      'src/math.test.ts': lines(
        "it('adds', () => {",
        '  const r = add(1, 2);',
        '});',
        "test('always passes', () => {",
        '  expect(true).toBe(true);',
        '});',
        "it('works', async () => {",
        '  expect(await add(1, 2)).toBe(3);',
        '});',
        "it('renders', () => {",
        '  render(<App />);',
        "  screen.getByText('Hello');",
        '});',
        "it('empty', () => {});",
        "it.todo('later');",
      ),
    },
    'hollow-test',
  );
  assert.deepEqual(
    res.map((f) => [f.line, f.severity]),
    [
      [1, 'warn'],
      [5, 'error'],
      [14, 'warn'],
    ],
  );
});

test('hollow-test: Python', async () => {
  const res = await findings(
    {
      'tests/test_api.py': lines(
        'def test_empty():',
        '    pass',
        '',
        'def test_true():',
        '    assert True',
        '',
        'def test_real(client):',
        '    r = client.get("/")',
        '    assert r.status_code == 200',
        '',
        'def test_raises():',
        '    with pytest.raises(ValueError):',
        '        parse("x")',
        '',
        'def test_calls_only():',
        '    parse("x")',
      ),
    },
    'hollow-test',
  );
  assert.deepEqual(res.map((f) => f.line), [1, 5, 15]);
});

test('hollow-test: ignores non-test files', async () => {
  const res = await findings({ 'src/util.js': 'expect(true).toBe(true);' }, 'hollow-test');
  assert.equal(res.length, 0);
});

test('swallowed-error: JS', async () => {
  const res = await findings(
    {
      'a.js': lines(
        'try { a() } catch (e) {}',
        'try { b() } catch {',
        '  // nothing',
        '}',
        'p.catch(() => {});',
        'try { c() } catch (e) { log(e); throw e; }',
        'try { d() } catch { /* best-effort cleanup */ }',
        'const body = await res.json().catch(() => null);',
      ),
    },
    'swallowed-error',
  );
  assert.deepEqual(
    res.map((f) => [f.line, f.severity]),
    [
      [1, 'warn'],
      [2, 'warn'],
      [5, 'info'],
    ],
  );
});

test('swallowed-error: Python', async () => {
  const res = await findings(
    {
      'a.py': lines(
        'try:',
        '    a()',
        'except:',
        '    pass',
        'try:',
        '    b()',
        'except KeyError:',
        '    pass',
        'try:',
        '    c()',
        'except Exception:  # intentional: optional telemetry',
        '    pass',
        'try:',
        '    d()',
        'except Exception as e:',
        '    logger.warning(e)',
        'try:',
        '    e()',
        'except OSError: pass',
      ),
    },
    'swallowed-error',
  );
  assert.deepEqual(
    res.map((f) => [f.line, f.severity]),
    [
      [3, 'warn'],
      [7, 'info'],
      [19, 'info'],
    ],
  );
});

test('narrating-comment: restatements vs explanations', () => {
  assert.equal(isNarration('Import the os module', 'import os'), true);
  assert.equal(isNarration('Increment counter', 'counter++'), true);
  assert.equal(isNarration('Return the result', '  return result;'), true);
  assert.equal(isNarration('Initialize the list', 'items = []'), true);
  assert.equal(isNarration('Create a new user', 'const user = new User(data);'), true);
  assert.equal(isNarration('Loop through the users', 'for (const user of users) {'), true);
  assert.equal(isNarration('Retry because the API is flaky', 'retry()'), false);
  assert.equal(isNarration('Set timeout to 5 seconds', 'timeout = 5000'), false);
  assert.equal(isNarration('Create the admin session', 'const user = new User(data);'), false);
  assert.equal(isNarration('Parse the config', 'const cfg = load(path)'), false);
  assert.equal(isNarration('Return early', 'if (!x) return;'), false);
});

test('narrating-comment: only own-line comments directly above code', async () => {
  const got = await flaggedLines(
    'a.py',
    lines('# Import the os module', 'import os', '', '# Set up the client', '', 'client = make()', 'x = 1  # Set the x'),
    'narrating-comment',
  );
  assert.deepEqual(got, [1]);
});

test('slop-prose: flags filler in docs and comments, not in code samples', async () => {
  const md = await flaggedLines(
    'README.md',
    lines(
      '# Tool',
      "In today's fast-paced world, shipping matters.",
      'Let us delve into the details.',
      'It works with Postgres.',
      '```',
      'delve into nothing',
      '```',
      'This tool seamlessly integrates with GitHub.',
    ),
    'slop-prose',
  );
  assert.deepEqual(md, [2, 3, 8]);
  const js = await flaggedLines('a.js', lines('// Unlock the full potential of caching', "const s = 'delve into it';"), 'slop-prose');
  assert.deepEqual(js, [1]);
});

test('emoji-headings: a column of emoji headings, not one', async () => {
  const many = await flaggedLines('README.md', lines('# 🚀 Tool', '## ✨ Features', '## 📦 Install', '## Usage'), 'emoji-headings');
  assert.deepEqual(many, [1]);
  const one = await flaggedLines('README.md', lines('# Tool 🦀', '## Features', '## Install', '## 🧪 Testing'), 'emoji-headings');
  assert.deepEqual(one, []);
});

test('ignore comments and config', async () => {
  const res = await findings(
    {
      '.sloplintrc.json': { rules: { 'swallowed-error': 'off', 'placeholder-code': 'warn' }, ignore: ['legacy/**'] },
      'a.js': lines('// ... rest of code', '// ...existing code  sloplint-ignore-line', 'try { x() } catch {}'),
      'legacy/old.js': '// ... rest of code',
      'gen.js': '// sloplint-ignore-file\n// ... rest of code',
    },
  );
  assert.deepEqual(
    res.map((f) => [f.file, f.line, f.rule, f.severity]),
    [['a.js', 1, 'placeholder-code', 'warn']],
  );
});
