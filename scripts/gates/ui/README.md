# UI gate (checks A to I)

Playwright against the installed system Chrome (`channel: 'chrome'`, no browser download). Plan:
`hq/01-aerospace/keeptrack-space/quality-gates-plan.md`, section "UI checks".

| File | What |
|---|---|
| `collector.ts` | One in-page walk (string-evaluated, avoids tsx `__name`): rect, computed overflow, text-overflow, position, z-index, control flag, clipping-ancestor bounds, `elementsFromPoint` hit for controls. Also the pseudo-locale padding script. |
| `checks.ts` | Pure functions A to E over collector data, `applyAllowlist`. |
| `mutations.ts` | I: widen a button, drop a z-index (to -9999), shrink a text element to 24px; reruns A to D and requires a finding inside the mutation. |
| `run.ts` | Matrix runner: static server on :5598 serving `dist/`, viewport x locale, every `.side-menu-parent` opened in turn. Flags `--viewports= --locales=en,pseudo --axe=desktop --mutations --limit=N`. |
| `chrome-screenshot.spec.ts`, `playwright.config.ts` | H: `toHaveScreenshot`, canvas and clock readouts masked, pinned ISS TLE at a fixed frozen time (`test/e2e/fixed-scene.ts`). Baselines in `.metrics/ui/snapshots`. |
| `summarize.ts` | Writes `.metrics/ui/summary.md` from the run files. |
| `allowlist.json` | Accepted findings (`rule`, exact `selector`, `reason`, optional `viewport`/`locale`/`menu`). Starts empty. |
| `__tests__/` | Vitest unit tests on `fixtures.json`. |

## Run

```
pnpm run build:pro                                   # dist/ must be the pro build
pnpm exec vitest run scripts/gates/ui                # unit tests
pnpm exec tsx scripts/gates/ui/run.ts --mutations    # matrix, writes .metrics/ui/<viewport>-<locale>.json
pnpm exec tsx scripts/gates/ui/summarize.ts          # .metrics/ui/summary.md
pnpm exec playwright test -c scripts/gates/ui/playwright.config.ts --update-snapshots   # H baseline (first run); drop the flag to compare
```

Wrap long runs in `hq/tooling/run-bounded.mjs`. Phone runs use the viewport user agent from `test/e2e/viewports.json` (the app picks
mobile mode from the UA).

## Rules

- A-offscreen / A-h-overflow: element outside the viewport (not when inside a scroller), element past an ancestor's clipping or
  scrolling box horizontally, page scrolls sideways. Wide tables in an `overflow-x: auto` wrapper are flagged too; allowlist them.
- B-clipped-text: `overflow: hidden/clip` with scroll size over client size, no `text-overflow: ellipsis`, no line clamp. Inputs, selects,
  textareas and the Materialize select trigger are exempt (they clip by design).
- C-sibling-overlap: in-flow siblings under one parent overlapping over 2px in both axes (absolute/fixed skipped).
- D-occluded-control: `elementsFromPoint` at the control centre does not return the control, a descendant, an ancestor or its label.
- E-tap-target (phone only, under 44px) and E-zero-size (control or text element with zero width or height).
- F: locale `pseudo` = English with every text node padded 40 percent (repeats the string's own prefix), then A to E.
- G: `@axe-core/playwright`, menu-scoped, English at the viewports named in `--axe` (default desktop).

## Notes and limits

- Added `@axe-core/playwright` with `pnpm add -D --lockfile-only`: the worktree's `node_modules` is a junction to the main checkout,
  so nothing was installed there. `pnpm install` in the main checkout is needed before G runs without `AXE_MODULE_DIR`
  (`run.ts` falls back to a copy at that path). `pnpm-lock.yaml` also dropped four unrelated stale entries during the re-resolve.
- Menus run with the catalog off and no sensor or satellite selected, so menus that need one show their empty state. `presets.json`
  preconditions from locale-matrix are not applied.
- Existing `test/e2e/layout-invariants.ts` covers overlap, clipped text, outside-viewport and outside-menu per menu with its own allowlist;
  it was left alone. This gate adds whole-page collection, pure unit-tested checks, D, E, F, G, H and I.
- Result shape is local (`types.ts`); `scripts/gates/lib/report.ts` did not exist yet.
