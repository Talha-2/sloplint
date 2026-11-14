---
name: sloplint-deps
description: Use before you add, install, suggest or upgrade a package or library with any package manager (npm, pnpm, yarn, bun, pip, uv, poetry), and when you review a change that adds one. Checks that the package is needed, correctly named, real, maintained and licensed, then adds it the way the project expects. For calls to functions inside a package that's already installed, use sloplint rule 2 instead.
---

# sloplint deps

**Goal:** add a package only when it's needed, and only after checking that it is the one you meant.

**Principle: a package that installs is not proof it's the right one.** Models often suggest packages that don't exist, or get a real name slightly wrong. Attackers publish packages under those invented and misspelled names, so the wrong install runs their code. This is called **slopsquatting**.

Go through the steps in order. Any step can stop the process. When one does, tell the user why instead of looking for a workaround. Read [Registries and package managers](references/registries.md) for the commands each step uses.

If you are only suggesting a package, not installing it, do steps 1 to 5 and tell the user what you checked.

## 1. Check whether you need a new package

Look first for something that already does the job: the language's standard library, a package the project already depends on, or a few lines of your own code. Every new package is more code to trust, update and audit.

## 2. Get the exact name from an official source

Copy the name from the library's official documentation or its source repository. Don't type it from memory. A name that is one letter off, or that merely sounds right, can belong to someone else. Be wary of names that look like a popular package with a small change, such as an extra word or a swapped letter.

## 3. Confirm it exists and is the right package

Look the package up in its registry. Check that its description and source repository match the library you meant. A package with the right name and the wrong owner is the attack this skill exists to stop.

## 4. Check that it is maintained and used

Look at when it was last released and how widely it's used. An abandoned package won't get security fixes. A new package with almost no users has had few people check it.

## 5. Check the license

Find its license. Some licenses limit how the project can be used or sold.

## When to stop

| What you found | What to do |
|---|---|
| The package doesn't exist | Stop. Don't substitute a similar name. Tell the user. |
| The name or repository doesn't match the official source | Stop and tell the user what doesn't match. |
| No release in over two years, few downloads (for example, under about 1,000 a week on npm), first published in the last few weeks, or open security advisories | Tell the user what you found and let them decide before you add it. |
| The license is missing, unusual, or different from the project's other dependencies | Tell the user before you add it. |
| Something the project already has does the job | Use that instead, and say so. |

## 6. Add it the way the project does

Use the project's own package manager, so the lock file updates too. The lock file tells you which one. Put packages needed only for development or tests in the development dependencies, and follow the project's existing style for version ranges.

After installing, check that the dependency file and the lock file both changed, and that the project still builds and its tests pass.

## 7. Report what you added

Tell the user what you added, why, and what you checked, including anything that looked risky even if you added the package anyway.

```text
Added zod 4.6.7 to dependencies (npm install zod) to validate request bodies.
Name copied from zod.dev; the npm entry links to github.com/colinhacks/zod.
Last release one month ago, about 450 million downloads a week, MIT license.
The project had no validation library, so nothing existing did this.
```

The figures above are from November 2026.

## Upgrading a package

For an upgrade to a new major version, read the changelog or release notes for breaking changes between the two versions before you upgrade. Minor and patch upgrades don't need this.

For any upgrade, use the project's package manager, run the tests, and report anything that changed behaviour. A clean install is not proof that nothing broke.

## When something fails

- **The registry can't be reached:** don't add the package as checked. Tell the user it is unverified and which checks you couldn't run.
- **The install fails:** read the error. Don't switch to a different package or package manager to make it pass without telling the user.

## When you review a change that adds a package

Run steps 2 to 5 on every new or upgraded package in the dependency file. Report it if the change imports a package without declaring it, or changes the dependency file without updating the lock file.
