// sloplint-ignore-file -- this file defines the phrases it detects.

// Text that only appears when a chat reply was pasted into a file.
const PATTERNS = [
  /\bas an AI(?: language model)?\b/i,
  /\bas of my (?:last|latest) (?:knowledge )?(?:update|training)/i,
  /\bmy knowledge cutoff\b/i,
  /\bI hope this helps\b/i,
  /^\W*(?:certainly|sure|absolutely|of course)[!,.]\s+here(?:'s| is| are)\b/i,
  /\bhere(?:'s| is) the (?:updated|revised|modified|complete|corrected|refactored) (?:code|version|file|implementation)\b/i,
  /\blet me know if you(?:'d)? (?:need|have|want|would like)\b/i,
  /\bfeel free to (?:ask|reach out|let me know)\b/i,
  /\bI (?:cannot|can't|am unable to) (?:browse|access the internet|run code)\b/i,
  /\bgreat question\b/i,
];

export default {
  id: 'chat-artifact',
  severity: 'error',
  description: 'Leftover chatbot phrasing pasted into code, comments or docs.',
  appliesTo: () => true,
  check(file) {
    const found = [];
    file.proseLines.forEach((line, i) => {
      for (const re of PATTERNS) {
        const m = re.exec(line);
        if (m) {
          found.push({ line: i + 1, message: `Chat reply text left in the file: "${m[0].trim()}"` });
          break;
        }
      }
    });
    return found;
  },
};
