// sloplint-ignore-file -- this file's comments and strings quote the patterns it detects.

export default {
  id: 'swallowed-error',
  severity: 'warn',
  description: 'Errors caught and silently discarded (`catch {}`, `except: pass`).',
  appliesTo: (file) => file.lang === 'js' || file.lang === 'py',
  check(file) {
    return file.lang === 'js' ? checkJs(file.lines) : checkPy(file.lines);
  },
};

function checkJs(lines) {
  const text = lines.join('\n');
  const found = [];
  const patterns = [
    // try {} catch (e) {}  /  catch {}   (a block holding only a short comment still counts)
    [/\bcatch\s*(?:\([^)]*\))?\s*\{(?:\s|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*\}/g, 'warn', 'Error is caught and silently discarded'],
    // promise.catch(() => {}): a common fire-and-forget idiom, so only a nudge.
    // `.catch(() => null)` is a deliberate fallback value and isn't flagged.
    [/\.catch\(\s*(?:\(\s*\w*\s*\)|\w+)\s*=>\s*\{\s*\}\s*\)/g, 'info', 'Promise rejection is silently discarded'],
    [/\.catch\(\s*function\s*\w*\s*\([^)]*\)\s*\{\s*\}\s*\)/g, 'info', 'Promise rejection is silently discarded'],
  ];
  for (const [re, severity, message] of patterns) {
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split('\n').length;
      if (justified(m[0])) continue;
      found.push({ line, message, severity });
    }
  }
  return found.sort((a, b) => a.line - b.line);
}

function checkPy(lines) {
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)except\b([^:]*):\s*(pass|\.\.\.)?\s*(#.*)?$/.exec(lines[i]);
    if (!m) continue;
    const [, indent, what, inlineBody, comment] = m;
    if (justified(comment)) continue;
    if (!inlineBody) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j] ?? '';
      if (/^\s*/.exec(next)[0].length <= indent.length) continue;
      const nm = /^\s*(pass|\.\.\.)\s*(#.*)?$/.exec(next);
      if (!nm) continue;
      if (justified(nm[2])) continue;
      // Only the single `pass` statement, nothing else in the block.
      let k = j + 1;
      while (k < lines.length && !lines[k].trim()) k++;
      if (k < lines.length && /^\s*/.exec(lines[k])[0].length > indent.length) continue;
    }
    const broad = !what.trim() || /\b(Exception|BaseException)\b/.test(what);
    found.push({
      line: i + 1,
      message: broad
        ? 'Every exception is caught and silently discarded'
        : `"${what.trim()}" is caught and silently discarded`,
      severity: broad ? 'warn' : 'info',
    });
  }
  return found;
}

// Ignoring an error is fine when the code says why. A comment of three or more
// words counts as that explanation ("// nothing" does not).
function justified(text) {
  if (!text) return false;
  const words = text
    .replace(/\/\/|\/\*|\*\/|#|\bcatch\b|[{}()]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w) && !/^(e|err|error|_)$/.test(w));
  return words.length >= 3 || /sloplint-ok|intentional|best[- ]effort|noop/i.test(text);
}
