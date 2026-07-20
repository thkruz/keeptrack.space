/**
 * One-off verification: mobile pinch-out from a focused satellite escapes the
 * close-range standoff dolly and reaches a whole-Earth view (pro build, mobile mode).
 * Boots KeepTrack in forced mobile mode with the catalog, selects the ISS,
 * dispatches repeated two-finger pinch-out strokes via CDP Input.dispatchTouchEvent,
 * and logs the camera distance after every stroke plus before/after screenshots.
 *
 * Run: npx tsx <this file>   (needs the warm dev server on :5544)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5544';
const OUT = path.join(process.cwd(), 'test-results', 'visual-inspect', 'pinch-zoom-out');
const WHOLE_EARTH_KM = 40_000;
const MAX_STROKES = 16;

const main = async (): Promise<void> => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[console.error] ${msg.text()}`);
    }
  });

  const override = {
    isAutoStart: true,
    minLogLevel: 'WARN',
    isDisablePerformanceDowngrade: true,
    isDisableLoginGate: true,
    isDisableOnboarding: true,
    isForceMobileMode: true,
    plugins: {},
  };

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify(override)};`,
    });
  });

  await page.goto(BASE_URL);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 120_000 });
  await page.waitForFunction('window.keepTrack && window.keepTrack.isReady === true', { timeout: 90_000 });
  await page.waitForTimeout(3_000); // let autostart settle the camera

  // Select the ISS and let the camera snap in close
  await page.evaluate(`(() => {
    const api = window.keepTrack.api;
    const id = api.getCatalogManager().sccNum2Id('25544');
    if (id === null || id === -1) { throw new Error('ISS not found'); }
    api.getPluginByName('SelectSatManager').selectSat(id);
  })()`);
  await page.waitForTimeout(2_500);

  const readState = async (): Promise<{ dist: number; standoff: number; camType: number }> => JSON.parse(String(await page.evaluate(`(() => {
    const cam = window.keepTrack.api.getMainCamera();
    return JSON.stringify({
      dist: cam.calcDistanceBasedOnZoom(cam.state.zoomTarget),
      standoff: cam.state.camDistBuffer,
      camType: cam.cameraType,
    });
  })()`)));

  const before = await readState();

  console.log(`after select: dist=${before.dist.toFixed(1)} km  standoff=${before.standoff.toFixed(2)} km  camType=${before.camType}`);
  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'pinch-before.png') });

  const box = await page.locator('#keeptrack-canvas').boundingBox();

  if (!box) {
    throw new Error('no canvas');
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const client = await context.newCDPSession(page);

  // Horizontal finger pair closing from +-250 px to +-40 px = one pinch-out stroke
  const pts = (halfSpread: number) => [
    { x: cx - halfSpread, y: cy, id: 1 },
    { x: cx + halfSpread, y: cy, id: 2 },
  ];

  const pinchOutStroke = async (): Promise<void> => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(250) });
    for (let half = 243; half >= 40; half -= 7) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(half) });
      await page.waitForTimeout(16);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(120);
  };

  let strokes = 0;
  let dist = before.dist;

  while (strokes < MAX_STROKES && dist < WHOLE_EARTH_KM) {
    await pinchOutStroke();
    strokes += 1;
    const s = await readState();

    dist = s.dist;
    console.log(`stroke ${String(strokes).padStart(2)}: dist=${dist.toFixed(1)} km  standoff=${s.standoff.toFixed(2)} km`);
  }

  await page.waitForTimeout(1_000);
  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'pinch-zoomed-out.png') });

  // Pinch back in a couple of strokes to confirm the hand-off back to the dolly is smooth
  const pinchInStroke = async (): Promise<void> => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(40) });
    for (let half = 47; half <= 250; half += 7) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(half) });
      await page.waitForTimeout(16);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(120);
  };

  for (let i = 0; i < 3; i++) {
    await pinchInStroke();
    const s = await readState();

    console.log(`pinch-in ${i + 1}: dist=${s.dist.toFixed(1)} km  standoff=${s.standoff.toFixed(2)} km`);
  }

  await page.waitForTimeout(1_000);
  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'pinch-back-in.png') });
  await browser.close();

  console.log(`\nresult: ${dist >= WHOLE_EARTH_KM ? 'PASS' : 'FAIL'} - reached ${dist.toFixed(0)} km in ${strokes} strokes (target ${WHOLE_EARTH_KM} km within ${MAX_STROKES})`);
  console.log(`shots: ${OUT}`);

  if (dist < WHOLE_EARTH_KM) {
    process.exitCode = 1;
  }
};

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
