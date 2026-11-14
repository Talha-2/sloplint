---
name: sloplint-review
description: Use whenever you review, check or audit a change, such as a diff, a branch, a commit or a pull request, whether or not a review was requested. That includes checking your own work before you commit it or open a pull request, and checking work handed back by another agent or a teammate before you accept it. Checks the change against the nine sloplint rules, confirms each problem before reporting it, and writes a short review with a file and line for every finding. To avoid the problems while writing code, use sloplint instead.
---

# sloplint review

**Goal:** give the author a short list of problems you have confirmed, plus any open questions, so they can act without re-checking your work.

**Principle: confirm before you report.** A review that guesses is slop too. It sends the author chasing problems that aren't there, and it teaches them to ignore your reviews.

What you do with the problems depends on whose change it is:

- **Someone else's change:** report the problems and suggest fixes. Change their code only if the user asks you to.
- **Your own change:** fix the problems you confirm, then review the fixes the same way before you commit or report the task as done.

## 1. Get the change

Review exactly what changed, and nothing else.

| What you were given | How to get the diff |
|---|---|
| A branch | `git diff <base>...HEAD`, where `<base>` is the branch it will merge into |
| A pull request | `gh pr diff <number>` |
| A commit | `git show <commit>` |
| Uncommitted work | `git diff` and `git diff --staged` |

If it isn't clear which change to review, ask once before you start. Also read the pull request description or commit message if there is one. Step 4 checks its claims.

## 2. Run sloplint

If Node.js is available, run:

```bash
npx sloplint-cli --diff --base <base> --online
```

Treat each sloplint finding as a **lead**, not a verdict. Confirm it in step 4 like anything else you notice. If the command can't run, note that for the report and continue by reading.

## 3. Read the change against the rules

Read every changed line, and ask these questions. They match the nine rules of the sloplint skill.

**Code**

1. Is every new import a real package, declared in the dependency file?
2. Does every function, option and endpoint it uses actually exist?
3. Is any code left unfinished, such as `// ... rest of code` or a stub that does nothing?
4. Is any error caught and then dropped without a reason?
5. Does every change belong to the task?

**Tests**

6. Would each new test fail if the code it tests were broken?
7. Was any test weakened, skipped or deleted to make it pass?

**Comments and writing**

8. Do comments explain why, or only repeat the code? Are there notes to the user left in files?
9. Are the claims in docs, the commit message and the pull request description true and backed up?

These questions are where to look, not a form to fill in. Skip the ones that don't apply to this change. Unchanged code is out of scope unless the change breaks it.

## 4. Confirm each problem

Before you write a problem down, prove it. Read [Confirming problems](references/confirming-problems.md) for how to prove each kind.

Then give it one of two states:

- **Confirmed:** you checked, and the evidence shows the problem. Say what you checked.
- **Question:** it looks wrong, but you couldn't prove it, or it depends on intent you can't see.

Never present a Question as a Confirmed problem. If you can't confirm something and it isn't worth asking, leave it out.

Keep the effort bounded. If one or two checks don't settle a lead, make it a Question and move on.

Leave out matters of taste, such as naming, or formatting that the project's own linter accepts. They bury the real problems.

## 5. Write the review

Use this shape. Drop sections that don't apply.

```markdown
**Verdict:** Ready to merge | Needs changes | Needs discussion

**Problems**

1. `src/api.ts:42`: Imports `express-schema-guardian`, which doesn't exist on npm.
   Why it matters: the install fails, and anyone could publish a package under that name.
   Fix: use `zod`, which the project already depends on.

**Questions**

- `src/cache.ts:88`: Is the 5-minute timeout intended? The description doesn't mention it.

**What I checked**

Ran `npx sloplint-cli --diff --online` (2 findings, both confirmed) and `npm test` (48 passed).
Read all 6 changed files. Did not run the end-to-end tests: they need a database.
```

- Put the most serious problem first.
- Give every problem a file and line, what is wrong, why it matters and a concrete fix, in two or three short sentences.
- Always include **What I checked**, including what you didn't check. It tells the reader how far to trust the review.
- If you found no problems, say so plainly and still list what you checked. Don't invent problems to look thorough.

## When something fails

- **Can't get the diff** (no access to the pull request, unknown branch): tell the user what you tried and ask for the change another way.
- **sloplint or the tests can't run:** review by reading, and say in What I checked which tools didn't run and why.
- **The registry can't be reached:** keep package findings as Questions, not Confirmed problems.
