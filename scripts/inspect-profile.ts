/**
 * Verify a build profile's own settingsOverride in a real browser.
 *
 * `scripts/inspect.ts` cannot do this: it intercepts the `settings/settingsOverride.js`
 * route and serves a synthesized object built from its spec, so the profile's file never
 * executes. That is the right call for feature screenshots - it makes them reproducible -
 * but it means a profile's plugin allowlist, catalog flag and scene settings are invisible
 * to it, and a profile can be completely broken while every inspect.ts run comes back green.
 *
 * This script loads the page untouched and reports what the profile actually produced.
 *
 * Prereq: a dev server for the profile under test, e.g. `npm run start:solar-system`.
 *
 *   npx tsx scripts/inspect-profile.ts
 *   BASE_URL=http://localhost:5544 npx tsx scripts/inspect-profile.ts
 *   SHOT=test-results/profile.png npx tsx scripts/inspect-profile.ts
 *
 * Note the perf-downgrade toast ("Your computer is struggling!") is expected under headless
 * SwiftShader and is not a profile fault - inspect.ts suppresses it via a setting this
 * script deliberately does not inject, because injecting anything would defeat the purpose.
 */
import { chromium } from '@playwright/test';

const URL = process.env.BASE_URL ?? 'http://localhost:5544';
const SHOT = process.env.SHOT ?? 'test-results/inspect-profile.png';
/** Same benign-noise allowlist the e2e console listener uses, plus headless-only chatter. */
const BENIGN = /geo3D exists|\b403\b|GPU stall|Select a satellite|struggling/u;

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors: string[] = [];

page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') {
    errors.push(`console: ${m.text().slice(0, 200)}`);
  }
});

await page.goto(URL);

/*
 * A profile without isAutoStart parks on the "Click to Begin" splash forever. Click through
 * it rather than hanging, but report it - for a kiosk/embed profile it is usually a bug.
 */
let neededClick = false;

try {
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 45_000 });
} catch {
  neededClick = true;
  await page.mouse.click(800, 450);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 45_000 });
}

await page.waitForFunction(() => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true, { timeout: 60_000 });
await page.waitForTimeout(4000);

const report = await page.evaluate(() => {
  const win = window as unknown as Record<string, Record<string, unknown>>;
  const sm = win.settingsManager;
  const wo = (win.settingsOverride ?? {}) as Record<string, unknown>;
  const scene = (win.keepTrack.api as unknown as Record<string, () => Record<string, unknown>>).getScene();
  const plugins = (sm.plugins ?? {}) as Record<string, { enabled?: boolean }>;

  return {
    overrideLoaded: Object.keys(wo).length > 0,
    isStrictPluginList: wo.isStrictPluginList === true,
    noCatalogOnLoad: sm.noCatalogOnLoad === true,
    isAutoStart: sm.isAutoStart === true,
    enabled: Object.entries(plugins).filter(([, v]) => v?.enabled).map(([k]) => k).sort((a, b) => a.localeCompare(b)),
    scene: {
      moons: Object.keys((scene.moons ?? {}) as object).length,
      asteroids: Object.keys((scene.asteroids ?? {}) as object).length,
      dwarfPlanets: Object.keys((scene.dwarfPlanets ?? {}) as object).length,
      deepSpaceSatellites: Object.keys((scene.deepSpaceSatellites ?? {}) as object).length,
      asteroidBelt: scene.asteroidBelt ? 'present' : 'absent',
    },
  };
});

await page.screenshot({ path: SHOT });
await browser.close();

const real = errors.filter((e) => !BENIGN.test(e));

console.log(JSON.stringify({ ...report, enabledCount: report.enabled.length, neededSplashClick: neededClick, errors: real }, null, 2));
console.log(`\nscreenshot: ${SHOT}`);

if (real.length > 0 || !report.overrideLoaded) {
  process.exitCode = 1;
}
