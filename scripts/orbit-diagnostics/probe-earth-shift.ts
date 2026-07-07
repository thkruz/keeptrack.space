/**
 * TEMPORARY probe: estimates the frame-to-frame x-shift of the EARTH (background)
 * in saved burst frames via patch cross-correlation, to compare against the
 * orbit line's measured x-shift. Same shift => camera motion, not line motion.
 *
 * Usage: npx tsx scripts/orbit-diagnostics/probe-earth-shift.ts <framesDir> <patchX> <patchY>
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { resolveWithin } from '../lib/safe-path';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// DIR is CLI-supplied; confine it to the repo before reading the frame files so a
// stray argument can't enumerate an arbitrary directory outside the workspace.
const DIR = resolveWithin(ROOT_DIR, process.argv[2] ?? 'test-results/visual-inspect/jitter-ecf-r1');
const PX = Number(process.argv[3] ?? '400');
const PY = Number(process.argv[4] ?? '300');

const log = (m: string): void => {
  // eslint-disable-next-line no-console
  console.log(m);
};

const main = async (): Promise<void> => {
  const files = fs.readdirSync(DIR).filter((f) => f.startsWith('frame-')).sort();
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();

  await page.goto('about:blank');

  log(`frames: ${files.length} in ${DIR}; patch at (${PX},${PY}) 160x160, search +/-8 px`);

  let prev: string | null = null;

  for (const fname of files) {
    const b64 = fs.readFileSync(path.join(DIR, fname)).toString('base64');

    if (prev) {
      const result = await page.evaluate(
        `(async () => {
          const load = (b64) => new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => res(im); im.onerror = rej;
            im.src = 'data:image/png;base64,' + b64;
          });
          const [a, b] = await Promise.all([load(${JSON.stringify(prev)}), load(${JSON.stringify(b64)})]);
          const c = document.createElement('canvas'); c.width = a.width; c.height = a.height;
          const x2d = c.getContext('2d', { willReadFrequently: true });
          x2d.drawImage(a, 0, 0);
          const dA = x2d.getImageData(0, 0, a.width, a.height).data;
          x2d.drawImage(b, 0, 0);
          const dB = x2d.getImageData(0, 0, a.width, a.height).data;
          const W = a.width, S = 160, px = ${PX}, py = ${PY};
          const lum = (d, x, y) => { const o = (y * W + x) * 4; return d[o] * 0.5 + d[o+1] + d[o+2] * 0.25; };
          let best = 0, bestErr = Infinity;
          for (let dx = -8; dx <= 8; dx++) {
            let err = 0;
            for (let y = py; y < py + S; y += 2) {
              for (let x = px; x < px + S; x += 2) {
                const e = lum(dA, x, y) - lum(dB, x + dx, y);
                err += e * e;
              }
            }
            if (err < bestErr) { bestErr = err; best = dx; }
          }
          return best;
        })()`,
      ) as number;

      log(`${fname}: earth x-shift vs prev = ${result} px`);
    }
    prev = b64;
  }

  await browser.close();
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
