import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scan } from '../src/index.js';

/** Write a throwaway project from { 'path': 'contents' } and return its folder. */
export function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sloplint-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return dir;
}

/** Scan a fixture and return findings, optionally only for one rule. */
export async function findings(files, rule, opts = {}) {
  const cwd = fixture(files);
  const res = await scan({ cwd, ...opts });
  return rule ? res.findings.filter((f) => f.rule === rule) : res.findings;
}

/** Lines (1-based) flagged by `rule` in a single file. */
export async function flaggedLines(file, content, rule, extra = {}) {
  const res = await findings({ [file]: content, ...extra }, rule);
  return res.filter((f) => f.file === file).map((f) => f.line);
}

export const lines = (...ls) => ls.join('\n');
