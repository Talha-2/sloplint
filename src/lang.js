import path from 'node:path';

const LANGS = {
  js: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'],
  py: ['.py', '.pyi'],
  md: ['.md', '.mdx', '.markdown'],
  // Languages we only read line comments from.
  cstyle: ['.go', '.rs', '.java', '.kt', '.kts', '.swift', '.c', '.h', '.cc', '.cpp', '.hpp', '.cs', '.php', '.scala', '.dart'],
  hash: ['.rb', '.sh', '.bash', '.zsh', '.yml', '.yaml', '.toml', '.r'],
};

const BY_EXT = new Map();
for (const [lang, exts] of Object.entries(LANGS)) for (const ext of exts) BY_EXT.set(ext, lang);

export function detectLang(file) {
  return BY_EXT.get(path.extname(file).toLowerCase()) ?? null;
}

export function isTestFile(file) {
  const p = file.replace(/\\/g, '/');
  return (
    /(^|\/)(__tests__|tests?|spec)\//.test(p) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(p) ||
    /(^|\/)test_[^/]*\.py$/.test(p) ||
    /_test\.py$/.test(p)
  );
}

/**
 * Return the line-comment text on a line, or null.
 * Deliberately conservative: we only treat `//` or `#` as a comment when it
 * starts the line (after indentation) or follows whitespace, and never `://`.
 */
export function lineComment(line, lang) {
  if (lang === 'js' || lang === 'cstyle') {
    const m = /(^|\s)\/\/(?!\/)\s?(.*)$/.exec(line);
    if (!m) return null;
    const before = line.slice(0, m.index);
    if (inString(before)) return null;
    return { text: m[2].trim(), own: before.trim() === '' };
  }
  if (lang === 'py' || lang === 'hash') {
    const m = /(^|\s)#(?![!{])\s?(.*)$/.exec(line);
    if (!m) return null;
    const before = line.slice(0, m.index);
    if (inString(before)) return null;
    return { text: m[2].trim(), own: before.trim() === '' };
  }
  return null;
}

function inString(prefix) {
  let single = 0;
  let double = 0;
  let tick = 0;
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix[i];
    if (c === '\\') { i++; continue; }
    if (c === "'" && !double && !tick) single ^= 1;
    else if (c === '"' && !single && !tick) double ^= 1;
    else if (c === '`' && !single && !double) tick ^= 1;
  }
  return Boolean(single || double || tick);
}

/**
 * Blank out fenced code blocks and inline code in markdown, keeping line
 * numbers stable, so prose rules never fire on quoted examples.
 */
export function stripMarkdownCode(lines) {
  const out = [];
  let fence = null;
  for (const line of lines) {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      out.push('');
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      continue;
    }
    if (m) { fence = m[1]; out.push(''); continue; }
    out.push(line.replace(/`[^`]*`/g, ''));
  }
  return out;
}
