# Contributing to KeepTrack

Thanks for your interest in contributing. This guide covers how to get a working
development environment, how to run the checks that CI runs, and what a good pull
request looks like.

## Development setup

You need:

- **Node.js 24 or later** (the repo pins 24.14.0 via Volta; `engines` requires `>=24`)
- **pnpm 10 or later** (`corepack enable` will provide the pinned version)
- **git**

```bash
git clone https://github.com/YOUR-USERNAME/keeptrack.space
cd keeptrack.space
pnpm install
pnpm start
```

`pnpm start` launches the dev server at `http://localhost:5544`. If the port is
taken, the server picks another one and prints it in the terminal. On first load
the app downloads the satellite catalog (about 5 MB), which takes around 30 seconds.

## Running tests

- `pnpm test` runs the unit test suite (Vitest).
- `pnpm run test:coverage` runs it with coverage.
- End-to-end tests use Playwright: `pnpm run test:e2e`. The specs live next to the
  code as `**/__tests__/*.spec.ts` under `src/`. A quick boot check is available
  with `pnpm run test:e2e:smoke`. You may need `pnpm exec playwright install chromium`
  the first time.

Unit tests for a plugin belong in that plugin's `__tests__/` folder, co-located
with the plugin code.

## Linting and code style

- `pnpm run lint` runs Biome over `src/`; `pnpm run lint:fix` auto-fixes.
- **Every regular expression must have the `u` flag** (the `v` flag is also
  accepted). A custom Biome plugin enforces this. Write `/[a-z]+/u.test(str)`,
  not `/[a-z]+/.test(str)`. This applies everywhere, including tests.
- Use **LF line endings**, never CRLF.
- Do not auto-format code outside your change. Format the lines you edit, not
  the whole file.
- TypeScript must type-check: `pnpm run typecheck`.

## Commit messages

Commits follow this format:

```text
type(scope): :emoji: message
```

Only the **type** and **message** are required; the scope and emoji are optional.

| type     | emoji                    |
| -------- | ------------------------ |
| feat     | `:sparkles:`             |
| fix      | `:bug:`                  |
| refactor | `:recycle:`              |
| test     | `:white_check_mark:`     |
| chore    | `:wrench:`               |
| docs     | `:memo:`                 |
| i18n     | `:globe_with_meridians:` |
| perf     | `:zap:`                  |
| style    | `:art:`                  |

Other accepted types: `build`, `ci`, `revert`.

Examples:

```text
feat(filter-menu): :sparkles: add command palette commands
fix(timeline): resolve playback state reset
docs: clarify dev setup
```

## Pull requests

- **Target the `develop` branch**, not `main`. Contributor PRs are merged into
  `develop`; the maintainer promotes `develop` to `main` for releases.
- Include a clear description of what changed and why, and reference related
  issues (`Fixes #123`).
- Add screenshots or GIFs for UI changes.
- Make sure `pnpm run lint`, `pnpm run typecheck`, and `pnpm test` pass locally.
  CI runs the same checks plus builds and a boot smoke test.

## Plugin architecture

Most features are plugins. Each plugin is a self-contained folder under
`src/plugins/<plugin-name>/` containing the plugin class, its own CSS file, its
tests in `__tests__/`, and its translations in `locales/`. Locale source files
are named `<lang>.src.json`, one per entry in `SUPPORTED_LOCALES` in
`src/locales/locales.ts`, and are compiled into the app's translation tables with `pnpm run generate-t7e`.
Do not reference translation keys that do not exist in the generated
`src/locales/keys.ts`. New plugins are registered in `src/plugins/plugins.ts`.
Adding a plugin is the recommended way to add a feature; for changes to the
engine or rendering pipeline, open an issue first to discuss the approach.

## The pro submodule

Some commercial features live in a private submodule at `src/plugins-pro`. As an
open-source contributor you will not have access to it, and that is expected:
the OSS build, tests, and dev server all work with that folder empty. CI runs a
dedicated job that simulates exactly this setup, so you can develop and submit
PRs without it.

## Finding something to work on

- Issues labeled [Good First Issue](https://github.com/thkruz/keeptrack.space/labels/Good%20First%20Issue)
  are a good starting point.
- Browse [open issues](https://github.com/thkruz/keeptrack.space/issues) for bugs
  and feature requests.
- Ask questions in [GitHub Discussions](https://github.com/thkruz/keeptrack.space/discussions)
  or on [Discord](https://discord.gg/G4tJfSkmzx).
- For security issues, email <admin@keeptrack.space> privately instead of opening
  an issue.

## License

KeepTrack is licensed under AGPL-3.0. By contributing, you agree that your
contributions are licensed under the same terms.
