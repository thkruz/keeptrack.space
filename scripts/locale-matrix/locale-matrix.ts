/**
 * locale-matrix: render a single v13 (kt-ui-v13) side menu across many UI
 * languages and stitch a labeled contact sheet so translation-driven layout
 * breakage (overflowing cards, too-wide submit buttons, struck-through floating
 * labels, clipped controls) is a glance instead of a 12-language click-through.
 *
 * KeepTrack switches locale by i18next.changeLanguage() + a full page reload
 * (see src/plugins-pro/debug/debug.ts) - there is no live re-render of an open
 * menu. So this tool boots the app once per language (seeding the i18next cache
 * in localStorage/cookie BEFORE any app script runs), drives into the target
 * menu, screenshots it, runs in-page overflow heuristics, then composes one grid
 * image. It is the locale sibling of scripts/inspect.ts and reuses the same
 * warm-dev-server + settingsOverride-route boot pattern.
 *
 * Prereq: a warm PRO dev server on :5544
 *   npm run start:pro          (background, rebuilds on edit via --watch)
 *
 * Usage:
 *   npm run locale-matrix -- <preset>                 # default: all 12 UI languages
 *   npm run locale-matrix -- <preset> --quick         # en + overflow-prone subset (fast loop)
 *   npm run locale-matrix -- <preset> --langs=de,ru,zh
 *   npm run locale-matrix -- <preset> --out=some/dir  # override output folder
 *   npm run locale-matrix -- --list                   # list presets
 *   npm run locale-matrix -- '{"id":"x","plugin":"...","menuRoot":"..."}'   # inline spec
 *
 * Exit code is non-zero when any language fails a heuristic (so it can gate CI);
 * pass --no-fail to always exit 0.
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, type ConsoleMessage, chromium } from 'playwright';
import { DEFAULT_ALLOWLIST } from '../../test/e2e/console-listener';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '..', '..');
const PRESETS_FILE = path.join(SCRIPT_DIR, 'presets.json');
const DEFAULT_OUT_ROOT = path.join(ROOT_DIR, 'test-results', 'locale-matrix');

/**
 * All 12 UI languages, kept in lockstep with SUPPORTED_LOCALES in
 * src/locales/locales.ts. Hardcoded (not imported) so this Node CLI never pulls
 * the i18next init graph. `overflowProne` marks the languages where translated
 * strings run longest or use CJK glyphs - the default fast subset.
 */
const LOCALES: { code: string; nativeName: string; overflowProne?: boolean }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch', overflowProne: true },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'ja', nativeName: '日本語', overflowProne: true },
  { code: 'ko', nativeName: '한국어', overflowProne: true },
  { code: 'ru', nativeName: 'Русский', overflowProne: true },
  { code: 'uk', nativeName: 'Українська', overflowProne: true },
  { code: 'zh', nativeName: '中文', overflowProne: true },
  { code: 'pl', nativeName: 'Polski' },
  { code: 'cs', nativeName: 'Čeština' },
  { code: 'it', nativeName: 'Italiano' },
];

interface Spec {
  id: string;
  plugin: string;
  menuRoot: string;
  catalog?: boolean;
  catalogWaitMs?: number;
  selectSat?: string;
  evaluate?: string[];
  settleMs?: number;
  viewport?: { width: number; height: number };
}

interface Flag {
  type: 'horizontalOverflow' | 'overflowsRoot' | 'offViewport' | 'labelOverlap';
  el: string;
  by?: number;
}

interface LangResult {
  code: string;
  nativeName: string;
  pass: boolean;
  flags: Flag[];
  /** A genuine failure to capture/evaluate the menu (not console noise). */
  error?: string;
  pngFile: string;
  pngBase64: string;
}

const log = (msg: string): void => {
  // eslint-disable-next-line no-console
  console.log(msg);
};

const GIT_SHA = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
const CAPTURE_DATE = new Date().toISOString().slice(0, 10);

/** Benign console noise that is normal in the headless/SwiftShader test env. */
const isBenign = (text: string): boolean =>
  DEFAULT_ALLOWLIST.some((e) => e.pattern.test(text)) ||
  (/40[34]\b/u).test(text) ||
  (/Failed to load resource/u).test(text) ||
  (/Select a satellite first/u).test(text);

interface PresetsFile {
  presets: Record<string, Omit<Spec, 'id'>>;
}

const loadPresets = (): Record<string, Omit<Spec, 'id'>> => {
  const raw = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8')) as PresetsFile;

  return raw.presets ?? {};
};

interface ParsedArgs {
  specArg: string | null;
  langCodes: string[];
  outDir: string | null;
  fail: boolean;
  sweep: boolean;
  catalog: boolean;
}

