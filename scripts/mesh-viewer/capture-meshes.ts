/**
 * Headless contact-sheet capture for the standalone mesh viewer. Pass an output
 * dir and one or more mesh names; captures a 45-deg oblique of each. Chromium
 * MUST launch with --disable-gpu (swiftshader) or the first composited WebGL
 * context is lost (black canvas). Camera fits the bbox in world km directly,
 * bypassing the viewer's 20 m minimum-distance floor that swallows sub-meter meshes.
 *
 *   PORT=5599 npx tsx scripts/mesh-viewer/capture-meshes.ts <outDir> <name...>
 */
import { chromium } from 'playwright';

const PORT = Number.parseInt(process.env.PORT ?? '5599', 10);
const [outDir, ...names] = process.argv.slice(2);

if (!outDir || names.length === 0) {
  throw new Error('usage: capture-meshes.ts <outDir> <name...>');
}

const main = async (): Promise<void> => {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
  let nav = 0;

  for (const name of names) {
    await page.goto(`http://localhost:${PORT}/?n=${nav++}#${encodeURIComponent(name)}`, { waitUntil: 'load' });
    await page.waitForFunction(
      (n) => {
        const dbg = (globalThis as { __viewerDebug?: { state: { currentName: string | null; model: unknown } } }).__viewerDebug;

        return dbg?.state.currentName === n && Boolean(dbg.state.model);
      },
      name,
      { timeout: 20_000 },
    );
    await page.evaluate(() => {
      const dbg = (globalThis as { __viewerDebug?: { state: { cam: Record<string, number>; sunAz: number; sunEl: number; model: { bboxMin: number[]; bboxMax: number[] } }; renderFrame: () => void } }).__viewerDebug!;
      const bb = dbg.state.model;
      const extentKm = Math.max(bb.bboxMax[0] - bb.bboxMin[0], bb.bboxMax[1] - bb.bboxMin[1], bb.bboxMax[2] - bb.bboxMin[2]) * 0.001;

      dbg.state.cam.yaw = 0.7;
      dbg.state.cam.pitch = 0.4;
      dbg.state.cam.dist = extentKm * 2.4;
      dbg.state.sunAz = 40;
      dbg.state.sunEl = 35;
      dbg.renderFrame();
    });
    await page.waitForTimeout(120);
    await page.locator('#canvas').screenshot({ path: `${outDir}/${name}-oblique.png` });
    // eslint-disable-next-line no-console
    console.log(`captured ${name}`);
  }

  await browser.close();
};

await main();
