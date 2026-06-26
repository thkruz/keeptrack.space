/**
 * visual-inspect: boot the warm KeepTrack dev server, drive it into an arbitrary
 * feature/UI state, and capture screenshots for visual verification.
 *
 * This is the lean, iterative companion to scripts/capture-verification-shots.ts.
 * It connects to an ALREADY-RUNNING dev server (no per-run webServer spin-up), so
 * the boot/drive/shoot loop is fast. Use capture-verification-shots.ts when you
 * want a labeled, reusable KEEPER in the manifest library; use this for quick
 * "does it look right" checks while iterating on UI/CSS/features.
 *
 * Prereq: a warm PRO dev server on :5544
 *   npm run start:pro      (background, rebuilds on edit via --watch)
 *
 * Usage:
 *   npx tsx scripts/inspect.ts <spec.json>
 *   npx tsx scripts/inspect.ts '{"id":"foo","openMenu":"menu-SettingsMenuPlugin"}'
 *   echo '{...}' | npx tsx scripts/inspect.ts -
 *
 * The spec is documented in .claude/skills/visual-inspect/SKILL.md. Key fields:
 *   id           output folder name (required)
 *   catalog      false (default) => noCatalogOnLoad (fast); true => load + wait for crunchers
 *   plugins      { PluginId: { enabled: true } }
 *   settings     extra settingsOverride keys (godrays/skybox/etc.)
 *   viewport     { width, height }   (default 1920x1080; shrink when GPU-bound)
 *   deviceScale  number              (>1 upscales for crisp small detail)
 *   sensor       objName string, e.g. "GEODDSSOC"
 *   selectSat    sccNum string,  e.g. "25544"
 *   timeIso      ISO string to jump to (or timeMs: epoch ms)
 *   camera       cameraType number (FLAT_MAP=2, POLAR_VIEW=5, NOT 7=PLANETARIUM)
 *   flatMapZoom  number (set last; onEnter resets it)
 *   openMenu     element id to click (e.g. "menu-FlatMapView" or "<plugin>-bottom-icon")
 *   evaluate     string[] of JS run in page context AFTER the drive steps (string-form!)
 *   settleMs     ms to wait before capture (default 1200; menu fades take ~1s)
 *   captures     ("full"|"canvas")[]  (default ["full","canvas"])
 *   crop         { x, y, w, h }  clip region for an extra cropped shot
 *   keep         true => also copy to docs-local/visual-inspect/<id>/ + manifest entry
 *   title/description/feature/tags   manifest metadata (only used when keep=true)
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, type ConsoleMessage, chromium, type Page } from 'playwright';
import { DEFAULT_ALLOWLIST } from '../test/e2e/console-listener';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EPHEMERAL_DIR = path.join(ROOT_DIR, 'test-results', 'visual-inspect');
const LIBRARY_DIR = path.join(ROOT_DIR, 'docs-local', 'visual-inspect');
const MANIFEST = path.join(LIBRARY_DIR, 'manifest.json');

/**
 * Resolve `target` against `base` and ensure the result stays inside `base`.
 * Guards the file-system reads/writes below against `..`/absolute-path traversal
 * from untrusted CLI/spec input. Throws on escape.
 */
const resolveWithin = (base: string, target: string): string => {
  const baseResolved = path.resolve(base);
  const resolved = path.resolve(baseResolved, target);

  // Require a STRICT subpath: rejects `..` traversal AND the base dir itself
  // (e.g. an empty/"." target), so callers can't write into or escape the
  // shared output root, only into a per-run subfolder/file under it.
  if (!resolved.startsWith(baseResolved + path.sep)) {
    throw new Error(`Refusing to access path outside ${baseResolved} (must be a subpath): ${target}`);
  }

  return resolved;
};

interface InspectSpec {
  id: string;
  catalog?: boolean;
  catalogWaitMs?: number;
  plugins?: Record<string, { enabled: boolean }>;
  settings?: Record<string, unknown>;
  viewport?: { width: number; height: number };
  deviceScale?: number;
  sensor?: string;
  selectSat?: string;
  timeIso?: string;
  timeMs?: number;
  camera?: number;
  flatMapZoom?: number;
  openMenu?: string;
  evaluate?: string[];
  settleMs?: number;
  captures?: ('full' | 'canvas')[];
  crop?: { x: number; y: number; w: number; h: number };
  keep?: boolean;
  title?: string;
  description?: string;
  feature?: string;
  tags?: string[];
}

