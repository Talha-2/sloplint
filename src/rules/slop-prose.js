// sloplint-ignore-file -- this file defines the phrases it detects.

// Stock phrases that make docs and comments read as generated filler.
// Kept to phrases that rarely carry meaning; plain words like "robust" alone are not flagged.
const PHRASES = [
  /\bdelv(?:e|es|ing)\s+(?:into|deeper)\b/i,
  /\b(?:rich|vibrant|intricate) tapestry\b/i,
  /\bin today'?s (?:fast-paced|digital|ever-changing|ever-evolving|rapidly evolving|modern) (?:world|landscape|age|era)\b/i,
  /\bever-(?:evolving|changing) landscape\b/i,
  /\bit(?:'s| is) (?:important|worth|crucial) (?:to note|noting|to remember|to mention)\b/i,
  /\b(?:unlock|unleash|harness) the (?:full )?(?:power|potential)\b/i,
  /\b(?:elevate|supercharge|turbocharge|revolutionize) your\b/i,
  /\b(?:a|is a) game[- ]changer\b/i,
  /\bseamless(?:ly)? integrat(?:es?|ion|ing)\b/i,
  /\bembark on (?:a|an|your|this)\b/i,
  /\b(?:stands as )?a testament to\b/i,
  /\bnavigat(?:e|ing) the (?:complexities|intricacies)\b/i,
  /\blook no further\b/i,
  /\bwhether you(?:'re| are) an? [\w\s-]{2,30} or an? \b/i,
  /\bin the (?:realm|world) of\b/i,
  /\bplays? a (?:crucial|pivotal|vital) role\b/i,
  /\bfast-paced world\b/i,
  /\b(?:robust|powerful),? (?:and )?(?:scalable|flexible|intuitive) (?:solution|framework|platform|tool)\b/i,
  /\bboasts? (?:a|an) (?:wide|rich|robust|impressive)\b/i,
  /\bcomprehensive (?:suite|solution) (?:of|for)\b/i,
  /\bbuilt with ❤️/i,
];

export default {
  id: 'slop-prose',
  severity: 'info',
  description: 'Stock filler phrases in docs and comments ("delve into", "unlock the power", "in today\'s fast-paced world").',
  appliesTo: () => true,
  check(file) {
    const found = [];
    file.proseLines.forEach((line, i) => {
      for (const re of PHRASES) {
        const m = re.exec(line);
        if (m) {
          found.push({ line: i + 1, message: `Filler phrase: "${m[0].trim()}"` });
          break;
        }
      }
    });
    return found;
  },
};
