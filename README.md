# sloplint

Catch the problems AI-written code ships with, the ones a reviewer can actually check: packages that don't exist, `// ... rest of code` stubs, tests that can't fail, errors swallowed in empty `catch` blocks.

sloplint is three things that work together:

- **A linter** you run locally or in a pre-commit hook: `npx sloplint`
- **A GitHub Action** that reviews the lines each pull request adds and leaves one comment
- **An agent skill** that teaches Claude Code, Codex, Cursor and friends not to write slop in the first place

It is **not an AI detector**. It doesn't guess who wrote the code. Every finding is a concrete problem you'd want fixed whether a person or a model wrote it.

```
$ npx sloplint --online

src/server.js
      2  error  "express-schema-guardian" does not exist on npm: likely hallucinated (slopsquatting risk)  phantom-import
     10  warn   Error is caught and silently discarded  swallowed-error
     11  error  Placeholder instead of real code: "... rest of the handlers"  placeholder-code

tests/server.test.js
      3  warn   Test "creates a user" never asserts anything  hollow-test
      8  error  Assertion compares a constant to itself, so it can never fail  hollow-test

sloplint grade F  3 errors, 2 warnings, 0 info  (2 files, 22 lines, whole project)
```

## Quick start

Needs Node 20+. No install, no config, no dependencies.

### 1. Check your code

```bash
npx sloplint            # the whole project
npx sloplint --diff     # only lines you added since main (what you'll want most days)
npx sloplint src/api    # just a folder
```

Exit code is `1` when there are errors, so it drops straight into scripts and CI.

### 2. Teach your coding agent

```bash
npx sloplint init
```

This writes two files you commit with the repo:

| File | Read by |
|---|---|
| `.claude/skills/sloplint/SKILL.md` | Claude Code (loads the skill when it writes or reviews code) |
| `AGENTS.md` (a marked section, the rest of your file is untouched) | Codex, Cursor, GitHub Copilot, Gemini CLI, Jules, Amp, and other tools that read AGENTS.md |

The rules tell the agent what to avoid and to run `npx sloplint --diff` before it says it's done, so it checks its own work.

To install for every project on your machine instead: `npx sloplint init --global`.

Claude Code users can also install it as a plugin:

```
/plugin marketplace add Talha-2/sloplint
/plugin install sloplint@sloplint
```

### 3. Review every pull request

```bash
npx sloplint init --ci
```

That adds `.github/workflows/sloplint.yml`:

```yaml
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  sloplint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: Talha-2/sloplint@v0
```

On each PR it checks only the lines the PR adds. It posts one summary comment (updated on every push, never duplicated), annotates the lines in the Files tab, and fails the check on errors. On PRs from forks it can't comment, so the report goes to the job summary instead.

| Input | Default | |
|---|---|---|
| `fail-on` | `error` | `error`, `warn`, `info` or `none` |
| `comment` | `true` | post the summary comment |
| `online` | `true` | look up flagged imports on npm / PyPI |
| `base` | PR base branch | ref to diff against |
| `working-directory` | `.` | for monorepos |

Outputs: `grade` (A–F) and `errors`.

## What it catches

