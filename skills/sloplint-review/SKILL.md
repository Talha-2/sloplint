---
name: sloplint-review
description: Use when someone asks you to review a change for quality or for AI slop, such as a diff, a branch, a commit or a pull request. It gives a step-by-step process for checking the change against the sloplint rules, confirming each problem before reporting it, and writing a clear review with file and line for every finding.
---

# sloplint review

Use this skill to review a change someone else made, or a change you made earlier.

A good review finds real problems and proves them. A review that guesses is slop too: it sends the author chasing problems that aren't there. So this process has one rule above the others: **confirm every problem before you report it.**

## Step 1. Get the change

Find exactly what changed. Review only that.

- A branch: `git diff main...HEAD` (use the project's main branch name)
- A pull request: `gh pr diff <number>`
- Uncommitted work: `git diff` and `git diff --staged`

Also read the pull request description or commit message, if there is one. You will check its claims in step 4.

## Step 2. Run sloplint

If the project can run it, run:

```bash
npx sloplint --diff --online
```

Use `--base <branch>` if the change isn't based on the default branch.

Treat each finding as a lead, not a verdict. Confirm it in step 4 like any other problem.

## Step 3. Read the change against the rules

Read every changed line. For each part of the change, ask these questions. They match the nine rules of the `sloplint` skill.

**Code**

1. Is every new import a real package, declared in the dependency file?
2. Does every function, method, flag and setting it uses actually exist?
3. Is any code left unfinished, such as `// ... rest of code` or a stub that does nothing?
4. Is any error caught and then ignored without a reason?
5. Does every change belong to the task? Are there unrelated edits or layers nothing needs yet?

**Tests**

6. Would each new test fail if the code it tests were broken?
7. Was any test weakened, skipped or deleted to make it pass?

**Comments and writing**

8. Do comments explain why, or do they only repeat the code? Are there notes to the user left in files?
9. Are claims in docs, commit messages and the pull request description true and backed up?

## Step 4. Confirm each problem

Before you write a problem down, prove it. Each kind of problem has a check:

| Problem | How to confirm it |
|---|---|
| A package may not exist | Look it up: `npm view <name>` or `pip index versions <name>` |
| A function or option may not exist | Search the codebase and the library's docs for its definition |
| A test may not be able to fail | Read what it asserts. If you can, break the code briefly and run the test |
| A claim may be false ("tests pass", "2x faster") | Run the command, or find the evidence in the change |

If you can't confirm a problem, either leave it out or list it as a question, not a finding.

Don't report matters of taste, such as naming or formatting the project's linter already accepts. They bury the real problems.

## Step 5. Write the review

Use this format:

```markdown
**Verdict:** Ready to merge / Needs changes / Needs discussion

**Problems**

1. `src/api.ts:42`: Imports `express-schema-guardian`, which doesn't exist on npm.
   Why it matters: the build fails, and someone could publish a package under that name.
   Fix: use `zod`, which the project already depends on.

**Questions**

- `src/cache.ts:88`: Is the 5-minute timeout intended? It isn't mentioned in the description.

**What I checked**

Ran `npx sloplint --diff --online` (2 findings, both confirmed), `npm test` (passed), and read all 6 changed files.
```

Follow these rules when you write it:

- Put the most serious problem first.
- Give every problem a file and line, what is wrong, why it matters, and a concrete fix.
- Keep each problem to two or three short sentences.
- Always include "What I checked", so the reader knows how far to trust the review.
- If you found no problems, say so plainly. Don't invent problems to look thorough.
