---
name: sloplint-tests
description: Use whenever you write, add, change or fix tests, whether or not the task mentions testing. That includes adding tests for code you just wrote, updating tests after changing behaviour, and getting a failing suite to pass. Gives a process for writing tests from expected behaviour, with a step that proves each new test fails when the code it tests is broken. For the general rules on code and writing, use sloplint. To review a whole change, use sloplint-review.
---

# sloplint tests

**Goal:** add tests that fail when the code is wrong, and prove they do.

**Principle: a test that can't fail is not a test.** Such a test is worse than none, because it makes broken code look checked. A test passing is not proof that it can fail. Step 5 is how you prove it.

Write tests for behaviour that matters. Don't add tests just to raise a count, and don't test the language or the framework itself.

## 1. Decide what to test

Work out the behaviours the code must have, from the task and from how the code is used. For example: "returns the total in cents", "rejects an empty cart", "retries once on a timeout". Tests written from the expected behaviour catch mistakes. Tests written by reading the implementation tend to repeat them.

Cover the cases that break code most often, where they apply: empty input, a single item, the largest and smallest allowed values, invalid input and the error path.

## 2. Follow the project's way of testing

Find existing tests for nearby code. Use the same framework, file location, naming style and helpers. Don't add a new test library unless the task asks for one.

## 3. Write one behaviour per test

Name each test after the behaviour it expects, such as `rejects an empty cart`, so a failure says what broke. Set up the input, call the code, then assert on the result.

- Assert on what the code returns or does, not on how it does it internally.
- Mock only what the code depends on, such as the network, the clock or the file system. Never mock the code under test.
- Never assert something that is always true, such as `expect(true).toBe(true)` or `assert True`.
- Wait for the actual condition instead of a fixed `sleep`.

## 4. Run the tests

Run the new tests first. Then run the rest of the suite, or, if the full suite is slow, the part that covers the code you changed. A test you haven't run is a guess.

If a test fails, find out whether the code or the test is wrong. Don't change a test just to make it pass. If the code is wrong and fixing it is outside the task, tell the user instead of hiding the failure.

## 5. Prove each new test can fail

To prove a test can fail, break the code it checks in a small way that a real bug could cause, run the test, and see it fail. Then undo the change.

Ways to break the code:

- flip a condition, such as `>` to `>=`
- return a wrong value
- skip a line or remove a check

Work safely:

- Before you break anything, run `git diff` and keep its output. Your own new code may already be in it.
- Change only your local copy of the code. Never commit or push the broken version.
- Reverse the exact edit straight away. Run `git diff` again and check that the output is the same as before the break.
- Run the tests again and see them pass.

When several tests check the same behaviour, one break can cover them, if each of those tests fails.

**Fixing a bug works in reverse.** Write the test first and see it fail on the current code. Then fix the bug and see the test pass. That proves the test catches this bug.

If a test still passes when the code is broken, it isn't testing that behaviour. Fix the test and try again.

## 6. Report what you did

Tell the user which tests you added, the command you ran with its result, and how you proved each test can fail.

```text
Added 3 tests in tests/cart.test.ts:
- totals the price of all items in cents
- rejects an empty cart
- applies a discount only once

Ran `npm test`: 48 passed.

Proved each can fail: removed the empty-cart check, returned 0 from total(),
and applied the discount twice. Each matching test failed, then passed after
I undid the change.
```

If you couldn't prove a test can fail, for example because the code can't be changed safely, list it under "Not proved" with the reason.

## When something fails

- **The tests can't run here** (missing database, credentials or tools): write the tests, say they weren't run and why, and don't report results you didn't see.
- **Existing tests were already failing** before your change: say which ones, and don't count them as your failures or fix them silently.
- **`git diff` differs after the undo:** the code wasn't fully restored. Stop and tell the user before doing anything else.