interface ManifestEntry {
  file: string;
  title: string;
  description: string;
  feature: string;
  tags: string[];
  date: string;
  gitSha: string;
  viewport: { width: number; height: number };
}

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
  (/403\b/u).test(text) ||
  (/Select a satellite first/u).test(text);

const log = (msg: string): void => {
  // eslint-disable-next-line no-console
  console.log(msg);
};

const readSpec = (): InspectSpec => {
  const arg = process.argv[2];

  if (!arg) {
    throw new Error('Usage: npx tsx scripts/inspect.ts <spec.json | inline-json | ->');
  }

  let raw: string;

  if (arg === '-') {
    raw = fs.readFileSync(0, 'utf8');
  } else if (arg.trimStart().startsWith('{')) {
    raw = arg;
  } else {
    raw = fs.readFileSync(resolveWithin(ROOT_DIR, arg), 'utf8');
  }

  const spec = JSON.parse(raw) as InspectSpec;

  if (!spec.id) {
    throw new Error('spec.id is required (used as the output folder name)');
  }

  return spec;
};

const buildOverride = (spec: InspectSpec): Record<string, unknown> => ({
  isAutoStart: true,
  // Catalog OFF by default - the dominant boot/GPU cost. Flip with spec.catalog=true.
  noCatalogOnLoad: spec.catalog !== true,
  minLogLevel: 'WARN',
  // Headless SwiftShader runs below the FPS limit; without this the perf-downgrade
  // toast band covers menus and intercepts clicks.
  isDisablePerformanceDowngrade: true,
  // Pro builds gate some plugins behind a login modal that hijacks the icon click.
  isDisableLoginGate: true,
  plugins: spec.plugins ?? {},
  ...(spec.settings ?? {}),
});

