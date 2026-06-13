/**
 * Capture per-plugin help screenshots into public/img/help/<plugin-id>/.
 *
 * Usage:
 *   npm run start            (in another terminal, or any server on BASE_URL)
 *   npx tsx scripts/capture-help-screenshots.ts [plugin-id ...]
 *
 * With no arguments every recipe runs; pass plugin ids (e.g. "stereo-map") to
 * regenerate a subset. Each run also saves a screenshot of the plugin's
 * rendered help dialog (Shift+F1) to test-results/help-verify/ so the final
 * dialog can be reviewed without launching the app.
 *
 * Recipes drive the real app, so screenshots are reproducible - re-run this
 * script whenever a plugin's UI changes instead of hand-cropping images.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'img', 'help');
const VERIFY_DIR = path.join(ROOT_DIR, 'test-results', 'help-verify');
const VIEWPORT = { width: 1600, height: 900 };

interface CaptureRecipe {
  /** Recipe name passed on the CLI. Also the output folder unless outDir is set. */
  id: string;
  /** Output folder name under public/img/help/ when it differs from the id. */
  outDir?: string;
  /** Plugins to force-enable for this capture. */
  plugins: Record<string, { enabled: boolean }>;
  /** Extra settingsOverride values. */
  settings?: Record<string, unknown>;
  /** Drive the UI into the state to capture. Must leave the plugin's menu open. */
  steps: (page: Page) => Promise<void>;
  /** Element screenshots to save. insetLeft crops overlaying UI (e.g. the icon rail). */
  shots: { name: string; selector: string; insetLeft?: number }[];
}

/**
 * Mirror of test/e2e/keeptrack-fixtures.ts waitForAppReady, but with the
 * catalog enabled so screenshots show real satellites.
 */
