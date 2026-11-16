# Testing

Complete [development setup](../CONTRIBUTING.md#development-setup) first. Use the
OSS build for public contributions; private Pro features are not required.

## Automated checks

```bash
pnpm run generate-t7e
pnpm run lint
pnpm run typecheck
pnpm test
```

Vitest unit tests live next to plugins and other source modules in `__tests__/`
folders. Shared setup and fixtures live in `test/`. Run a relevant test file
while iterating, then run the checks required for your pull request.

```bash
pnpm exec vitest run path/to/changed.test.ts
pnpm run test:coverage
```

The first command is a template: replace the path with the test you want to run.

## Browser tests

Playwright tests use Chromium and an application served on port 5544. Build the
app first: the Playwright-managed server serves `dist/` without compiling it.

```bash
pnpm exec playwright install chromium
pnpm run build
pnpm run test:e2e:smoke
```

Run the broader suite with `pnpm run test:e2e`, or target a relevant spec:

```bash
pnpm exec playwright test path/to/changed.spec.ts
```

Replace the example path with a spec under `src/`. Specs are named
`**/__tests__/*.spec.ts`. See [`playwright.config.ts`](../playwright.config.ts)
for browser settings, retries, and artifact capture.

Locally, Playwright reuses a server already running on port 5544. Confirm that
it serves the intended build and profile before interpreting a result. Use a
fresh production build and stop an unrelated server when verifying a release.
The local HTML report can be opened with `pnpm exec playwright show-report`.

Tests tagged `@local` depend on local graphics hardware or screenshot baselines
and are excluded in CI. A CI pass does not establish performance on a user's GPU.

## Manual checks for UI changes

Choose checks affected by the change. Record the commit, build profile, browser,
viewport, and input data so someone else can reproduce your results.

| Check | Steps | Expected result |
| --- | --- | --- |
| Search and selection | Search for a known NORAD ID from the loaded catalog, then select the result. | The selected object's ID matches the query and its information is displayed. |
| Simulation time | Pause, change the simulation time, then resume. | The displayed time changes as requested; updates resume when playback resumes. |
| Sensor analysis | Select a sensor and a satellite, then calculate look angles for a specified time. | Output identifies the selected objects, time, and units. Compare numerical changes against an independent reference or a known fixture. |
| Menu layout | Open the changed menu at desktop and phone widths; use its inputs and close it. | Labels and controls remain readable and reachable, with no overlapping buttons or trapped scrolling. |
| Data import | Load a known valid fixture, then a malformed file. | Valid objects appear as expected; invalid input produces an understandable error without breaking the app. |

For simulation changes, record the inputs and compare the resulting objects or
orbits with a known fixture. A plausible-looking orbit is not a numerical check.

## Performance changes

Compare the same scenario before and after a change. Record browser version,
CPU/GPU, viewport, catalog size, graphics settings, and whether caches were warm.
Measure initial loading separately from interaction and rendering performance.
Avoid a universal loading-time or frame-rate threshold without a defined test
machine and workload.

## Reporting failures

Include reproduction steps, expected and observed behavior, build information,
and relevant console errors. Attach a screenshot or Playwright trace for UI
failures. Note whether the issue occurs in the OSS build, the hosted app, or both.
Report security vulnerabilities through the [security policy](../SECURITY.md).

Maintainers promoting a release can also consult the
[local E2E merge gate](e2e-merge-gate.md). That workflow is separate from the
checks expected for contributor pull requests.
