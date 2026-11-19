import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page } from '@playwright/test';
import { type Comparison, compareOrRecord, comparePngs, PIXEL_THRESHOLD } from './baseline-store';
import { expect, test } from './coverage';
import { fixedSceneMasks, loadFixedIssScene, selectFixedIss } from './fixed-scene';
import { selectSensor } from './menu-catalog';
import { VIEWPORTS } from './viewports';

/*
 * Fixed-scene image baselines of what the WebGL canvas draws (#617). A scene is one entry in a table; this runner
 * boots the pinned ISS scene, runs the entry's setup, waits until two shots 500 ms apart match (see stillShot), and
 * compares against (or records) a per-machine baseline named `scene-<name>` through baseline-store.ts.
 *
 * Record: KT_BASELINE_UPDATE=1 npx playwright test <spec> --project=chromium
 * Compare: npx playwright test <spec> --project=chromium
 * Env: KT_SCENE_FILTER=a,b (only scenes whose name contains one of these; skips the manifest check and rewrite).
 * Measured diffs are appended to test-results/scene-diffs.jsonl.
 */

/** Sim time of the scene specs (matches the menu specs). Sub-solar point is near 0 degrees longitude. */
export const SCENE_DATE = new Date('2008-09-20T12:30:00.000Z');
/** Twelve hours later: the same longitudes are in night. */
export const SCENE_NIGHT_DATE = new Date('2008-09-21T00:30:00.000Z');

/** Mid-latitude radar (Eglin AFB, 30.6 N) and high-latitude radar (Clear SFS, 64.3 N). Keys from src/app/data/catalogs/sensors.ts. */
export const MID_LAT_SENSOR = 'EGLAFB';
export const HIGH_LAT_SENSOR = 'CLRSFS';

/** Camera enum values from src/engine/camera/camera-type.ts (the scenes drive them through the camera's own mode cycle). */
export const CAMERA = {
  FIXED_TO_EARTH: 1,
  FLAT_MAP: 2,
  FIXED_TO_SAT_ECI: 3,
  FIXED_TO_SAT_LVLH: 4,
  POLAR_VIEW: 5,
  SATELLITE_FIRST_PERSON: 6,
  PLANETARIUM: 7,
  ASTRONOMY: 8,
  FPS: 9,
} as const;

export interface SceneDef {
  /** Shot name without the `scene-` prefix. */
  name: string;
  /** Sim time to boot at; default {@link SCENE_DATE}. */
  date?: Date;
  /** Extra settingsManager overrides at boot (the fixed scene sets isFocusOnSatelliteWhenSelected to false). */
  settings?: Record<string, unknown>;
  /** Runs after the pinned scene booted (ISS not selected, no sensor). */
  setup: (page: Page) => Promise<void>;
  /** Share of differing pixels, in percent, above which the scene fails. */
  maxDiffPercent: number;
}

interface FlakyEntry {
  name: string;
  reason: string;
}
type Manifest = Record<string, { shots: string[]; flaky: FlakyEntry[] }>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const UPDATE = process.env.KT_BASELINE_UPDATE === '1';
const FILTER = (process.env.KT_SCENE_FILTER ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PREFIX = 'scene-';

/** Ad slots and toasts are not part of the scene. */
const HIDE_CSS = '#toast-container, .toast-container, .toast, ins.adsbygoogle, [id*="ad-slot"], [class*="ad-slot"] { display: none !important; }';

const readManifest = (path: string): Manifest => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Manifest) : {});

function writeManifest(path: string, data: Manifest): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);
}

/** Loose view of the running app's api; scene setups poke the app from page code that is not type-checked against it. */
// biome-ignore lint/suspicious/noExplicitAny: page code only.
type KtApi = any;

/** Select a sensor through the sensor manager (the same call the sensor list makes) and let its FOV mesh build. */
export async function pickSensor(page: Page, key: string): Promise<void> {
  await selectSensor(page, key);
  await page.waitForTimeout(1_500);
}

