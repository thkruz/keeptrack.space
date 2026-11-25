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
- Module cache: `mutate.vitest.config.ts` enables vitest `experimental.fsModuleCache` (dir `node_modules/.mutate-vitest-cache`, override `KT_MUTATE_CACHE`) so spawns share transforms (kills ~2.5x faster, survivors ~1.25x; box is CPU-bound, so 14 workers is the useful maximum). `experimental_defineCacheKeyGenerator` returns false for the mutated module: this is mandatory, otherwise the cache serves the clean transform and a killed mutant passes. A cold cache with concurrent workers gave baseline errors, so the runner first runs a serial warm-up (clean runs of the first 4 files' tests, ~2 min cold). `KT_MUTATE_DIR` redirects the journal/overlay dir (scratch runs). Slow runs near `--timeout-s` can flip between `timeout` and `survived` across runs.
- Source files are never edited. Each worker writes the mutated text to `.metrics/mutate/overlay/w<N>/<file>`; `scripts/gates/mutate.vitest.config.ts` (the normal unit config plus a `load` plugin that serves the overlay text for the one module named in `KT_MUTATE_TARGET`) runs the tests.
- Which tests: not `vitest related`. Measured here, `related` costs ~80 s of startup per call (it transforms every test's import graph) and runs hundreds of files for hub modules. `lib/testmap.ts` builds the same relation once from the static import graph; stage 1 runs the tests that import the file directly, stage 2 the nearest transitive tests (cap `--max-tests=40`), `--bail=1`. Typecheck is not run per mutant (vitest transpiles only); a mutant whose tests fail, fail to transform, or exceed `--timeout-s` (90, per stage) counts as killed (`timeout` is journaled separately). A kill is re-verified once per test list by running it unmutated; if that baseline fails the result is `error`, not `killed`.
- Test selection (2026-11-25): `lib/covmap.ts` and `mutate --build-covmap [--workers=14] [--max-minutes=9] [--restart]` run every test file alone with v8 coverage and store, per source file, which tests execute which line ranges (`.metrics/mutate/covmap.json`, with the git head and a per-source-file sha1; the build is resumable through `covmap.partial.jsonl`, packs when all tests are done). Per-test runs because vitest reports coverage only merged over a run. A mutant runs the tests that execute its mutated line (operator) or any line of its function body (empty), with no file cap. When the map is missing, the source file changed since the build (hash differs), the file is not in the map or no test covers the range, the runner falls back to the import-graph map (`testmap.ts`, 40-file cap, stage 1 direct importers isolated, stage 2 the rest). The journal entry records `selector` (`coverage` or `import-graph`), `selectorReason` for fallbacks, `tests` (list size), `mode`, `baselineMs`, `limitMs`, `killedBy`, `leak`, `retried` (all optional; old entries still read). `--no-covmap` forces the import graph; `KT_MUTATE_COVMAP` overrides the map path (a scratch `KT_MUTATE_DIR` still reads the main map). Rebuild the map after large source or test changes; stale files fall back by themselves.
- Speed rules: coverage-selected lists and graph stage 2 run non-isolated in one fork (`KT_MUTATE_ISOLATE=0`, `--no-isolate` equivalent). Every failure there is confirmed by an isolated rerun of just the failing test file (state leaks gave a false failure once); if that passes the rest of the list runs isolated, and the entry gets `leak: true`. Tests run kill-first: most past kills for the source file (journal `killedBy`), then shortest baseline duration (`mutate.vitest.config.ts` `ListOrderSequencer` keeps vitest from re-sorting). Timeout = max(30 s, 3x clean baseline + 10 s) per distinct test list; the clean baseline run happens once per list before its first mutant (a failing or over-300 s baseline gives `error`, not a kill). A timeout is rerun once at the end of the run, 2 at a time, with the same limit, and only then journaled as `timeout` (`retried: true`). Timeouts still count as killed in the score; the report prints the count separately. `--timeout-floor-s`, `--baseline-timeout-s` tune the limits; `--ids=<json file>` runs just those mutant ids (proof samples, with `--mutate-all`).
- Order: changed files first, then most recently committed. Progress line every minute.
- `--report`: per kind, journal coverage of the repo (mutants and files), killed/survived counts, worst 20 functions by survivors; writes `.metrics/mutate/report.md` and `.metrics/mutate.json`.

## Copies

ootk `scripts/gates` (crap, dry, deps, test-lint, run, lib, tests) was copied from here on 2026-11-25 at keeptrack-space commit 855850e2f plus uncommitted gate work; mutate.ts still to be copied. Branch `chore/quality-gates` in thkruz/ootk.
