// sloplint-ignore-file -- this file defines the patterns it detects.

// Assertions that can never fail.
const TAUTOLOGIES = [
  /\bexpect\(\s*(true|false|null|undefined|\d+|(['"])[^'"]*\2)\s*\)\s*\.\s*(toBe|toEqual|toStrictEqual)\(\s*\1\s*\)/,
  /\bexpect\(\s*true\s*\)\s*\.\s*toBeTruthy\(\s*\)/,
  /\bexpect\(\s*false\s*\)\s*\.\s*toBeFalsy\(\s*\)/,
  /\bassert(?:\.ok)?\(\s*true\s*\)/,
  /\bassert\.(?:equal|strictEqual|deepEqual|deepStrictEqual)\(\s*(true|\d+|(['"])[^'"]*\2)\s*,\s*\1\s*\)/,
  /^\s*assert\s+(?:True|1|not\s+False)\s*(?:,|#|$)/,
  /^\s*self\.assertTrue\(\s*True\s*\)/,
  /^\s*self\.assertEqual\(\s*(\d+|True|(['"])[^'"]*\2)\s*,\s*\1\s*\)/,
];

// Anything that looks like it checks something.
const JS_ASSERTS = /\b(expect|assert|should|t\.(?:is|not|deepEqual|true|false|truthy|falsy|throws|ok|equal|plan|snapshot|like|match)|verify|expectTypeOf|assertType)\b|\.(?:should|rejects|resolves)\b|\b(?:getBy|getAllBy|findBy|findAllBy)\w*\(|\b(?:check|expect|assert|verify)\w*\(/;
const PY_ASSERTS = /\b(assert\w*|pytest\.(?:raises|warns|approx|fail)|self\.(?:assert\w+|fail)|raises|verify\w*|check\w*|expect\w*)\b/;

export default {
  id: 'hollow-test',
  severity: 'error',
  description: 'Tests that cannot fail: no assertions, or assertions that compare a constant to itself.',
  appliesTo: (file) => file.isTest && (file.lang === 'js' || file.lang === 'py'),
  check(file) {
    const found = [];
    file.lines.forEach((line, i) => {
      if (TAUTOLOGIES.some((re) => re.test(line))) {
        found.push({ line: i + 1, message: 'Assertion compares a constant to itself, so it can never fail' });
      }
    });
    const blocks = file.lang === 'js' ? jsTestBlocks(file.lines) : pyTestBlocks(file.lines);
    for (const b of blocks) {
      const body = b.body.replace(/\/\/.*$|#.*$/gm, '');
      const re = file.lang === 'js' ? JS_ASSERTS : PY_ASSERTS;
      if (!re.test(body)) {
        found.push({
          line: b.line,
          message: b.empty ? `Test "${b.name}" is empty` : `Test "${b.name}" never asserts anything`,
          severity: 'warn',
        });
      }
    }
    return found;
  },
};

function jsTestBlocks(lines) {
  const text = lines.join('\n');
  const out = [];
  const re = /\b(?:it|test)\s*\(\s*(['"`])((?:(?!\1).){1,120})\1\s*,\s*(?:async\s*)?(?:function\s*\w*\s*\([^)]*\)|\([^)]*\)|\w+)\s*(?:=>)?\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index + m[0].length;
    const end = matchBrace(text, start);
    if (end < 0) continue;
    const body = text.slice(start, end);
    out.push({
      name: m[2],
      line: text.slice(0, m.index).split('\n').length,
      body,
      empty: body.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '').trim() === '',
    });
  }
  return out;
}

// Index of the `}` matching an already-open `{`, skipping strings and comments.
function matchBrace(text, i) {
  let depth = 1;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && text[i + 1] === '*') {
      const e = text.indexOf('*/', i + 2);
      i = e < 0 ? text.length : e + 1;
    } else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

function pyTestBlocks(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(?:async\s+)?def\s+(test\w*)\s*\(/.exec(lines[i]);
    if (!m) continue;
    const indent = m[1].length;
    // Skip to the end of the signature (it may span lines).
    let j = i;
    while (j < lines.length && !/:\s*(#.*)?$/.test(lines[j])) j++;
    const body = [];
    for (j++; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() && /^\s*/.exec(l)[0].length <= indent) break;
      body.push(l);
    }
    const code = body.join('\n').replace(/#.*$/gm, '').replace(/("""|''')[\s\S]*?\1/g, '').trim();
    out.push({ name: m[2], line: i + 1, body: body.join('\n'), empty: code === '' || code === 'pass' || code === '...' });
  }
  return out;
}
