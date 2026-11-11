// Opt-in (--online): ask npm / PyPI whether a flagged import exists at all.
// A package that doesn't exist is almost certainly hallucinated, and is a
// slopsquatting risk: anyone can register that name and ship code to you.

const TIMEOUT_MS = 5000;
const CONCURRENCY = 8;

const URLS = {
  npm: (name) => `https://registry.npmjs.org/${name.replace('/', '%2F')}`,
  pypi: (name) => `https://pypi.org/pypi/${encodeURIComponent(name)}/json`,
};

export async function verifyPackages(findings) {
  const targets = findings.filter((f) => f.rule === 'phantom-import' && f.pkg && URLS[f.ecosystem]);
  const keys = [...new Set(targets.map((f) => `${f.ecosystem}:${f.pkg}`))];
  const status = new Map();
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, keys.length) }, async () => {
      while (i < keys.length) {
        const key = keys[i++];
        const [eco, ...rest] = key.split(':');
        status.set(key, await exists(eco, rest.join(':')));
      }
    }),
  );
  for (const f of targets) {
    const s = status.get(`${f.ecosystem}:${f.pkg}`);
    const where = f.ecosystem === 'npm' ? 'npm' : 'PyPI';
    if (s === false) {
      f.message =
        f.ecosystem === 'npm'
          ? `"${f.pkg}" does not exist on npm: likely hallucinated (slopsquatting risk)`
          : `No PyPI project named "${f.pkg}" and it isn't declared: likely hallucinated, unless it installs under another name`;
      f.verified = 'missing';
      f.severity = 'error';
    } else if (s === true) {
      const manifest = f.ecosystem === 'npm' ? 'package.json' : 'requirements/pyproject';
      f.message =
        f.severity === 'error'
          ? `"${f.pkg}" is not declared in ${manifest} or installed. A package by that name exists on ${where}: check it's the one you meant before adding it`
          : `${f.message} (it exists on ${where})`;
      f.verified = 'exists';
    }
  }
}

async function exists(ecosystem, name) {
  try {
    const res = await fetch(URLS[ecosystem](name), {
      method: ecosystem === 'npm' ? 'HEAD' : 'GET',
      headers: { 'user-agent': 'sloplint' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 404) return false;
    if (res.ok) return true;
    return null;
  } catch {
    return null; // offline or timed out: say nothing rather than guess
  }
}
