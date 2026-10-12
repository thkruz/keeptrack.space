# `scripts/` — developer and maintainer tooling

Standalone tools that support the app but are not part of it. Nothing here is bundled: `src/` is the
application, `build/` is the build system, and this directory is everything you run by hand.

Most tools have an npm entry; the rest are run by path. Both forms assume the repo root as the working
directory:

```bash
npm run inspect:profile -- pro          # npm entry, arguments after --
npx tsx scripts/inspect.ts --help       # by path
```

A few tools want a warm dev server (`npm start`, or `npm run start:pro`) already listening on :5544.
Each says so in its own header comment, which is always the authoritative documentation for flags -
this file is a map, not a manual.

## Verifying the app by looking at it

Screenshot-driven verification. These boot the real app in Chromium and drive it through
`window.keepTrack.api`, so they check pixels rather than mocks.

| Tool | Run with | What it does |
| --- | --- | --- |
| `inspect.ts` | `npx tsx scripts/inspect.ts` | Boot the app, drive it into an arbitrary UI/feature state, capture screenshots. The general-purpose one; start here. |
| `inspect-profile.ts` | `npm run inspect:profile` | Verify a build profile's own `settingsOverride` in a real browser. |
| `capture-verification-shots.ts` | `npm run capture-shots` | Labeled, dated, tagged screenshots that double as reusable assets (help menus, release notes). |
| `capture-help-screenshots.ts` | `npx tsx scripts/capture-help-screenshots.ts` | Per-plugin help imagery into `public/img/help/<plugin-id>/`. |
| `capture-notice-shot.ts` | `npx tsx scripts/capture-notice-shot.ts` | Headless capture of a 3D view for publication. |
| `generate-polar.ts` | `npx tsx scripts/generate-polar.ts` | Batch-render Polar Plot pass charts for a sensor. |
| `pinch-zoom-verify.ts` | `npx tsx scripts/pinch-zoom-verify.ts` | One-off: mobile pinch-out escapes the close-range standoff dolly. |
| `twist-verify.ts` | `npx tsx scripts/twist-verify.ts` | One-off: two-finger twist maps to camera roll. |
| `twist-drag-verify.ts` | `npx tsx scripts/twist-drag-verify.ts` | One-off: single-finger drag stays screen-relative after a twist roll. |

The `*-verify.ts` scripts are kept rather than deleted because each encodes a gesture regression that
was expensive to diagnose once already.

## Mesh viewer

A standalone web viewer that renders any OBJ+MTL through the engine's exact mesh pipeline (layout,
0.001 scale, shader, log depth), so a model can be checked the way the app will actually draw it -
without booting the app or shipping the mesh first.

| Tool | Run with | What it does |
| --- | --- | --- |
| `mesh-viewer/server.ts` | `npm run mesh-viewer` | Serves the viewer (`index.html` + `viewer.js`) and every mesh in `public/meshes/`. Deep-link a model with `#<name>`. |
| `mesh-viewer/capture-meshes.ts` | `npx tsx scripts/mesh-viewer/capture-meshes.ts` | Headless contact sheet: a 45-degree oblique of each named mesh. |
| `mesh-viewer/capture-angles.ts` | `npx tsx scripts/mesh-viewer/capture-angles.ts` | Four verification views per mesh, chosen to catch the failure modes in the model-authoring guide. |
| `mesh-viewer/resolve-model.ts` | `npx tsx --tsconfig scripts/mesh-viewer/tsconfig.json scripts/mesh-viewer/resolve-model.ts <sccNum>` | Which mesh would the app draw for this object, and is it purpose-built or a shape-routed generic? |
| `mesh-viewer/catalog-lookup.ts` | `npx tsx --tsconfig scripts/mesh-viewer/tsconfig.json scripts/mesh-viewer/catalog-lookup.ts <pattern>` | Dump the catalog dimensions mesh authoring is driven by (`length`/`diameter`/`span`/`shape`). |

Chromium must launch with `--disable-gpu` (swiftshader) for headless capture, or the first composited
WebGL context is lost and every frame comes out black.

## Flag atlas

| Tool | Run with | What it does |
| --- | --- | --- |
| `flag-atlas/build-flag-atlas.ts` | `npx tsx scripts/flag-atlas/build-flag-atlas.ts` | Rasterise the flag-icons SVGs (and the custom PNGs in `public/flags/`) for every country code in `countries.ts` into `public/img/flag-atlas/atlas.png` + `atlas.json`, the decal the mesh shader projects onto the selected model. Deterministic (sorted keys, CPU Chromium, own PNG writer); fails over 512 KB. Rerun after editing the country tables. |