const boot = async (page: Page, spec: InspectSpec): Promise<number> => {
  const t0 = Date.now();
  const override = buildOverride(spec);

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify(override)};`,
    });
  });

  await page.goto(BASE_URL);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 20_000 },
  );

  if (spec.catalog === true) {
    // Wait for the catalog to load, then for the crunchers to populate positions.
    await page.waitForFunction(
      () =>
        ((window as unknown as { keepTrack: { api: { getCatalogManager(): { objectCache: unknown[] } } } })
          .keepTrack.api.getCatalogManager().objectCache.length) > 1000,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(spec.catalogWaitMs ?? 4_000);
  }

  return Date.now() - t0;
};

/** Run all drive steps in order. All page.evaluate calls are STRING-FORM to dodge the tsx __name trap. */
const drive = async (page: Page, spec: InspectSpec): Promise<void> => {
  // Camera modes need autostart to finish grabbing the camera first (~3s).
  if (typeof spec.camera === 'number') {
    await page.waitForTimeout(3_000);
  }

  if (spec.sensor) {
    await page.evaluate(`window.keepTrack.api.getSensorManager().setSensor(${JSON.stringify(spec.sensor)})`);
    await page.waitForTimeout(500);
  }

  if (typeof spec.camera === 'number') {
    await page.evaluate(`window.keepTrack.api.getMainCamera().cameraType = ${spec.camera}`);
    await page.waitForTimeout(1_500);
  }

  if (typeof spec.flatMapZoom === 'number') {
    // Set last - onEnter resets it.
    await page.evaluate(`window.keepTrack.api.getMainCamera().flatMapZoom = ${spec.flatMapZoom}`);
    await page.waitForTimeout(1_000);
  }

  let targetMs: number | null = null;

  if (typeof spec.timeMs === 'number') {
    targetMs = spec.timeMs;
  } else if (spec.timeIso) {
    targetMs = Date.parse(spec.timeIso);
  }

  if (targetMs !== null && !Number.isNaN(targetMs)) {
    await page.evaluate(`window.keepTrack.api.getTimeManager().changeStaticOffset(${targetMs} - Date.now())`);
    await page.waitForTimeout(800);
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

  if (spec.openMenu) {
    await page.evaluate(`(() => {
      const el = document.getElementById(${JSON.stringify(spec.openMenu)});
      if (!el) { throw new Error('openMenu element not found: ' + ${JSON.stringify(spec.openMenu)}); }
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    })()`);
    // Menu open/fade is ~1s - under that captures a dimmed mid-animation menu.
    await page.waitForTimeout(1_100);
  }

  for (const js of spec.evaluate ?? []) {
    await page.evaluate(js);
  }

  await page.waitForTimeout(spec.settleMs ?? 1_200);
};

const capture = async (page: Page, spec: InspectSpec, outDir: string): Promise<string[]> => {
  const want = spec.captures ?? ['full', 'canvas'];
  const written: string[] = [];

  if (want.includes('full')) {
    const f = path.join(outDir, `${spec.id}-full.png`);

    await page.screenshot({ path: f });
    written.push(f);
  }

  if (want.includes('canvas')) {
    const f = path.join(outDir, `${spec.id}-canvas.png`);
    const canvas = page.locator('#keeptrack-canvas');

    if (await canvas.count() > 0) {
      await canvas.screenshot({ path: f });
      written.push(f);
    } else {
      log('  (no #keeptrack-canvas, skipping canvas shot)');
    }
  }

  if (spec.crop) {
    const f = path.join(outDir, `${spec.id}-crop.png`);

    await page.screenshot({
      path: f,
      clip: { x: spec.crop.x, y: spec.crop.y, width: spec.crop.w, height: spec.crop.h },
    });
    written.push(f);
  }

  return written;
};

const updateManifest = (spec: InspectSpec, files: string[], viewport: { width: number; height: number }): void => {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  let existing: ManifestEntry[] = [];

  if (fs.existsSync(MANIFEST)) {
    try {
      existing = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as ManifestEntry[];
    } catch {
      existing = [];
    }
  }

  const byFile = new Map(existing.map((e) => [e.file, e]));

  for (const abs of files) {
    const rel = path.relative(LIBRARY_DIR, abs).split(path.sep).join('/');

    byFile.set(rel, {
      file: rel,
      title: spec.title ?? spec.id,
      description: spec.description ?? '',
      feature: spec.feature ?? spec.id,
      tags: spec.tags ?? [],
      date: CAPTURE_DATE,
      gitSha: GIT_SHA,
      viewport,
    });
  }

  const merged = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));

  fs.writeFileSync(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);
};

const main = async (): Promise<void> => {
  const spec = readSpec();

  const ping = await fetch(BASE_URL).catch(() => null);

  if (!ping) {
    throw new Error(`No server at ${BASE_URL}. Start one with "npm run start:pro" (or set BASE_URL).`);
  }

  const viewport = spec.viewport ?? { width: 1920, height: 1080 };
  const baseDir = spec.keep ? LIBRARY_DIR : EPHEMERAL_DIR;
  const outDir = resolveWithin(baseDir, spec.id);

  fs.mkdirSync(outDir, { recursive: true });

  const violations: string[] = [];
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: spec.deviceScale ?? 1,
    });
    const page = await context.newPage();

    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();

      if ((type === 'warning' || type === 'error') && !isBenign(msg.text())) {
        violations.push(`[console.${type}] ${msg.text()}`);
      }
    });
    page.on('pageerror', (err: Error) => {
      if (!isBenign(err.message)) {
        violations.push(`[pageerror] ${err.name}: ${err.message}`);
      }
    });

    log(`[${spec.id}] booting (catalog=${spec.catalog === true ? 'ON' : 'off'})...`);
    const bootMs = await boot(page, spec);

    log(`[${spec.id}] ready in ${(bootMs / 1000).toFixed(1)}s - driving...`);
    await drive(page, spec);

    const files = await capture(page, spec, outDir);

    for (const f of files) {
      log(`[${spec.id}] wrote ${path.relative(ROOT_DIR, f)}`);
    }

    if (spec.keep) {
      updateManifest(spec, files, viewport);
      log(`[${spec.id}] manifest updated: ${path.relative(ROOT_DIR, MANIFEST)}`);
    }

    await context.close();
  } finally {
    await browser?.close();
  }

  if (violations.length > 0) {
    log(`\n[${spec.id}] ⚠ ${violations.length} non-benign console/page error(s):`);
    for (const v of violations) {
      log(`  ${v}`);
    }
  } else {
    log(`\n[${spec.id}] clean boot - no non-benign console/page errors.`);
  }
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
