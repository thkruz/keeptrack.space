/**
 * One-off verification: single-finger drag stays screen-relative after a twist roll.
 * Boots KeepTrack in forced mobile mode, measures camPitch/camYaw response to a
 * horizontal one-finger drag at roll 0, then twists ~100deg clockwise (-90deg roll)
 * and repeats the same drag. With roll compensation the second drag must move pitch
 * (the base-frame axis that is horizontal on screen after the roll), not yaw.
 *
 * Run: npx tsx scripts/twist-drag-verify.ts   (needs the warm dev server on :5544)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5544';
const OUT = path.join(process.cwd(), 'test-results', 'visual-inspect', 'twist-drag');

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
  await page.waitForTimeout(3_000);
  await page.evaluate('window.keepTrack.api.getMainCamera().autoRotate(false)');
  await page.waitForTimeout(500);

  const box = await page.locator('#keeptrack-canvas').boundingBox();

  if (!box) {
    throw new Error('no canvas');
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const client = await context.newCDPSession(page);

  const readAngles = async (): Promise<{ pitch: number; yaw: number; roll: number }> => {
    const raw = await page.evaluate(`JSON.stringify({
      pitch: window.keepTrack.api.getMainCamera().state.camPitch,
      yaw: window.keepTrack.api.getMainCamera().state.camYaw,
      roll: window.keepTrack.api.getMainCamera().state.localRotateCurrent.roll,
    })`);

    return JSON.parse(raw);
  };

  /** Horizontal one-finger drag to the right, then wait out the release momentum. */
  const dragRight = async (px: number): Promise<void> => {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - px / 2, y: cy, id: 1 }] });
    for (let d = 20; d <= px; d += 20) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - px / 2 + d, y: cy, id: 1 }] });
      await page.waitForTimeout(16);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(2_000);
  };

  /** Two-finger clockwise twist about the canvas center. */
  const twistCw = async (deg: number): Promise<void> => {
    const r = 200;
    const pts = (thetaDeg: number) => {
      const t = (thetaDeg * Math.PI) / 180;

      return [
        { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t), id: 1 },
        { x: cx - r * Math.cos(t), y: cy - r * Math.sin(t), id: 2 },
      ];
    };

    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
    for (let d = 2; d <= deg; d += 2) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(d) });
      await page.waitForTimeout(16);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(800);
  };

  const toDeg = (rad: number): number => (rad * 180) / Math.PI;

  // Phase 1: horizontal drag with no roll -> expect yaw-dominant
  const a0 = await readAngles();

  await dragRight(300);
  const a1 = await readAngles();

  console.log(`roll 0 drag:    dYaw=${toDeg(a1.yaw - a0.yaw).toFixed(1)} deg, dPitch=${toDeg(a1.pitch - a0.pitch).toFixed(1)} deg (expect yaw-dominant)`);

  // Phase 2: twist to ~-90deg roll, same drag -> expect pitch-dominant
  await twistCw(100);
  const a2 = await readAngles();

  console.log(`roll after twist: ${toDeg(a2.roll).toFixed(1)} deg (expect ~ -90)`);

  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'rolled-before-drag.png') });
  await dragRight(300);
  const a3 = await readAngles();

  await page.locator('#keeptrack-canvas').screenshot({ path: path.join(OUT, 'rolled-after-drag.png') });

  console.log(`rolled drag:    dYaw=${toDeg(a3.yaw - a2.yaw).toFixed(1)} deg, dPitch=${toDeg(a3.pitch - a2.pitch).toFixed(1)} deg (expect pitch-dominant, yaw ~0)`);
  console.log(`shots: ${OUT}`);

  await browser.close();
};

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
