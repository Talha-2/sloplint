---
name: sloplint
description: Rules for writing code, tests, comments, docs, commit messages and PR descriptions that a careful senior engineer would sign off on, without the usual AI-slop failure modes (hallucinated packages, placeholder code, tests that can't fail, swallowed errors, narrating comments, filler prose). Use whenever you write or review code, tests, READMEs, commits or PRs, and before you say a task is done.
---

# sloplint: ship work you could defend line by line

Slop is output that looks finished but isn't: it compiles, it reads confidently, and it falls apart on first contact with a reviewer. Every rule below targets something a reviewer can **check**, not a style preference.

## Before you say "done"

1. If the project has Node available, run `npx sloplint --diff` and fix every **error**. Fix warnings unless you can say why they're wrong. If a finding is a false positive, add `// sloplint-ignore-line` (or `# sloplint-ignore-line`) with a short reason.
2. Run the project's real tests, linter and type checker. Report what you ran and what it printed. Never write "all tests pass" unless you ran them in this session and saw them pass.
3. Re-read your diff as a reviewer. Delete anything you can't justify.

## Code

**Only import what exists.** Before adding an import, confirm the package is in `package.json` / `requirements.txt` / `pyproject.toml`, or add it there in the same change. Never guess a package name from what it "should" be called: look it up (`npm view <name>`, `pip index versions <name>`). A hallucinated package name is a security hole: attackers register those names ("slopsquatting").

**Only call what exists.** Before calling a function, method, API endpoint, CLI flag or config key, find its definition in the codebase or its docs. If you can't find it, say so; don't invent a plausible signature.

**Write the whole thing.** Never leave `// ... rest of code`, `// existing code here`, `# implementation goes here`, `pass  # TODO`, or "simplified for brevity" stubs. If something is genuinely out of scope, say so in your reply and leave a TODO that names the missing behaviour and why it's missing.

**Don't swallow errors.** No empty `catch {}`, no `except: pass`, no `.catch(() => {})`. Either handle the error (retry, fall back, return a typed error), add context and rethrow, or let it propagate. If ignoring it is correct, write one comment saying why.

**Don't add speculative machinery.** No abstraction with one implementation, no config option nobody asked for, no "manager"/"helper"/"utils" class wrapping two functions, no defensive checks for states the types already rule out. Match the patterns already in the codebase rather than introducing new ones.

**Keep the diff to the task.** No drive-by renames, reformatting or "improvements" to unrelated code. Unrelated changes hide the real change and make review slower.

## Comments

Comments explain **why**, never **what**. The code already says what.

```python
# Bad: restates the code
# Increment the retry counter
retries += 1

# Good: explains a decision a reader would question
# The upstream API rate-limits per minute, so back off a full minute, not exponentially.
time.sleep(60)
```

- Don't write a docstring that repeats the function name ("`get_user`: Gets the user.").
- Don't leave notes addressed to the user ("Here's the updated function", "Note: you may need to…"). That belongs in your reply, not the file.
- Don't mark changes in comments (`// CHANGED:`, `// NEW:`, `// Fixed bug here`). Version control already records that.

## Tests

A test that cannot fail is worse than no test, because it's false evidence.

- Every test must assert on behaviour that would break if the code were wrong. Before you finish, ask: "if I deleted the implementation, would this test fail?"
- Never `expect(true).toBe(true)`, `assert True`, or assert a value against itself.
- Don't mock the unit under test. Mock its boundaries (network, clock, filesystem), then assert on its output.
- Don't weaken or delete a failing test to make it pass. A failing test means the code or the test is wrong; find out which and say so.
- Cover the edge cases the change introduces (empty input, error path, boundary values), not only the happy path.

## Docs, READMEs, commits, PRs

Write like an engineer briefing a colleague: specific, short, verifiable.

- **No filler.** Cut `delve into`, `unlock the power of`, `seamlessly integrates`, `in today's fast-paced world`, `it's important to note`, `robust and scalable solution`, `a testament to`. Replace each with the concrete fact, or delete it.
- **No template decoration.** Don't put an emoji at the start of every heading (`## 🚀 Features`, `## 📦 Installation`), and don't add a "Features" list that restates the description. Don't add badges for things that aren't set up.
- **Claims need evidence.** "Faster" needs a number and how you measured it. "Tested" needs the command you ran. "Production-ready" needs nothing; don't write it.
- **Commit messages:** imperative subject under ~70 characters saying what changed. Then a body saying why, if it isn't obvious. No bullet list restating the diff file by file.
- **PR descriptions:** what changed, why, how you verified it, and anything the reviewer should look at closely. Mention anything you were unsure about or didn't test.

## When you don't know

Say so. "I couldn't find where X is configured; I assumed Y" is useful. A confident guess dressed up as fact is the most expensive kind of slop, because someone has to find out it's wrong.
