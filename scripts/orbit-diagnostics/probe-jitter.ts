/**
 * TEMPORARY numeric probe for the ECF orbit-line jitter investigation.
 *
 * Instead of pixels, this records the actual per-frame inputs to the orbit-line
 * vertex shader (GL buffer head/body vertices, gmst, worldShift, dot position)
 * for N consecutive frames, then re-computes the shader transform in emulated
 * float32 to report exactly how far each rendered vertex moves frame-to-frame,
 * in km. Discriminates head vs body motion and pins the responsible term.
 *
 * Usage: npx tsx scripts/orbit-diagnostics/probe-jitter.ts <sccNum> <ecf|eci> <propRate>
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const SCC = process.argv[2] ?? '41866';
const MODE = (process.argv[3] ?? 'ecf').toLowerCase();
const PROP_RATE = Number(process.argv[4] ?? '1');
const SAMPLE_FRAMES = 40;

const log = (m: string): void => {
  // eslint-disable-next-line no-console
  console.log(m);
};

interface FrameSample {
  t: number;
  gmst: number;
  worldShift: number[];
  dotPos: number[];
  anchor: number[];
  bufLen: number;
  v0: number[]; // first vertex xyzw
  v1: number[];
  v2: number[];
  vMid: number[];
}

const f = Math.fround;

/** Emulated-f32 rotate ECEF->ECI about Z with precomputed cos/sin. */
const rotCS = (v: number[], c: number, s: number): number[] => [
  f(f(v[0] * c) - f(v[1] * s)),
  f(f(v[0] * s) + f(v[1] * c)),
  f(v[2]),
];

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

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
      })};`,
    });
  });

  log(`[probe-${MODE}-r${PROP_RATE}] booting...`);
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

  await page.evaluate(`(() => {
    const api = window.keepTrack.api;
    const id = api.getCatalogManager().sccNum2Id(${JSON.stringify(SCC)});
    if (id === null || id === -1) { throw new Error('sat not found: ${SCC}'); }
    api.getPluginByName('SelectSatManager').selectSat(id);
    api.getTimeManager().changePropRate(${PROP_RATE});
    window.__probeSatId = id;
  })()`);
  await page.waitForTimeout(3_000);

  log(`sampling ${SAMPLE_FRAMES} frames...`);
  const raw = await page.evaluate(`(() => new Promise((resolve) => {
    const api = window.keepTrack.api;
    const id = window.__probeSatId;
    const om = api.getOrbitManager();
    const dm = api.getDotsManager();
    const tm = api.getTimeManager();
    const scene = api.getScene();
    const samples = [];
    const tick = () => {
      const buf = om.getBufferData(id);
      const dot = dm.getPositionArray(id);
      const anchor = (om.orbitAnchors_ && om.orbitAnchors_.get(id)) || [0, 0, 0];
      const mid = buf ? 4 * Math.floor(buf.length / 8) : 0;
      samples.push({
        t: performance.now(),
        gmst: tm.gmst,
        worldShift: [...scene.worldShift],
        dotPos: [dot[0], dot[1], dot[2]],
        anchor: [anchor[0], anchor[1], anchor[2]],
        bufLen: buf ? buf.length : 0,
        v0: buf ? [buf[0], buf[1], buf[2], buf[3]] : [],
        v1: buf ? [buf[4], buf[5], buf[6], buf[7]] : [],
        v2: buf ? [buf[8], buf[9], buf[10], buf[11]] : [],
        vMid: buf ? [buf[mid], buf[mid + 1], buf[mid + 2], buf[mid + 3]] : [],
      });
      if (samples.length < ${SAMPLE_FRAMES}) { requestAnimationFrame(tick); } else { resolve(JSON.stringify(samples)); }
    };
    requestAnimationFrame(tick);
  }))()`) as string;

  await browser.close();

  const samples = JSON.parse(raw) as FrameSample[];

  // Raw sample sanity: relative buffers have km-scale v1 and a ~42164 km anchor;
  // a stale (absolute) bundle shows ~42164 km v1 and a zero anchor.
  log(`\nsample f00: anchor=[${samples[0].anchor.map((n) => n.toFixed(1)).join(', ')}] v1=[${samples[0].v1.map((n) => n.toFixed(2)).join(', ')}]`);

  // Re-compute the shader transform per frame in emulated f32 and report motion.
  log(`\n=== per-frame rendered-vertex motion, km (mode=${MODE}, propRate=${PROP_RATE}) ===`);
  log('col: dot = dot+worldShift | v0 = head vertex | v1,v2 = first body vertices | vMid = mid body vertex');

  interface Rendered {
    dot: number[];
    v0: number[];
    v1: number[];
    v2: number[];
    vMid: number[];
  }

  const renderFrame = (smp: FrameSample): Rendered => {
    const ws = smp.worldShift.map(f);
    const c = Math.cos(smp.gmst);
    const s = Math.sin(smp.gmst);
    const c32 = f(c);
    const s32 = f(s);

    // anchorEciNow computed in float64 (as writePathToGpu_ does), then the
    // u_anchorLocal uniform quantized to f32 at upload.
    const anchorEciNow = MODE === 'ecf'
      ? [smp.anchor[0] * c - smp.anchor[1] * s, smp.anchor[0] * s + smp.anchor[1] * c, smp.anchor[2]]
      : smp.anchor;
    const anchorLocal = [
      f(anchorEciNow[0] + smp.worldShift[0]),
      f(anchorEciNow[1] + smp.worldShift[1]),
      f(anchorEciNow[2] + smp.worldShift[2]),
    ];

    const place = (v: number[]): number[] => {
      if (!v.length) {
        return [Number.NaN, Number.NaN, Number.NaN];
      }
      // anchor-relative: body rotates the SMALL relative vertex (ECF only),
      // head (w<0) is already current-ECI relative; both then add u_anchorLocal.
      let p = [f(v[0]), f(v[1]), f(v[2])];

      if (MODE === 'ecf' && v[3] >= 0) {
        p = rotCS(p, c32, s32);
      }

      return [f(p[0] + anchorLocal[0]), f(p[1] + anchorLocal[1]), f(p[2] + anchorLocal[2])];
    };

    return {
      dot: [f(f(smp.dotPos[0]) + ws[0]), f(f(smp.dotPos[1]) + ws[1]), f(f(smp.dotPos[2]) + ws[2])],
      v0: place(smp.v0),
      v1: place(smp.v1),
      v2: place(smp.v2),
      vMid: place(smp.vMid),
    };
  };

  const rendered = samples.map(renderFrame);
  const d3 = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // Decompose each vertex's frame-to-frame motion against the LOCAL line
  // direction: tangential slide (resample epoch advancing along the curve) is
  // invisible; only the PERPENDICULAR component is visible jitter.
  const perp = (move: number[], tangent: number[]): number => {
    const tLen = Math.hypot(tangent[0], tangent[1], tangent[2]) || 1;
    const t = [tangent[0] / tLen, tangent[1] / tLen, tangent[2] / tLen];
    const along = move[0] * t[0] + move[1] * t[1] + move[2] * t[2];

    return Math.hypot(move[0] - along * t[0], move[1] - along * t[1], move[2] - along * t[2]);
  };

  let maxPerpV1 = 0;

  log('perp = component of motion perpendicular to the local line (visible jitter)');
  for (let i = 1; i < rendered.length; i++) {
    const dtMs = (samples[i].t - samples[i - 1].t).toFixed(0);
    const prevTangent = [
      rendered[i - 1].v2[0] - rendered[i - 1].v0[0],
      rendered[i - 1].v2[1] - rendered[i - 1].v0[1],
      rendered[i - 1].v2[2] - rendered[i - 1].v0[2],
    ];
    const moveV1 = [
      rendered[i].v1[0] - rendered[i - 1].v1[0],
      rendered[i].v1[1] - rendered[i - 1].v1[1],
      rendered[i].v1[2] - rendered[i - 1].v1[2],
    ];
    const perpV1 = perp(moveV1, prevTangent);
    const move = {
      dot: d3(rendered[i].dot, rendered[i - 1].dot),
      v0: d3(rendered[i].v0, rendered[i - 1].v0),
      v1: d3(rendered[i].v1, rendered[i - 1].v1),
      vMid: d3(rendered[i].vMid, rendered[i - 1].vMid),
    };

    maxPerpV1 = Math.max(maxPerpV1, perpV1);
    log(
      `f${String(i).padStart(2, '0')} dt=${dtMs}ms  dot=${move.dot.toFixed(4)}  v0=${move.v0.toFixed(4)}  ` +
      `v1=${move.v1.toFixed(4)} (perp ${perpV1.toFixed(4)})  vMid=${move.vMid.toFixed(4)}  v0w=${samples[i].v0[3]?.toFixed(1)}`,
    );
  }

  // Head-to-first-body gap per frame (line "kink" length at the head)
  log('\n=== head (v0) to first body vertex (v1) rendered gap, km ===');
  for (let i = 0; i < rendered.length; i += 5) {
    log(`f${String(i).padStart(2, '0')} |v0-v1| = ${d3(rendered[i].v0, rendered[i].v1).toFixed(3)}`);
  }

  log(`\nmax per-frame PERPENDICULAR v1 motion: ${(maxPerpV1 * 1000).toFixed(2)} m`);
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
