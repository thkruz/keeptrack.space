# Architecture

KeepTrack separates rendering and shared services from satellite-specific logic
and feature plugins. Start with [development setup](../CONTRIBUTING.md) if you
want to run the app.

## Source layout

| Directory | Contents |
| --- | --- |
| [`src/engine/`](../src/engine/) | Rendering, cameras, input, shared services, and plugin infrastructure |
| [`src/app/`](../src/app/) | Satellite catalogs, sensors, analysis, and application UI |
| [`src/plugins/`](../src/plugins/) | Built-in feature plugins |
| [`src/plugins-external/`](../src/plugins-external/) | Installed external plugins and development instructions |
| [`src/webworker/`](../src/webworker/) | Background position, orbit, color, and analysis calculations |
| [`src/settings/`](../src/settings/) | Settings definitions and build presets |
| [`src/locales/`](../src/locales/) | Shared translations and generated translation keys |
| [`build/`](../build/) | Build configuration, profiles, and the development server |
| [`test/`](../test/) | Shared test fixtures, setup, and browser-test helpers |

The public orbital mechanics library, OOTK, is a Git submodule at
`src/engine/ootk/`. Commercial plugins live in a separate private submodule at
`src/plugins-pro/`. The OSS build works without the private module.

## Rendering and calculation

The renderer uses WebGL 2 and custom shaders for points, orbit lines, meshes,
and celestial bodies. Rendering code lives in `src/engine/rendering/`; camera
controls live in `src/engine/camera/` and `src/engine/input/`.

Web Workers perform calculations outside the UI thread. Start with
[`positionCruncher.ts`](../src/webworker/positionCruncher.ts) for position updates,
[`orbitCruncher.ts`](../src/webworker/orbitCruncher.ts) for orbit paths, and
[`colorCruncher.ts`](../src/webworker/colorCruncher.ts) for object colors.
Message definitions sit alongside the workers.

Catalog loading and object management live in `src/app/data/catalog-manager/`.
The simulation clock is managed by
[`TimeManager`](../src/engine/core/time-manager.ts). Displayed satellite positions
are propagated from orbital data for that clock time; they are not a stream of
measured positions.

## Services, events, and plugins

[`ServiceLocator`](../src/engine/core/service-locator.ts) provides access to shared
managers. Events in `src/engine/events/` connect lifecycle steps and application
actions to listeners. Plugin infrastructure lives in `src/engine/plugins/`;
built-in plugins are registered in [`src/plugins/plugins.ts`](../src/plugins/plugins.ts).

Keep rendering and reusable infrastructure in the engine. Place
satellite-specific behavior in the app layer or feature plugins. Put reusable
astrodynamics calculations in OOTK.

External plugins use the versioned [`@keeptrack/plugin-api`](plugin-api.md)
interface. Follow the [external plugin guide](../src/plugins-external/README.md)
for installation, scaffolding, and compatibility checks.

## Builds and configuration

Rspack bundles the application. The configuration is assembled in
[`build/webpack-manager.ts`](../build/webpack-manager.ts); its filename retains
the older bundler name. [`build/build-manager.ts`](../build/build-manager.ts)
coordinates builds and profiles.

- `pnpm start` runs the OSS watch build and development server.
- `pnpm run build` writes a production build to `dist/`.
- `pnpm run start:ci` serves the existing `dist/` without rebuilding it.

Build profiles select settings and content for different deployments. Some
profiles require private modules or deployment-specific assets; use the OSS
profile for public contributions. Publication commands require the maintainer's
infrastructure credentials and are not part of local setup.

## Translations

Plugin locale sources live in each plugin's `locales/` folder as
`<lang>.src.json`. `pnpm run generate-t7e` combines locale sources and generates
the translation keys. See the [contributing guide](../CONTRIBUTING.md#plugin-architecture)
for conventions when adding a plugin or translation.

## Verification

Use Biome for linting, TypeScript for type checks, Vitest for unit tests, and
Playwright for browser tests. Commands and a manual checklist are in the
[testing guide](regression-testing.md).
