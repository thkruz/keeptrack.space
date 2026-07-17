/**
 * One-off verification: two-finger twist -> camera roll.
 * Boots KeepTrack in forced mobile mode, dispatches a synthetic two-finger
 * clockwise twist via CDP Input.dispatchTouchEvent, and captures before/after
 * canvas screenshots plus the numeric localRotateCurrent.roll delta.
 *
 * Run: npx tsx <this file>   (needs the warm dev server on :5544)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5544';
const OUT = path.join(process.cwd(), 'test-results', 'visual-inspect', 'twist-roll');

const main = async (): Promise<void> => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

  const override = {
    isAutoStart: true,
    noCatalogOnLoad: true,
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
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
  await page.waitForFunction('window.keepTrack && window.keepTrack.isReady === true', { timeout: 20_000 });
  await page.waitForTimeout(3_000); // let autostart settle the camera

  const probe = await page.evaluate(`JSON.stringify({
    mobile: window.settingsManager.isMobileModeEnabled,
    hasRollTouchTwist: typeof window.keepTrack.api.getMainCamera().rollTouchTwist === 'function',
  })`);

  console.log(`probe: ${probe}`);

  await page.evaluate('window.keepTrack.api.getMainCamera().autoRotate(false)');
  await page.waitForTimeout(500);

  const rollBefore = Number(await page.evaluate('window.keepTrack.api.getMainCamera().state.localRotateCurrent.roll'));

  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'twist-before.png') });

  const box = await page.locator('#keeptrack-canvas').boundingBox();

  if (!box) {
    throw new Error('no canvas');
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = 200;
  const client = await context.newCDPSession(page);

  // Finger pair diametrically opposed about the canvas center; increasing theta
  // (with screen y down) moves the fingers visually CLOCKWISE.
  const pts = (thetaDeg: number) => {
    const t = (thetaDeg * Math.PI) / 180;

    return [
      { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t), id: 1 },
      { x: cx - r * Math.cos(t), y: cy - r * Math.sin(t), id: 2 },
    ];
  };

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
  for (let d = 2; d <= 70; d += 2) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);

  const rollAfter = Number(await page.evaluate('window.keepTrack.api.getMainCamera().state.localRotateCurrent.roll'));

  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'twist-after.png') });

  // Twist back counter-clockwise to confirm the gesture reverses cleanly
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(70) });
  for (let d = 68; d >= 0; d -= 2) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);

  const rollFinal = Number(await page.evaluate('window.keepTrack.api.getMainCamera().state.localRotateCurrent.roll'));

  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'twist-reversed.png') });

  await browser.close();

  const toDeg = (rad: number): string => ((rad * 180) / Math.PI).toFixed(1);

  console.log(`roll before:   ${toDeg(rollBefore)} deg`);
  console.log(`roll after CW: ${toDeg(rollAfter)} deg  (expect ~ -60: 70deg twist minus ~9deg activation threshold, negative = image rotates CW with fingers)`);
  console.log(`roll reversed: ${toDeg(rollFinal)} deg  (expect ~ back toward 0)`);
  console.log(`shots: ${OUT}`);
};

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
