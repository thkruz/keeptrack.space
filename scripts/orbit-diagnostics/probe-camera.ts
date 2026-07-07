/**
 * TEMPORARY probe: samples camera state per frame for the satellite-centered
 * view to detect oscillation (zoom/pitch/yaw hunting) that would read as
 * whole-scene jitter around the pinned dot.
 *
 * Usage: npx tsx scripts/orbit-diagnostics/probe-camera.ts <sccNum> <distKm>
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const SCC = process.argv[2] ?? '41866';
const CAM_DIST = Number(process.argv[3] ?? '15');
const N = 40;

const log = (m: string): void => {
  // eslint-disable-next-line no-console
  console.log(m);
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify({
        isAutoStart: true, noCatalogOnLoad: false, minLogLevel: 'WARN',
        isDisablePerformanceDowngrade: true, isDisableLoginGate: true, isDisableOnboarding: true,
        isOrbitCruncherInEcf: true, isDisableGodrays: true, isDisableSkybox: true,
      })};`,
    });
  });

  log(`[camera-probe dist=${CAM_DIST}] booting...`);
  await page.goto(BASE_URL);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () => ((window as unknown as { keepTrack: { api: { getCatalogManager(): { objectCache: unknown[] } } } })
      .keepTrack.api.getCatalogManager().objectCache.length) > 1000,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(5_000);

  await page.evaluate(`(() => {
    const api = window.keepTrack.api;
    const id = api.getCatalogManager().sccNum2Id(${JSON.stringify(SCC)});
    if (id === null || id === -1) { throw new Error('sat not found'); }
    api.getPluginByName('SelectSatManager').selectSat(id);
  })()`);
  await page.waitForTimeout(3_000);
  await page.evaluate(`(() => {
    const cam = window.keepTrack.api.getMainCamera();
    cam.state.camZoomSnappedOnSat = true;
    cam.state.camDistBuffer = ${CAM_DIST};
  })()`);
  await page.waitForTimeout(600);
  await page.evaluate(`(() => {
    const cam = window.keepTrack.api.getMainCamera();
    cam.state.zoomLevel = cam.state.zoomTarget;
  })()`);
  await page.waitForTimeout(8_000);

  const raw = await page.evaluate(`(() => new Promise((resolve) => {
    const cam = window.keepTrack.api.getMainCamera();
    const out = [];
    const tick = () => {
      const s = cam.state;
      out.push({
        zoomLevel: s.zoomLevel, zoomTarget: s.zoomTarget,
        camPitch: s.camPitch, camYaw: s.camYaw,
        ftsPitch: s.ftsPitch ?? 0, ftsYaw: s.ftsYaw ?? 0,
        camDistBuffer: s.camDistBuffer,
      });
      if (out.length < ${N}) { requestAnimationFrame(tick); } else { resolve(JSON.stringify(out)); }
    };
    requestAnimationFrame(tick);
  }))()`) as string;

  await browser.close();

  const s = JSON.parse(raw) as Record<string, number>[];

  log('\nper-frame camera deltas (urad = microradians; zoom in 1e-9 units):');
  for (let i = 1; i < s.length; i += 1) {
    const dz = (s[i].zoomLevel - s[i - 1].zoomLevel) * 1e9;
    const dp = (s[i].camPitch - s[i - 1].camPitch) * 1e6;
    const dy = (s[i].camYaw - s[i - 1].camYaw) * 1e6;
    const dfp = (s[i].ftsPitch - s[i - 1].ftsPitch) * 1e6;
    const dfy = (s[i].ftsYaw - s[i - 1].ftsYaw) * 1e6;

    log(`f${String(i).padStart(2, '0')} dZoom=${dz.toFixed(1)}e-9 dPitch=${dp.toFixed(2)}urad dYaw=${dy.toFixed(2)}urad dFtsPitch=${dfp.toFixed(2)}urad dFtsYaw=${dfy.toFixed(2)}urad`);
  }
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