/** Parse CLI args. In --sweep (whole-app) mode the positional preset is optional. */
const parseArgs = (): ParsedArgs => {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')));
  const kv = new Map(
    args
      .filter((a) => a.startsWith('--') && a.includes('='))
      .map((a) => {
        const i = a.indexOf('=');

        return [a.slice(2, i), a.slice(i + 1)] as [string, string];
      }),
  );
  const positional = args.filter((a) => !a.startsWith('--'));

  if (flags.has('--list')) {
    const presets = loadPresets();

    log('Available presets:');
    for (const [name, p] of Object.entries(presets)) {
      log(`  ${name.padEnd(20)} plugin=${p.plugin} menuRoot=${p.menuRoot}${p.catalog ? ' (catalog)' : ''}`);
    }
    log('\n--sweep discovers and covers ALL v13 menus automatically (no preset needed).');
    process.exit(0);
  }

  const sweep = flags.has('--sweep');
  const specArg = positional[0] ?? null;

  if (!sweep && !specArg) {
    throw new Error(
      'Usage: npm run locale-matrix -- <preset|inline-json> [--all|--quick|--langs=de,ru] [--out=dir] [--no-fail]\n' +
      '       npm run locale-matrix -- --sweep [--catalog] [--quick|--langs=...] [--out=dir]   (whole-app coverage)\n' +
      '       npm run locale-matrix -- --list',
    );
  }

  let langCodes: string[];

  if (kv.has('langs')) {
    langCodes = kv.get('langs')!.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (flags.has('--quick')) {
    // Fast iteration loop: en baseline + the overflow-prone subset only.
    langCodes = LOCALES.filter((l) => l.code === 'en' || l.overflowProne).map((l) => l.code);
  } else {
    // Default: ALL supported UI languages - a silently-missing locale is exactly
    // what this tool exists to catch, so full coverage is the safe default.
    // (--all is accepted as an explicit alias for this.)
    langCodes = LOCALES.map((l) => l.code);
  }

  const unknown = langCodes.filter((c) => !LOCALES.some((l) => l.code === c));

  if (unknown.length) {
    throw new Error(`Unknown language code(s): ${unknown.join(', ')}. Known: ${LOCALES.map((l) => l.code).join(', ')}`);
  }

  return {
    specArg,
    langCodes,
    outDir: kv.get('out') ?? null,
    fail: !flags.has('--no-fail'),
    sweep,
    catalog: flags.has('--catalog'),
  };
};

const resolveSpec = (specArg: string): Spec => {
  if (specArg.trimStart().startsWith('{')) {
    const spec = JSON.parse(specArg) as Spec;

    if (!spec.id || !spec.plugin || !spec.menuRoot) {
      throw new Error('Inline spec requires id, plugin, and menuRoot');
    }

    return spec;
  }

  const presets = loadPresets();
  const preset = presets[specArg];

  if (!preset) {
    throw new Error(`Unknown preset "${specArg}". Run --list to see presets, or pass an inline JSON spec.`);
  }

  return { id: specArg, ...preset };
};

const buildOverride = (spec: Spec): Record<string, unknown> => ({
  isAutoStart: true,
  noCatalogOnLoad: spec.catalog !== true,
  minLogLevel: 'WARN',
  isDisablePerformanceDowngrade: true,
  isDisableLoginGate: true,
  isDisableOnboarding: true,
  plugins: {},
});

/**
 * In-page overflow heuristics, scoped to the menu root. Returns layout-failure
 * flags. Runs as a string (dodges the tsx `__name` helper trap that breaks
 * function-form page.evaluate under the warm dev server).
 */
const heuristicsScript = (menuRoot: string): string => `(() => {
  const root = document.getElementById(${JSON.stringify(menuRoot)});
  if (!root) { return { error: 'menu root not found: ' + ${JSON.stringify(menuRoot)} }; }
  const rootRect = root.getBoundingClientRect();
  if (rootRect.width < 2 || rootRect.height < 2) { return { error: 'menu root not visible (0-size)' }; }
  const flags = [];
  const seen = new Set();
  const desc = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) { s += '#' + el.id; }
    else if (typeof el.className === 'string' && el.className.trim()) { s += '.' + el.className.trim().split(/\\s+/u).slice(0, 2).join('.'); }
    const txt = (el.textContent || '').trim().replace(/\\s+/gu, ' ').slice(0, 24);
    if (txt) { s += ' "' + txt + '"'; }
    return s;
  };
  const push = (type, el, by) => {
    const key = type + '|' + desc(el);
    if (seen.has(key)) { return; }
    seen.add(key);
    flags.push(by === undefined ? { type: type, el: desc(el) } : { type: type, el: desc(el), by: by });
  };
  const all = root.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    // Native form controls manage their own overflow and are NOT layout breaks:
    //  - checkbox/radio inputs (incl. Materialize toggle switches) collapse the
    //    real <input> to ~0 width with a nonzero scrollWidth;
    //  - <select>/<textarea> clip long option/wrapped text inside a fixed box,
    //    so scrollWidth just reports their widest content, not a broken layout.
    // A control that pushes past the card edge is still caught by check #2.
    const selfOverflowExempt = tag === 'select' || tag === 'textarea' || (tag === 'input' && (type === 'checkbox' || type === 'radio'));
    // 1. Content wider than its own VISIBLE box, and not an intentional scroller.
    if (el.clientWidth > 4 && !selfOverflowExempt && el.scrollWidth - el.clientWidth > 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
      push('horizontalOverflow', el, el.scrollWidth - el.clientWidth);
    }
    // 2. Element extends past the menu card's right edge (too-wide button/row).
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right - rootRect.right > 2) { push('overflowsRoot', el, Math.round(r.right - rootRect.right)); }
  }
  // 3. Menu itself clipped by the viewport.
  if (rootRect.right > window.innerWidth + 2 || rootRect.bottom > window.innerHeight + 2 || rootRect.left < -2) {
    push('offViewport', root);
  }
  // 4. Struck-through floating label: a label box overlapping an unrelated input
  //    (the v13 dense-form bug where a floating label sits over the field above).
  const labels = root.querySelectorAll('label');
  const fields = Array.from(root.querySelectorAll('input, select, textarea'));
  for (const label of labels) {
    const lr = label.getBoundingClientRect();
    if (lr.width < 2 || lr.height < 2) { continue; }
    for (const f of fields) {
      if (label.contains(f) || (label.htmlFor && label.htmlFor === f.id)) { continue; }
      const fr = f.getBoundingClientRect();
      const overlapX = Math.min(lr.right, fr.right) - Math.max(lr.left, fr.left);
      const overlapY = Math.min(lr.bottom, fr.bottom) - Math.max(lr.top, fr.top);
      if (overlapX > 4 && overlapY > 4) { push('labelOverlap', label); break; }
    }
  }
  return { flags: flags.slice(0, 12) };
})()`;

const bootAndCapture = async (browser: Browser, spec: Spec, code: string, nativeName: string): Promise<LangResult> => {
  const viewport = spec.viewport ?? { width: 1600, height: 1000 };
  const context = await browser.newContext({ viewport });

  // Seed the i18next language cache BEFORE any app script runs, so the app boots
  // straight into `code`. Mirrors how the app persists a language choice
  // (localStorage `i18nextLng` + `i18next` cookie via i18next-browser-languagedetector).
  await context.addInitScript((lng: string) => {
    try {
      localStorage.setItem('i18nextLng', lng);
    } catch { /* private-mode guard */ }
    document.cookie = `i18next=${lng};path=/;max-age=3600`;
  }, code);

  const page = await context.newPage();
  const violations: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type();

    if ((type === 'warning' || type === 'error') && !isBenign(msg.text())) {
      violations.push(msg.text());
    }
  });

  const override = buildOverride(spec);

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify(override)};`,
    });
  });

  try {
    await page.goto(`${BASE_URL}?lng=${code}`);
    await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
    await page.waitForFunction(
      () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
      { timeout: 20_000 },
    );

    if (spec.catalog === true) {
      await page.waitForFunction(
        () =>
          ((window as unknown as { keepTrack: { api: { getCatalogManager(): { objectCache: unknown[] } } } })
            .keepTrack.api.getCatalogManager().objectCache.length) > 1000,
        { timeout: 30_000 },
      );
      await page.waitForTimeout(spec.catalogWaitMs ?? 4_000);
    }

    if (spec.selectSat) {
      await page.evaluate(`(() => {
        const api = window.keepTrack.api;
        const id = api.getCatalogManager().sccNum2Id(${JSON.stringify(spec.selectSat)});
        if (id === null || id === -1) { throw new Error('sat not found: ' + ${JSON.stringify(spec.selectSat)}); }
        api.getPluginByName('SelectSatManager').selectSat(id);
      })()`);
      await page.waitForTimeout(1_200);
    }

    // Open the target menu via the plugin (drawer-safe), falling back to just
    // un-hiding the side-menu-parent if the plugin lacks openSideMenu.
    await page.evaluate(`(() => {
      const api = window.keepTrack.api;
      const p = api.getPluginByName(${JSON.stringify(spec.plugin)});
      if (!p) { throw new Error('plugin not found: ' + ${JSON.stringify(spec.plugin)}); }
      if (typeof p.openSideMenu === 'function') { p.openSideMenu(); }
      else { const el = document.getElementById(${JSON.stringify(spec.menuRoot)}); if (el) { el.classList.remove('start-hidden'); } }
    })()`);
    await page.waitForTimeout(1_100);

    for (const js of spec.evaluate ?? []) {
      await page.evaluate(js);
    }

    await page.waitForTimeout(spec.settleMs ?? 900);

    const menu = page.locator(`#${spec.menuRoot}`);
    let pngBase64 = '';
    let error: string | undefined;

    if (await menu.count() > 0) {
      const buf = await menu.screenshot();

      pngBase64 = buf.toString('base64');
    } else {
      error = `menu element #${spec.menuRoot} not found in DOM`;
    }

    const heur = (await page.evaluate(heuristicsScript(spec.menuRoot))) as { flags?: Flag[]; error?: string };
    const flags = heur.flags ?? [];
    // `error` is a genuine capture/evaluate failure only. Non-benign console
    // output is surfaced separately (see below) and never flips a layout verdict.
    const finalError = error ?? heur.error;

    if (violations.length) {
      log(`    (${violations.length} non-benign console message(s), e.g. "${violations[0].slice(0, 80)}")`);
    }

    return {
      code,
      nativeName,
      pass: flags.length === 0 && !finalError,
      flags,
      error: finalError,
      pngFile: `${code}.png`,
      pngBase64,
    };
  } catch (e) {
    return {
      code,
      nativeName,
      pass: false,
      flags: [],
      error: e instanceof Error ? e.message : String(e),
      pngFile: `${code}.png`,
      pngBase64: '',
    };
  } finally {
    await context.close();
  }
};