export { selectFixedIss };

/** Cycle the camera with the app's own `v` cycle until it reaches the mode (needs a satellite and a sensor selected). Satellite modes settle a frame after the call, so each step waits. */
export async function cycleCameraTo(page: Page, mode: number): Promise<void> {
  const read = (): Promise<number> => page.evaluate(() => (window as unknown as { keepTrack: { api: KtApi } }).keepTrack.api.getMainCamera().cameraType as number);
  let current = await read();

  for (let i = 0; i < 12 && current !== mode; i++) {
    await page.evaluate(() => (window as unknown as { keepTrack: { api: KtApi } }).keepTrack.api.getMainCamera().changeCameraType());
    await page.waitForTimeout(600);
    current = await read();
  }

  if (current !== mode) {
    throw new Error(`camera cycle stopped on ${current}, wanted ${mode}`);
  }
  await page.waitForTimeout(2_000);
}

/** Move the camera to a lat/lon with a 0..1 zoom through its own lookAtLatLon and let it settle. */
export async function lookAt(page: Page, lat: number, lon: number, zoom: number): Promise<void> {
  await page.evaluate(
    ([la, lo, z]) => {
      const cam = (window as unknown as { keepTrack: { api: KtApi } }).keepTrack.api.getMainCamera();

      cam.autoRotate(false);
      cam.lookAtLatLon(la, lo, z);
    },
    [lat, lon, zoom] as const
  );
  await page.waitForTimeout(2_500);
}

/** Set a Graphics menu control by id through the plugin's own control list (the same set() the menu calls). */
export async function setGraphicsControl(page: Page, id: string, value: boolean | string | number): Promise<void> {
  const ok = await page.evaluate(
    ([ctlId, v]) => {
      const plugin = (window as unknown as { keepTrack: { api: KtApi } }).keepTrack.api.getPluginByName('GraphicsMenuPlugin');
      const controls = plugin.getOwnSections_().flatMap((s: { controls: unknown[] }) => s.controls) as { id: string; set: (x: unknown) => void }[];
      const control = controls.find((c) => c.id === ctlId);

      if (!control) {
        return false;
      }
      control.set(v);

      return true;
    },
    [id, value] as const
  );

  if (!ok) {
    throw new Error(`Graphics menu has no control ${id}`);
  }
  await page.waitForTimeout(1_500);
}

/** Whether the app has this plugin (a Pro plugin is missing in an OSS build). */
export async function hasPlugin(page: Page, id: string): Promise<boolean> {
  return page.evaluate((pid) => {
    const found = (window as unknown as { keepTrack: { api: KtApi } }).keepTrack.api.getPluginByName(pid);

    return found !== null && found !== undefined;
  }, id);
}

interface Still {
  png: Buffer;
  stable: boolean;
  tries: number;
}

/** Two shots count as still when fewer than this share of pixels differ (the GPU leaves a few hundred pixels one or two levels apart, so byte-identical never happens: measured 176 to 191 px of 2 million). */
const STILL_RATIO = 0.0001;

/** Takes the scene shot until two shots 500 ms apart match within {@link STILL_RATIO} (max 15 s). */
export async function stillShot(page: Page): Promise<Still> {
  const take = (): Promise<Buffer> => page.screenshot({ animations: 'disabled', caret: 'hide', style: HIDE_CSS, mask: fixedSceneMasks(page), timeout: 20_000 });
  let prev = await take();
  const start = Date.now();
  let tries = 1;

  while (Date.now() - start < 15_000) {
    await page.waitForTimeout(500);
    const cur = await take();

    tries++;
    if (comparePngs(prev, cur, PIXEL_THRESHOLD, STILL_RATIO).failure === null) {
      return { png: cur, stable: true, tries };
    }
    prev = cur;
  }

  return { png: prev, stable: false, tries };
}

