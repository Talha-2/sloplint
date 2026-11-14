# Registries and package managers

Commands for each step of sloplint-deps. Replace `<name>` with the exact package name.

## npm

| Check | Command |
|---|---|
| Exists, description and repository | `npm view <name> name version description repository.url` |
| Last release | `npm view <name> time.modified` |
| Weekly downloads | open `https://api.npmjs.org/downloads/point/last-week/<name>` |
| License | `npm view <name> license` |
| Security advisories | `npm audit` after installing |

`npm view` prints an `E404` error when the package doesn't exist.

## PyPI

| Check | Where |
|---|---|
| Exists, description, repository, release history, license | `https://pypi.org/project/<name>/` |
| Latest versions | `pip index versions <name>` (an experimental pip command; use the page if it fails) |
| Security advisories | `pip-audit`, if the project uses it |

A Python package's install name can differ from the name you import. For example, you install `Pillow` and import `PIL`. Check the install name on the package's PyPI page.

## Adding with the project's package manager

The lock file in the project tells you which package manager it uses.

| Lock file | Add | Add for development only |
|---|---|---|
| `package-lock.json` | `npm install <name>` | `npm install -D <name>` |
| `pnpm-lock.yaml` | `pnpm add <name>` | `pnpm add -D <name>` |
| `yarn.lock` | `yarn add <name>` | `yarn add -D <name>` |
| `bun.lock` or `bun.lockb` | `bun add <name>` | `bun add -d <name>` |
| `uv.lock` | `uv add <name>` | `uv add --dev <name>` |
| `poetry.lock` | `poetry add <name>` | `poetry add --group dev <name>` |
| `requirements.txt` only | add a line to `requirements.txt`, then `pip install -r requirements.txt` | add it to the project's dev requirements file, if it has one |

If there is no lock file, ask the user which package manager the project uses rather than picking one. Mixing package managers creates conflicting lock files.