const badge = (pass: boolean): string =>
  pass
    ? '<span class="badge pass">PASS</span>'
    : '<span class="badge fail">FAIL</span>';

const cellHtml = (r: LangResult): string => {
  const img = r.pngBase64
    ? `<img src="data:image/png;base64,${r.pngBase64}" alt="${r.code}">`
    : '<div class="none">(no screenshot)</div>';
  const items: string[] = [];

  if (r.error) {
    items.push(`<li class="err">⚠ ${escapeHtml(r.error)}</li>`);
  }
  for (const f of r.flags) {
    const by = typeof f.by === 'number' ? ` (+${f.by}px)` : '';

    items.push(`<li>${f.type}${by}: <code>${escapeHtml(f.el)}</code></li>`);
  }
  const flagsHtml = items.length ? `<ul class="flags">${items.join('')}</ul>` : '<div class="ok">no layout flags</div>';

  return `<div class="cell ${r.pass ? 'pass' : 'fail'}">
    <div class="hd"><span>${r.code} · ${escapeHtml(r.nativeName)}</span>${badge(r.pass)}</div>
    ${img}
    ${flagsHtml}
  </div>`;
};

const escapeHtml = (s: string): string =>
  s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;');

const gridHtml = (spec: Spec, results: LangResult[], cols: number): string => {
  const failCount = results.filter((r) => !r.pass).length;

  return `<style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0b0e14; font-family: 'Segoe UI', system-ui, sans-serif; padding: 16px; color: #e6e6e6; }
    h1 { font-size: 15px; margin: 0 0 4px; font-weight: 600; }
    .sub { font-size: 12px; color: #7d8798; margin: 0 0 14px; }
    .sub .fail { color: #ff8f85; font-weight: 600; }
    .sub .pass { color: #7fdb7f; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 12px; }
    .cell { background: #151a23; border: 1px solid #232a36; border-radius: 8px; overflow: hidden; }
    .cell.fail { border-color: #ba160c; }
    .hd { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; font-size: 13px; color: #cfd6e4; border-bottom: 1px solid #232a36; }
    .badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; letter-spacing: 0.04em; }
    .badge.pass { background: #16311a; color: #7fdb7f; }
    .badge.fail { background: #3a1414; color: #ff8f85; }
    .cell img { display: block; width: 100%; height: auto; background: #0b0e14; }
    .flags { margin: 0; padding: 8px 10px; font-size: 11px; color: #ff8f85; list-style: none; }
    .flags li { margin: 3px 0; line-height: 1.35; word-break: break-word; }
    .flags li.err { color: #ffb454; }
    .flags code { color: #cfd6e4; font-size: 10px; }
    .ok { padding: 7px 10px; font-size: 11px; color: #5a6373; }
    .none { padding: 24px 10px; font-size: 12px; color: #7d8798; text-align: center; }
  </style>
  <h1>Locale × UI matrix — ${escapeHtml(spec.id)} (menu #${escapeHtml(spec.menuRoot)})</h1>
  <p class="sub">${CAPTURE_DATE} · ${GIT_SHA} · ${results.length} languages · <span class="${failCount ? 'fail' : 'pass'}">${failCount} fail / ${results.length - failCount} pass</span></p>
  <div class="grid">${results.map(cellHtml).join('')}</div>`;
};

