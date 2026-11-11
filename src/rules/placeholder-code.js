// sloplint-ignore-file -- this file defines the phrases it detects.

// Comments that stand in for code the model never wrote.
const PATTERNS = [
  /^\.{3}\s*(?:rest|remainder) of\b/i,
  /^\.{3}\s*(?:existing|previous|other|same|more|remaining) (?:code|logic|implementation|methods|functions|imports|fields|props)\b/i,
  /^(?:rest|remainder) of (?:the )?(?:code|implementation|function|file|logic|class|component) (?:goes here|remains|unchanged|as before|stays the same)/i,
  /^(?:existing|previous|other) (?:code|logic|implementation) (?:here|unchanged|remains|goes here|as before)\b/i,
  /^(?:your|add your|insert your|put your) (?:own )?(?:code|logic|implementation)(?: \w+){0,3} here\b/i,
  /^(?:add|insert|put|write) (?:your |the |more )?(?:[\w-]+ ){0,3}(?:code|logic|implementation|handling) here\b/i,
  /^(?:implementation|logic|code) (?:goes|would go|here)\b/i,
  /^(?:todo|fixme)\b[:\s-]*(?:implement|add implementation|implement (?:this|me|the logic|logic|later))\s*\.?$/i,
  /^(?:same as|similar to) (?:above|before|the previous)\b\s*\.?$/i,
  /^\.{3}\s*$/,
  /^(?:simplified|placeholder|dummy|mock) (?:implementation|logic|version)(?: for (?:now|demo|demonstration|brevity))?\b/i,
  /^(?:in a real|in production,? you would|for brevity|for simplicity,? (?:we|this) (?:skip|omit|return|assume))/i,
];

export default {
  id: 'placeholder-code',
  severity: 'error',
  description: 'Comments that stand in for code that was never written ("... rest of code", "implementation goes here").',
  appliesTo: (file) => file.lang && file.lang !== 'md',
  check(file) {
    const found = [];
    for (const c of file.comments) {
      const text = c.text.replace(/^[*\s]+/, '');
      if (PATTERNS.some((re) => re.test(text))) {
        found.push({ line: c.line, message: `Placeholder instead of real code: "${truncate(text)}"` });
      }
    }
    return found;
  },
};

function truncate(s, n = 60) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
