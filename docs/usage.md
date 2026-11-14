# Usage

## Command line

```
sloplint [paths...]       check the project, or only these paths
  --diff                  only lines added since the merge-base with the default branch
  --base <ref>            diff against <ref> instead (implies --diff)
  --staged                only staged lines (for pre-commit hooks)
  --online                look up flagged imports on npm / PyPI
  --format <fmt>          text | json | markdown
  --output <file>         write the report to a file
  --fail-on <level>       error (default) | warn | info | none
  --config <file>         config path (default .sloplintrc.json)
  --badge                 print a README badge for the current grade
sloplint init             install the agent rules
  --global                for every project (~/.claude/skills, ~/.codex/AGENTS.md)
  --ci                    also add .github/workflows/sloplint.yml
  --no-claude             skip the Claude Code skills
  --no-agents-md          skip the AGENTS.md section
sloplint rules            list the rules
```

The exit code is `1` when findings reach `--fail-on`, and `2` on a usage error. There's also a JS API: `import { scan } from 'sloplint'`.

## Agent rules

`npx sloplint-cli init` writes:

| File | Read by |
|---|---|
| `.claude/skills/<skill>/` | Claude Code |
| `.agents/skills/<skill>/` | Codex |
| a marked section in `AGENTS.md` (the rest of the file is untouched) | Codex, Cursor, GitHub Copilot, Gemini CLI, Jules, Amp |

The four skills are `sloplint` (writing code, tests and docs), `sloplint-review` (reviewing a change, including the agent's own work), `sloplint-tests` (writing tests that can fail) and `sloplint-deps` (checking a package before adding it).

Running `init` again updates everything in place. The skill folders are replaced whole, so don't keep your own edits inside them. Use `--no-claude`, `--no-codex` or `--no-agents-md` to skip a target. Claude Code users can also install the skill as a plugin:

```
/plugin marketplace add Talha-2/sloplint
/plugin install sloplint@sloplint
```

## GitHub Action

```yaml
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  sloplint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: Talha-2/sloplint@v0
```

It checks only the lines the PR adds, keeps one summary comment up to date, annotates lines in the Files tab, and fails the check on errors. On PRs from forks it can't comment, so the report goes to the job summary instead.

| Input | Default | |
|---|---|---|
| `fail-on` | `error` | `error`, `warn`, `info` or `none` |
| `comment` | `true` | post the summary comment |
| `online` | `true` | look up flagged imports on npm / PyPI |
| `base` | PR base branch | ref to diff against |
| `working-directory` | `.` | for monorepos |

Outputs: `grade` (A–F) and `errors`.

## Pre-commit hook

```bash
# .git/hooks/pre-commit, or a husky / lefthook step
npx --yes sloplint --staged
```

## Configuration

Optional `.sloplintrc.json` at the repo root:

```json
{
  "ignore": ["legacy/**", "scripts/*.py"],
  "rules": { "narrating-comment": "off", "swallowed-error": "error" },
  "allowImports": ["virtual:my-plugin", "my-webpack-alias"]
}
```

- `ignore`: globs on top of the defaults. `node_modules`, build output, `vendor`, virtualenvs, minified and generated files, and anything in `.gitignore` are always skipped.
- `rules`: set any rule to `off`, `info`, `warn` or `error`.
- `allowImports`: module names to accept without a manifest entry, such as bundler aliases.

To silence one finding, add `sloplint-ignore-line` on the line, or `sloplint-ignore-next-line` above it. Put `sloplint-ignore-file` in a file's first ten lines to skip it.

## Grades

Each finding costs points (error 10, warning 3, info 1), scaled per 1,000 lines checked. At least 500 lines are assumed, so one nit in a small diff isn't an F.

| A | B | C | D | F |
|---|---|---|---|---|
| < 5 | < 15 | < 30 | < 60 | 60+ |

## Precision

A linter that cries wolf gets uninstalled, so sloplint leans toward silence. An error needs evidence: a package that is neither declared nor installed, a placeholder phrase, an assertion that compares a constant to itself. When it can't tell, it stays quiet or reports a warning. Prose rules skip code blocks, so docs that quote bad examples don't trip them.

`phantom-import` understands npm workspaces, tsconfig `paths`/`baseUrl`, Node built-ins, `requirements*.txt`, `pyproject.toml` (PEP 621, Poetry, uv), `setup.py`/`setup.cfg`, Pipfile, conda `environment.yml`, the Python standard library, packages that install under another name (`Pillow` → `PIL`), and namespace packages (`google-cloud-storage` → `google`).

Found a false positive? [Open an issue](https://github.com/Talha-2/sloplint/issues) with the snippet.
