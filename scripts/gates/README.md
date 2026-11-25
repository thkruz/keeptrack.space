# Code-quality gates

Lineage: approach from unclebob/crapper and unclebob/dryer, reimplemented in TS (TypeScript compiler API, run through tsx).
No code was copied from those projects.

Changed code must pass; unchanged code only warns. "Changed" = lines touched by `git diff` against the merge-base with
`develop` (falls back to `origin/develop`), plus untracked files. Nothing here is wired into husky or CI.

## Usage

```
pnpm exec tsx scripts/gates/run.ts                 # all four gates, changed code only
pnpm exec tsx scripts/gates/run.ts crap dry --all  # baseline: judge everything, exit 0
pnpm exec tsx scripts/gates/crap.ts --base origin/main
pnpm vitest run scripts/gates                      # unit tests for lib/* and the gate helpers
```

- `--all`: baseline. Every item is judged, exit code is 0, counts are reported.
- default: only items that touch a changed line are reported; exit 1 when a changed item fails.
- `--base <ref>`: overrides the merge-base with develop.
- Output: a table on stdout and `.metrics/<gate>.json` (ignored by git). Result shape: `lib/report.ts` (`GateResult`, `GateItem`), reused by the mutation and UI gates.

## Scope

`src/` minus `src/engine/ootk`, `src/lib/external`, `src/plugins-external`, test files, `__tests__`, `*.d.ts`; includes
`src/plugins-pro` (submodule) minus the dev tooling it lists in its own `coverage-exclude.json`.

Plugins-pro limitation: the superproject diff only sees the submodule pointer, so plugins-pro files are diffed inside the submodule
against the merge-base of its HEAD with its own `origin/develop` / `origin/main`. `--base` applies to the superproject only.

TypeScript note: the repo's `typescript` is v7 (native, no JS API), so the gates use the `typescript-api` alias (TypeScript 5.9) from package.json.

## Gates

1. `crap.ts`: CRAP = CC^2 * (1 - cov)^3 + CC per function. Fails (changed) at CRAP >= 10, warns (unchanged). CC = 1 + `if`, `for`, `for-in`, `for-of`,
   `while`, `do`, `catch`, `?:`, each `case` (not `default`), `&&`, `||`, `??` (and their `=` forms), `?.`. One entry per outermost function, method, accessor,
   constructor or arrow; nested callbacks count toward the enclosing entry. Coverage per function from LCOV: branch records (BRDA) in the function's
   range when present, else line hits; a function the report does not mention scores 0%. Reads `coverage/lcov.info` (unit) and `coverage-e2e/lcov.info`
   (merged in when present). Generate unit coverage with `vitest run --coverage`. Message: "add tests first; split only when complexity is the cause".
   Without e2e coverage, WebGL and render code is scored on unit coverage only.
4. `dry.ts`: pairs of functions with Jaccard similarity >= 0.8 over 4-gram fingerprints of the normalized syntax-node sequence. Min 4 lines and 20 normalized
   nodes. Locals, fields, literals and types normalize away; call names and operators stay. A pair is "changed" when either side touches the diff.
5. `deps.ts`: import graph (static, dynamic, re-exports; aliases resolved) against `deps-rules.json` (engine never imports plugins; nothing outside plugins-pro
   imports plugins-pro; plugins reach the app only through `src/plugin-api`). All three rules are `confirmed: false`: violations are reported as warn-level
   "unconfirmed rule" even on changed code until Ted confirms the list. Set `confirmed: true` per rule to make them fail.
7. `test-lint.ts`: test cases (`test`, `it`, `.each`) with no assertion, or only `not.toThrow`, `toBeDefined`, `toMatchSnapshot`. Assertions made through a helper
   defined in the same file count. Notes in the output say what the two generators (`test/generic-tests.ts`, `build/utils/create-test-file.ts`) produce.

Gates 2, 3 (mutation) and 6 (property tests) and the UI checks are separate packages of work.

## Mutation (gates 2 and 3): `mutate.ts`

```
pnpm exec tsx scripts/gates/run.ts mutate --scan
pnpm exec tsx scripts/gates/run.ts mutate --kind=empty --max-minutes=90 [--workers=14] [--limit=N] [--files=substr] [--mutate-all]
pnpm exec tsx scripts/gates/run.ts mutate --kind=operator --max-minutes=60
pnpm exec tsx scripts/gates/run.ts mutate --report [--kind=empty|operator]
```

- Gate 3 (`--kind=empty`): one mutant per outermost function, body replaced with `{}` (arrow expression bodies with `undefined`; constructors and already-empty bodies skipped). Gate 2 (`--kind=operator`): `=== !==`, `== !=`, `< <=`, `> >=`, `+ -`, `* /`, `&& ||`, `??` to `||`, `true false`, `0 1`, delete `!` and unary `-`, `?.` to `.`. Mutation works on AST tokens, so strings, comments and type positions are never touched. Only lines/functions with unit coverage (`coverage/lcov.info`) are mutated.
- Journal: `.metrics/mutate/journal.jsonl`, appended per finished mutant. Id = `file|function|line|col|original|replacement`. A rerun skips ids already journaled whose function body hash is unchanged (`--mutate-all` ignores the journal; `error` results are retried). Stop with Ctrl+C or by creating `.metrics/mutate/STOP`; in-flight mutants finish. `--max-minutes` stops cleanly. Resume = run the same command again.
- Source files are never edited. Each worker writes the mutated text to `.metrics/mutate/overlay/w<N>/<file>`; `scripts/gates/mutate.vitest.config.ts` (the normal unit config plus a `load` plugin that serves the overlay text for the one module named in `KT_MUTATE_TARGET`) runs the tests.
- Which tests: not `vitest related`. Measured here, `related` costs ~80 s of startup per call (it transforms every test's import graph) and runs hundreds of files for hub modules. `lib/testmap.ts` builds the same relation once from the static import graph; stage 1 runs the tests that import the file directly, stage 2 the nearest transitive tests (cap `--max-tests=40`), `--bail=1`. Typecheck is not run per mutant (vitest transpiles only); a mutant whose tests fail, fail to transform, or exceed `--timeout-s` (90, per stage) counts as killed (`timeout` is journaled separately). A kill is re-verified once per test list by running it unmutated; if that baseline fails the result is `error`, not `killed`.
- Order: changed files first, then most recently committed. Progress line every minute.
- `--report`: per kind, journal coverage of the repo (mutants and files), killed/survived counts, worst 20 functions by survivors; writes `.metrics/mutate/report.md` and `.metrics/mutate.json`.

## Copies

ootk `scripts/gates` (crap, dry, deps, test-lint, run, lib, tests) was copied from here on 2026-11-25 at keeptrack-space commit 855850e2f plus uncommitted gate work; mutate.ts still to be copied. Branch `chore/quality-gates` in thkruz/ootk.
