#!/usr/bin/env node
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { scan, RULES } from '../src/index.js';
import { formatText, formatJson, formatMarkdown, summarize, badgeUrl } from '../src/report.js';
import { runInit } from '../src/init.js';

const VERSION = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const HELP = `sloplint ${VERSION}: catch the checkable problems AI-written code ships with.

Usage
  sloplint [paths...]          check the whole project (or just these paths)
  sloplint --diff              check only lines you added since the default branch
  sloplint --staged            check only staged lines (pre-commit hook)
  sloplint init                teach your coding agents the rules (Claude Code, Codex, Cursor...)
  sloplint init --ci           ...and add a GitHub Action that reviews every PR
  sloplint rules               list the rules

Options
  --diff                 only lines added since the merge-base with the default branch
  --base <ref>           compare against <ref> instead (implies --diff)
  --staged               only lines in the git index
  --online               look up flagged imports on npm / PyPI (are they real?)
  --format <fmt>         text (default) | json | markdown
  --output <file>        write the report to a file instead of stdout
  --fail-on <level>      exit 1 at this severity or worse: error (default) | warn | info | none
  --config <file>        config file (default: .sloplintrc.json)
  --badge                print a README badge for the current grade
  --no-color             plain output
  -v, --version
  -h, --help

Init options
  --global               install for every project (~/.claude/skills, ~/.codex/AGENTS.md)
  --ci                   add .github/workflows/sloplint.yml
  --no-claude            skip the Claude Code skill
  --no-agents-md         skip the AGENTS.md section (Codex, Cursor, Copilot, Gemini CLI...)

Docs: https://github.com/Talha-2/sloplint`;

const LEVELS = { none: 99, error: 3, warn: 2, info: 1 };
const RANK = { error: 3, warn: 2, info: 1 };

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      diff: { type: 'boolean' },
      base: { type: 'string' },
      staged: { type: 'boolean' },
      online: { type: 'boolean' },
      format: { type: 'string', default: 'text' },
      output: { type: 'string', short: 'o' },
      'fail-on': { type: 'string', default: 'error' },
      config: { type: 'string', short: 'c' },
      badge: { type: 'boolean' },
      color: { type: 'boolean' },
      'no-color': { type: 'boolean' },
      global: { type: 'boolean' },
      ci: { type: 'boolean' },
      'no-claude': { type: 'boolean' },
      'no-agents-md': { type: 'boolean' },
      force: { type: 'boolean' },
      'from-json': { type: 'string' },
      version: { type: 'boolean', short: 'v' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) return print(HELP), 0;
  if (values.version) return print(VERSION), 0;

  const [command, ...rest] = positionals;
  if (command === 'init') {
    runInit({
      cwd: process.cwd(),
      global: values.global,
      ci: values.ci,
      claude: !values['no-claude'],
      agentsMd: !values['no-agents-md'],
      force: values.force,
      log: print,
    });
    return 0;
  }
  if (command === 'rules') {
    const w = Math.max(...RULES.map((r) => r.id.length));
    for (const r of RULES) print(`${r.id.padEnd(w)}  ${r.severity.padEnd(5)}  ${r.description}`);
    return 0;
  }
  const paths = command === 'check' ? rest : positionals;

  if (!(values['fail-on'] in LEVELS)) throw usage(`--fail-on must be one of: ${Object.keys(LEVELS).join(', ')}`);
  if (!['text', 'json', 'markdown', 'md'].includes(values.format)) throw usage('--format must be text, json or markdown');

  // --from-json re-renders an earlier --format json result (used by the GitHub Action).
  const result = values['from-json']
    ? JSON.parse(fs.readFileSync(values['from-json'], 'utf8'))
    : await scan({
        cwd: process.cwd(),
        paths,
        diff: values.base ?? values.diff ?? false,
        staged: values.staged,
        online: values.online,
        configPath: values.config,
      });
  const summary = summarize(result);

  if (values.badge) {
    print(`[![sloplint](${badgeUrl(summary.grade)})](https://github.com/Talha-2/sloplint)`);
    return 0;
  }

  const useColor =
    !values['no-color'] && !values.output && (values.color || (process.stdout.isTTY && !process.env.NO_COLOR));
  const report =
    values.format === 'json'
      ? formatJson(result)
      : values.format === 'markdown' || values.format === 'md'
        ? formatMarkdown(result, { linkBase: githubLinkBase() })
        : formatText(result, { color: useColor });

  if (values.output) fs.writeFileSync(values.output, report + '\n');
  else print(report);

  const threshold = LEVELS[values['fail-on']];
  return result.findings.some((f) => RANK[f.severity] >= threshold) ? 1 : 0;
}

// In GitHub Actions, link findings to the PR head commit.
function githubLinkBase() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, SLOPLINT_HEAD_SHA, GITHUB_SHA } = process.env;
  const sha = SLOPLINT_HEAD_SHA || GITHUB_SHA;
  if (!GITHUB_REPOSITORY || !sha) return undefined;
  return `${GITHUB_SERVER_URL || 'https://github.com'}/${GITHUB_REPOSITORY}/blob/${sha}`;
}

function print(s) {
  process.stdout.write(s + '\n');
}

function usage(msg) {
  const e = new Error(msg);
  e.usage = true;
  return e;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    process.stderr.write(`sloplint: ${err.message}\n${err.usage ? 'Run sloplint --help for usage.\n' : ''}`);
    process.exitCode = 2;
  },
);