const composeGrid = async (browser: Browser, spec: Spec, results: LangResult[], outDir: string): Promise<string> => {
  const cols = Math.min(3, results.length);
  const context = await browser.newContext({ viewport: { width: cols * 440 + 40, height: 1000 } });
  const page = await context.newPage();

  await page.setContent(gridHtml(spec, results, cols), { waitUntil: 'load' });
  await page.waitForTimeout(200);
  const gridPath = path.join(outDir, 'grid.png');

  await page.screenshot({ path: gridPath, fullPage: true });
  await context.close();

  return gridPath;
};

const runSingle = async (parsed: ParsedArgs): Promise<void> => {
  const spec = resolveSpec(parsed.specArg!);
  const outDir = parsed.outDir ? path.resolve(ROOT_DIR, parsed.outDir) : path.join(DEFAULT_OUT_ROOT, spec.id);

  fs.mkdirSync(outDir, { recursive: true });

  const langs = parsed.langCodes.map((c) => LOCALES.find((l) => l.code === c)!);

  log(`[locale-matrix] ${spec.id}: ${langs.length} languages (${langs.map((l) => l.code).join(' ')}), catalog=${spec.catalog === true ? 'ON' : 'off'}`);

  let browser: Browser | null = null;
  const results: LangResult[] = [];

  try {
    browser = await chromium.launch();

    // Sequential: SwiftShader is GPU-bound and concurrent app boots thrash it.
    for (const l of langs) {
      const t0 = Date.now();
      const r = await bootAndCapture(browser, spec, l.code, l.nativeName);

      results.push(r);
      const status = r.pass ? 'PASS' : `FAIL (${r.error ?? `${r.flags.length} flag(s)`})`;

      log(`  ${l.code.padEnd(3)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${status}`);

      if (r.pngBase64) {
        fs.writeFileSync(path.join(outDir, r.pngFile), Buffer.from(r.pngBase64, 'base64'));
      }
    }

    const gridPath = await composeGrid(browser, spec, results, outDir);

    log(`[locale-matrix] wrote ${path.relative(ROOT_DIR, gridPath)}`);
  } finally {
    await browser?.close();
  }

  const report = {
    id: spec.id,
    menuRoot: spec.menuRoot,
    plugin: spec.plugin,
    date: CAPTURE_DATE,
    gitSha: GIT_SHA,
    summary: {
      total: results.length,
      pass: results.filter((r) => r.pass).length,
      fail: results.filter((r) => !r.pass).length,
    },
    results: results.map((r) => ({ code: r.code, nativeName: r.nativeName, pass: r.pass, error: r.error, flags: r.flags, screenshot: r.pngFile })),
  };

  fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  log(`[locale-matrix] wrote ${path.relative(ROOT_DIR, path.join(outDir, 'report.json'))}`);

  const failures = results.filter((r) => !r.pass);

  if (failures.length) {
    log(`\n[locale-matrix] ⚠ ${failures.length} language(s) with layout issues: ${failures.map((r) => r.code).join(', ')}`);
    if (parsed.fail) {
      process.exitCode = 1;
    }
  } else {
    log('\n[locale-matrix] ✓ all languages clean');
  }
};

