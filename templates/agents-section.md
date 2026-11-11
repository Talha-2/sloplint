## No slop (sloplint)

Hold every change to what a careful reviewer can check:

- **Imports:** only packages already in the manifest, or add them in the same change. Never guess a package name; look it up first. Hallucinated names are a supply-chain risk.
- **APIs:** only call functions, flags and endpoints you found in the code or docs. If you can't find one, say so.
- **No placeholders:** never leave `// ... rest of code`, `implementation goes here` or stub bodies. Name any genuinely missing piece in your reply.
- **Errors:** no empty `catch {}` / `except: pass`. Handle, rethrow with context, or comment why ignoring is correct.
- **Tests:** every test must fail if the implementation were deleted. No `expect(true).toBe(true)`, no mocking the unit under test, never weaken a failing test to pass.
- **Comments:** explain why, not what. No comments that restate the next line, no notes addressed to the user.
- **Prose (docs, commits, PRs):** no filler (`delve into`, `seamlessly`, `unlock the power`), no emoji on every heading, no claims without evidence. Say what you ran to verify.
- **Scope:** change only what the task needs. No speculative abstractions or drive-by refactors.
- **Before finishing:** run `npx sloplint --diff` and the project's tests, and report what you actually ran.
