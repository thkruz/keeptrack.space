/**
 * Build the country flag atlas the mesh shader projects onto the selected satellite.
 *
 *   npx tsx scripts/flag-atlas/build-flag-atlas.ts
 *
 * Writes `public/img/flag-atlas/atlas.png` (2048x1024 RGBA, 96x64 px cells, 3:2 like a flag)
 * and `public/img/flag-atlas/atlas.json` ({ cells: { <flag key>: [u0, v0, u1, v1] } }).
 *
 * Flag keys are the flag-icons class suffixes `country2flagIcon()` produces (`fi-us` -> `us`)
 * for every code in `countries.ts`, plus every operator rule's country. Art comes from:
 *   1. the custom PNGs in `public/flags/` named by `public/css/flag-icons.css` (they win, as
 *      that stylesheet loads after flag-icons in the app), else
 *   2. `node_modules/flag-icons/flags/4x3/<key>.svg`, stretched to 3:2, else
 *   3. nothing: the key maps to the neutral grey fallback cell (cell 0) and is logged.
 *
 * Rasterised with Playwright's bundled Chromium (already a dev dependency) on the CPU
 * (`--disable-gpu`), then encoded by our own PNG writer, so two runs on the same machine are
 * byte-identical. Cells are assigned in sorted key order so diffs stay stable. Fails if the
 * PNG exceeds 512 KB.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { countryCodeList, countryFlagIconMap } from '../../src/app/data/catalogs/country-codes';
import { OPERATOR_RULES } from '../../src/app/data/operators/operator-rules';
import { encodePngRgba } from './png-encode';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'public', 'img', 'flag-atlas');
const SVG_DIR = join(ROOT, 'node_modules', 'flag-icons', 'flags', '4x3');
const CUSTOM_CSS = join(ROOT, 'public', 'css', 'flag-icons.css');
const CUSTOM_DIR = join(ROOT, 'public', 'flags');

const ATLAS_W = 2048;
const ATLAS_H = 1024;
const CELL_W = 96;
const CELL_H = 64;
const COLS = Math.floor(ATLAS_W / CELL_W);
const ROWS = Math.floor(ATLAS_H / CELL_H);
const MAX_PNG_BYTES = 512 * 1024;
const FALLBACK_KEY = '_fallback';
const FALLBACK_GREY = '#808080';

const byCodeUnit = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }

  return a > b ? 1 : 0;
};

/**
 * Every flag key the app can ask for: the key `country2flagIcon()` yields for each country
 * name, each individual code and each flag-map entry in `countries.ts` (name or code ->
 * code list -> first code -> flag map -> lower case), plus every operator rule's country.
 */
const collectKeys = (): string[] => {
  const flagMap = countryFlagIconMap as Record<string, string>;
  const codeList = countryCodeList as Record<string, string>;
  const keyFor = (input: string): string => {
    const first = (codeList[input] ?? input).split('|')[0];

    return (flagMap[first] ?? first).toLowerCase();
  };
  const inputs = new Set<string>([...Object.keys(codeList), ...Object.values(codeList).flatMap((codes) => codes.split('|')), ...Object.keys(flagMap)]);
  const keys = new Set<string>();

  for (const input of inputs) {
    if (input !== '') {
      keys.add(keyFor(input));
    }
  }
  for (const rule of OPERATOR_RULES) {
    keys.add(rule.country);
  }

  return [...keys].sort(byCodeUnit);
};

/** `.fi-xxx` selector -> custom PNG file name, parsed from public/css/flag-icons.css. */
const parseCustomFlags = (): Map<string, string> => {
  const css = readFileSync(CUSTOM_CSS, 'utf8');
  const out = new Map<string, string>();
  const ruleRe = /([^{}]+)\{\s*background-image:\s*url\(\.\.\/flags\/([^)]+)\)\s*;?\s*\}/gu;

  for (const match of css.matchAll(ruleRe)) {
    for (const selector of match[1].split(',')) {
      const name = selector.trim();

      if (name.startsWith('.fi-')) {
        out.set(name.slice(4), match[2].trim());
      }
    }
  }

  return out;
};

interface CellSource {
  key: string;
  dataUrl: string;
}

const svgDataUrl = (file: string): string => {
  // Give the root element an explicit cell size and let it stretch (4:3 -> 3:2).
  const svg = readFileSync(file, 'utf8').replace(/<svg\b/u, `<svg width="${CELL_W}" height="${CELL_H}" preserveAspectRatio="none"`);

  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
};

