# Rules

Each rule targets something a reviewer can verify. Set any rule's level in `.sloplintrc.json` (`"off"`, `"info"`, `"warn"`, `"error"`), or silence a single line with `sloplint-ignore-line`.

## phantom-import

**Imports a package the project doesn't declare.** Languages: JavaScript, TypeScript, Python.

Models often invent package names that sound right. Sometimes the package doesn't exist. Sometimes it exists but belongs to someone else, because attackers register commonly hallucinated names ("slopsquatting"). Either way the import shouldn't land without a manifest entry.

| Situation | Severity |
|---|---|
| Not declared, but found in `node_modules` / the project virtualenv (a transitive dependency) | warn |
| Not declared, nothing installed to compare against | warn |
| Not declared and not installed | error |
| With `--online`: no such package on npm / PyPI | error |

Counted as declared: Node built-ins, the Python standard library, every dependency field of every `package.json` from the file up to the repo root, workspace package names, tsconfig/jsconfig `paths` and `baseUrl`, `requirements*.txt` / `.in`, `pyproject.toml`, `setup.py`, `setup.cfg`, `Pipfile`, `environment.yml`, local Python modules, and anything in `allowImports`. It also covers distributions that install under another name (`Pillow` → `PIL`) and namespace families (`google-cloud-storage` → `google`). Optional imports inside `try: … except ImportError:` are skipped.

Fix: add the package to the manifest if it's the one you meant, or replace the import with a real package.

## placeholder-code

**A comment standing in for code that was never written.**

```js
function handler(req) {
  validate(req);
  // ... rest of the logic
}
```

Flags phrases like `... rest of code`, `existing code here`, `your code here`, `implementation goes here`, bare `TODO: implement`, `same as above`, and "in a real app you would…" or "for brevity we skip…" disclaimers. A TODO that names what's missing and why (`TODO: retry once the API sends Retry-After`) is not flagged.

Fix: write the code, or say in the PR what is deliberately left out.

## chat-artifact

**Chatbot reply text pasted into a file.** Checks comments and Markdown prose, not string literals, so a chatbot UI's own strings are safe.

`Certainly! Here's the updated code`, `As an AI language model`, `I hope this helps`, `Let me know if you need`, `as of my last knowledge update`.

Fix: delete it. That text was meant for the chat window.

## hollow-test

**A test that can't fail.** Runs on test files only (`*.test.*`, `*.spec.*`, `test_*.py`, `*_test.py`, files under `tests/` or `__tests__/`).

- error: an assertion comparing a constant to itself: `expect(true).toBe(true)`, `assert True`, `self.assertEqual(1, 1)`
- warn: a test body with no assertion at all, or an empty one

Counted as assertions: `expect`, `assert*`, `should`, `t.is` and friends, `pytest.raises`, Testing Library `getBy*` / `findBy*` queries (they throw when nothing matches), and helpers named `check*` / `verify*` / `expect*` / `assert*`.

Fix: assert on behaviour that would break if the implementation were wrong.

## swallowed-error

**An error caught and thrown away with no explanation.**

- warn: an empty `catch {}` block, `except: pass`, `except Exception: pass`
- info: a specific exception type passed silently (`except KeyError: pass`), or a promise chain ending in `.catch(() => {})`

Not flagged: `.catch(() => null)` (a deliberate fallback value), or any empty block holding a comment of three or more words that says why ignoring is safe:

```js
try { fs.unlinkSync(tmp) } catch { /* already gone is fine */ }
```

Fix: handle it, rethrow it with context, or write the one-line reason.

## narrating-comment

**A comment that restates the line below it.** Severity: info.

```python
# Import the os module
import os
```

To keep false positives near zero, it fires only when the comment starts with a verb visible in the code (import, return, increment, loop, initialize, create…), has 8 words or fewer, and every other meaningful word is an identifier on that line. Comments mentioning reasons ("because", "otherwise", "workaround", numbers, links) are never flagged. Test files are skipped.

Fix: delete it, or replace it with why the line exists.

## slop-prose

**Stock filler phrases in docs and comments.** Severity: info.

Flags `delve into`, `rich tapestry`, `in today's fast-paced world`, `it's important to note`, `unlock the full potential`, `elevate your`, `seamlessly integrates`, `a testament to`, `navigate the complexities`, `plays a crucial role`, and similar. Single words like "robust" are not flagged on their own. Code blocks and inline code are skipped.

Fix: replace the phrase with the specific fact, or cut it.

## emoji-headings

**A Markdown file where at least three headings, and at least half of all headings, start with an emoji.** Severity: info. One decorative emoji is a choice; a column of 🚀 ✨ 📦 🤝 is a template.
