/**
 * TEMPORARY diagnostic for the ECF orbit-line jitter investigation.
 *
 * Boots the warm dev server (:5544), selects a satellite, zooms close, patches the
 * dot layer off, then captures a burst of consecutive canvas frames. For each frame
 * it extracts the sub-pixel x-centroid of the (red) orbit line on every scanline of
 * a center crop, then reports frame-to-frame line displacement statistics per
 * vertical band - discriminating rigid shifts from head-fanning from noise.
 *
 * Usage: npx tsx scripts/orbit-diagnostics/inspect-jitter.ts <sccNum> <distKm> <ecf|eci> <propRate>
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type ConsoleMessage } from 'playwright';
import { resolveWithin } from '../lib/safe-path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SCC = process.argv[2] ?? '41866';
const CAM_DIST = Number(process.argv[3] ?? '200');
const MODE = (process.argv[4] ?? 'ecf').toLowerCase();
const PROP_RATE = Number(process.argv[5] ?? '1');
const RUN_ID = `jitter-${MODE}-r${PROP_RATE}`;
// RUN_ID embeds the CLI-supplied MODE, so confine the output dir to the
// visual-inspect results root before any mkdir/write touches the filesystem.
const OUT_DIR = resolveWithin(path.join(ROOT_DIR, 'test-results', 'visual-inspect'), RUN_ID);

const FRAMES = 8;
const FRAME_GAP_MS = 150;
const CROP = 600;

interface RowClusters {
  y: number;
  xs: number[]; // sub-pixel centroid of each red-line cluster on this row, left-to-right
}

const log = (m: string): void => {
  // eslint-disable-next-line no-console
  console.log(m);
};

const main = async (): Promise<void> => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`[pageerror] ${err.name}: ${err.message}`);
  });

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify({
        isAutoStart: true,
        noCatalogOnLoad: false,
        minLogLevel: 'WARN',
        isDisablePerformanceDowngrade: true,
        isDisableLoginGate: true,
        isDisableOnboarding: true,
        isOrbitCruncherInEcf: MODE === 'ecf',
        isDisableGodrays: true,
        isDisableSkybox: true,
        enableConstantSelectedSatRedraw: process.env.NO_REDRAW !== '1',
      })};`,
    });
  });

  log(`[${RUN_ID}] booting (catalog ON, mode=${MODE}, propRate=${PROP_RATE})...`);
  await page.goto(BASE_URL);
  await page.waitForSelector('#loading-screen', { state: 'hidden', timeout: 60_000 });
  await page.waitForFunction(
    () => (window as unknown as { keepTrack?: { isReady?: boolean } }).keepTrack?.isReady === true,
    { timeout: 20_000 },
  );
  await page.waitForFunction(
    () =>
      ((window as unknown as { keepTrack: { api: { getCatalogManager(): { objectCache: unknown[] } } } })
        .keepTrack.api.getCatalogManager().objectCache.length) > 1000,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(5_000);

  log(`selecting sat ${SCC}...`);
  await page.evaluate(`(() => {
    const api = window.keepTrack.api;
    const id = api.getCatalogManager().sccNum2Id(${JSON.stringify(SCC)});
    if (id === null || id === -1) { throw new Error('sat not found: ${SCC}'); }
    api.getPluginByName('SelectSatManager').selectSat(id);
  })()`);
  await page.waitForTimeout(3_000);

  log(`zoom camDistBuffer=${CAM_DIST} km, propRate=${PROP_RATE}, dots OFF...`);
  await page.evaluate(`(() => {
    const api = window.keepTrack.api;
    const cam = api.getMainCamera();
    cam.state.camZoomSnappedOnSat = true;
    cam.state.camDistBuffer = ${CAM_DIST};
    api.getTimeManager().changePropRate(${PROP_RATE});
    api.getDotsManager().draw = () => {};
  })()`);
  await page.waitForTimeout(600);
  await page.evaluate(`(() => {
    const cam = window.keepTrack.api.getMainCamera();
    cam.state.zoomLevel = cam.state.zoomTarget;
  })()`);
  // Long settle: the satellite-snap zoom easing keeps converging for several
  // seconds and reads as whole-scene x-shift in the diffs if captured early.
  await page.waitForTimeout(8_000);
  await page.evaluate(`(() => {
    const cam = window.keepTrack.api.getMainCamera();
    cam.state.zoomLevel = cam.state.zoomTarget;
  })()`);
  await page.waitForTimeout(1_000);

  const stateReport = await page.evaluate(`(() => {
    const api = window.keepTrack.api;
    const sm = window.settingsManager;
    const cam = api.getMainCamera();
    return JSON.stringify({
      ecf: sm.isOrbitCruncherInEcf,
      camDistBuffer: cam.state.camDistBuffer,
      zoomLevel: +cam.state.zoomLevel.toFixed(4),
      propRate: api.getTimeManager().propRate,
    });
  })()`) as string;

  log(`state: ${stateReport}`);

  log(`capturing ${FRAMES} frames ${FRAME_GAP_MS}ms apart...`);
  const canvas = page.locator('#keeptrack-canvas');
  const shots: Buffer[] = [];

  for (let i = 0; i < FRAMES; i++) {
    shots.push(await canvas.screenshot());
    await page.waitForTimeout(FRAME_GAP_MS);
  }

  for (let i = 0; i < FRAMES; i++) {
    fs.writeFileSync(path.join(OUT_DIR, `frame-${String(i).padStart(2, '0')}.png`), shots[i]);
  }

  // Extract per-row red-line centroids for every frame in a scratch page.
  log('extracting line centroids per scanline...');
  const scratch = await context.newPage();

  await scratch.goto('about:blank');

  const perFrame: RowClusters[][] = [];

  for (let i = 0; i < FRAMES; i++) {
    const b64 = shots[i].toString('base64');
    const result = await scratch.evaluate(
      `(async () => {
        const img = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = 'data:image/png;base64,${b64}';
        });
        const S = ${CROP};
        const sx = Math.max(0, (img.width - S) / 2 | 0);
        const sy = Math.max(0, (img.height - S) / 2 | 0);
        const w = Math.min(S, img.width), h = Math.min(S, img.height);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x2d = c.getContext('2d', { willReadFrequently: true });
        x2d.drawImage(img, sx, sy, w, h, 0, 0, w, h);
        const d = x2d.getImageData(0, 0, w, h).data;
        const rows = [];
        for (let y = 0; y < h; y++) {
          // Collect red-dominant pixels on this row (orbit select color is red).
          const hits = [];
          for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4;
            const r = d[o], g = d[o + 1], b = d[o + 2];
            if (r > 110 && r > 2.2 * g && r > 2.2 * b) { hits.push({ x, wgt: r }); }
          }
          if (!hits.length) { continue; }
          // Cluster by x-gap > 4px, weighted centroid per cluster.
          const xs = [];
          let cs = 0, cw = 0, lastX = -10;
          for (const hxx of hits) {
            if (hxx.x - lastX > 4 && cw > 0) { xs.push(cs / cw); cs = 0; cw = 0; }
            cs += hxx.x * hxx.wgt; cw += hxx.wgt; lastX = hxx.x;
          }
          if (cw > 0) { xs.push(cs / cw); }
          rows.push({ y, xs: xs.map((v) => +v.toFixed(2)) });
        }
        return JSON.stringify(rows);
      })()`,
    ) as string;

    perFrame.push(JSON.parse(result) as RowClusters[]);
  }

  // Cross-frame analysis: per adjacent frame pair, match rows and clusters
  // (same row y, same cluster count, nearest-x pairing) and collect dx.
  log('\n=== line displacement between adjacent frames (px, + = right) ===');
  const bandOf = (y: number): string => (y < CROP / 3 ? 'top' : y < (2 * CROP) / 3 ? 'mid' : 'bot');

  for (let i = 1; i < FRAMES; i++) {
    const prev = new Map(perFrame[i - 1].map((r) => [r.y, r.xs]));
    const bands: Record<string, number[]> = { top: [], mid: [], bot: [] };
    let matched = 0;

    for (const row of perFrame[i]) {
      const pXs = prev.get(row.y);

      if (!pXs || pXs.length !== row.xs.length) {
        continue;
      }
      for (let k = 0; k < row.xs.length; k++) {
        const dx = row.xs[k] - pXs[k];

        // Ignore wild mismatches (a dot/cluster artifact), keep plausible line motion.
        if (Math.abs(dx) < 30) {
          bands[bandOf(row.y)].push(dx);
          matched++;
        }
      }
    }

    const stat = (a: number[]): string => {
      if (!a.length) {
        return 'n/a';
      }
      const sorted = [...a].sort((p, q) => p - q);
      const med = sorted[(sorted.length / 2) | 0];
      const absSorted = a.map(Math.abs).sort((p, q) => p - q);
      const p95 = absSorted[Math.min(absSorted.length - 1, (absSorted.length * 0.95) | 0)];

      return `med=${med.toFixed(2)} p95|dx|=${p95.toFixed(2)} n=${a.length}`;
    };

    log(`pair ${i - 1}->${i}: top[${stat(bands.top)}] mid[${stat(bands.mid)}] bot[${stat(bands.bot)}] (${matched} samples)`);
  }

  await browser.close();

  const real = errors.filter((e) => !(/geo3D exists|403|GPU stall|Select a satellite|Failed to load resource/u).test(e));

  if (real.length) {
    log(`\n${real.length} non-benign console/page errors:`);
    for (const e of real.slice(0, 10)) {
      log(`  ${e}`);
    }
  } else {
    log('\nclean boot - no non-benign console/page errors.');
  }
  log(`output: ${path.relative(ROOT_DIR, OUT_DIR)}`);
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
