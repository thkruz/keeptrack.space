# KeepTrack Plugin API (`@keeptrack/plugin-api`)

External plugins (installed with `npm run plugin -- add` into `src/plugins-external/<name>`) build against one
versioned module, `@keeptrack/plugin-api`, instead of KeepTrack's internal paths. Internal code can then be
refactored without breaking your plugin, and `plugin add` can tell a user up front whether your plugin fits
their KeepTrack.

Source: [`src/plugin-api/index.ts`](../src/plugin-api/index.ts) (every export carries a doc comment).

## Import rule

A plugin's files may import only:

| Specifier | Use |
| --- | --- |
| `@keeptrack/plugin-api` | everything app-related (below) |
| `@keeptrack/plugin-api/testing` | unit tests only |
| `ootk` | astrodynamics classes and math (`Satellite`, `CatalogSource`, `Degrees`, ...) |
| `vitest` | tests |
| `./...`, `../...` | your own files and assets (icons, CSS), inside the plugin folder |

Anything else (`@app/*`, `@engine/*`, `@ootk/*`, `@public/*`, `@test/*`, a relative path that climbs out of
the plugin folder, a non-literal `import()`) is rejected. The rule is the Biome grit plugin
`biome-plugins/plugin-api-imports.grit`, run by:

- `npm run plugin -- doctor <name>`: reports each offending import with the facade replacement.
- `npm run plugin -- add` / `update`: refuses the install (override with `--force`).

`ootk` resolves to the copy inside KeepTrack, so your plugin and the app share one instance (`instanceof`
works across the boundary). Ship your own icon: copy the PNG into your plugin and import it relatively.

## What is exported

**Plugin base:** `KeepTrackPlugin`, `TopMenuPlugin`, `MenuMode`, `IconPlacement`, `UtilityGroup`, and the
capability config types `IBottomIconConfig`, `ISideMenuConfig`, `ISecondaryMenuConfig`, `IDragOptions`,
`ClickDragOptions`, `IContextMenuConfig`, `RmbMenuContext`, `IHelpConfig`, `IHelpSection`, `IHelpImage`,
`IHelpShortcut`, `IKeyboardShortcut`, `ICommandPaletteCommand`, `ISettingsContribution`, `ISettingControl`
(+ `ISettingToggleControl`, `ISettingNumberControl`, `ISettingSelectControl`, `ISettingButtonControl`).

**Events:** `EventBus`, `EventBusEvent`, `EngineEventMap` (payload types).

**Services and settings:** `keepTrackApi` (toast, event shortcuts, `getPlugin`, manager getters), its type
`KeepTrackApi`, and `settingsManager`.

**Helpers** (thin wrappers over the managers; same behaviour as the built-in plugins get):

| Area | Exports |
| --- | --- |
| Selection | `getSelectedSat()`, `selectSat(id)`, `selectSatByNorad(norad)`, `findObjectIdByNorad(norad)`, `getSatByNorad(norad)`, `isCurrentSelection(obj)` |
| Time | `getSimTime()` (a copy of the sim clock), `jumpToTime(dateOrMs)` (keeps play/pause) |
| Sensor | `getSensor()` |
| Toast | `toast(message, type?, isLong?, action?)`, `ToastMsgType`, `ToastAction` |
| Info box | `addSatInfoBoxSection({ html, order, collapsibleSectionId?, onReady? })` |
| Tooltips | `createTooltip(el)` for DOM you add after the menu is built |

**DOM/UI:** `getEl`, `html`, `showLoading`, `hideLoading`, `initMaterialSelects`, `buildSideMenuTabsHtml`,
`initSideMenuTabs`, `SideMenuTabDef`, `openColorbox`, `closeColorbox`.

**Files:** `saveCsv`, `saveXlsx`, `saveVariable`, `copyTsvToClipboard`.

**Errors/logging:** `errorManagerInstance`.

**Persistence:** `createPluginStorage(configKey)` returns `getItem`/`setItem`/`removeItem`/`getJson`/`setJson`/
`keys`/`clear`, namespaced to your plugin. It is device-local, honours `isBlockPersistence`, and is cleared
along with the rest of the app's saved state when a new KeepTrack version wipes storage.

**Locales:** `t7e(key)` for host keys (e.g. `help.overview`), `pluginT7e(configKey)` for your own
`plugins.<configKey>.*` keys (plain strings, no casts), `TranslationKey`.

**Types:** `BaseObject`, `Satellite` (types only; import the classes from `ootk`), `DetailedSensor`.

**Version:** `PLUGIN_API_VERSION`.

Missing something? Open an issue naming the plugin that needs it. The facade grows by demand, one deliberate
export at a time; it never re-exports internals in bulk.

## Versioning

`PLUGIN_API_VERSION` is semver (currently `1.0.0`), separate from the app version:

- **Major:** an export is removed or renamed, or its signature or behaviour changes incompatibly.
- **Minor:** an export (or an optional parameter or field) is added.
- **Patch:** docs or a fix with no contract change.

Declare the range you build against in `keeptrack-plugin.json` (the scaffold writes it for you):

```json
{
  "engine": ">=13.0.0 <14.0.0",
  "pluginApi": "^1.0.0"
}
```

`plugin add` and `update` refuse a host whose `PLUGIN_API_VERSION` is outside `pluginApi` (unless `--force`),
and `doctor` reports it. There is no "same major, warn" tier as there is for `engine`: needing `^1.3.0` on a
`1.2.0` host means you use an export that host lacks. `pluginApi` is optional (older plugins omit it; `doctor`
warns). The build itself never blocks on it. `engine` stays as the coarse app-version gate.

## Testing kit

`@keeptrack/plugin-api/testing` re-exports the host's jsdom environment and the standard suites, so tests
never import `@test/*`:

- `setupStandardEnvironment(deps?)`: fresh app environment (settings, event bus, mocked managers with a
  sample catalog). Call in `beforeEach`.
- `setupDefaultHtml()`: rebuild just the default DOM skeleton.
- `standardPluginSuite(Plugin, configKey)`, `standardPluginSmokeSuite(...)`,
  `standardPluginMenuButtonTests(...)`: the lifecycle and drawer-icon tests every built-in plugin runs.
- `websiteInit(plugin)`: boot a minimal engine, init the plugin, and emit the UI lifecycle events.

```ts
import { EventBus, EventBusEvent } from '@keeptrack/plugin-api';
import { setupStandardEnvironment, standardPluginSuite } from '@keeptrack/plugin-api/testing';
import { MyPlugin } from '../src/plugin';

describe('MyPlugin', () => {
  beforeEach(() => setupStandardEnvironment());
  standardPluginSuite(MyPlugin, 'MyPlugin');
});
```

Run them with `npm run plugin -- test <name>`.
