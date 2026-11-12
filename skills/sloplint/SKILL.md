---
name: sloplint
description: Use when you write, change or review code, tests, comments, docs, commit messages or pull requests, and before you say a coding task is done. It lists the mistakes AI-written work often has, such as importing packages that don't exist, leaving placeholder code, writing tests that can't fail and hiding errors, and how to avoid each one.
---

# sloplint

"Slop" is work that looks finished but isn't. It reads well, but it falls apart when someone checks it.

This skill lists the mistakes that cause slop. Each rule says what to do, why it matters, and how to check it. Every rule is about something a reviewer can verify, not about style.

Follow the rules while you work. Then go through the checklist at the end before you say you are done.

## Code

### 1. Only import packages that are real and declared

- **Do:** Before you import a package, find it in the project's dependency file (`package.json`, `requirements.txt` or `pyproject.toml`). If it isn't there, add it in the same change.
- **Why:** AI models often invent package names that sound right. A made-up package breaks the build. Worse, attackers publish packages under commonly invented names, so installing one can run their code.
- **Check:** If you aren't sure a package exists, look it up (`npm view <name>` or `pip index versions <name>`). Don't guess.

### 2. Only use functions and options that exist

- **Do:** Before you call a function, method, API endpoint, command-line flag or setting, find where it is defined, in this codebase or in its official docs.
- **Why:** A call that looks right but doesn't exist fails at runtime, often far from where it was written.
- **Check:** If you can't find the definition, don't write the call. Tell the user what you couldn't find.

### 3. Finish the code you write

- **Do:** Write every part of the change. Don't leave stand-ins like `// ... rest of code`, `// existing code here` or `# implementation goes here`.
- **Why:** A placeholder looks like working code until it runs.
- **Check:** If part of the task truly can't be done now, say so in your reply. In the code, leave a TODO that says what is missing and why.

### 4. Don't hide errors

- **Do:** When you catch an error, handle it, re-throw it with more detail, or let it reach the caller.
- **Why:** An empty `catch {}` or `except: pass` makes failures silent, so bugs show up later in a place that is much harder to debug.
- **Check:** If ignoring an error really is correct, add a short comment inside the block that says why.

### 5. Change only what the task needs

- **Do:** Keep the change focused. Follow the patterns this codebase already uses.
- **Why:** Unrelated edits hide the real change and make review slower. Extra layers that aren't needed yet, like an interface with one implementation or a setting no one asked for, make the code harder to change.
- **Check:** Read your diff. Every changed line should be explained by the task.

## Tests

### 6. Write tests that can fail

- **Do:** Assert on what the code under test returns or does.
- **Why:** A test that always passes tells you nothing, and it makes broken code look checked.
- **Check:** Ask, "If this code were broken, would this test fail?" If not, fix the test. Never assert something that is always true, like `expect(true).toBe(true)` or `assert True`. Don't mock the code you are testing; mock only what it depends on, such as the network, the clock or the file system.

### 7. Don't weaken a failing test to make it pass

- **Do:** When a test fails, find out whether the code or the test is wrong.
- **Why:** Changing the test to match broken code hides the bug.
- **Check:** Fix the real cause and say what it was. If the test itself was wrong, explain why.

## Comments

### 8. Explain why, not what

- **Do:** Write a comment when the reason for the code isn't obvious: a decision, a limit, a workaround.
- **Why:** The code already shows what it does. A comment that repeats it adds reading time and goes stale.
- **Check:** Delete comments that only restate the next line.

```python
# Restates the code. Delete it.
# Increment the retry counter
retries += 1

# Explains a decision. Keep it.
# The API limits requests per minute, so wait a full minute before retrying.
time.sleep(60)
```

Also keep chat out of files. Notes for the user ("Here's the updated function") go in your reply, not in the code. Don't mark edits with comments like `// NEW` or `// changed`, because version control already records changes.

## Writing: docs, READMEs, commit messages, pull requests

### 9. Write plainly and back up claims

- **Do:** Use short, specific sentences. Say the concrete fact.
- **Why:** Filler makes text longer without making it clearer, and readers learn to skim past it.
- **Check:**
  - Remove stock phrases such as `delve into`, `seamlessly`, `unlock the power of` and `it's important to note`. Replace each with the fact it was hiding, or delete the sentence.
  - Don't start every heading with an emoji.
  - Support every claim. "Faster" needs a number. "Tested" needs the command you ran.

For a **commit message**, write a short first line that says what changed. Add a body that says why, if the reason isn't obvious.

For a **pull request**, say what changed, why, how you checked it, and anything you are unsure about.

## Before you say "done"

- [ ] Run the project's tests, linter and type checker. Report what you ran and what it printed.
- [ ] If the project can run it, run `npx sloplint --diff` and fix every error. If a finding is wrong, add `sloplint-ignore-line` to that line with a short reason.
- [ ] Read your whole diff the way a reviewer would. Remove anything you can't explain.
- [ ] Say "tests pass" only if you ran them in this session and saw them pass.

## When you aren't sure

Say so. "I couldn't find where X is configured, so I assumed Y" helps the user. A confident guess costs more, because someone has to discover that it's wrong.
