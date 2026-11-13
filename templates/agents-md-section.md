## sloplint: avoid AI slop

Slop is work that looks finished but isn't. Follow these rules when you write or review code, tests, docs, commits or pull requests.

1. **Only import packages that are real and declared.** Add new ones to the dependency file in the same change. If you aren't sure a package exists, look it up instead of guessing.
2. **Only use functions and options that exist.** Find the definition in the code or official docs first. If you can't find it, say so.
3. **Finish the code you write.** No `// ... rest of code` or `implementation goes here`. If something can't be done now, say so and leave a TODO that explains what is missing.
4. **Don't hide errors.** No empty `catch {}` or `except: pass`. Handle the error, re-throw it with more detail, or comment why ignoring it is safe.
5. **Change only what the task needs.** No unrelated edits, and no extra layers the task doesn't need.
6. **Write tests that can fail.** If the code were broken, the test should fail. Never assert something that is always true, and don't mock the code under test.
7. **Don't weaken a failing test to make it pass.** Find out whether the code or the test is wrong.
8. **Comments explain why, not what.** Don't restate the code. Keep notes for the user in your reply, not in files.
9. **Write plainly and back up claims.** No filler phrases. "Faster" needs a number; "tested" needs the command you ran.

When you review someone else's change, check it against the same rules, confirm each problem before you report it, and give a file and line for each one.

Before you say you're done: run the tests, run `npx sloplint-cli --diff` if the project can, read your whole diff, and report what you actually ran.