const rasterise = async (items: string[]): Promise<Uint8Array> => {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--force-color-profile=srgb', '--disable-lcd-text'] });

  try {
    const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
    const base64Pixels = await page.evaluate(
      async ({ urls, w, h, cw, ch, cols, grey }) => {
        const canvas = document.createElement('canvas');

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('2d context unavailable');
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Cell 0: neutral grey fallback.
        ctx.fillStyle = grey;
        ctx.fillRect(0, 0, cw, ch);

        const images = await Promise.all(
          urls.map(async (src) => {
            const img = new Image();

            img.src = src;
            await img.decode();

            return img;
          })
        );

        // Drawn strictly in cell order so the output is deterministic.
        images.forEach((img, i) => {
          const cell = i + 1;

          ctx.drawImage(img, (cell % cols) * cw, Math.floor(cell / cols) * ch, cw, ch);
        });

        const data = ctx.getImageData(0, 0, w, h).data;
        let bin = '';

        for (let i = 0; i < data.length; i += 0x8000) {
          bin += String.fromCharCode(...data.subarray(i, i + 0x8000));
        }

        return btoa(bin);
      },
      { urls: items, w: ATLAS_W, h: ATLAS_H, cw: CELL_W, ch: CELL_H, cols: COLS, grey: FALLBACK_GREY }
    );

    return new Uint8Array(Buffer.from(base64Pixels, 'base64'));
  } finally {
    await browser.close();
  }
};

const main = async (): Promise<void> => {
  const keys = collectKeys();
  const custom = parseCustomFlags();
  const sources: CellSource[] = [];
  const missing: string[] = [];

  for (const key of keys) {
    const customFile = custom.get(key);
    const svgFile = join(SVG_DIR, `${key}.svg`);

    if (customFile && existsSync(join(CUSTOM_DIR, customFile))) {
      sources.push({ key, dataUrl: `data:image/png;base64,${readFileSync(join(CUSTOM_DIR, customFile)).toString('base64')}` });
    } else if (/^[a-z]{2}(?:-[a-z]{3})?$/u.test(key) && existsSync(svgFile)) {
      sources.push({ key, dataUrl: svgDataUrl(svgFile) });
    } else {
      missing.push(key);
    }
  }

  // Keys that share identical art (esa / i-esa, iss / i-iss) share one cell.
  const uniqueUrls: string[] = [];
  const cellOfUrl = new Map<string, number>();

  for (const source of sources) {
    if (!cellOfUrl.has(source.dataUrl)) {
      uniqueUrls.push(source.dataUrl);
      cellOfUrl.set(source.dataUrl, uniqueUrls.length);
    }
  }

  if (uniqueUrls.length + 1 > COLS * ROWS) {
    throw new Error(`Atlas overflow: ${uniqueUrls.length + 1} cells > ${COLS * ROWS} slots`);
  }

  const pixels = await rasterise(uniqueUrls);
  const png = encodePngRgba(ATLAS_W, ATLAS_H, pixels);

  if (png.length > MAX_PNG_BYTES) {
    throw new Error(`atlas.png is ${png.length} bytes, over the ${MAX_PNG_BYTES}-byte budget`);
  }

  // Half-texel inset keeps bilinear filtering inside each cell.
  const round = (v: number): number => Math.round(v * 1e6) / 1e6;
  const rectFor = (cell: number): number[] => {
    const x = (cell % COLS) * CELL_W;
    const y = Math.floor(cell / COLS) * CELL_H;

    return [round((x + 0.5) / ATLAS_W), round((y + 0.5) / ATLAS_H), round((x + CELL_W - 0.5) / ATLAS_W), round((y + CELL_H - 0.5) / ATLAS_H)];
  };
  const cells: Record<string, number[]> = { [FALLBACK_KEY]: rectFor(0) };

  for (const source of sources) {
    cells[source.key] = rectFor(cellOfUrl.get(source.dataUrl) ?? 0);
  }
  for (const key of missing) {
    cells[key] = rectFor(0);
  }
  const sortedCells = Object.fromEntries(
    Object.keys(cells)
      .sort(byCodeUnit)
      .map((k) => [k, cells[k]])
  );

  const json = {
    generatedBy: 'scripts/flag-atlas/build-flag-atlas.ts (do not edit by hand)',
    width: ATLAS_W,
    height: ATLAS_H,
    cellWidth: CELL_W,
    cellHeight: CELL_H,
    fallback: FALLBACK_KEY,
    // Keys with no flag art; they map to the fallback cell.
    missing,
    cells: sortedCells,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'atlas.png'), png);
  writeFileSync(join(OUT_DIR, 'atlas.json'), `${JSON.stringify(json, null, 2)}\n`);

  for (const key of missing) {
    console.log(`no flag art for "${key}", using the fallback cell`);
  }
  const sha = createHash('sha256').update(png).digest('hex').slice(0, 16);

  console.log(`atlas.png ${png.length} bytes (sha256 ${sha}), ${uniqueUrls.length} flag cells + 1 fallback for ${sources.length} keys, ${missing.length} keys on the fallback`);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