// ---------------------------------------------------------------------------
// --sweep : whole-app coverage. Boot once per language, then discover and drive
// EVERY v13 menu in that single instance (menus are all in the DOM at boot,
// hidden). Menus are discovered live from the DOM, so new plugins are covered
// automatically; presets.json only supplies per-menu preconditions for the few
// menus that need a selected sat / sensor / catalog.
// ---------------------------------------------------------------------------

interface Precondition {
  needsCatalog?: boolean;
  selectSat?: string;
  sensor?: string;
  evaluate?: string[];
  settleMs?: number;
}

interface SweepPerLang {
  pass: boolean;
  flags: Flag[];
  error?: string;
  pngBase64: string;
}

interface SweepMenu {
  root: string;
  pluginId: string | null;
  perLang: Map<string, SweepPerLang>;
}

const loadPreconditions = (): Record<string, Precondition> => {
  const raw = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8')) as { preconditions?: Record<string, Precondition> };

  return raw.preconditions ?? {};
};

/** In-page discovery: every v13 menu root + its owning plugin id, plus legacy roots. */
const DISCOVER_SCRIPT = `(() => {
  const api = window.keepTrack.api;
  const plugins = typeof api.getPluginList === 'function' ? api.getPluginList() : [];
  const byRoot = {};
  for (const p of plugins) { if (p && p.sideMenuElementName) { byRoot[p.sideMenuElementName] = p.id; } }
  const v13 = Array.from(document.querySelectorAll('.side-menu-parent.kt-ui-v13'))
    .map((r) => ({ root: r.id, pluginId: byRoot[r.id] || null }))
    .filter((m) => m.root);
  const legacy = Array.from(document.querySelectorAll('.side-menu-parent:not(.kt-ui-v13)'))
    .map((r) => r.id).filter(Boolean);
  return { v13: v13, legacy: legacy, hasList: typeof api.getPluginList === 'function' };
})()`;

