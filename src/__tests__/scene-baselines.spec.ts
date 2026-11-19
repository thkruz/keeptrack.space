import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAMERA,
  cycleCameraTo,
  HIGH_LAT_SENSOR,
  lookAt,
  MID_LAT_SENSOR,
  pickSensor,
  registerSceneSuite,
  SCENE_NIGHT_DATE,
  type SceneDef,
  selectFixedIss,
  setGraphicsControl,
} from '@test/e2e/scene-runner';

/*
 * Fixed-scene WebGL baselines (#617): what the 3D view draws for the pinned ISS scene (earth day and night,
 * clouds, zoom levels, sensor FOV, camera modes, Graphics menu toggles). Pro-only scenes (flat map, polar
 * view, Pro graphics toggles, earth style presets) live in
 * src/plugins-pro/scene-baselines/__tests__/scene-baselines-pro.spec.ts.
 *
 * Baselines are per machine, outside the checkout (test/e2e/baseline-store.ts), shared with the menu baselines
 * under the store prefix `scene-`. The manifest is test/e2e/scene-baselines.json.
 *   Record:  KT_BASELINE_UPDATE=1 npx playwright test src/__tests__/scene-baselines.spec.ts --project=chromium
 *   Compare: npx playwright test src/__tests__/scene-baselines.spec.ts --project=chromium
 *   One scene: KT_SCENE_FILTER=earth-day (substring match, skips the manifest check)
 * Needs the real GPU: run without CI set (CI selects SwiftShader in playwright.config.ts). The WebGL canvas is the
 * subject, so it is never masked; only the clock and the satellite info box are (fixedSceneMasks).
 * Failures write expected, actual and diff PNGs to test-results/baseline-diffs/chromium/.
 */

/** Scene limit: started at 0.5 percent of pixels, tightened to the 0.05 floor because every scene but camera-fps measured under 0.025 between runs (two twin runs). */
const START = 0.05;

/** A scene with the ISS selected and a sensor chosen, camera left where the app puts it. */
const withIssAndSensor = (key: string) => async (page: Parameters<SceneDef['setup']>[0]) => {
  await pickSensor(page, key);
  await selectFixedIss(page);
};

const toggle = (name: string, id: string, value: boolean): SceneDef => ({
  name: `graphics-${name}`,
  maxDiffPercent: START,
  setup: async (page) => {
    await selectFixedIss(page);
    await setGraphicsControl(page, id, value);
    // Selecting the satellite leaves the camera drifting; pin the view (measured: ~1 percent run-to-run diff without it).
    await lookAt(page, 20, -7, 0.45);
  },
});

const camera = (name: string, mode: number, maxDiffPercent = START): SceneDef => ({
  name: `camera-${name}`,
  maxDiffPercent,
  // The camera cycle only enters satellite modes when selecting a satellite focuses the camera on it.
  settings: { isFocusOnSatelliteWhenSelected: true },
  setup: async (page) => {
    await pickSensor(page, MID_LAT_SENSOR);
    await selectFixedIss(page);
    await cycleCameraTo(page, mode);
  },
});

const SCENES: SceneDef[] = [
  // FIXED_TO_EARTH is the default camera mode: this scene is its baseline.
  {
    name: 'earth-default-iss',
    maxDiffPercent: START,
    setup: async (page) => {
      await selectFixedIss(page);
      await lookAt(page, 0, 0, 0.5);
    },
  },
  { name: 'earth-day', maxDiffPercent: START, setup: async (page) => lookAt(page, 20, -7, 0.45) },
  { name: 'earth-night', date: SCENE_NIGHT_DATE, maxDiffPercent: START, setup: async (page) => lookAt(page, 20, -7, 0.45) },
  {
    name: 'earth-clouds-on',
    maxDiffPercent: START,
    setup: async (page) => {
      await page.evaluate(() => {
        (window as unknown as { settingsManager: { isDrawCloudsMap: boolean } }).settingsManager.isDrawCloudsMap = true;
      });
      await lookAt(page, 20, -7, 0.45);
    },
  },
  {
    name: 'earth-clouds-off',
    maxDiffPercent: START,
    setup: async (page) => {
      await page.evaluate(() => {
        (window as unknown as { settingsManager: { isDrawCloudsMap: boolean } }).settingsManager.isDrawCloudsMap = false;
      });
      await lookAt(page, 20, -7, 0.45);
    },
  },
  { name: 'earth-zoom-far', maxDiffPercent: START, setup: async (page) => lookAt(page, 20, -7, 0.8) },
  { name: 'earth-zoom-near', maxDiffPercent: START, setup: async (page) => lookAt(page, 20, -7, 0.25) },
  {
    name: 'sensor-mid-lat-3d',
    maxDiffPercent: START,
    setup: async (page) => {
      await withIssAndSensor(MID_LAT_SENSOR)(page);
      await lookAt(page, 30.6, -86.8, 0.3);
    },
  },
  {
    name: 'sensor-high-lat-3d',
    maxDiffPercent: START,
    setup: async (page) => {
      await withIssAndSensor(HIGH_LAT_SENSOR)(page);
      await lookAt(page, 64.3, -149.2, 0.3);
    },
  },
  {
    name: 'closest-zoom-on-satellite',
    maxDiffPercent: START,
    settings: { isFocusOnSatelliteWhenSelected: true },
    setup: async (page) => {
      await selectFixedIss(page);
      await cycleCameraTo(page, CAMERA.FIXED_TO_SAT_ECI);
      await page.evaluate(() => {
        const cam = (window as unknown as { keepTrack: { api: { getMainCamera(): { snapZoomToDistance(d: number): void } } } }).keepTrack.api.getMainCamera();
        const sm = (window as unknown as { settingsManager: { minZoomDistance: number } }).settingsManager;

        cam.snapZoomToDistance(sm.minZoomDistance);
      });
      await page.waitForTimeout(2_000);
    },
  },
  camera('sat-eci', CAMERA.FIXED_TO_SAT_ECI),
  camera('sat-lvlh', CAMERA.FIXED_TO_SAT_LVLH),
  camera('sat-first-person', CAMERA.SATELLITE_FIRST_PERSON),
  camera('planetarium', CAMERA.PLANETARIUM),
  camera('astronomy', CAMERA.ASTRONOMY),
  // FPS view never gave two matching shots in 15 s; measured 0.069 percent between runs, so the limit is twice that.
  camera('fps', CAMERA.FPS, 0.15),
  toggle('black-earth', 'blackEarth', true),
  toggle('grayscale-earth', 'grayscaleEarth', true),
  toggle('ambient-lighting-off', 'ambientLighting', false),
  toggle('night-as-day', 'nightAsDay', true),
  toggle('graticule', 'graticule', true),
  toggle('political-map-off', 'politicalMap', false),
  toggle('dim-orbit-in-eclipse-off', 'dimOrbitInEclipse', false),
];

registerSceneSuite({ title: 'Scene baselines (3D, OSS)', manifestPath: join(fileURLToPath(new URL('../..', import.meta.url)), 'test/e2e/scene-baselines.json'), scenes: SCENES });