export interface SuiteOptions {
  title: string;
  /** Manifest path (test/e2e/scene-baselines.json or the Pro one). */
  manifestPath: string;
  scenes: SceneDef[];
  /** Plugin ids that must exist; a scene is skipped when one is missing. */
  requirePlugins?: string[];
}

const matchesFilter = (name: string): boolean => FILTER.length === 0 || FILTER.some((f) => name.includes(f));

/** Registers one test per scene plus a manifest test inside a describe tagged `@baseline @scene @local`. */
export function registerSceneSuite(options: SuiteOptions): void {
  test.describe(`${options.title} @baseline @scene @local`, () => {
    test.beforeEach(({}, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'scene baselines run on the chromium project (1920x1080) only');
    });

    test('manifest lists exactly the scenes in the table', ({}, testInfo) => {
      const project = testInfo.project.name;
      const all = readManifest(options.manifestPath);
      const entry = all[project] ?? { shots: [], flaky: [] };
      const names = options.scenes.map((s) => `${PREFIX}${s.name}`).sort();

      expect(new Set(names).size, 'scene names must be unique').toBe(names.length);
      if (UPDATE) {
        if (!FILTER.length) {
          all[project] = { shots: names, flaky: entry.flaky };
          writeManifest(options.manifestPath, all);
        }

        return;
      }
      if (FILTER.length) {
        return;
      }
      expect(entry.shots, `scene table and ${options.manifestPath} differ (KT_BASELINE_UPDATE=1 rewrites it)`).toEqual(names);
    });

    for (const scene of options.scenes) {
      test(`scene ${scene.name}`, async ({ page }, testInfo) => {
        test.skip(!matchesFilter(scene.name), 'filtered out by KT_SCENE_FILTER');
        test.setTimeout(240_000);
        const project = testInfo.project.name;
        const shotName = `${PREFIX}${scene.name}`;
        const flaky = new Map((readManifest(options.manifestPath)[project]?.flaky ?? []).map((f) => [f.name, f.reason]));

        await page.setViewportSize({ width: VIEWPORTS.desktop.width, height: VIEWPORTS.desktop.height });
        await loadFixedIssScene(page, { date: scene.date ?? SCENE_DATE, settings: { isSmoothCameraTransitions: false, ...(scene.settings ?? {}) } });
        for (const id of options.requirePlugins ?? []) {
          test.skip(!(await hasPlugin(page, id)), `plugin ${id} is not in this build`);
        }
        await scene.setup(page);
        await page.waitForTimeout(1_000);
        const still = await stillShot(page);
        let measured: Comparison | null = null;
        const failure = await compareOrRecord(testInfo, shotName, still.png, {
          maxRatio: scene.maxDiffPercent / 100,
          onCompare: (r) => {
            measured = r;
          },
        });
        const m = measured as Comparison | null;

        mkdirSync(join(ROOT, 'test-results'), { recursive: true });
        appendFileSync(
          join(ROOT, 'test-results', 'scene-diffs.jsonl'),
          `${JSON.stringify({ scene: shotName, limitPercent: scene.maxDiffPercent, diffPixels: m?.diffPixels ?? null, diffPercent: m ? +(m.ratio * 100).toFixed(4) : null, stable: still.stable, tries: still.tries, update: UPDATE })}\n`
        );
        console.log(`[scene] ${shotName} stable=${still.stable} tries=${still.tries} diff=${m ? `${(m.ratio * 100).toFixed(4)}%` : 'recorded'}`);
        if (!still.stable) {
          testInfo.annotations.push({ type: 'unstable', description: `${shotName} never gave two identical shots in 15 s` });
        }
        if (flaky.has(shotName) && !UPDATE) {
          testInfo.annotations.push({ type: 'flaky-not-compared', description: `${shotName}: ${flaky.get(shotName)}` });

          return;
        }
        expect(failure, failure ?? '').toBeNull();
      });
    }
  });
}
