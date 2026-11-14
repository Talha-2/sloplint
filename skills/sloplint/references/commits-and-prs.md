# Commits and pull requests

A commit message and a pull request description tell a reviewer what changed and why, so they know what to check. Write them from the diff you are submitting, not from what you meant to do.

## Commit messages

- **First line:** what changed, in the imperative, under about 70 characters. For example, "Retry uploads once on timeout", not "Updated upload logic".
- **Body**, if the reason isn't obvious from the first line: why the change was needed, and anything surprising about how it works.
- Don't list the changed files. The diff already shows them.
- Follow the project's existing style if it has one, such as a `fix:` prefix.

```text
Retry uploads once on timeout

The storage API drops about 1% of requests during its nightly
maintenance window. One retry clears all of them in our logs; more
retries only delay the error when the service is really down.
```

## Pull request descriptions

Use this shape. Drop sections that don't apply.

```markdown
## What changed
<One to three sentences.>

## Why
<The problem this solves, or a link to the issue.>

## How I checked it
<Commands you ran and their results. Anything you checked by hand.>

## Not done or unsure
<What is out of scope, untested or worth a closer look.>
```

- **How I checked it** lists only what you actually ran in this session. A command you expect to pass is not a result.
- **Not done or unsure** is where honest gaps go. A reviewer trusts a description more when it names its limits.
- Keep it short enough to read in a minute. Link to details instead of pasting them.
