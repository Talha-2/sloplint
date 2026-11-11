import path from 'node:path';

export const WEIGHTS = { error: 10, warn: 3, info: 1 };
// Short diffs are judged as if they were this long, so one nit in a 10-line change isn't an F.
const MIN_LINES = 500;
const GRADES = [
  ['A', 5],
  ['B', 15],
  ['C', 30],
  ['D', 60],
  ['F', Infinity],
];
const GRADE_COLORS = { A: 'brightgreen', B: 'green', C: 'yellow', D: 'orange', F: 'red' };

export function summarize(result) {
  const counts = { error: 0, warn: 0, info: 0 };
  const byRule = {};
  let penalty = 0;
  for (const f of result.findings) {
    if (!(f.severity in counts)) continue;
    counts[f.severity]++;
    byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
    penalty += WEIGHTS[f.severity];
  }
  const density = (penalty / Math.max(result.linesScanned, MIN_LINES)) * 1000;
  const grade = GRADES.find(([, max]) => density < max)[0];
  return { counts, byRule, penalty, density: Math.round(density * 10) / 10, grade };
}

export function badgeUrl(grade) {
  return `https://img.shields.io/badge/sloplint-${grade}-${GRADE_COLORS[grade]}`;
}

// ---------- terminal ----------

export function formatText(result, { color = false } = {}) {
  const c = color ? ANSI : NO_ANSI;
  const s = summarize(result);
  const out = [];
  let lastFile = null;
  for (const f of result.findings) {
    if (f.file !== lastFile) {
      if (lastFile !== null) out.push('');
      out.push(c.underline(f.file));
      lastFile = f.file;
    }
    const sev = { error: c.red('error'), warn: c.yellow('warn '), info: c.dim('info ') }[f.severity];
    out.push(`  ${c.dim(String(f.line).padStart(5))}  ${sev}  ${f.message}  ${c.dim(f.rule)}`);
  }
  if (result.findings.length) out.push('');
  const scope =
    result.mode === 'diff' ? `changes since ${result.base}` : result.mode === 'staged' ? 'staged changes' : 'whole project';
  const gradeColor = { A: c.green, B: c.green, C: c.yellow, D: c.yellow, F: c.red }[s.grade];
  out.push(
    `${c.bold('sloplint')} ${gradeColor(c.bold(`grade ${s.grade}`))}  ` +
      `${plural(s.counts.error, 'error')}, ${plural(s.counts.warn, 'warning')}, ${s.counts.info} info  ` +
      c.dim(`(${result.filesScanned} files, ${result.linesScanned} lines, ${scope})`),
  );
  if (!result.findings.length) out.push(c.dim('No slop found.'));
  return out.join('\n');
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

const wrap = (a, b) => (s) => `\x1b[${a}m${s}\x1b[${b}m`;
const ANSI = {
  red: wrap(31, 39),
  yellow: wrap(33, 39),
  green: wrap(32, 39),
  dim: wrap(2, 22),
  bold: wrap(1, 22),
  underline: wrap(4, 24),
};
const NO_ANSI = Object.fromEntries(Object.keys(ANSI).map((k) => [k, (s) => s]));

// ---------- JSON ----------

export function formatJson(result) {
  return JSON.stringify({ ...summarize(result), mode: result.mode, base: result.base, filesScanned: result.filesScanned, linesScanned: result.linesScanned, findings: result.findings }, null, 2);
}

// ---------- Markdown (PR comment / job summary) ----------

export const COMMENT_MARKER = '<!-- sloplint-report -->';
const MAX_ROWS = 50;

export function formatMarkdown(result, { linkBase } = {}) {
  const s = summarize(result);
  const lines = [COMMENT_MARKER];
  lines.push(`### ![sloplint ${s.grade}](${badgeUrl(s.grade)}) sloplint`);
  lines.push('');
  const scope = result.mode === 'diff' ? 'lines this PR adds' : result.mode === 'staged' ? 'staged lines' : 'the whole project';
  if (!result.findings.length) {
    lines.push(`No slop found in ${scope} (${result.linesScanned} lines checked).`);
    return lines.join('\n');
  }
  lines.push(
    `**${plural(s.counts.error, 'error')}**, ${plural(s.counts.warn, 'warning')}, ${s.counts.info} info in ${scope} (${result.linesScanned} lines checked).`,
  );
  lines.push('');
  lines.push('| | Where | Finding | Rule |');
  lines.push('|---|---|---|---|');
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...result.findings].sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of sorted.slice(0, MAX_ROWS)) {
    const icon = { error: '🔴', warn: '🟡', info: '⚪' }[f.severity];
    const where = `${f.file}:${f.line}`;
    const link = linkBase ? `[${escapeMd(where)}](${linkBase}/${encodePath(f.file)}#L${f.line})` : `\`${where}\``;
    lines.push(`| ${icon} | ${link} | ${escapeMd(f.message)} | [\`${f.rule}\`](${RULE_DOCS}#${f.rule}) |`);
  }
  if (sorted.length > MAX_ROWS) lines.push('', `…and ${sorted.length - MAX_ROWS} more. Run \`npx sloplint --diff\` locally for the full list.`);
  lines.push('');
  lines.push('<sub>Not an AI detector: these are checkable problems no matter who wrote the code. Silence a false positive with <code>// sloplint-ignore-line</code>.</sub>');
  return lines.join('\n');
}

const RULE_DOCS = 'https://github.com/Talha-2/sloplint/blob/main/docs/rules.md';

function escapeMd(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function encodePath(p) {
  return p.split(path.posix.sep).map(encodeURIComponent).join('/');
}