| Rule | Severity | Example |
|---|---|---|
| [`phantom-import`](docs/rules.md#phantom-import) | error / warn | `import { x } from 'react-hooks-pro'` when that package isn't declared, installed, or real |
| [`placeholder-code`](docs/rules.md#placeholder-code) | error | `// ... rest of code`, `# implementation goes here`, `// In a real app you would…` |
| [`chat-artifact`](docs/rules.md#chat-artifact) | error | `// Certainly! Here's the updated code`, `I hope this helps` in a README |
| [`hollow-test`](docs/rules.md#hollow-test) | error / warn | `expect(true).toBe(true)`, tests with no assertions, `def test_x(): pass` |
| [`swallowed-error`](docs/rules.md#swallowed-error) | warn | `catch (e) {}`, `except: pass` with no comment saying why |
| [`narrating-comment`](docs/rules.md#narrating-comment) | info | `# Import the os module` above `import os` |
| [`slop-prose`](docs/rules.md#slop-prose) | info | `delve into`, `unlock the full potential`, `in today's fast-paced world` |
| [`emoji-headings`](docs/rules.md#emoji-headings) | info | a README where every heading starts with 🚀 ✨ 📦 |

JavaScript, TypeScript and Python get every rule. Comment and prose rules also cover Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin and Markdown.

### Hallucinated packages are a security problem

Models invent plausible package names. Attackers watch for those names and register them on npm and PyPI. This is called *slopsquatting*: the next person who runs the suggested install gets the attacker's code. `phantom-import` flags imports that aren't declared in your manifest. Severity follows the evidence:

- **installed but undeclared**: warning (it works through a transitive dependency today, and breaks when that changes)
- **not installed anywhere**: error
- with `--online`: **doesn't exist on the registry** is an error, and **exists** shows a note to check it's the package you meant

It understands `package.json` workspaces, tsconfig `paths`/`baseUrl`, Node built-ins, `requirements*.txt`, `pyproject.toml` (PEP 621, Poetry, uv), `setup.py`/`setup.cfg`, Pipfile, conda `environment.yml`, the Python standard library, local modules, packages that install under another name (`Pillow` → `PIL`, `scikit-learn` → `sklearn`), and namespace packages (`livekit-agents` → `livekit`).

## Grades

Each finding costs points: error 10, warning 3, info 1. The total is scaled by lines checked (at least 500, so one nit in a ten-line diff isn't an F):

| Grade | Points per 1,000 lines |
|---|---|
| A | under 5 |
| B | 5 to 15 |
| C | 15 to 30 |
| D | 30 to 60 |
| F | 60 or more |

`npx sloplint --badge` prints a README badge for your current grade.

## Pre-commit hook

```bash
# .git/hooks/pre-commit  (or a husky / lefthook step)
npx --yes sloplint --staged
```

`--staged` checks only the lines you're about to commit.

## Configuration

Optional. Put a `.sloplintrc.json` at the repo root:

```json
{
  "ignore": ["legacy/**", "scripts/*.py"],
  "rules": {
    "narrating-comment": "off",
    "swallowed-error": "error"
  },
  "allowImports": ["virtual:my-plugin", "my-webpack-alias"]
}
```

- `ignore`: globs added to the defaults (`node_modules`, `dist`, `build`, `vendor`, virtualenvs, minified and generated files are always skipped, as is anything in `.gitignore`)
- `rules`: set any rule to `off`, `info`, `warn` or `error`
- `allowImports`: module names to accept without a manifest entry (bundler aliases, virtual modules)

### Silencing one finding

```js
} catch {} // sloplint-ignore-line

// sloplint-ignore-next-line
import thing from 'resolved-by-a-custom-loader';
```

Put `sloplint-ignore-file` in the first ten lines to skip a whole file. For `swallowed-error`, a comment of three or more words inside the empty block counts as the explanation, so you won't need an ignore comment.

## CLI reference

```
sloplint [paths...]       check the project, or only these paths
  --diff                  only lines added since the merge-base with the default branch
  --base <ref>            diff against <ref> instead (implies --diff)
  --staged                only staged lines
  --online                look up flagged imports on npm / PyPI
  --format <fmt>          text | json | markdown
  --output <file>         write the report to a file
  --fail-on <level>       error (default) | warn | info | none
  --config <file>         config path (default .sloplintrc.json)
  --badge                 print a badge for the current grade
sloplint init             install the agent rules (--global, --ci, --no-claude, --no-agents-md)
sloplint rules            list the rules
```

There's also a JS API: `import { scan } from 'sloplint'`.

## How it stays quiet

A linter that cries wolf gets uninstalled, so every rule leans toward silence:

- An **error** needs evidence: a package that's neither declared nor installed, a placeholder phrase, an assertion that compares a constant to itself.
- When sloplint can't tell (no manifest, no `node_modules`), it says nothing or downgrades to a warning.
- Prose rules skip code blocks and inline code, so docs that *quote* bad examples don't trip them.
- `--diff` only judges what you changed, so turning it on in an old repo doesn't bury you.

Found a false positive? [Open an issue](https://github.com/Talha-2/sloplint/issues) with the snippet. Those are the most useful bug reports this project gets.

## Contributing

Each rule is one file in [`src/rules/`](src/rules) exporting `{ id, severity, description, appliesTo, check }`, plus tests in [`test/`](test) covering both what it flags and what it must not flag. `npm test` runs everything with Node's built-in test runner. There are no dependencies to install.

Ideas on the roadmap:

- a public benchmark: the same coding tasks given to each major model, with and without the skill, scored by sloplint
- `phantom-call`: calls to functions and methods that don't exist in the codebase
- more languages for `phantom-import` (Go modules, Cargo, Maven)

## License

MIT
