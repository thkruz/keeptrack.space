/**
 * Capture labeled, dated, tagged verification screenshots that double as
 * reusable assets (social media, help menus, release notes).
 *
 * Usage:
 *   npm run start:pro            (in another terminal, or any pro server on BASE_URL)
 *   npx tsx scripts/capture-verification-shots.ts [recipe-id ...]
 *
 * Output goes to test-results/verification-shots/<recipe-id>/, and every shot
 * is recorded in test-results/verification-shots/manifest.json with a title,
 * date, feature, tags, git sha, and description so the library stays searchable
 * (e.g. `jq '.[] | select(.tags | index("terminator"))' manifest.json`).
 *
 * Recipes drive the REAL app, so shots are reproducible - re-run after a visual
 * change instead of hand-capturing. The manifest is merged by file path, so
 * re-running a recipe refreshes its entries in place.
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT_DIR, 'test-results', 'verification-shots');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const VIEWPORT = { width: 1920, height: 1080 };

const GIT_SHA = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
const CAPTURE_DATE = new Date().toISOString().slice(0, 10);

interface ShotSpec {
  /** Output file name (no extension). Becomes the manifest key under the recipe folder. */
  name: string;
  /** Human-readable title for help menus / social captions. */
  title: string;
  /** Searchable description of what the shot demonstrates. */
  description: string;
  /** Search tags. */
  tags: string[];
  /** Hide the satellite catalog so the underlying view (e.g. a grid) is legible. */
  noCatalog?: boolean;
  /** Drive the app into the exact state for this shot (settings already applied at boot). */
  setup?: (page: Page) => Promise<void>;
}