const openMenuScript = (root: string, pluginId: string | null): string => `(() => {
  const api = window.keepTrack.api;
  ${pluginId ? `const p = api.getPluginByName(${JSON.stringify(pluginId)}); if (p && typeof p.openSideMenu === 'function') { p.openSideMenu(); return; }` : ''}
  const el = document.getElementById(${JSON.stringify(root)}); if (el) { el.classList.remove('start-hidden'); }
})()`;

const closeMenuScript = (root: string, pluginId: string | null): string => `(() => {
  const api = window.keepTrack.api;
  ${pluginId ? `const p = api.getPluginByName(${JSON.stringify(pluginId)}); if (p && typeof p.closeSideMenu === 'function') { try { p.closeSideMenu(); } catch (e) { /* ignore */ } }` : ''}
  const el = document.getElementById(${JSON.stringify(root)}); if (el) { el.classList.add('start-hidden'); }
})()`;

const captureMenu = async (page: Page, root: string, pluginId: string | null, settleMs: number): Promise<SweepPerLang> => {
  try {
    await page.evaluate(openMenuScript(root, pluginId));
    await page.waitForTimeout(settleMs);

    let pngBase64 = '';
    let error: string | undefined;
    const menu = page.locator(`#${root}`);
    const visible = await menu.isVisible().catch(() => false);

    if (visible) {
      const buf = await menu.screenshot().catch(() => null);

      if (buf) {
        pngBase64 = buf.toString('base64');
      } else {
        error = 'screenshot failed';
      }
    } else {
      error = 'menu did not become visible';
    }

    const heur = (await page.evaluate(heuristicsScript(root))) as { flags?: Flag[]; error?: string };
    const flags = heur.flags ?? [];
    const finalError = error ?? heur.error;

    await page.evaluate(closeMenuScript(root, pluginId));
    await page.waitForTimeout(120);

    return { pass: flags.length === 0 && !finalError, flags, error: finalError, pngBase64 };
  } catch (e) {
    return { pass: false, flags: [], error: e instanceof Error ? e.message : String(e), pngBase64: '' };
  }
};

const bootSweepPage = async (browser: Browser, code: string, catalog: boolean): Promise<{ context: import('playwright').BrowserContext; page: Page }> => {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

  await context.addInitScript((lng: string) => {
    try {
      localStorage.setItem('i18nextLng', lng);
    } catch { /* private-mode guard */ }
    document.cookie = `i18next=${lng};path=/;max-age=3600`;
  }, code);

  const page = await context.newPage();
  const override = {
    isAutoStart: true,
    noCatalogOnLoad: !catalog,
    minLogLevel: 'WARN',
    isDisablePerformanceDowngrade: true,
    isDisableLoginGate: true,
    isDisableOnboarding: true,
    plugins: {},
  };

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({ contentType: 'application/javascript', body: `window.settingsOverride = ${JSON.stringify(override)};` });
  });

  await page.goto(`${BASE_URL}?lng=${code}`);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 20_000 },
  );

  if (catalog) {
    await page.waitForFunction(
      () =>
        ((window as unknown as { keepTrack: { api: { getCatalogManager(): { objectCache: unknown[] } } } })
          .keepTrack.api.getCatalogManager().objectCache.length) > 1000,
      { timeout: 30_000 },
    ).catch(() => { /* proceed even if catalog is slow; catalog menus will report */ });
    await page.waitForTimeout(3_000);
  }

  return { context, page };
};

const applyPreconditions = async (page: Page, pre: Precondition): Promise<void> => {
  if (pre.sensor) {
    await page.evaluate(`window.keepTrack.api.getSensorManager().setSensor(${JSON.stringify(pre.sensor)})`).catch(() => { /* ignore */ });
    await page.waitForTimeout(300);
  }
  if (pre.selectSat) {
    await page.evaluate(`(() => {
      const api = window.keepTrack.api;
      const id = api.getCatalogManager().sccNum2Id(${JSON.stringify(pre.selectSat)});
      if (id !== null && id !== -1) { api.getPluginByName('SelectSatManager').selectSat(id); }
    })()`).catch(() => { /* ignore */ });
    await page.waitForTimeout(600);
  }
  for (const js of pre.evaluate ?? []) {
    await page.evaluate(js).catch(() => { /* ignore */ });
  }
};

/** Colored status dot for the sweep dashboard. */
const statusDot = (per: SweepPerLang | undefined, skippedReason: string | undefined): string => {
  if (skippedReason) {
    return '<span class="dot skip" title="skipped"></span>';
  }
  if (!per) {
    return '<span class="dot none" title="not captured"></span>';
  }

  return per.pass
    ? '<span class="dot pass"></span>'
    : `<span class="dot fail" title="${escapeHtml((per.error ?? `${per.flags.length} flag(s)`))}"></span>`;
};

