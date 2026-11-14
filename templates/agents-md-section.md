## sloplint: avoid AI slop

Slop is work that looks finished but isn't. Looking finished is not being finished. Follow these rules whenever you write or review code, tests, docs, commits or pull requests.

1. **Import only packages that are real and declared.** Add new ones to the dependency file in the same change. Copy package names from official docs; never guess them.
2. **Use only functions, options and endpoints that exist.** Find the definition in the code or official docs first. If you can't find it, say so.
3. **Finish the code you write.** No `// ... rest of code` or `implementation goes here`. If part can't be done now, say so and leave a TODO that names what is missing.
4. **Don't hide errors.** No empty `catch {}` or `except: pass`. Handle the error, re-throw it with more detail, or comment why ignoring it is safe.
5. **Change only what the task needs.** No unrelated edits, and no layers nothing needs yet.
6. **Write tests that can fail.** A passing test is not proof it can fail: break the code briefly and see the test fail. Never assert something that is always true, and don't mock the code under test.
7. **Don't weaken a failing test to make it pass.** Find out whether the code or the test is wrong.
8. **Comments explain why, not what.** Don't restate the code. Notes for the user go in your reply, not in files.
9. **Write plainly and back up claims.** No filler phrases. "Faster" needs a number; "tested" needs the command you ran.

Review every change before you commit or hand it over, including your own: check it against these rules, confirm each problem before you report it, and give a file and line for each one.

Before you say you're done, run the tests and `npx sloplint-cli --diff` if the project can, read your whole diff, and report what you actually ran. If you couldn't run something, say "not run" and why.
