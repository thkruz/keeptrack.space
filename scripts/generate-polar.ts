/**
 * generate-polar: head-less batch generator for Polar Plot pass charts, intended
 * for automated social-media / content pipelines. It boots the warm KeepTrack dev
 * server, selects a sensor, and asks the Polar Plot plugin to render each
 * requested satellite's pass straight to a PNG via its pure renderer
 * (PolarPlotPlugin.renderToDataUrl) - no menu clicking, no screenshotting.
 *
 * Prereq: a warm dev server on :5544
 *   npm run start          (OSS)   or   npm run start:pro
 *
 * Usage:
 *   npx tsx scripts/generate-polar.ts <spec.json>
 *   npx tsx scripts/generate-polar.ts '{"sensor":"CODSFS","sats":["25544","20580"]}'
 *   echo '{...}' | npx tsx scripts/generate-polar.ts -
 *
 * Spec fields:
 *   sensor      sensor objName to select (required), e.g. "CODSFS"
 *   sats        array of SCC numbers to render (required)
 *   outDir      output folder (default test-results/polar-plots)
 *   size        square image size in px (default 1080)
 *   windowDays  look-ahead window for finding the pass (default plugin's 3)
 *   passIndex   which upcoming pass to render, 0 = next (default 0)
 *   timeIso     ISO time to treat as "now" before searching (optional)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5544';
const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

interface GenerateSpec {
  sensor: string;
  sats: string[];
  outDir?: string;
  size?: number;
  windowDays?: number;
  passIndex?: number;
  timeIso?: string;
}

const log = (msg: string): void => {
  // eslint-disable-next-line no-console
  console.log(msg);
};

const readSpec = (): GenerateSpec => {
  const arg = process.argv[2];

  if (!arg) {
    throw new Error('Usage: npx tsx scripts/generate-polar.ts <spec.json | inline-json | ->');
  }

  let raw: string;

  if (arg === '-') {
    raw = fs.readFileSync(0, 'utf8');
  } else if (arg.trimStart().startsWith('{')) {
    raw = arg;
  } else {
    raw = fs.readFileSync(arg, 'utf8');
  }

  const spec = JSON.parse(raw) as GenerateSpec;

  if (!spec.sensor || !Array.isArray(spec.sats) || spec.sats.length === 0) {
    throw new Error('spec needs a "sensor" objName and a non-empty "sats" array of SCC numbers');
  }

  return spec;
};

const boot = async (page: Page): Promise<void> => {
  const override = {
    isAutoStart: true,
    // The catalog is required: renderToDataUrl resolves satellites and propagates them.
    noCatalogOnLoad: false,
    minLogLevel: 'WARN',
    isDisablePerformanceDowngrade: true,
    isDisableLoginGate: true,
    plugins: { PolarPlotPlugin: { enabled: true } },
  };

  await page.route('**/settings/settingsOverride.js', async (route) => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `window.settingsOverride = ${JSON.stringify(override)};`,
    });
  });

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
  await page.waitForTimeout(4_000);
};

/** Renders one satellite's pass to a PNG data URL in page context (or null). */
const renderOne = async (page: Page, sccNum: string, spec: GenerateSpec): Promise<string | null> => {
  const opts = JSON.stringify({
    sccNum,
    size: spec.size ?? 1080,
    windowDays: spec.windowDays,
    passIndex: spec.passIndex ?? 0,
  });

  return page.evaluate(`(() => {
    const plugin = window.keepTrack.api.getPluginByName('PolarPlotPlugin');
    if (!plugin || typeof plugin.renderToDataUrl !== 'function') {
      throw new Error('PolarPlotPlugin.renderToDataUrl unavailable');
    }
    return plugin.renderToDataUrl(${opts});
  })()`) as Promise<string | null>;
};

const writePng = (dataUrl: string, file: string): void => {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/u, '');

  fs.writeFileSync(file, Buffer.from(base64, 'base64'));
};

const main = async (): Promise<void> => {
  const spec = readSpec();
  const ping = await fetch(BASE_URL).catch(() => null);

  if (!ping) {
    throw new Error(`No server at ${BASE_URL}. Start one with "npm run start" (or set BASE_URL).`);
  }

  const outDir = path.isAbsolute(spec.outDir ?? '')
    ? (spec.outDir as string)
    : path.join(ROOT_DIR, spec.outDir ?? path.join('test-results', 'polar-plots'));

  fs.mkdirSync(outDir, { recursive: true });

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    log(`booting (sensor=${spec.sensor}, ${spec.sats.length} sat(s))...`);
    await boot(page);

    await page.evaluate(`window.keepTrack.api.getSensorManager().setSensor(${JSON.stringify(spec.sensor)})`);
    await page.waitForTimeout(500);

    if (spec.timeIso) {
      const ms = Date.parse(spec.timeIso);

      if (!Number.isNaN(ms)) {
        await page.evaluate(`window.keepTrack.api.getTimeManager().changeStaticOffset(${ms} - Date.now())`);
        await page.waitForTimeout(500);
      }
    }

    let written = 0;

    for (const sccNum of spec.sats) {
      const dataUrl = await renderOne(page, sccNum, spec);

      if (!dataUrl) {
        log(`  [${sccNum}] no pass within the window - skipped`);
        continue;
      }

      const file = path.join(outDir, `sat-${sccNum}-polar.png`);

      writePng(dataUrl, file);
      written++;
      log(`  [${sccNum}] wrote ${path.relative(ROOT_DIR, file)}`);
    }

    log(`\ndone: ${written}/${spec.sats.length} chart(s) written to ${path.relative(ROOT_DIR, outDir)}`);
    await context.close();
  } finally {
    await browser?.close();
  }
};

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
