import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PKG_ROOT = new URL('..', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, PKG_ROOT), 'utf8');

const START = '<!-- sloplint:start -->';
const END = '<!-- sloplint:end -->';

/**
 * Install sloplint's rules where coding agents will read them.
 *  - Claude Code: .claude/skills/<name>/ for each skill (loaded on demand)
 *  - Codex:       .agents/skills/<name>/ for each skill (project only)
 *  - AGENTS.md:   a short always-on section (Codex, Cursor, Copilot, Gemini CLI, Jules, Amp...)
 *  - --ci:        .github/workflows/sloplint.yml
 */
export const SKILLS = ['sloplint', 'sloplint-review', 'sloplint-tests', 'sloplint-deps'];

export function runInit({ cwd, global = false, ci = false, claude = true, codex = true, agentsMd = true, force = false, log = console.log }) {
  const home = os.homedir();
  const done = [];

  if (claude) {
    const base = global ? path.join(home, '.claude', 'skills') : path.join(cwd, '.claude', 'skills');
    installSkills(base);
    done.push(['Claude Code skills', base]);
  }

  if (codex) {
    if (global) {
      log('Codex skills are installed per project: run `npx sloplint-cli init` inside a repo.');
    } else {
      const base = path.join(cwd, '.agents', 'skills');
      installSkills(base);
      done.push(['Codex skills', base]);
    }
  }

  if (agentsMd) {
    const file = global ? path.join(home, '.codex', 'AGENTS.md') : path.join(cwd, 'AGENTS.md');
    const section = `${START}\n${read('templates/agents-md-section.md').trim()}\n${END}`;
    upsertSection(file, section);
    done.push(['AGENTS.md rules', file]);
  }

  if (ci) {
    if (global) {
      log('Skipping --ci with --global: workflows live in a repository.');
    } else {
      const file = path.join(cwd, '.github', 'workflows', 'sloplint.yml');
      if (fs.existsSync(file) && !force) {
        log(`Kept existing ${rel(cwd, file)} (use --force to overwrite).`);
      } else {
        write(file, read('templates/github-workflow.yml'), { force: true });
        done.push(['GitHub Action', file]);
      }
    }
  }

  for (const [what, file] of done) log(`  ✓ ${what.padEnd(20)} ${global ? file : rel(cwd, file)}`);
  log('');
  if (!global) {
    log('Next:');
    log('  • Commit these files so everyone on the repo (and their agents) gets them.');
    if (!ci) log('  • Add PR reviews with:  npx sloplint-cli init --ci');
    log('  • Check your own changes any time:  npx sloplint-cli --diff');
  }
}

// Each skill folder is managed by sloplint: replace it whole, so files removed
// in a newer version don't linger and links between files stay valid.
function installSkills(base) {
  for (const name of SKILLS) {
    const dest = path.join(base, name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(new URL(`skills/${name}/`, PKG_ROOT), dest, { recursive: true });
  }
}

function write(file, content, { force }) {
  if (fs.existsSync(file) && !force) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Replace our marked section in place, or append it; never touch the rest of the file.
export function upsertSection(file, section) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  if (s >= 0 && e > s) {
    text = text.slice(0, s) + section + text.slice(e + END.length);
  } else {
    text = text ? `${text.replace(/\s*$/, '')}\n\n${section}\n` : `${section}\n`;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

function rel(cwd, file) {
  return path.relative(cwd, file).replace(/\\/g, '/');
}
