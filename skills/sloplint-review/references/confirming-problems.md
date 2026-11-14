# Confirming problems

Each kind of problem has its own proof. If you can't get the proof, report the problem as a Question.

| Problem | How to confirm it | Not proof |
|---|---|---|
| A package may not exist | `npm view <name>` or the PyPI page `https://pypi.org/project/<name>/`. A 404 confirms it. | The name looking unfamiliar to you |
| A package may not be declared | Search the dependency file the import resolves against | The project building on your machine, which can rely on a package installed for another reason |
| A function, option or endpoint may not exist | Find its definition in the codebase, or in the library's docs for the version in the lock file | Not remembering it |
| Code may be unfinished | Read the function: does every path do real work? | A TODO alone; a TODO that names what's missing is allowed |
| An error may be hidden | Read the catch block: is the error handled, re-thrown or explained? | A broad `catch` that logs and re-throws, which is fine |
| A test may not be able to fail | Read what it asserts. If you can, break the code briefly, run the test and see whether it fails, then undo the change | The test passing |
| A test may have been weakened | Compare the old and new assertions in the diff | A test changing at all; behaviour changes need test changes |
| A change may be outside the task | Compare it with the pull request description or the issue | The change being large |
| A claim may be false ("tests pass", "2x faster") | Run the command, or find the evidence in the change | The claim being stated confidently |

When you break code to test a test, change it only in the working tree, undo the change straight away, and check with `git diff` that the code is exactly as it was. Never commit or push the change.
