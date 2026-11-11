// "## 🚀 Features / ## 📦 Installation / ## 🤝 Contributing" — one emoji is a choice, a column of them is a template.
const EMOJI_HEADING = /^#{1,6}\s+(?:\p{Extended_Pictographic}|\p{Regional_Indicator})/u;
const MIN_HEADINGS = 3;

export default {
  id: 'emoji-headings',
  severity: 'info',
  description: 'Markdown files where most headings start with an emoji.',
  appliesTo: (file) => file.lang === 'md',
  check(file) {
    const headings = [];
    file.proseLines.forEach((line, i) => {
      if (/^#{1,6}\s/.test(line)) headings.push({ line: i + 1, emoji: EMOJI_HEADING.test(line) });
    });
    const withEmoji = headings.filter((h) => h.emoji);
    if (withEmoji.length < MIN_HEADINGS || withEmoji.length / headings.length < 0.5) return [];
    return [
      {
        line: withEmoji[0].line,
        message: `${withEmoji.length} of ${headings.length} headings start with an emoji`,
      },
    ];
  },
};
