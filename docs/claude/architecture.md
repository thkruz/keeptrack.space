# Where code belongs

Agents tend to put new code next to whatever file they opened first. In this codebase that
spreads domain logic into the engine and math into UI files. Decide where the code goes
before writing it.

## The layers

| Path | Holds | Must not hold |
|------|-------|---------------|
| `src/engine/ootk` | OOTK, the orbital toolkit (git submodule, separate repository): propagation, coordinate transforms, orbit determination and design, maneuvers, time systems | anything that touches the DOM, KeepTrack settings, or the catalog |
| `src/engine` | reusable infrastructure: rendering, camera, input, events, plugin base classes, persistence, workers, generic UI helpers | satellite-, sensor- or feature-specific behaviour, plugin names, menu content |
| `src/app` | the KeepTrack application: catalog loading, sensors, search, app-level UI | code that only one plugin uses |
| `src/plugins/<name>` | one feature per folder: class, CSS, `__tests__/`, `locales/` | shared helpers other plugins import (move those to `src/app`) |
| `src/plugins-external`, `docs/plugin-api.md` | the versioned public plugin API | imports of internal `@app` or `@engine` modules |

### Math goes to OOTK

- **Do** put new, reusable astrodynamics math (frames, propagation, look angles, passes,
  conjunction geometry, orbit design) in OOTK, with tests there, and call it from KeepTrack.
- **Don't** write a new Kepler solver, frame rotation or pass search inside a plugin or in
  `src/engine/math` because it was quicker. If OOTK lacks something, say so in your pull
  request and propose the OOTK change; the maintainer decides whether it goes into OOTK first.
- **Don't** edit files under `src/engine/ootk` as part of a KeepTrack pull request. It is a
  submodule; changes go to the OOTK repository.
- After the OOTK pointer moves, run `pnpm install --frozen-lockfile` inside `src/engine/ootk`
  before its lint or build.

### The engine stays generic

- **Do** ask "would a different visualisation app want this?" before adding to `src/engine`.
  If the answer is no, it belongs in `src/app` or a plugin.
- **Don't** import from `@app/...` or `src/plugins/...` inside new engine code, and don't name
  specific plugins, menus or satellite types there. Use events (`src/engine/events`) or a
  plugin capability so the app plugs into the engine, not the other way round.
- Some older engine files predate this rule. Do not copy their pattern into new code, and do
  not mass-move them in an unrelated pull request.

### Plugins

- **Do** make a feature a plugin when it can be one. Register it in `src/plugins/plugins.ts`.
- **Do** give each plugin its own CSS file (`plugin-name.css`) imported from the plugin's main
  file.
- **Don't** assume every plugin fits the bottom icon plus side menu pattern; check what the
  feature needs before copying another plugin.
- When a plugin uses `onBottomIconClick()`, bridge it to the legacy event system:
  `bottomIconCallback = (): void => { this.onBottomIconClick(); };`
- Add `getKeyboardShortcuts()` when a natural shortcut exists, chosen for what a user would
  guess ('M' for mute), not for what is free.

### Private code

`src/plugins-pro` is a private submodule. The open-source build, tests and dev server work with
it empty, and CI has a job that checks exactly that.

- **Don't** import from it, write code that requires it, or try to fetch it.
- **Don't** try to work around its absence by stubbing files into that folder.

### Build-time values

Prefer rspack `DefinePlugin` (configured in `build/webpack-manager.ts`) for values known at
build time, and always wrap them with `JSON.stringify()`.
