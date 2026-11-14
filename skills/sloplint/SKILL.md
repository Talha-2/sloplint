---
name: sloplint
description: Use when you write or change code, tests, comments, docs, commit messages or pull request descriptions, and before you tell the user a coding task is done. Covers the checkable mistakes AI-written work often has, such as invented packages, calls to functions that don't exist, placeholder code, hidden errors, tests that can't fail and filler text. To review a change, including your own before you commit, use sloplint-review. To write tests, use sloplint-tests. To add or upgrade a package, use sloplint-deps.
---

# sloplint

**Goal:** hand over work that holds up when a reviewer checks it line by line.

**Slop** is work that looks finished but isn't. It reads confidently, and it fails the first time someone checks it. Each rule below targets one kind of slop that a reviewer can find by checking, rather than by personal taste.

**Principle: looking finished is not being finished.** When a rule doesn't cover a case, ask what a reviewer would find if they checked, and act on that.

Follow the rules while you work. They are not a checklist to recite, and they are not a reason to rewrite working code that you weren't asked to change. Before you report the task as done, go through [Before you say done](#before-you-say-done).

## Code

**1. Import only packages that are real and declared.** Before you import a package, find it in the project's dependency file (`package.json`, `requirements.txt` or `pyproject.toml`). If it isn't there, add it in the same change, following sloplint-deps. Don't guess a package's name from what it should be called: models often invent names that sound right, and attackers publish packages under those names. A package that installs is not proof it is the one you meant.

**2. Use only functions, options and endpoints that exist.** Whenever you rely on memory for a library's API, a function elsewhere in the codebase, or the name of a flag, option or endpoint, find its definition first, in the code or in the library's official docs. If you can't find it, don't write the call. Tell the user what you looked for and where. A call that looks plausible but doesn't exist fails at runtime, often far from where it was written.

**3. Finish the code you write.** Don't leave stand-ins such as `// ... rest of code`, `// existing code here` or `# implementation goes here`. If part of the task can't be done now, leave it out on purpose: say so in your reply, and leave a TODO that names what is missing and why. A placeholder that compiles is not working code.

**4. Don't hide errors.** Catch an error only to handle it or to re-throw it with more detail. Otherwise, don't catch it at all, and let it reach the caller. An empty `catch {}` or `except: pass` turns a failure into silence, so the bug shows up later somewhere harder to trace. If ignoring an error really is correct, say why in a short comment inside the block.

**5. Change only what the task needs.** Follow the patterns the codebase already uses. Don't rename, reformat or rework code outside the task, and don't add layers nothing needs yet, such as an interface with one implementation or a setting no one asked for. Unrelated changes hide the real one and slow the review down.

## Tests

**6. Write tests that can fail.** A test exists to fail when the code is wrong. Assert on what the code returns or does. Never assert something that is always true, such as `expect(true).toBe(true)`, and don't mock the code you are testing. A passing test is not proof that it can fail. The sloplint-tests skill shows how to prove it.

**7. Don't weaken a failing test to make it pass.** A failing test means the code or the test is wrong. Find out which. If it's within the task, fix it and tell the user what was wrong. If fixing the code is outside the task, leave the test failing and tell the user. Editing a test to match broken code hides the bug it found.

## Comments

**8. Explain why, not what.** Write a comment when the reason behind the code isn't obvious: a decision, a limit, a workaround. Delete comments that only repeat the next line.

```python
# Repeats the code. Delete it.
# Increment the retry counter
retries += 1

# Explains a decision. Keep it.
# The API limits requests per minute, so wait a full minute before retrying.
time.sleep(60)
```

Notes for the user, such as "Here's the updated function", go in your reply, not in the file. Don't mark edits with comments like `// NEW` or `// changed`. Version control already records changes.

## Writing

**9. Write plainly and back up every claim.** In docs, commit messages and pull request descriptions, use short, specific sentences that state the fact. Cut stock phrases such as `delve into`, `seamlessly` and `unlock the power of`, and don't start every heading with an emoji. Every claim needs its evidence: "faster" needs a number, and "tested" needs the command you ran.

When you write a commit message or a pull request description, read [Commits and pull requests](references/commits-and-prs.md).

## Before you say done

1. **Run the checks.** Run the project's tests, linter and type checker. If Node.js is available, also run `npx sloplint-cli --diff` and fix every error.
2. **Review your diff** with sloplint-review, or for a small change, read it the way a reviewer would. Remove anything you can't explain.
3. **Report what happened, not what should have happened.** Name each command you ran and what it printed. If you couldn't run something, say "not run" and why. "Not run" is a useful answer. A guessed "passes" is slop.

If sloplint flags something that is correct, add `sloplint-ignore-line` to that line with a short reason, and mention it in your reply.

## When you aren't sure

Say so, and say what you assumed: "I couldn't find where X is configured, so I assumed Y." A confident guess costs more than an admitted gap, because someone has to discover that it's wrong.
