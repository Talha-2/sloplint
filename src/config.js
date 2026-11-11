import fs from 'node:fs';
import path from 'node:path';

export const CONFIG_FILES = ['.sloplintrc.json', '.sloplintrc', 'sloplint.config.json'];

// Never worth scanning: dependencies, build output, generated and minified files.
export const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.svelte-kit/**',
  '**/coverage/**',
  '**/vendor/**',
  '**/third_party/**',
  '**/.venv/**',
  '**/venv/**',
  '**/env/**',
  '**/__pycache__/**',
  '**/site-packages/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.generated.*',
  '**/*.d.ts',
  '**/CHANGELOG.md',
  '**/LICENSE*',
];

export function loadConfig(cwd, explicitPath) {
  const candidates = explicitPath ? [explicitPath] : CONFIG_FILES;
  for (const name of candidates) {
    const file = path.resolve(cwd, name);
    if (!fs.existsSync(file)) continue;
    try {
      return { ...JSON.parse(fs.readFileSync(file, 'utf8')), _file: file };
    } catch (err) {
      throw new Error(`Could not parse ${file}: ${err.message}`);
    }
  }
  if (explicitPath) throw new Error(`Config file not found: ${explicitPath}`);
  return {};
}

/** Minimal glob -> RegExp: `**`, `*`, `?`. Patterns without a slash match any basename. */
export function globToRegExp(glob) {
  let g = glob.replace(/\\/g, '/');
  if (!g.includes('/')) g = `**/${g}`;
  if (g.endsWith('/')) g += '**';
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      if (g[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re.replace(/^\(\?:\.\*\/\)\?/, '(?:.*/)?')}$`);
}

export function makeIgnore(config) {
  const res = [...DEFAULT_IGNORE, ...(config.ignore ?? [])].map(globToRegExp);
  return (file) => res.some((re) => re.test(file));
}
