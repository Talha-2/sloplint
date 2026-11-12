<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo-light.svg" alt="sloplint" width="360">
  </picture>
</p>

<p align="center">
  Catch the problems AI-written code ships with, before they reach review.
</p>

<p align="center">
  <a href="https://github.com/Talha-2/sloplint/actions/workflows/ci.yml"><img src="https://github.com/Talha-2/sloplint/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="zero dependencies">
</p>

---

sloplint finds the mistakes reviewers keep catching in AI-written code: packages that don't exist, `// ... rest of code` stubs, tests that can't fail, and errors swallowed by empty `catch` blocks.

It's not an AI detector. Every finding is a real problem, whoever wrote the code.

```
$ npx sloplint --online

src/server.js
      2  error  "express-schema-guardian" does not exist on npm: likely hallucinated (slopsquatting risk)  phantom-import
     10  warn   Error is caught and silently discarded  swallowed-error
     11  error  Placeholder instead of real code: "... rest of the handlers"  placeholder-code

tests/server.test.js
      4  error  Assertion compares a constant to itself, so it can never fail  hollow-test

sloplint grade F  3 errors, 1 warning, 0 info  (2 files, 18 lines, whole project)
```

This output comes from [`examples/demo`](examples/demo). Run it there to see it yourself.

## Get started

**Check your code.** No install, no config.

```bash
npx sloplint          # whole project
npx sloplint --diff   # only what you changed
```

**Teach your coding agent.** Adds the rules for Claude Code, Codex, Cursor, Copilot and other agents, so they check their own work.

```bash
npx sloplint init
```

**Review every pull request.** Adds a GitHub Action that comments on each PR.

```bash
npx sloplint init --ci
```

## What it catches

| Rule | Catches |
|---|---|
| `phantom-import` | Packages that aren't declared, installed, or real |
| `placeholder-code` | `// ... rest of code`, `implementation goes here` |
| `chat-artifact` | `Certainly! Here's the updated code` left in files |
| `hollow-test` | Tests with no assertions, or `expect(true).toBe(true)` |
| `swallowed-error` | Empty `catch {}` and `except: pass` with no reason given |
| `narrating-comment` | Comments that repeat the next line of code |
| `slop-prose` | Filler like `delve into` and `unlock the full potential` |
| `emoji-headings` | READMEs with an emoji on every heading |

Works on JavaScript, TypeScript and Python. The comment and prose rules also cover Go, Rust, Java, C#, Ruby, PHP, Swift, Kotlin and Markdown.

## Docs

- [Usage](docs/usage.md): CLI options, GitHub Action, configuration, pre-commit hook
- [Rules](docs/rules.md): what each rule flags and how to fix it
- [Agent skill](skills/sloplint/SKILL.md): the rules your coding agent follows

## Contributing

Each rule is one file with its own tests, and there's nothing to install. See [CONTRIBUTING.md](CONTRIBUTING.md). False-positive reports are especially welcome.

## License

[MIT](LICENSE)