const sweepIndexHtml = (
  menus: SweepMenu[],
  langs: { code: string; nativeName: string }[],
  skipped: Map<string, string>,
  legacy: string[],
  catalog: boolean,
): string => {
  const rows = menus.map((m) => {
    const reason = skipped.get(m.root);
    const dots = langs.map((l) => `<td class="d">${statusDot(m.perLang.get(l.code), reason)}</td>`).join('');
    const failLangs = langs.filter((l) => { const p = m.perLang.get(l.code); return p && !p.pass; }).map((l) => l.code);
    const status = reason
      ? `<span class="tag skip">skipped: ${escapeHtml(reason)}</span>`
      : failLangs.length
        ? `<a class="tag fail" href="./${encodeURIComponent(m.root)}/grid.png">${failLangs.length} lang fail →</a>`
        : '<span class="tag pass">clean</span>';

    return `<tr>
      <td class="root"><code>${escapeHtml(m.root)}</code>${m.pluginId ? '' : ' <span class="noplug" title="no owning plugin resolved">?</span>'}</td>
      ${dots}
      <td class="st">${status}</td>
    </tr>`;
  }).join('');

  const head = langs.map((l) => `<th class="d" title="${escapeHtml(l.nativeName)}">${l.code}</th>`).join('');
  const cleanCount = menus.filter((m) => !skipped.has(m.root) && langs.every((l) => m.perLang.get(l.code)?.pass)).length;
  const failCount = menus.filter((m) => !skipped.has(m.root) && langs.some((l) => { const p = m.perLang.get(l.code); return p && !p.pass; })).length;

  return `<style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0b0e14; color: #e6e6e6; font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; }
    h1 { font-size: 17px; margin: 0 0 4px; }
    .sub { color: #7d8798; font-size: 12px; margin: 0 0 18px; }
    .sub b.pass { color: #7fdb7f; } .sub b.fail { color: #ff8f85; } .sub b.skip { color: #ffb454; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { padding: 5px 8px; border-bottom: 1px solid #1c232e; text-align: left; }
    th.d, td.d { text-align: center; width: 26px; padding: 5px 2px; }
    th { color: #9aa4b4; font-weight: 600; position: sticky; top: 0; background: #0b0e14; }
    td.root code { color: #cfd6e4; font-size: 11px; }
    .noplug { color: #ffb454; font-weight: 700; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .dot.pass { background: #2f9e44; } .dot.fail { background: #e03131; }
    .dot.skip { background: #f08c00; } .dot.none { background: #333b47; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; text-decoration: none; white-space: nowrap; }
    .tag.pass { color: #7fdb7f; } .tag.fail { color: #ff8f85; background: #2a1212; }
    .tag.skip { color: #ffb454; }
    h2 { font-size: 14px; margin: 26px 0 6px; color: #cfd6e4; }
    .legacy { columns: 3; font-size: 11px; color: #7d8798; }
    .legacy code { color: #9aa4b4; }
  </style>
  <h1>Locale × UI — whole-app sweep</h1>
  <p class="sub">${CAPTURE_DATE} · ${GIT_SHA} · catalog=${catalog ? 'ON' : 'off'} · ${menus.length} v13 menus × ${langs.length} langs ·
    <b class="pass">${cleanCount} clean</b> · <b class="fail">${failCount} with failures</b> · <b class="skip">${skipped.size} skipped</b></p>
  <table>
    <thead><tr><th>menu root</th>${head}<th>status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>Legacy menus not yet migrated to v13 (${legacy.length})</h2>
  <div class="legacy">${legacy.map((r) => `<div><code>${escapeHtml(r)}</code></div>`).join('')}</div>`;
};

