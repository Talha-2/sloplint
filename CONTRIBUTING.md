# Contributing

Thanks for helping. The most useful contributions are:

1. **False-positive reports.** If sloplint flags code that is fine, [open an issue](https://github.com/Talha-2/sloplint/issues/new?template=false-positive.yml) with the snippet. Precision matters more than coverage.
2. **New rules** for mistakes reviewers keep catching in AI-written code.
3. **Better wording** in the agent skills (`skills/`).

## Setup

You need Node 22 or newer. There are no dependencies to install.

```bash
git clone https://github.com/Talha-2/sloplint.git
cd sloplint
npm test                 # run the tests
node bin/sloplint.js     # run sloplint on itself
```

## Project layout

```
bin/sloplint.js          command-line entry point
src/
  index.js               scan(): lists files, runs rules, collects findings
  rules/                 one file per rule
  project.js             reads package.json, requirements, tsconfig
  git.js                 --diff and --staged support
  report.js              text, JSON and Markdown output, grades
  init.js                `sloplint init`
  data/                  Python standard library list, pip name mappings
skills/sloplint/         agent skill for writing work
skills/sloplint-review/  agent skill for reviewing a change
skills/sloplint-tests/   agent skill for writing tests that can fail
skills/sloplint-deps/    agent skill for adding packages safely
templates/               files `sloplint init` writes into other repos
action.yml               the GitHub Action
examples/demo/           a sloppy project used for the README output
docs/                    usage and rule reference
test/                    tests, using Node's built-in test runner
```

## Adding a rule

1. Create `src/rules/<rule-id>.js`. It exports an object with:
   - `id`: the rule name, in kebab-case
   - `severity`: `error`, `warn` or `info`
   - `description`: one sentence
   - `appliesTo(file)`: returns true if the rule should run on this file
   - `check(file)`: returns a list of `{ line, message }`
2. Register it in `src/rules/index.js`.
3. Add tests in `test/`. Cover both what the rule should flag **and what it must not flag**.
4. Document it in `docs/rules.md` and add a row to the table in `README.md`.

A rule should flag only things a reviewer can verify. If a rule can't tell for sure, it should stay quiet or use a lower severity.

## Changing the agent skill

The writing skill (`skills/sloplint/SKILL.md`), the review skill (`skills/sloplint-review/SKILL.md`) and the AGENTS.md section (`templates/agents-md-section.md`) use the same nine rules. Keep them in sync. The tests and deps skills expand rules 6 and 1 into full processes, so keep them consistent with those rules too.

New skills go in `skills/<name>/SKILL.md` and must be added to the `SKILLS` list in `src/init.js`. Write in plain language: short sentences, one idea each, and a reason for every rule.

## Pull requests

- Keep each pull request to one change.
- Run `npm test` and `node bin/sloplint.js` before you open it.
- Say what changed, why, and how you checked it.