## External plugins

| Tool | Run with | What it does |
| --- | --- | --- |
| `plugin/index.ts` | `npm run plugin -- <command>` | The plugin CLI: `create`, `add`, `remove`, `list`, `sync`, `update`, `restore`, `dev`, `test`, `doctor`. Scaffolds and manages plugins in `src/plugins-external/`. |
| `plugin/export-template.ts` | `npm run plugin:export-template` | Render the plugin template to a standalone directory, to regenerate the public `keeptrack-plugin-example` repo. |

`plugin sync` also runs automatically as part of every `build:*` script.

## Localization

| Tool | Run with | What it does |
| --- | --- | --- |
| `check-locale-quality.ts` | `npm run check:locales` | Deterministic checks (HTML tag mismatches, placeholder drift, untranslated strings) plus an optional local Ollama review. `check:locales:quick` skips the LLM pass; if Ollama is not running, the full command reports that and continues with the deterministic results. |
| `locale-matrix/` | `npm run locale-matrix -- <preset>` | Render one v13 side menu across many languages and stitch a labeled contact sheet, so translation-driven layout breakage is visible. See [locale-matrix/README.md](locale-matrix/README.md). |

## Code quality and CI

| Tool | Run with | What it does |
| --- | --- | --- |
| `sonar.ts` | `npm run sonar` | Zero-touch offline SonarQube: starts the Docker server, mints a token, enables anonymous access, scans, opens the dashboard. `sonar:token` and `sonar:issues` are the sub-operations. |
| `merge-coverage.ts` | `npm run coverage:merge` | Merge the vitest and Playwright/monocart lcov reports into one total. |
| `e2e-gate.ts` | `npm run test:e2e:gate` | Run the E2E suite locally and report the result to GitHub as a commit status, so a develop to main PR can require it. |
| `toolchain-bench/bench.ts` | `npx tsx scripts/toolchain-bench/bench.ts` | Benchmark harness for build-toolchain comparisons. |

## Propagator benchmarks

| Tool | Run with | What it does |
| --- | --- | --- |
| `sgp4-benchmark/sgp4-benchmark.ts` | `npm run benchmark:sgp4` | Pure-TypeScript SGP4 against the USSF Astro Standards wasm builds: single-TLE latency, full-catalog frames, catalog load. Writes a self-contained HTML report plus raw JSON. |
| `sgp4-benchmark/validate-parity.ts` | `npm run validate:sgp4-parity` | Proves the classic and SGP4-XP wasm builds agree on position and velocity for the same TLE. |
| `sgp4-benchmark/validate-xtle.ts` | `npm run validate:sgp4-xtle` | Validates against paired TLE/XTLE products for the same satellites on the same day. |

The Astro Standards wasm builds are license-restricted and are not in this repository, and neither are
the paired TLE/XTLE products `validate-xtle.ts` reads. Every tool here notices what is missing, says so
in its report, and continues with whatever it does have - the pure-TypeScript SGP4 benchmark runs for
anyone.

## Data preparation and generators

| Tool | Run with | What it does |
| --- | --- | --- |
| `fetch-tle.ts` | `npx tsx scripts/fetch-tle.ts` | Pull the latest TLE set from the KeepTrack API into `public/tle/tle.json`. |
| `slim-natural-earth.ts` | `npx tsx scripts/slim-natural-earth.ts` | Slim the Natural Earth admin-0 country GeoJSON for runtime use by the political map. |
| `missile-scenario/` | `npm run missile:scenarios -- --all` | Bake the notional missile raid scenarios the app offers as presets. Config, geography data and the generator core live alongside the CLI. |

## Shared pieces

| Path | What it is |
| --- | --- |
| `lib/safe-path.ts` | Resolve untrusted path segments against a base directory and refuse anything that escapes it. |
| `lib/maintainer-only.ts` | Fail-fast guards for scripts that need credentials only a maintainer has. They print what is missing and why the open-source build does not need it, then exit 0. |
| `watermark/stamp.ts` | Stamp the KeepTrack badge onto published PNGs and GIFs via ffmpeg. Every outbound raster carries the mark. |
| `orbit-diagnostics/` | Numeric probes from the ECF orbit-line jitter investigation. Explicitly temporary, kept because the measurement technique is reusable. See [orbit-diagnostics/README.md](orbit-diagnostics/README.md). |
| `pro.ts` | Dispatcher for the commercial edition's tooling, which is not part of this repository. Run `npm run pro` and it explains itself. Nothing in the open-source build depends on it. |
