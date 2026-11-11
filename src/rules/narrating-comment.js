// A comment that only restates the next line of code, e.g.
//   # Import the os module        import os
//   // Increment the counter      counter++
// Fires only when the comment's verb is visible in the code AND every other
// meaningful word in the comment is an identifier on that line.

const STOP = new Set(
  'a an the to of for and or with from in into on at by is are be this that it its new our we us some all each every current given then here now through over across up out'.split(' '),
);
// Nouns that just name the kind of thing, not what it means.
const GENERIC = new Set(
  'variable variables var function functions func method methods module modules package library value values list lists array arrays object objects dict dictionary map string strings number numbers integer int result results data item items element elements instance class constant constants field property properties parameter parameters param params argument arguments loop counter index i statement line code call'.split(' '),
);
// Words that carry intent; their presence means the comment explains something.
const INTENT = /\b(because|why|since|otherwise|unless|so that|in order|workaround|hack|note|warning|careful|todo|fixme|xxx|bug|issue|avoid|prevent|ensure|must|should|never|always|only|instead|until|without|before|after|edge|case|legacy|compat|deprecated|perf|slow|fast|cache|race|lock|https?:\/\/)\b|\d/i;

const VERBS = {
  import: (code) => /\b(import|require|from|use|include)\b/.test(code),
  imports: (code) => /\b(import|require|from)\b/.test(code),
  return: (code) => /\breturn\b/.test(code),
  returns: (code) => /\breturn\b/.test(code),
  increment: (code) => /\+\+|\+=\s*1\b/.test(code),
  decrement: (code) => /--|-=\s*1\b/.test(code),
  loop: (code) => /\b(for|while|forEach|map)\b/.test(code),
  iterate: (code) => /\b(for|while|forEach|map)\b/.test(code),
  print: (code) => /\b(print|console\.log|println|printf|fmt\.Print|puts|echo)\b/.test(code),
  log: (code) => /\b(console\.\w+|log(ger)?\.\w+|print|logging\.\w+)\b/.test(code),
  call: (code) => /\w\s*\(/.test(code),
  check: (code) => /\b(if|assert)\b/.test(code),
  initialize: assigns,
  initialise: assigns,
  init: assigns,
  create: assigns,
  define: (code) => assigns(code) || /\b(def|function|class|const|let|var|type|interface)\b/.test(code),
  declare: assigns,
  set: assigns,
  assign: assigns,
  store: assigns,
  save: assigns,
  get: assigns,
  fetch: (code) => /\b(fetch|get|request|axios)\b/i.test(code),
  add: (code) => /\b(push|append|add|insert)\b|\+=/.test(code),
  append: (code) => /\b(push|append|add)\b/.test(code),
  update: assigns,
  instantiate: (code) => /\bnew\b|\w+\s*\(/.test(code),
  convert: (code) => /\w\s*\(/.test(code),
  close: (code) => /\bclose\b/.test(code),
  open: (code) => /\bopen\b/.test(code),
  start: (code) => /\bstart|run|listen\b/.test(code),
};

function assigns(code) {
  return /(^|[^=!<>])=(?!=)|:=|\b(const|let|var)\b/.test(code);
}

export default {
  id: 'narrating-comment',
  severity: 'info',
  description: 'Comments that restate the next line of code instead of explaining why.',
  appliesTo: (file) => file.lang && file.lang !== 'md' && !file.isTest,
  check(file) {
    const found = [];
    for (const c of file.comments) {
      if (!c.own) continue;
      const next = nextCodeLine(file, c.line);
      if (!next) continue;
      if (isNarration(c.text, next.text)) {
        found.push({ line: c.line, message: `Comment restates the code below it: "${c.text}"` });
      }
    }
    return found;
  },
};

export function isNarration(comment, code) {
  if (!comment || INTENT.test(comment)) return false;
  const words = comment.toLowerCase().replace(/[^a-z\s'_-]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 8) return false;
  const verb = words[0];
  const verbCheck = VERBS[verb] ?? VERBS[verb.replace(/s$/, '')];
  if (!verbCheck || !verbCheck(code)) return false;
  const idents = identifierWords(code);
  const rest = words.slice(1).filter((w) => !STOP.has(w) && !GENERIC.has(w));
  if (!rest.length) return true; // "Initialize the variable", "Call the function"
  return rest.every((w) => idents.some((id) => id === w || id === singular(w) || singular(id) === singular(w)));
}

function singular(w) {
  return w.replace(/(ies)$/, 'y').replace(/(?<!s)s$/, '');
}

// Split identifiers on the line into lowercase words: fetchUserData -> fetch, user, data
function identifierWords(code) {
  const ids = code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const words = new Set();
  for (const id of ids) {
    words.add(id.toLowerCase());
    for (const part of id.split(/_|(?<=[a-z0-9])(?=[A-Z])/)) if (part) words.add(part.toLowerCase());
  }
  return [...words];
}

function nextCodeLine(file, line) {
  for (let i = line; i < file.lines.length && i < line + 2; i++) {
    const text = file.lines[i];
    if (!text.trim()) return null; // a blank line means the comment heads a block, not a line
    if (file.commentLines.has(i + 1)) return null; // multi-line comment: probably explaining
    return { text, line: i + 1 };
  }
  return null;
}
