# Guidance for Claude Code (and other coding agents)

These files are for contributors who use Claude Code, or a similar agent, on KeepTrack.
They collect the mistakes agents have made in this codebase before, written as concrete
dos and don'ts. The maintainer's own agent setup is not published because it depends on
files outside this repository; everything here stands on its own.

## Load it into your agent

`CLAUDE.md` is git-ignored in this repository, so you can keep a personal one. Create
`CLAUDE.md` at the repository root with this line, and Claude Code will import the guidance
at the start of every session:

```markdown
@docs/claude/README.md
```

Other agents: point their instruction file (for example `AGENTS.md`, also git-ignored here)
at the same files.

## Topics

| File | Read it before |
|------|----------------|
| [architecture.md](architecture.md) | adding a file, moving code, or writing any math |
| [code-style.md](code-style.md) | writing TypeScript, CSS, translations or settings |
| [testing.md](testing.md) | writing tests or claiming a change works |
| [workflow.md](workflow.md) | committing, opening a pull request, or touching an issue |

## The short version

- Orbital and astrodynamics math belongs in OOTK (`src/engine/ootk`), not in KeepTrack.
- `src/engine` is reusable infrastructure. Satellite, sensor and feature code goes in `src/app`
  or a plugin under `src/plugins`.
- Every regex has the `u` flag. Files use LF line endings.
- Never add `Co-Authored-By`, "Generated with Claude Code", or any other AI attribution to
  commits, pull requests, or issue comments.
- A change is not done because the tests pass. UI changes need a screenshot; closing an issue
  needs a comment or pull request that shows the proof.
- `src/plugins-pro` is a private submodule you will not have. Do not reference it, import from
  it, or try to initialise it.
- Target the `develop` branch.

Human contributors should also read [CONTRIBUTING.md](../../CONTRIBUTING.md) and
[docs/technical.md](../technical.md); these files do not repeat them.