const runSweep = async (parsed: ParsedArgs): Promise<void> => {
  const outDir = parsed.outDir ? path.resolve(ROOT_DIR, parsed.outDir) : path.join(DEFAULT_OUT_ROOT, '_sweep');

  fs.mkdirSync(outDir, { recursive: true });

  const preconditions = loadPreconditions();
  const langs = parsed.langCodes.map((c) => LOCALES.find((l) => l.code === c)!);

  log(`[locale-matrix] SWEEP: ${langs.length} languages (${langs.map((l) => l.code).join(' ')}), catalog=${parsed.catalog ? 'ON' : 'off'}`);

  const menus = new Map<string, SweepMenu>();
  const skipped = new Map<string, string>();
  let legacyRoots: string[] = [];
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();

    for (const l of langs) {
      const t0 = Date.now();
      const { context, page } = await bootSweepPage(browser, l.code, parsed.catalog);

      try {
        const disc = (await page.evaluate(DISCOVER_SCRIPT)) as { v13: { root: string; pluginId: string | null }[]; legacy: string[]; hasList: boolean };

        if (!disc.hasList) {
          log('  ⚠ api.getPluginList() not found in this build (menus without a resolvable plugin fall back to un-hiding). Rebuild the dev server to pick it up.');
        }
        if (!legacyRoots.length) {
          legacyRoots = [...new Set(disc.legacy)].sort((a, b) => a.localeCompare(b));
        }

        const sweepMenus = disc.v13.filter((m) => !m.root.endsWith('-secondary'));

        for (const m of sweepMenus) {
          if (!menus.has(m.root)) {
            menus.set(m.root, { root: m.root, pluginId: m.pluginId, perLang: new Map() });
          }

          const pre = preconditions[m.root] ?? {};

          if (pre.needsCatalog && !parsed.catalog) {
            skipped.set(m.root, 'requires --catalog');
            continue;
          }

          await applyPreconditions(page, pre);
          const per = await captureMenu(page, m.root, m.pluginId, pre.settleMs ?? 650);

          menus.get(m.root)!.perLang.set(l.code, per);
        }

        const failNow = sweepMenus.filter((m) => menus.get(m.root)?.perLang.get(l.code)?.pass === false && !skipped.has(m.root)).length;

        log(`  ${l.code.padEnd(3)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${sweepMenus.length} menus, ${failNow} failing`);
      } finally {
        await context.close();
      }
    }

    const menusArr = [...menus.values()].sort((a, b) => a.root.localeCompare(b.root));

    // Per-menu grid only for menus that actually have a failing language.
    for (const menu of menusArr) {
      if (skipped.has(menu.root)) {
        continue;
      }
      const results: LangResult[] = langs.map((l) => {
        const per = menu.perLang.get(l.code);

        return {
          code: l.code,
          nativeName: l.nativeName,
          pass: per?.pass ?? false,
          flags: per?.flags ?? [],
          // Only a truly-missing capture is "not captured"; a captured menu that
          // failed on flags keeps its own (possibly undefined) error.
          error: per ? per.error : 'not captured',
          pngFile: `${l.code}.png`,
          pngBase64: per?.pngBase64 ?? '',
        };
      });

      if (!results.some((r) => !r.pass)) {
        continue;
      }

      const menuDir = path.join(outDir, menu.root);

      fs.mkdirSync(menuDir, { recursive: true });
      for (const r of results) {
        if (r.pngBase64) {
          fs.writeFileSync(path.join(menuDir, r.pngFile), Buffer.from(r.pngBase64, 'base64'));
        }
      }
      await composeGrid(browser, { id: menu.root, plugin: menu.pluginId ?? '', menuRoot: menu.root }, results, menuDir);
    }

    // Dashboard index.
    const indexPage = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();

    await indexPage.setContent(sweepIndexHtml(menusArr, langs, skipped, legacyRoots, parsed.catalog), { waitUntil: 'load' });
    fs.writeFileSync(path.join(outDir, 'index.html'), await indexPage.content());
    await indexPage.context().close();

    // Report.
    const report = {
      mode: 'sweep',
      date: CAPTURE_DATE,
      gitSha: GIT_SHA,
      catalog: parsed.catalog,
      langs: parsed.langCodes,
      summary: {
        v13Menus: menusArr.length,
        clean: menusArr.filter((m) => !skipped.has(m.root) && langs.every((l) => m.perLang.get(l.code)?.pass)).length,
        withFailures: menusArr.filter((m) => !skipped.has(m.root) && langs.some((l) => { const p = m.perLang.get(l.code); return p && !p.pass; })).length,
        skipped: skipped.size,
        legacyBacklog: legacyRoots.length,
      },
      menus: menusArr.map((m) => ({
        root: m.root,
        pluginId: m.pluginId,
        skipped: skipped.get(m.root) ?? null,
        langs: langs.map((l) => {
          const per = m.perLang.get(l.code);

          return { code: l.code, pass: per?.pass ?? null, error: per?.error, flags: per?.flags ?? [] };
        }),
      })),
      skipped: [...skipped].map(([root, reason]) => ({ root, reason })),
      legacyBacklog: legacyRoots,
    };

    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

    log(`\n[locale-matrix] sweep complete: ${report.summary.clean} clean · ${report.summary.withFailures} with failures · ${report.summary.skipped} skipped · ${report.summary.legacyBacklog} legacy backlog`);
    log(`[locale-matrix] dashboard: ${path.relative(ROOT_DIR, path.join(outDir, 'index.html'))}`);
    log(`[locale-matrix] report:    ${path.relative(ROOT_DIR, path.join(outDir, 'report.json'))}`);

    if (report.summary.withFailures > 0 && parsed.fail) {
      process.exitCode = 1;
    }
  } finally {
    await browser?.close();
  }
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();

  const ping = await fetch(BASE_URL).catch(() => null);

  if (!ping) {
    throw new Error(`No server at ${BASE_URL}. Start one with "npm run start:pro" (or set BASE_URL).`);
  }

  if (parsed.sweep) {
    await runSweep(parsed);
  } else {
    await runSingle(parsed);
  }
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
