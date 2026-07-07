# locale-matrix

Render a single **v13** (`kt-ui-v13`) side menu across many UI languages and
stitch a labeled contact sheet, so translation-driven layout breakage
(overflowing cards, too-wide submit buttons, struck-through floating labels,
clipped controls) is a **glance instead of a 12-language click-through**.

It is the locale sibling of `scripts/inspect.ts` (same warm-dev-server +
`settingsOverride`-route boot). KeepTrack switches locale by
`i18next.changeLanguage()` **plus a full page reload** (there is no live
re-render of an open menu), so this tool boots the app **once per language**,
seeding the i18next cache in `localStorage`/cookie before any app script runs.

## Usage

```bash
npm run start:pro                       # warm dev server on :5544 (background)

npm run locale-matrix -- <preset>            # default: ALL 12 UI languages
npm run locale-matrix -- <preset> --quick    # en + overflow-prone subset (fast loop)
npm run locale-matrix -- <preset> --langs=de,ru,zh
npm run locale-matrix -- <preset> --out=dir  # override output folder
npm run locale-matrix -- <preset> --no-fail  # always exit 0 (don't gate)
npm run locale-matrix -- --list              # list presets
npm run locale-matrix -- '{"id":"x","plugin":"...","menuRoot":"..."}'   # inline spec
```

## Whole-app coverage (`--sweep`)

Presets don't scale to 100+ plugins. `--sweep` covers the **entire application**
automatically: it boots the app **once per language** and drives **every** v13
menu discovered live from the DOM (`.side-menu-parent.kt-ui-v13`), so new plugins
are covered the day they ship — no preset needed.

```bash
npm run locale-matrix -- --sweep            # every v13 menu × all 12 languages
npm run locale-matrix -- --sweep --quick    # every v13 menu × 7-lang subset (faster)
npm run locale-matrix -- --sweep --catalog  # also cover menus that need a loaded catalog
```

Menus are opened via their owning plugin (resolved through the `getPluginList()`
debug API on `window.keepTrack.api`) so Materialize selects and wiring render
correctly. The few menus needing setup (a selected sat, a sensor, a catalog)
declare it in the `preconditions` block of [`presets.json`](./presets.json),
keyed by menu root; everything else opens bare.

Output in `test-results/locale-matrix/_sweep/`:

- `index.html` — **the whole-app dashboard**: one row per v13 menu, a per-language
  status dot (green clean / red fail / orange skipped), a link to each failing
  menu's grid, and the list of **legacy menus not yet migrated to v13** (the
  migration backlog).
- `report.json` — machine-readable: per-menu per-language pass/flags, skipped
  menus with reasons, and the legacy backlog.
- `<menu-root>/grid.png` + per-language PNGs — written **only for menus that
  fail**, so the output stays focused on what needs attention.

Exit code is non-zero if any menu has a failing language (CI gate). A full 12-lang
sweep drives ~70 menus per language and takes a few minutes per language, so it's
a periodic/CI job — use single-menu runs (or `--quick`) for tight iteration.

Output lands in `test-results/locale-matrix/<id>/` (gitignored):

- `grid.png` — the stitched contact sheet, one cell per language, PASS/FAIL badge + flags
- `report.json` — machine-readable per-language flags + summary
- `<code>.png` — the raw per-language menu screenshot

**Default** is all 12 UI languages — a silently-missing locale is exactly what
this tool exists to catch, so full coverage is the safe default. Use `--quick`
for the `en` + overflow-prone subset (`de ja ko ru uk zh`) during tight
iteration. Exit code is non-zero when any language trips a heuristic, so it can
gate CI.

## Adding a preset

Presets live in [`presets.json`](./presets.json). Add a row when you migrate a
menu to the v13 card style:

```json
"my-plugin": {
  "plugin": "MyPluginId",          // getPluginByName() name; opened via openSideMenu()
  "menuRoot": "my-plugin-menu",    // the side-menu-parent element id (screenshot + heuristic scope)
  "catalog": true,                 // optional: menu needs a loaded catalog
  "selectSat": "25544",            // optional: menu needs a selected satellite (implies catalog)
  "evaluate": ["/* extra drive-step JS, string-form */"]
}
```

## Heuristics

Scoped to the menu root, each language is flagged for:

| flag                | meaning |
| ------------------- | ------- |
| `horizontalOverflow`| an element's content is wider than its own visible box (native form controls are exempt — they clip/collapse by design) |
| `overflowsRoot`     | an element's right edge extends past the menu card (e.g. a too-wide button) |
| `offViewport`       | the menu itself is clipped by the viewport |
| `labelOverlap`      | a floating label box overlaps an unrelated input (the v13 dense-form struck-through-label bug) |

A language **passes** only with zero flags. Non-benign console output is reported
separately and never flips a layout verdict.
