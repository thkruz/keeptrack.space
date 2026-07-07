/**
 * TEMPORARY probe: measures whether the selected satellite's positionData is
 * time-consistent frame to frame, or rewinds when position-cruncher messages
 * land (dot sawtooth = velocity x latency). Reports the residual of
 * (deltaPos - velocity * deltaSimTime) per frame, split along/perpendicular to
 * the velocity, and marks frames where cruncherGmst changed.
 *
 * Usage: npx tsx scripts/orbit-diagnostics/probe-dot-lag.ts <sccNum> <propRate>
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const SCC = process.argv[2] ?? '41866';
const PROP_RATE = Number(process.argv[3] ?? '1');
const N = 60;

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

  log(`[dot-lag r${PROP_RATE}] booting...`);
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
    api.getTimeManager().changePropRate(${PROP_RATE});
    window.__probeSatId = id;
  })()`);
  await page.waitForTimeout(3_000);

  const raw = await page.evaluate(`(() => new Promise((resolve) => {
    const api = window.keepTrack.api;
    const id = window.__probeSatId;
    const dm = api.getDotsManager();
    const tm = api.getTimeManager();
    const out = [];
    const tick = () => {
      const p = dm.getPositionArray(id);
      const v = dm.velocityData ? [dm.velocityData[id*3], dm.velocityData[id*3+1], dm.velocityData[id*3+2]] : [0,0,0];
      out.push({
        simMs: tm.simulationTimeObj.getTime(),
        cruncherGmst: dm.cruncherGmst,
        p: [p[0], p[1], p[2]],
        v,
      });
      if (out.length < ${N}) { requestAnimationFrame(tick); } else { resolve(JSON.stringify(out)); }
    };
    requestAnimationFrame(tick);
  }))()`) as string;

  await browser.close();

  const s = JSON.parse(raw) as { simMs: number; cruncherGmst: number; p: number[]; v: number[] }[];

  log('\nresidual = deltaPos - v*deltaSimTime (m); along = along velocity; perp = perpendicular');
  log('cru* marks frames where a position-cruncher message landed (cruncherGmst changed)\n');

  let maxAlong = 0, maxPerp = 0;

  for (let i = 1; i < s.length; i++) {
    const dtSec = (s[i].simMs - s[i - 1].simMs) / 1000;
    const dp = [s[i].p[0] - s[i - 1].p[0], s[i].p[1] - s[i - 1].p[1], s[i].p[2] - s[i - 1].p[2]];
    const v = s[i - 1].v;
    const res = [dp[0] - v[0] * dtSec, dp[1] - v[1] * dtSec, dp[2] - v[2] * dtSec];
    const vLen = Math.hypot(v[0], v[1], v[2]) || 1;
    const vu = [v[0] / vLen, v[1] / vLen, v[2] / vLen];
    const along = res[0] * vu[0] + res[1] * vu[1] + res[2] * vu[2];
    const perp = Math.hypot(res[0] - along * vu[0], res[1] - along * vu[1], res[2] - along * vu[2]);
    const cru = s[i].cruncherGmst !== s[i - 1].cruncherGmst ? 'cru*' : '    ';

    maxAlong = Math.max(maxAlong, Math.abs(along));
    maxPerp = Math.max(maxPerp, perp);
    log(`f${String(i).padStart(2, '0')} ${cru} dtSim=${(dtSec * 1000).toFixed(0)}ms along=${(along * 1000).toFixed(1)}m perp=${(perp * 1000).toFixed(1)}m`);
  }
  log(`\nmax |along| = ${(maxAlong * 1000).toFixed(1)} m, max perp = ${(maxPerp * 1000).toFixed(1)} m`);
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
