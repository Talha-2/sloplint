---
name: sloplint-tests
description: Use when you write, fix or review tests, or when a task says to "add tests". It gives a step-by-step process for writing tests that catch real bugs, including a check that proves each new test fails when the code it tests is broken.
---

# sloplint tests

A test has one job: to fail when the code is wrong. A test that passes no matter what is worse than no test, because it makes broken code look checked.

This skill gives you a process for writing tests that do their job. Step 5 is the one that matters most: it proves each test can fail.

## Step 1. Decide what to test

- **Do:** List the behaviours the code must have, based on the task and how the code is used. For example: "returns the total in cents", "rejects an empty cart", "retries once on a timeout".
- **Why:** Tests written from the implementation tend to repeat its mistakes. Tests written from the expected behaviour catch them.
- **Check:** Include the cases that break code most often: empty input, a single item, the largest and smallest allowed values, invalid input, and the error path.

## Step 2. Follow the project's way of testing

- **Do:** Find existing tests for nearby code. Use the same test framework, file location, naming style and helpers.
- **Why:** Tests that look like the rest of the suite are easier to read and keep working.
- **Check:** Don't add a new test library unless the task asks for one.

## Step 3. Write one behaviour per test

- **Do:** Give each test a name that states the expected behaviour, such as `rejects an empty cart`. Set up the input, run the code once, then assert on the result.
- **Why:** When a focused test fails, its name tells you what broke.
- **Check:**
  - Assert on what the code returns or does, not on how it does it internally.
  - Mock only what the code depends on, such as the network, the clock or the file system. Never mock the code you are testing.
  - Never write an assertion that is always true, like `expect(true).toBe(true)` or `assert True`.
  - Avoid `sleep` and fixed waits. Wait for the actual condition instead.

## Step 4. Run the tests and see them pass

- **Do:** Run the new tests, then the whole suite.
- **Why:** A test you haven't run is a guess.
- **Check:** If a test fails, find out whether the code or the test is wrong. Don't change the test just to make it pass.

## Step 5. Prove each test can fail

This step separates real tests from decoration.

- **Do:** For each new test, break the code it checks in a small way, run the test, and confirm it fails. Then undo the change.
- **Why:** If a test still passes when the code is broken, it isn't testing anything.
- **How to break the code:** make one small change that a real bug could cause. Flip a condition (`>` to `>=`), return a wrong value, skip a line, or remove a check.
- **Check:** After you undo the change, run `git diff` and make sure the code is exactly as it was. Run the suite again to confirm it passes.

If you are fixing a bug, do this in the opposite order: write the test first, run it, and see it fail on the current code. Then fix the bug and see the test pass. That proves the test catches this bug.

## Step 6. Report what you did

Tell the user:

- which tests you added and which behaviour each one checks
- the command you ran and its result
- for each test, how you broke the code and that the test failed

Example:

```text
Added 3 tests in tests/cart.test.ts:
- totals the price of all items in cents
- rejects an empty cart
- applies a discount only once
Ran `npm test`: 48 passed.
Checked each one fails when the code is broken: changed `>=` to `>` in applyDiscount,
removed the empty-cart check, and returned 0 from total(). Each test failed, then passed after undoing.
```

If you couldn't do a step, such as when the tests can't run in this environment, say so plainly. Don't report results you didn't see.