interface ShotRecipe {
  id: string;
  /** Feature / plugin this documents (manifest "feature" field). */
  feature: string;
  plugins: Record<string, { enabled: boolean }>;
  settings?: Record<string, unknown>;
  shots: ShotSpec[];
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

const waitForAppReady = async (page: Page, recipe: ShotRecipe): Promise<void> => {
  const overrideObj = {
    isAutoStart: true,
    minLogLevel: 'WARN',
    isDisablePerformanceDowngrade: true,
    isDisableLoginGate: true,
    plugins: recipe.plugins,
    ...(recipe.settings ?? {}),
  };

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify(overrideObj)};`,
    });
  });

  await page.goto(BASE_URL);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 20_000 },
  );
};

/** Switch the main camera to FLAT_MAP (CameraType.FLAT_MAP === 2) and settle. */
const enterFlatMap = async (page: Page): Promise<void> => {
  // Let autostart finish grabbing the camera before we take it over.
  await page.waitForTimeout(3_000);
  await page.evaluate('window.keepTrack.api.getMainCamera().cameraType = 2');
  await page.waitForTimeout(1_500);
};

/** Set the flat-map zoom after entering the view (onEnter resets it, so set it last). */
const setFlatMapZoom = async (page: Page, zoom: number): Promise<void> => {
  await page.evaluate(`window.keepTrack.api.getMainCamera().flatMapZoom = ${zoom}`);
  await page.waitForTimeout(1_200);
};

const RECIPES: ShotRecipe[] = [
  {
    id: 'flat-map-view',
    feature: 'flat-map-view',
    plugins: { FlatMapView: { enabled: true } },
    shots: [
      {
        name: 'flat-map-terminator-day-night',
        title: 'Flat map day/night terminator and subsolar point',
        description:
          'Equirectangular flat-map camera view showing the day/night terminator line (orange) derived ' +
          'from the lighting term, plus the yellow subsolar-point marker, over the live catalog.',
        tags: ['flat-map-view', 'terminator', 'subsolar', 'day-night', 'social', 'help-menu'],
        setup: async (page) => {
          await enterFlatMap(page);
        },
      },
      {
        name: 'flat-map-graticule-15deg',
        title: 'Flat map graticule - coarse 15 degree spacing (zoomed out)',
        description:
          'Flat-map view with the adaptive graticule at its coarsest 15-degree spacing (labeled lat/lon ' +
          'degrees along the top and right edges), shown when zoomed out to the full world.',
        tags: ['flat-map-view', 'graticule', 'graticule-labels', 'adaptive-grid', '15-degree', 'help-menu'],
        noCatalog: true,
        setup: async (page) => {
          await enterFlatMap(page);
        },
      },
      {
        name: 'flat-map-graticule-1deg',
        title: 'Flat map graticule - fine 1 degree spacing (zoomed in)',
        description:
          'Flat-map view zoomed in close so the adaptive graticule switches to its finest 1-degree spacing, ' +
          'with lat/lon degree labels along the top and right edges.',
        tags: ['flat-map-view', 'graticule', 'graticule-labels', 'adaptive-grid', '1-degree', 'help-menu'],
        noCatalog: true,
        setup: async (page) => {
          await enterFlatMap(page);
          await setFlatMapZoom(page, 50);
        },
      },
    ],
  },
];

// The graticule shots need the grid drawn; the terminator shot leaves it off.
const GRATICULE_SHOTS = new Set(['flat-map-graticule-15deg', 'flat-map-graticule-1deg']);

const readManifest = (): ManifestEntry[] => {
  if (!fs.existsSync(MANIFEST)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as ManifestEntry[];
  } catch {
    return [];
  }
};

const writeManifest = (entries: ManifestEntry[]): void => {
  const byFile = new Map(entries.map((e) => [e.file, e]));
  const merged = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));

  fs.writeFileSync(MANIFEST, `${JSON.stringify(merged, null, 2)}\n`);
};

const runRecipe = async (browser: Browser, recipe: ShotRecipe): Promise<ManifestEntry[]> => {
  const entries: ManifestEntry[] = [];
  const outDir = path.join(OUT_DIR, recipe.id);

  fs.mkdirSync(outDir, { recursive: true });

  for (const shot of recipe.shots) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    try {
      // eslint-disable-next-line no-console
      console.log(`[${recipe.id}/${shot.name}] booting app...`);
      await waitForAppReady(page, {
        ...recipe,
        settings: {
          ...(recipe.settings ?? {}),
          isDrawGraticule: GRATICULE_SHOTS.has(shot.name),
          noCatalogOnLoad: shot.noCatalog ?? false,
        },
      });

      if (shot.setup) {
        await shot.setup(page);
      }
      // Let the map texture, lighting, and dots settle before capturing.
      await page.waitForTimeout(2_500);

      const file = path.join(outDir, `${shot.name}.png`);

      await page.locator('#keeptrack-canvas').screenshot({ path: file });
      // eslint-disable-next-line no-console
      console.log(`[${recipe.id}/${shot.name}] saved ${path.relative(ROOT_DIR, file)}`);

      entries.push({
        file: path.relative(OUT_DIR, file).split(path.sep).join('/'),
        title: shot.title,
        description: shot.description,
        feature: recipe.feature,
        tags: shot.tags,
        date: CAPTURE_DATE,
        gitSha: GIT_SHA,
        viewport: VIEWPORT,
      });
    } finally {
      await context.close();
    }
  }

  return entries;
};

const main = async (): Promise<void> => {
  const requested = process.argv.slice(2);
  const recipes = requested.length > 0 ? RECIPES.filter((r) => requested.includes(r.id)) : RECIPES;

  if (recipes.length === 0) {
    throw new Error(`No recipes matched [${requested.join(', ')}]. Known: ${RECIPES.map((r) => r.id).join(', ')}`);
  }

  const ping = await fetch(BASE_URL).catch(() => null);

  if (!ping) {
    throw new Error(`No server responding at ${BASE_URL}. Start one with "npm run start:pro" (or set BASE_URL).`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const newEntries: ManifestEntry[] = [];
  const failed: string[] = [];

  try {
    for (const recipe of recipes) {
      try {
        newEntries.push(...(await runRecipe(browser, recipe)));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[${recipe.id}] FAILED:`, e);
        failed.push(recipe.id);
      }
    }
  } finally {
    await browser.close();
  }

  writeManifest([...readManifest(), ...newEntries]);
  // eslint-disable-next-line no-console
  console.log(`Manifest updated: ${path.relative(ROOT_DIR, MANIFEST)} (${newEntries.length} shot(s) this run)`);

  if (failed.length > 0) {
    throw new Error(`Recipes failed: ${failed.join(', ')}`);
  }
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