const waitForAppReady = async (page: Page, recipe: CaptureRecipe): Promise<void> => {
  const overrideObj = {
    isAutoStart: true,
    minLogLevel: 'WARN',
    isDisablePerformanceDowngrade: true,
    // Pro builds gate some plugins behind login; captures need the menus open
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

/**
 * Open a plugin's side menu by dispatching a click on its bottom icon.
 * A JS click works even when the icon is hidden by the current menu mode,
 * so recipes don't have to drive the dock/drawer UI first.
 * (String-form evaluate: tsx/esbuild injects a __name helper into function
 * arguments that breaks inside the page context.)
 */
const openPluginMenu = async (page: Page, bottomIconId: string): Promise<void> => {
  await page.evaluate(`document.getElementById(${JSON.stringify(bottomIconId)})?.click()`);
};

/** Search the catalog and select the first result. */
const selectSatellite = async (page: Page, query: string): Promise<void> => {
  const search = page.locator('#search');

  await search.click();
  await search.fill(query);
  const firstResult = page.locator('.search-result:not(.search-result-decayed)').first();

  await firstResult.waitFor({ state: 'visible', timeout: 15_000 });
  await firstResult.click();
};

/** Select a sensor in the sensor list (by data-sensor id, or the first one), then close the sensor menu. */
const selectSensor = async (page: Page, sensorId?: string): Promise<void> => {
  await openPluginMenu(page, 'sensors-bottom-icon');
  const selector = sensorId
    ? `#sensor-list-content li.menu-selectable[data-sensor="${sensorId}"]`
    : '#sensor-list-content li.menu-selectable[data-sensor]';
  const firstSensor = page.locator(selector).first();

  await firstSensor.waitFor({ state: 'visible', timeout: 10_000 });
  await firstSensor.click();
  await page.evaluate('document.getElementById(\'sensor-list-menu-close-btn\')?.dispatchEvent(new MouseEvent(\'click\', { bubbles: true }))');
  await page.waitForTimeout(500);
};

const RECIPES: CaptureRecipe[] = [
  {
    id: 'stereo-map',
    plugins: {
      StereoMap: { enabled: true },
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      // One deep-space sensor + a GPS satellite gives a trace with clear
      // yellow (in view) AND red (not in view) arcs, matching the help text.
      await selectSensor(page, 'GEODDSSOC');
      await selectSatellite(page, 'NAVSTAR');
      await openPluginMenu(page, 'stereo-map-bottom-icon');
      await page.locator('#map-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // Let the ground trace, sensor markers, and earth texture finish drawing
      await page.waitForTimeout(4_000);
    },
    shots: [{ name: 'stereo-map-menu', selector: '#map-menu', insetLeft: 44 }],
  },
  {
    id: 'find-sat',
    plugins: {
      FindSatPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'find-satellite-bottom-icon');
      await page.locator('#findByLooks-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'find-sat-menu', selector: '#findByLooks-menu' }],
  },
  {
    id: 'sensor-list',
    plugins: {
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'sensors-bottom-icon');
      await page.locator('#sensor-list-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'sensor-list-menu', selector: '#sensor-list-menu' }],
  },
  {
    id: 'sensor',
    plugins: {
      SensorListPlugin: { enabled: true },
      SensorInfoPlugin: { enabled: true },
    },
    steps: async (page) => {
      // Eglin's FPS-85 is a radar, so the band and beam width rows are shown
      await selectSensor(page, 'EGLAFB');
      await openPluginMenu(page, 'sensor-info-bottom-icon');
      await page.locator('#sensor-info-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'sensor-info-menu', selector: '#sensor-info-menu' }],
  },
  {
    id: 'watchlist',
    plugins: {
      WatchlistPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-watchlist');
      await page.locator('#watchlist-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator('#watchlist-new-sat, #watchlist-new').first().fill('25544, 20580, 25338, 28654');
      await page.evaluate('document.getElementById(\'watchlist-add\')?.click()');
      await page.waitForTimeout(2_000);
    },
    shots: [{ name: 'watchlist-menu', selector: '#watchlist-menu' }],
  },
  {
    id: 'collisions',
    plugins: {
      Collisions: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-satellite-collision');
      await page.locator('#Collisions-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'Collisions-fetch-btn\')?.click()');
      // Wait for SOCRATES rows to render
      await page.locator('#Collisions-table .Collisions-object').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'collisions-menu', selector: '#Collisions-menu' }],
  },
  {
    id: 'reentries',
    plugins: {
      Reentries: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'reentries-bottom-icon');
      await page.locator('#reentries-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'reentries-fetch-btn\')?.click()');
      // Wait for TIP rows to render
      await page.locator('#reentries-tip-table .tip-object').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'reentries-menu', selector: '#reentries-menu' }],
  },
  {
    id: 'breakup',
    plugins: {
      Breakup: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'breakup-bottom-icon');
      await page.locator('#breakup-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'breakup-menu', selector: '#breakup-menu' }],
  },
  {
    id: 'new-launch',
    plugins: {
      NewLaunch: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'new-launch-bottom-icon');
      await page.locator('#newLaunch-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'new-launch-menu', selector: '#newLaunch-menu' }],
  },
  {
    id: 'dops',
    plugins: {
      DopsPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-dops');
      await page.locator('#dops-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'dops-submit\')?.click()');
      // 1440 one-minute DOP samples take a moment to compute
      await page.locator('#dops tr').first().waitFor({ state: 'visible', timeout: 60_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'dops-menu', selector: '#dops-menu' }],
  },
  {
    id: 'timeline-sensor',
    plugins: {
      SensorTimeline: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'sensor-timeline-bottom-icon');
      await page.locator('#sensor-timeline-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // Pass calculation across the whole sensor network takes a while
      await page.waitForTimeout(15_000);
      // The sat-info-box overlaps the wide timeline menu
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
    },
    shots: [{ name: 'timeline-sensor-menu', selector: '#sensor-timeline-menu', insetLeft: 44 }],
  },
  {
    id: 'timeline-satellite',
    plugins: {
      SatelliteTimeline: { enabled: true },
      SensorListPlugin: { enabled: true },
      WatchlistPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSensor(page, 'EGLAFB');
      await openPluginMenu(page, 'menu-watchlist');
      await page.locator('#watchlist-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator('#watchlist-new-sat, #watchlist-new').first().fill('25544, 20580, 25338, 28654');
      await page.evaluate('document.getElementById(\'watchlist-add\')?.click()');
      await page.waitForTimeout(2_000);
      await openPluginMenu(page, 'satellite-timeline-bottom-icon');
      await page.locator('#satellite-timeline-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(10_000);
    },
    shots: [{ name: 'timeline-satellite-menu', selector: '#satellite-timeline-menu', insetLeft: 44 }],
  },
  {
    id: 'missile',
    plugins: {
      MissilePlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'MissilePlugin-bottom-icon');
      await page.locator('#MissilePlugin-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'missile-menu', selector: '#MissilePlugin-menu' }],
  },
  {
    id: 'create-sat',
    plugins: {
      CreateSat: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'create-satellite-bottom-icon');
      await page.locator('#createSat-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'create-sat-menu', selector: '#createSat-menu' }],
  },
  {
    id: 'best-pass',
    plugins: {
      BestPassPlugin: { enabled: true },
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSensor(page, 'EGLAFB');
      await openPluginMenu(page, 'best-pass-icon');
      await page.locator('#best-pass-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator('#bp-sats').fill('25544, 20580');
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'best-pass-menu', selector: '#best-pass-menu' }],
  },
  {
    id: 'close-objects',
    plugins: {
      CloseObjectsPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'close-objects-icon');
      await page.locator('#close-objects-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'close-objects-menu', selector: '#close-objects-menu' }],
  },
  {
    id: 'debris-screening',
    plugins: {
      DebrisScreening: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'debris-screening-bottom-icon');
      await page.locator('#debris-screening-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'debris-screening-menu', selector: '#debris-screening-menu' }],
  },
  {
    id: 'scenario-management',
    plugins: {
      ScenarioManagementPlugin: { enabled: true },
      ScenarioManagementMenu: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'scenario-management-icon');
      await page.locator('#scenario-management-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'scenario-management-menu', selector: '#scenario-management-menu' }],
  },
  {
    id: 'calculator',
    plugins: {
      Calculator: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'menu-calculator');
      await page.locator('#calculator-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // Fill from the selected satellite and convert so outputs are populated
      await page.evaluate('document.getElementById(\'calc-load-sat-btn\')?.click()');
      await page.waitForTimeout(500);
      await page.evaluate('document.getElementById(\'calc-convert-btn\')?.click()');
      await page.waitForTimeout(500);
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
    },
    shots: [{ name: 'calculator-menu', selector: '#calculator-menu' }],
  },
  {
    id: 'short-term-fences',
    plugins: {
      ShortTermFences: { enabled: true },
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSensor(page, 'EGLAFB');
      // The id really does contain a space (slug only replaces the first one)
      await openPluginMenu(page, 'short-term fence-bottom-icon');
      await page.locator('#stf-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'short-term-fences-menu', selector: '#stf-menu' }],
  },
  {
    id: 'catalog-browser',
    plugins: {
      CatalogBrowserPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-catalog-browser');
      await page.locator('#catalog-browser-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'catalog-browser-menu', selector: '#catalog-browser-menu' }],
  },
  {
    id: 'sat-constellations',
    plugins: {
      SatConstellations: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-constellations');
      await page.locator('#constellations-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // Select GPS so the stats and member table are populated
      await page.evaluate('document.querySelector(\'#sc-constellation-list [data-group="GPSGroup"]\')?.dispatchEvent(new MouseEvent(\'click\', { bubbles: true }))');
      await page.waitForTimeout(3_000);
    },
    shots: [{ name: 'sat-constellations-menu', selector: '#constellations-menu' }],
  },
  {
    id: 'proximity-ops',
    plugins: {
      ProximityOps: { enabled: true },
    },
    steps: async (page) => {
      // The id really does contain spaces (slug only replaces the first one)
      await openPluginMenu(page, 'rendezvous-and proximity operations-bottom-icon');
      await page.locator('#proximityOps-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'proximity-ops-menu', selector: '#proximityOps-menu' }],
  },
  {
    id: 'transponder-channel-data',
    plugins: {
      TransponderChannelData: { enabled: true },
      SatConstellations: { enabled: true },
    },
    steps: async (page) => {
      // ASTRA 1KR is in the satsWithChannels list
      await selectSatellite(page, 'ASTRA 1KR');
      await openPluginMenu(page, 'menu-transponderChannelData');
      await page.locator('#TransponderChannelData-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // Channel data download from the API
      await page.locator('#TransponderChannelData-table tr').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'transponder-channel-data-menu', selector: '#TransponderChannelData-menu' }],
  },
  {
    id: 'colors-menu',
    plugins: {
      ColorMenu: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-color-scheme');
      await page.locator('#color-scheme-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'colors-menu', selector: '#color-scheme-menu' }],
  },
  {
    id: 'countries',
    plugins: {
      CountriesMenu: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-countries');
      await page.locator('#countries-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(1_000);
    },
    shots: [{ name: 'countries-menu', selector: '#countries-menu' }],
  },
  {
    id: 'planets-menu',
    plugins: {
      PlanetsMenuPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-planets');
      await page.locator('#planets-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'planets-menu', selector: '#planets-menu' }],
  },
  {
    id: 'next-launches',
    plugins: {
      NextLaunchesPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-nextLaunch');
      await page.locator('#nextLaunch-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'nextLaunch-fetch-btn\')?.click()');
      await page.locator('#nextLaunch-table tr').first().waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'next-launches-menu', selector: '#nextLaunch-menu' }],
  },
  {
    id: 'catalog-management',
    plugins: {
      CatalogManagementPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'catalog-management-icon');
      await page.locator('#catalog-management-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'catalog-management-menu', selector: '#catalog-management-menu' }],
  },
  {
    id: 'satellite-fov',
    plugins: {
      SatelliteFov: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'satellite-fov-bottom-icon');
      await page.locator('#satellite-fov-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'satellite-fov-menu', selector: '#satellite-fov-menu' }],
  },
  {
    id: 'reports',
    plugins: {
      ReportsPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'reports-bottom-icon');
      await page.locator('#reports-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'reports-menu', selector: '#reports-menu' }],
  },
  {
    id: 'plot-analysis',
    plugins: {
      Inc2LonPlots: { enabled: true },
      Time2LonPlots: { enabled: true },
      Inc2AltPlots: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'inc2lon-plots-icon');
      await page.locator('#inc2lon-plots-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // Chunked GEO computation needs time to draw
      await page.waitForTimeout(15_000);
    },
    shots: [{ name: 'inc2lon-menu', selector: '#inc2lon-plots-menu', insetLeft: 44 }],
  },
  {
    id: 'plot-analysis-time2lon',
    outDir: 'plot-analysis',
    plugins: {
      Time2LonPlots: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'time2lon-plots-icon');
      await page.locator('#time2lon-plots-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(20_000);
    },
    shots: [{ name: 'time2lon-menu', selector: '#time2lon-plots-menu', insetLeft: 44 }],
  },
  {
    id: 'plot-analysis-inc2alt',
    outDir: 'plot-analysis',
    plugins: {
      Inc2AltPlots: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'inc2alt-plots-icon');
      await page.locator('#inc2alt-plots-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(15_000);
    },
    shots: [{ name: 'inc2alt-menu', selector: '#inc2alt-plots-menu', insetLeft: 44 }],
  },
  {
    id: 'polar-plot',
    plugins: {
      PolarPlotPlugin: { enabled: true },
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSensor(page, 'EGLAFB');
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'polar-plot-bottom-icon');
      await page.locator('#polar-plot-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(3_000);
    },
    shots: [{ name: 'polar-plot-menu', selector: '#polar-plot-menu' }],
  },
  {
    id: 'filter-menu',
    plugins: {
      FilterMenuPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'filter-menu-icon');
      await page.locator('#filter-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'filter-menu', selector: '#filter-menu' }],
  },
  {
    id: 'video-director',
    plugins: {
      VideoDirectorPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'video-director-icon');
      await page.locator('#video-director-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'video-director-menu', selector: '#video-director-menu' }],
  },
  {
    id: 'orbit-guard-menu',
    plugins: {
      OrbitGuardMenuPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'orbitguard-bottom-icon');
      await page.locator('#maneuver-detection-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // The OrbitGuard API can be slow; give rows a chance but don't fail without them
      await page.waitForTimeout(10_000);
    },
    shots: [{ name: 'orbit-guard-menu', selector: '#maneuver-detection-menu' }],
  },
  {
    id: 'satellite-photos',
    plugins: {
      SatellitePhotos: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-sat-photo');
      await page.locator('#sat-photo-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(2_000);
    },
    shots: [{ name: 'satellite-photos-menu', selector: '#sat-photo-menu' }],
  },
  {
    id: 'settings-menu',
    plugins: {
      SettingsMenuPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'settings-menu-icon');
      await page.locator('#settings-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'settings-menu', selector: '#settings-menu' }],
  },
  {
    id: 'custom-sensor',
    plugins: {
      CustomSensorPlugin: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'custom-sensor-bottom-icon');
      await page.locator('#custom-sensor-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'custom-sensor-menu', selector: '#custom-sensor-menu' }],
  },
  {
    id: 'look-angles',
    plugins: {
      LookAnglesPlugin: { enabled: true },
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSensor(page, 'EGLAFB');
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'look-angles-bottom-icon');
      await page.locator('#look-angles-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(5_000);
    },
    shots: [{ name: 'look-angles-menu', selector: '#look-angles-menu' }],
  },
  {
    id: 'multi-sensor-look-angles',
    plugins: {
      MultiSensorLookAnglesPlugin: { enabled: true },
      SensorListPlugin: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'multi-sensor-looks-bottom-icon');
      await page.locator('#multi-sensor-look-angles-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(8_000);
    },
    shots: [{ name: 'multi-sensor-look-angles-menu', selector: '#multi-sensor-look-angles-menu' }],
  },
  {
    id: 'eclipse-solar-analysis',
    plugins: { EclipseSolarAnalysis: { enabled: true } },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'eclipse-analysis-bottom-icon');
      await page.locator('#eclipse-solar-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(3_000);
    },
    shots: [{ name: 'eclipse-solar-analysis-menu', selector: '#eclipse-solar-menu' }],
  },
  {
    id: 'initial-orbit',
    plugins: { InitialOrbitDeterminationPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'initial-od-bottom-icon');
      await page.locator('#initial-od-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'initial-orbit-menu', selector: '#initial-od-menu' }],
  },
  {
    id: 'maneuver',
    plugins: { ManeuverPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'maneuver-bottom-icon');
      await page.locator('#maneuver-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'maneuver-menu', selector: '#maneuver-menu' }],
  },
  {
    id: 'link-budget',
    plugins: { LinkBudgetPlugin: { enabled: true }, SensorListPlugin: { enabled: true } },
    steps: async (page) => {
      await selectSensor(page, 'EGLAFB');
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'link-budget-bottom-icon');
      await page.locator('#link-budget-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'link-calc-btn\')?.click()');
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(2_000);
    },
    shots: [{ name: 'link-budget-menu', selector: '#link-budget-menu' }],
  },
  {
    id: 'neighborhood-watch',
    plugins: { NeighborhoodWatch: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'neighborhood-watch-icon');
      await page.locator('#neighborhood-watch-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'neighborhood-watch-menu', selector: '#neighborhood-watch-menu' }],
  },
  {
    id: 'neighborhood-history',
    plugins: { NeighborhoodHistoryPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'neighborhood-history-icon');
      await page.locator('#neighborhood-history-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'neighborhood-history-menu', selector: '#neighborhood-history-menu' }],
  },
  {
    id: 'overflight',
    plugins: { OverflightPlugin: { enabled: true }, WatchlistPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-watchlist');
      await page.locator('#watchlist-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator('#watchlist-new-sat, #watchlist-new').first().fill('25544, 20580');
      await page.evaluate('document.getElementById(\'watchlist-add\')?.click()');
      await page.waitForTimeout(2_000);
      await openPluginMenu(page, 'overflight-icon');
      await page.locator('#overflight-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'overflight-menu', selector: '#overflight-menu' }],
  },
  {
    id: 'toca-poca',
    plugins: { TocaPocaPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-satellite-selection');
      await page.locator('#TocaPocaPlugin-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'toca-poca-menu', selector: '#TocaPocaPlugin-menu' }],
  },
  {
    id: 'oem-reader',
    plugins: { OemReaderPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'oem-reader-bottom-icon');
      await page.locator('#oem-reader-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'oem-reader-menu', selector: '#oem-reader-menu' }],
  },
  {
    id: 'observation-reader',
    plugins: { ObservationReaderPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'observation-reader-bottom-icon');
      await page.locator('#observation-reader-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'observation-reader-menu', selector: '#observation-reader-menu' }],
  },
  {
    id: 'historic-catalog',
    plugins: { HistoricCatalogPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-historic-catalog');
      await page.locator('#historic-catalog-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'historic-catalog-menu', selector: '#historic-catalog-menu' }],
  },
  {
    id: 'optical-simulation',
    plugins: { OpticalSimulation: { enabled: true }, SensorListPlugin: { enabled: true } },
    steps: async (page) => {
      await selectSensor(page, 'GEODDSSOC');
      await selectSatellite(page, 'NAVSTAR');
      await openPluginMenu(page, 'menu-optical-sim');
      await page.locator('#optical-sim-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.evaluate('document.getElementById(\'sat-infobox\')?.style.setProperty(\'display\', \'none\')');
      await page.waitForTimeout(1_000);
    },
    shots: [{ name: 'optical-simulation-menu', selector: '#optical-sim-menu' }],
  },
  {
    id: 'seismic-activity',
    plugins: { SeismicActivityPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-seismic-activity');
      await page.locator('#SeismicActivityPlugin-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // USGS feed fetch
      await page.waitForTimeout(8_000);
    },
    shots: [{ name: 'seismic-activity-menu', selector: '#SeismicActivityPlugin-menu' }],
  },
  {
    id: 'deep-space-missions-menu',
    plugins: { DeepSpaceMissionsPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-deep-space-missions');
      await page.locator('#deep-space-missions-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'deep-space-missions-menu', selector: '#deep-space-missions-menu' }],
  },
  {
    id: 'aurora',
    plugins: { AuroraPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-aurora');
      await page.locator('#AuroraPlugin-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // NOAA OVATION fetch
      await page.evaluate('document.getElementById(\'aurora-fetch-btn\')?.click()');
      await page.waitForTimeout(8_000);
    },
    shots: [{ name: 'aurora-menu', selector: '#AuroraPlugin-menu' }],
  },
  {
    id: 'natural-events',
    plugins: { NaturalEventsPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-natural-events');
      await page.locator('#NaturalEventsPlugin-menu').waitFor({ state: 'visible', timeout: 10_000 });
      // EONET feed fetch
      await page.waitForTimeout(8_000);
    },
    shots: [{ name: 'natural-events-menu', selector: '#NaturalEventsPlugin-menu' }],
  },
  {
    id: 'scenario-management-pro',
    plugins: {
      ScenarioManagementPlugin: { enabled: true },
      ScenarioManagementMenu: { enabled: true },
    },
    steps: async (page) => {
      await openPluginMenu(page, 'scenario-management-icon');
      await page.locator('#scenario-management-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'scenario-management-pro-menu', selector: '#scenario-management-menu' }],
  },
  {
    id: 'symbology',
    plugins: { SymbologyPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'symbology-icon');
      await page.locator('#symbology-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'symbology-menu', selector: '#symbology-menu' }],
  },
  {
    id: 'color-scheme-editor',
    plugins: { ColorSchemeEditorPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'color-scheme-editor-icon');
      await page.locator('#color-scheme-editor-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(1_000);
    },
    shots: [{ name: 'color-scheme-editor-menu', selector: '#color-scheme-editor-menu' }],
  },
  {
    id: 'companion-link',
    plugins: { CompanionLinkPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'menu-companion-link');
      await page.locator('#companion-link-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(1_000);
    },
    shots: [{ name: 'companion-link-menu', selector: '#companion-link-menu' }],
  },
  {
    id: 'graphics-menu',
    plugins: { GraphicsMenuPlugin: { enabled: true } },
    steps: async (page) => {
      await openPluginMenu(page, 'graphics-menu-bottom-icon');
      await page.locator('#graphics-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'graphics-menu', selector: '#graphics-menu' }],
  },
  {
    id: 'edit-sat',
    plugins: {
      EditSat: { enabled: true },
    },
    steps: async (page) => {
      await selectSatellite(page, 'ISS (ZARYA)');
      await openPluginMenu(page, 'edit-satellite-bottom-icon');
      await page.locator('#editSat-menu').waitFor({ state: 'visible', timeout: 10_000 });
      await page.waitForTimeout(500);
    },
    shots: [{ name: 'edit-sat-menu', selector: '#editSat-menu' }],
  },
];

const runRecipe = async (browser: Browser, recipe: CaptureRecipe): Promise<void> => {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  try {
    // eslint-disable-next-line no-console
    console.log(`[${recipe.id}] booting app...`);
    await waitForAppReady(page, recipe);
    await recipe.steps(page);

    const outDir = path.join(OUT_DIR, recipe.outDir ?? recipe.id);

    fs.mkdirSync(outDir, { recursive: true });
    for (const shot of recipe.shots) {
      const file = path.join(outDir, `${shot.name}.png`);
      const inset = shot.insetLeft ?? 0;

      if (inset > 0) {
        const box = await page.locator(shot.selector).boundingBox();

        if (!box) {
          throw new Error(`[${recipe.id}] ${shot.selector} has no bounding box`);
        }
        await page.screenshot({
          path: file,
          clip: { x: box.x + inset, y: box.y, width: box.width - inset, height: box.height },
        });
      } else {
        await page.locator(shot.selector).screenshot({ path: file });
      }
      // eslint-disable-next-line no-console
      console.log(`[${recipe.id}] saved ${path.relative(ROOT_DIR, file)}`);

      // Mirror into dist/ so a running dev server (which serves dist/) can
      // show the fresh image in the help-dialog verification shot below.
      const distFile = path.join(ROOT_DIR, 'dist', 'img', 'help', recipe.outDir ?? recipe.id, `${shot.name}.png`);

      if (fs.existsSync(path.join(ROOT_DIR, 'dist'))) {
        fs.mkdirSync(path.dirname(distFile), { recursive: true });
        fs.copyFileSync(file, distFile);
      }
    }

    // Capture the rendered help dialog for visual verification
    await page.keyboard.press('Shift+F1');
    const helpScreen = page.locator('#help-screen');

    if (await helpScreen.isVisible({ timeout: 5_000 }).catch(() => false)) {
      fs.mkdirSync(VERIFY_DIR, { recursive: true });
      const verifyFile = path.join(VERIFY_DIR, `${recipe.id}-help-dialog.png`);

      // Reload the help images in case they were captured moments ago
      await page.waitForTimeout(1_000);
      await helpScreen.screenshot({ path: verifyFile });
      // eslint-disable-next-line no-console
      console.log(`[${recipe.id}] saved ${path.relative(ROOT_DIR, verifyFile)} (verification only)`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[${recipe.id}] help dialog did not open (Shift+F1) - no verification shot`);
    }
  } finally {
    await context.close();
  }
};

const main = async (): Promise<void> => {
  const requested = process.argv.slice(2);
  const recipes = requested.length > 0 ? RECIPES.filter((r) => requested.includes(r.id)) : RECIPES;

  if (recipes.length === 0) {
    throw new Error(`No recipes matched [${requested.join(', ')}]. Known: ${RECIPES.map((r) => r.id).join(', ')}`);
  }

  // Fail fast with a clear message if the dev server is not running
  const ping = await fetch(BASE_URL).catch(() => null);

  if (!ping) {
    throw new Error(`No server responding at ${BASE_URL}. Start one with "npm run start" (or set BASE_URL).`);
  }

  const browser = await chromium.launch();
  const failed: string[] = [];

  try {
    for (const recipe of recipes) {
      try {
        await runRecipe(browser, recipe);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`[${recipe.id}] FAILED:`, e);
        failed.push(recipe.id);
      }
    }
  } finally {
    await browser.close();
  }

  if (failed.length > 0) {
    throw new Error(`Recipes failed: ${failed.join(', ')}`);
  }
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
