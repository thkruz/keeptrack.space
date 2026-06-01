# E2E Merge Gate (local, manual)

The Playwright E2E suite (137 specs) runs **locally on your machine** and reports
its result to GitHub as a commit status. A `develop -> main` PR can then *require*
that status, so you can't promote code that wasn't E2E-tested on real hardware.

This is deliberately a **local, self-attested** gate. It only ever evaluates your own
`develop -> main` promotions — contributor PRs into `develop` are gated by the
automated CI pipeline (lint, unit + coverage, build, boot-smoke) instead.

## Why local instead of CI

- The suite boots the full WebGL app 137 times. On a CI runner (software GL) that's
  slow and burns runner-minutes; on your GPU it's 5-10 minutes.
- Promotion happens rarely (every few days), and only you do it — so a manual,
  on-demand run is a better fit than always-on CI.

## How the gate works

GitHub branch protection evaluates required status checks against the **PR head SHA**.
So the gate binds to a commit:

1. `npm run test:e2e:gate` reads `git rev-parse HEAD`.
2. Posts a `pending` status (`context: e2e/local`) to that SHA — the PR shows
   "E2E running locally".
3. Runs `npx playwright test`.
4. Posts `success` or `failure` to the same SHA.

Because it's bound to the SHA, **pushing a new commit clears the status** — the PR
blocks again until you re-run. You can't merge code that wasn't tested.

> **Constraint:** promote `develop -> main` through a **PR on GitHub**. A local
> `git merge develop && git push` to `main` creates a new merge-commit SHA with no
> status, which branch protection will block permanently.

## Usage

```bash
# Make sure develop's tip is pushed first (the status attaches to a SHA on origin)
git push

# Full suite (5-10 min) — posts the result to HEAD
npm run test:e2e:gate

# Forward args to Playwright (e.g. a subset while iterating)
npm run test:e2e:gate -- --grep "smoke"
```

The command exits with Playwright's exit code, and the `e2e/local` check on the
`develop -> main` PR turns green/red to match.

## One-time setup

1. **gh auth scope** — the gate posts a commit status, which needs the `repo:status`
   scope (the broad `repo` scope includes it). Verify:

   ```bash
   gh auth status
   ```

   If status posts fail with a 403/422, re-auth with `gh auth refresh -s repo`.

2. **Report the context once** — a status context only appears in the branch-protection
   picker *after* it has been reported at least once. So run `npm run test:e2e:gate`
   once on any pushed commit before step 3.

3. **Require the check on `main`** — GitHub repo Settings → Branches → branch protection
   rule for `main` → enable "Require status checks to pass before merging" → add
   `e2e/local` to the required list.

## Optional env overrides

| Variable | Default | Purpose |
| --- | --- | --- |
| `E2E_GATE_CONTEXT` | `e2e/local` | Status context name (must match what's required in branch protection) |
| `E2E_GATE_TARGET_URL` | _(none)_ | URL for the check's "Details" link (e.g. a hosted Playwright report) |

## Caveats

- **Self-attested.** The status reflects what your machine reported; it is not
  independently verified. That's acceptable here because only you promote to `main`.
- **You must remember to run it.** If you'd rather not, a `husky` pre-push hook could
  trigger it automatically (husky is already installed) — not wired up by default.
