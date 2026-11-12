---
name: sloplint-deps
description: Use before you add, suggest or upgrade a package or library (npm, pip, or any package manager), and when you review a change that adds one. It gives a step-by-step check that the package is needed, real, correctly named, maintained and allowed, and then shows how to add it the way the project expects.
---

# sloplint deps

Adding a package means trusting someone else's code to run inside the project. AI models often suggest packages that don't exist, or get a real package's name slightly wrong. Attackers know this. They publish packages under those invented or misspelled names, so the wrong install can run their code. This attack is called slopsquatting.

Go through these steps before you add any package. Each step can stop the process. If one does, tell the user why.

## Step 1. Check whether you need a new package

- **Do:** Look for something that already does the job: the language's standard library, a package the project already depends on, or a few lines of your own code.
- **Why:** Every new package adds code to trust, update and audit.
- **Check:** Search the dependency file (`package.json`, `requirements.txt`, `pyproject.toml`) and the codebase before you look anywhere else.

## Step 2. Get the exact name from an official source

- **Do:** Copy the package name from the library's official documentation or its source repository. Don't type it from memory.
- **Why:** A name that is one letter off, or that merely sounds right, can belong to a different package or to an attacker.
- **Check:** Compare the name letter by letter with the official source. Be suspicious of names that look like a popular package with a small change, such as an extra word or a swapped letter.

## Step 3. Confirm the package exists and is the right one

- **Do:** Look the package up in its registry.
  - npm: `npm view <name> name version description repository.url`
  - PyPI: open `https://pypi.org/project/<name>/`, or run `pip index versions <name>` (an experimental pip command, so prefer the page if it fails)
- **Why:** A package that doesn't exist will break the install. A package with the right name but the wrong owner can be malicious.
- **Check:** The description and source repository should match the library you meant. If the package doesn't exist, stop. Don't look for a similar name to replace it.

## Step 4. Check that it is maintained and used

- **Do:** Look at when it last released and how widely it is used.
  - npm: `npm view <name> time.modified` for the last release, and `https://api.npmjs.org/downloads/point/last-week/<name>` for weekly downloads
  - PyPI: the release history on its PyPI page
- **Why:** An abandoned package won't get security fixes. A brand-new package with almost no users hasn't been checked by anyone.
- **Check:** Tell the user if the package hasn't released in over two years, has very few downloads, was first published only recently, or has open security advisories. Let them decide.

## Step 5. Check the license

- **Do:** Find the license: `npm view <name> license`, or the license shown on the PyPI page.
- **Why:** Some licenses limit how the project can be used or sold.
- **Check:** If the license is missing, unusual, or different from the licenses the project already uses, tell the user before you add the package.

## Step 6. Add it the way the project does

- **Do:** Use the project's own package manager, so the lock file updates too. The lock file in the project tells you which one:

  | Lock file | Command |
  |---|---|
  | `package-lock.json` | `npm install <name>` |
  | `pnpm-lock.yaml` | `pnpm add <name>` |
  | `yarn.lock` | `yarn add <name>` |
  | `bun.lock` or `bun.lockb` | `bun add <name>` |
  | `uv.lock` | `uv add <name>` |
  | `poetry.lock` | `poetry add <name>` |
  | `requirements.txt` only | Add the package to `requirements.txt`, then run `pip install -r requirements.txt` |

- **Why:** Mixing package managers creates conflicting lock files and installs that differ between machines.
- **Check:** Put packages that are only needed for development or tests in the development section (`npm install -D`, `uv add --dev`, `poetry add --group dev`). Follow the project's existing style for version ranges.

## Step 7. Report what you added

Tell the user:

- the package name and version you added, and why it was needed
- what you checked: the official source of the name, last release, usage, and license
- anything that looked risky, even if you added the package anyway

Example (figures as of November 2026):

```text
Added zod 4.6.7 to dependencies (npm install zod) to validate request bodies.
Name copied from zod.dev; the npm entry links to github.com/colinhacks/zod.
Last release one month ago, about 450 million downloads a week, MIT license.
The project had no validation library, so nothing existing could do this.
```

## When you review a change that adds a package

Run steps 2 to 5 on every new or changed package in the dependency file. If the change added a package without touching the dependency file, or without updating the lock file, report it.
