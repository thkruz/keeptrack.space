/**
 * Offline script to compress dwarf planet state vector databases into Chebyshev polynomial coefficients.
 *
 * Usage: npx tsx build/generate-chebyshev.ts
 *
 * This reads JPL Horizons ephemeris .txt files from the horizons/ directory,
 * converts geocentric data to HELIOCENTRIC coordinates (removing Earth's annual oscillation),
 * fits Chebyshev polynomials to the smooth heliocentric motion, validates accuracy,
 * and outputs compact coefficient files.
 *
 * Heliocentric data is ideal because dwarf planets barely move over decades — their
 * heliocentric trajectory is extremely smooth, needing far fewer coefficients and
 * producing much cleaner orbit paths with zero noise artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { GeoVector, Body, KM_PER_AU } from 'astronomy-engine';

// ---------- Types ----------

type HorizonsSVData = [number, [number, number, number], [number, number, number]?];

interface ChebyshevSegment {
  a: number; // start time (POSIX seconds)
  b: number; // end time (POSIX seconds)
  cx: number[]; // x position coefficients
  cy: number[]; // y position coefficients
  cz: number[]; // z position coefficients
}

// ---------- Sun position (geocentric) ----------

/**
 * Get the Sun's geocentric position (ECI, km) at a given time.
 * Uses astronomy-engine for high accuracy.
 */
function getSunEci(timeMs: number): [number, number, number] {
  const date = new Date(timeMs);
  const sunGeo = GeoVector(Body.Sun, date, false);

  return [
    sunGeo.x * KM_PER_AU,
    sunGeo.y * KM_PER_AU,
    sunGeo.z * KM_PER_AU,
  ];
}

// ---------- Convert geocentric data to heliocentric ----------

/**
 * Convert geocentric (Earth-centered) state vectors to heliocentric (Sun-centered).
 * heliocentric = geocentric - sun_geocentric
 */
function toHeliocentric(data: HorizonsSVData[]): HorizonsSVData[] {
  return data.map((sv) => {
    const sunEci = getSunEci(sv[0]);

    return [
      sv[0],
      [
        sv[1][0] - sunEci[0],
        sv[1][1] - sunEci[1],
        sv[1][2] - sunEci[2],
      ],
    ] as HorizonsSVData;
  });
}

// ---------- Lagrange interpolation of state vector data ----------

/** Lagrange polynomial interpolation of state vector data at a given time. */
function lagrangeInterp(data: HorizonsSVData[], timeMs: number, order = 10): [number, number, number] {
  const n = data.length;

  if (timeMs <= data[0][0]) {
    return [...data[0][1]];
  }
  if (timeMs >= data[n - 1][0]) {
    return [...data[n - 1][1]];
  }

  let lo = 0;
  let hi = n - 1;

  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;

    if (data[mid][0] <= timeMs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const useOrder = Math.min(order, n);
  const halfOrder = Math.floor(useOrder / 2);
  let start = lo - halfOrder + 1;

  if (start < 0) {
    start = 0;
  }
  if (start + useOrder > n) {
    start = n - useOrder;
  }

  const result: [number, number, number] = [0, 0, 0];

  for (let j = 0; j < useOrder; j++) {
    let basis = 1.0;

    for (let m = 0; m < useOrder; m++) {
      if (m !== j) {
        basis *= (timeMs - data[start + m][0]) / (data[start + j][0] - data[start + m][0]);
      }
    }

    result[0] += data[start + j][1][0] * basis;
    result[1] += data[start + j][1][1] * basis;
    result[2] += data[start + j][1][2] * basis;
  }

  return result;
}

// ---------- Chebyshev fitting ----------

function cosPi(x: number): number {
  return Math.cos(Math.PI * x);
}

/**
 * Fit Chebyshev coefficients for a single time window [a, b] with smoothing.
 *
 * Uses oversampling: samples at nSamples >> nCoeffs Chebyshev nodes, then keeps
 * only the first nCoeffs coefficients. This is a truncated DCT which acts as a
 * low-pass filter, smoothing out any remaining noise.
 */
function fitChebyshevWindow(
  data: HorizonsSVData[],
  nCoeffs: number,
  aSeconds: number,
  bSeconds: number,
  oversampleFactor: number,
  lagrangeOrder = 10,
): ChebyshevSegment {
  const nSamples = nCoeffs * oversampleFactor;
  const cx: number[] = new Array(nCoeffs);
  const cy: number[] = new Array(nCoeffs);
  const cz: number[] = new Array(nCoeffs);

  for (let j = 0; j < nCoeffs; j++) {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (let i = 0; i < nSamples; i++) {
      const h = 0.5;
      const x = cosPi((i + h) / nSamples);
      const tSeconds = x * (h * (bSeconds - aSeconds)) + h * (bSeconds + aSeconds);
      const tMs = tSeconds * 1000;
      const pos = lagrangeInterp(data, tMs, lagrangeOrder);
      const nFac = cosPi((j * (i + h)) / nSamples);

      sumX += pos[0] * nFac;
      sumY += pos[1] * nFac;
      sumZ += pos[2] * nFac;
    }

    cx[j] = sumX * (2 / nSamples);
    cy[j] = sumY * (2 / nSamples);
    cz[j] = sumZ * (2 / nSamples);
  }

  return { a: aSeconds, b: bSeconds, cx, cy, cz };
}

function evaluateChebyshev(c: number[], a: number, b: number, t: number): number {
  const n = c.length;
  const x = (t - 0.5 * (b + a)) / (0.5 * (b - a));
  const alpha = 2 * x;
  const beta = -1;
  let y1 = 0.0;
  let y2 = 0.0;

  for (let k = n - 1; k >= 1; k--) {
    const tmp = y1;

    y1 = alpha * y1 + beta * y2 + c[k];
    y2 = tmp;
  }

  return x * y1 - y2 + 0.5 * c[0];
}

function compressData(
  data: HorizonsSVData[],
  nCoeffs: number,
  segmentDurationSeconds: number,
  oversampleFactor: number,
  startSeconds?: number,
  endSeconds?: number,
  lagrangeOrder = 10,
): ChebyshevSegment[] {
  const s = startSeconds ?? data[0][0] / 1000;
  const e = endSeconds ?? data[data.length - 1][0] / 1000;

  const segments: ChebyshevSegment[] = [];
  let current = s;

  while (current < e) {
    const segEnd = Math.min(current + segmentDurationSeconds, e);

    segments.push(fitChebyshevWindow(data, nCoeffs, current, segEnd, oversampleFactor, lagrangeOrder));
    current = segEnd;
  }

  return segments;
}

function validateAccuracy(
  data: HorizonsSVData[],
  segments: ChebyshevSegment[],
  name: string,
): { maxError: number; avgError: number; rmsError: number } {
  let maxError = 0;
  let sumError = 0;
  let sumSqError = 0;
  let count = 0;

  for (const sv of data) {
    const tMs = sv[0];
    const tSec = tMs / 1000;
    const original = sv[1];

    let seg: ChebyshevSegment | null = null;

    for (const s of segments) {
      if (tSec >= s.a && tSec <= s.b) {
        seg = s;
        break;
      }
    }
    if (!seg) {
      continue;
    }

    const reconstructed = [
      evaluateChebyshev(seg.cx, seg.a, seg.b, tSec),
      evaluateChebyshev(seg.cy, seg.a, seg.b, tSec),
      evaluateChebyshev(seg.cz, seg.a, seg.b, tSec),
    ];

    const dx = original[0] - reconstructed[0];
    const dy = original[1] - reconstructed[1];
    const dz = original[2] - reconstructed[2];
    const error = Math.sqrt(dx * dx + dy * dy + dz * dz);

    maxError = Math.max(maxError, error);
    sumError += error;
    sumSqError += error * error;
    count++;
  }

  const avgError = sumError / count;
  const rmsError = Math.sqrt(sumSqError / count);

  console.log(`\n${name} accuracy (heliocentric):`);
  console.log(`  Data points validated: ${count}`);
  console.log(`  Max position error:    ${maxError.toFixed(3)} km`);
  console.log(`  Avg position error:    ${avgError.toFixed(3)} km`);
  console.log(`  RMS position error:    ${rmsError.toFixed(3)} km`);

  return { maxError, avgError, rmsError };
}

function generateTypeScript(segments: ChebyshevSegment[], exportName: string): string {
  const lines: string[] = [];

  lines.push(`import { ChebyshevCoefficients } from '@ootk/src/interpolator/ChebyshevCoefficients';`);
  lines.push(`import { Seconds } from '@ootk/src/main';`);
  lines.push(``);
  lines.push(`export const ${exportName}: ChebyshevCoefficients[] = [`);

  for (const seg of segments) {
    const fmtArr = (arr: number[]): string => `new Float64Array([${arr.map((v) => v.toPrecision(17)).join(', ')}])`;

    lines.push(`  new ChebyshevCoefficients(`);
    lines.push(`    ${seg.a} as Seconds,`);
    lines.push(`    ${seg.b} as Seconds,`);
    lines.push(`    ${fmtArr(seg.cx)},`);
    lines.push(`    ${fmtArr(seg.cy)},`);
    lines.push(`    ${fmtArr(seg.cz)},`);
    lines.push(`  ),`);
  }

  lines.push(`];`);
  lines.push(``);

  return lines.join('\n');
}

function generateJSON(segments: ChebyshevSegment[]): string {
  const data = segments.map((seg) => ({
    a: seg.a,
    b: seg.b,
    cx: Array.from(seg.cx),
    cy: Array.from(seg.cy),
    cz: Array.from(seg.cz),
  }));

  return JSON.stringify(data);
}

// ---------- Horizons .txt parser ----------

/**
 * Parse a JPL Horizons ephemeris .txt file into HorizonsSVData[].
 *
 * Data between $$SOE and $$EOE has 4 lines per epoch:
 *   Line 1: "<JD> = A.D. <date> TDB"
 *   Line 2: "   X  Y  Z"           (position km, scientific notation)
 *   Line 3: "   VX VY VZ"          (velocity km/s — ignored)
 *   Line 4: "   LT RG RR"          (light-time/range/range-rate — ignored)
 *
 * Julian Date -> POSIX ms: (JD - 2440587.5) * 86400000
 */
async function parseHorizonsFile(filePath: string): Promise<HorizonsSVData[]> {
  const text = await fs.promises.readFile(filePath, 'utf-8');
  const lines = text.split(/\r?\n/u);

  const soeIdx = lines.findIndex((l) => l.trim() === '$$SOE');
  const eoeIdx = lines.findIndex((l) => l.trim() === '$$EOE');

  if (soeIdx === -1 || eoeIdx === -1) {
    throw new Error(`Missing $$SOE/$$EOE markers in ${filePath}`);
  }

  const dataLines = lines.slice(soeIdx + 1, eoeIdx);
  const data: HorizonsSVData[] = [];

  for (let i = 0; i + 1 < dataLines.length; i += 4) {
    const jdLine = dataLines[i].trim();
    const posLine = dataLines[i + 1].trim();

    if (!jdLine || !posLine) {
      continue;
    }

    const jdMatch = (/^(?<jd>[\d.]+)/u).exec(jdLine);

    if (!jdMatch?.groups?.jd) {
      continue;
    }

    const jd = Number.parseFloat(jdMatch.groups.jd);
    const posixMs = (jd - 2440587.5) * 86400000;
    const [x, y, z] = posLine.split(/\s+/u).map(Number);

    data.push([posixMs, [x, y, z]]);
  }

  return data;
}

// ---------- Main ----------

async function main() {
  const celestialDir = path.resolve(
    __dirname,
    '../src/engine/rendering/draw-manager/celestial-bodies',
  );
  const horizonsDir = path.join(celestialDir, 'horizons');

  const publicDir = path.resolve(__dirname, '../public/data/ephemeris');

  const bodies: {
    name: string;
    file: string;
    exportName: string;
    outFile: string;
    lagrangeOrder: number;
    segmentYears: number;
    outputFormat?: 'ts' | 'json';
    /** Per-body fit-range start (ISO date), for probes whose early trajectory bends too hard to fit */
    rangeStart?: string;
  }[] = [
    // Ceres: short orbital period (4.6 yr) needs shorter segments for accurate Chebyshev fitting
    { name: 'Ceres', file: 'dwarf-planets/ceres.txt', exportName: 'ceresChebyshevCoeffs', outFile: 'ceres-chebyshev.ts', lagrangeOrder: 10, segmentYears: 1 },
    { name: 'Haumea', file: 'dwarf-planets/haumea.txt', exportName: 'haumeaChebyshevCoeffs', outFile: 'haumea-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    { name: 'Eris', file: 'dwarf-planets/eris.txt', exportName: 'erisChebyshevCoeffs', outFile: 'eris-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    { name: 'Sedna', file: 'dwarf-planets/sedna.txt', exportName: 'sednaChebyshevCoeffs', outFile: 'sedna-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    { name: 'Quaoar', file: 'dwarf-planets/quaoar.txt', exportName: 'quaoarChebyshevCoeffs', outFile: 'quaoar-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    { name: 'Orcus', file: 'dwarf-planets/orcus.txt', exportName: 'orcusChebyshevCoeffs', outFile: 'orcus-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    { name: 'Gonggong', file: 'dwarf-planets/gonggong.txt', exportName: 'gonggongChebyshevCoeffs', outFile: 'gonggong-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    { name: 'Charon', file: 'dwarf-planets/charon.txt', exportName: 'charonChebyshevCoeffs', outFile: 'charon-chebyshev.ts', lagrangeOrder: 10, segmentYears: 5 },
    // Deep-space satellites — JSON output, fetched at runtime from public/data/ephemeris/
    { name: 'Voyager 1', file: 'satellites/voyager-1.txt', exportName: 'voyager1ChebyshevCoeffs', outFile: 'voyager-1.json', lagrangeOrder: 10, segmentYears: 5, outputFormat: 'json' },
    // Voyager 2: the post-Neptune-flyby (Aug 1989) trajectory still bends through the
    // early 1990s, so 5-year segments under-fit; shorter segments keep the error down.
    { name: 'Voyager 2', file: 'satellites/voyager-2.txt', exportName: 'voyager2ChebyshevCoeffs', outFile: 'voyager-2.json', lagrangeOrder: 10, segmentYears: 1, outputFormat: 'json' },
    // Pioneers: data starts 1990, well past their last flybys (Saturn 1979), so the
    // heliocentric escape is already smooth enough for 5-year segments.
    { name: 'Pioneer 10', file: 'satellites/pioneer-10.txt', exportName: 'pioneer10ChebyshevCoeffs', outFile: 'pioneer-10.json', lagrangeOrder: 10, segmentYears: 5, outputFormat: 'json' },
    { name: 'Pioneer 11', file: 'satellites/pioneer-11.txt', exportName: 'pioneer11ChebyshevCoeffs', outFile: 'pioneer-11.json', lagrangeOrder: 10, segmentYears: 5, outputFormat: 'json' },
    // New Horizons: the launch arc (2006) and Jupiter flyby (Feb 2007) bend the early
    // trajectory far too hard to fit (>1M km error), so fitting starts in 2008 once the
    // post-flyby escape is ballistic; short segments then absorb the Pluto-era bending.
    { name: 'New Horizons', file: 'satellites/new-horizons.txt', exportName: 'newHorizonsChebyshevCoeffs', outFile: 'new-horizons.json', lagrangeOrder: 10, segmentYears: 1, outputFormat: 'json', rangeStart: '2008-01-01' },
  ];

  // Configuration — with heliocentric data, fewer coefficients give ultra-smooth orbits
  const nCoeffs = 12;
  const oversampleFactor = 5;

  // Standard range for the application (1990-01-01 to 2049-01-01 UTC)
  // DwarfPlanet.drawFullOrbitPath uses 1990-2048 range, so this covers it
  const rangeStartSeconds = Date.UTC(1990, 0, 1) / 1000;
  const rangeEndSeconds = Date.UTC(2049, 0, 1) / 1000;

  console.log(`Configuration:`);
  console.log(`  Coefficients per segment: ${nCoeffs}`);
  console.log(`  Oversample factor: ${oversampleFactor}x`);
  console.log('  Range: 1990-01-01 to 2049-01-01');

  // Parse all Horizons files in parallel
  const parsed = await Promise.all(
    bodies.map(async (b) => {
      const geoData = await parseHorizonsFile(path.join(horizonsDir, b.file));

      console.log(`${b.name}: ${geoData.length} geocentric state vectors`);

      return { ...b, geoData };
    }),
  );

  console.log('\nConverting to heliocentric and compressing...');

  const maxAcceptableError = 50000; // km
  let anyExceeded = false;
  const writePromises: Promise<void>[] = [];

  for (const body of parsed) {
    console.log(`\n--- ${body.name} ---`);

    const helioData = toHeliocentric(body.geoData);
    const bodySegDuration = body.segmentYears * 365.25 * 24 * 3600;

    // Clamp fitting range to the intersection of [desired range] and [data range]
    const dataStartSec = helioData[0][0] / 1000;
    const dataEndSec = helioData[helioData.length - 1][0] / 1000;
    const bodyRangeStartSeconds = body.rangeStart ? Date.parse(`${body.rangeStart}T00:00:00Z`) / 1000 : rangeStartSeconds;
    const effectiveStart = Math.max(bodyRangeStartSeconds, dataStartSec);
    const effectiveEnd = Math.min(rangeEndSeconds, dataEndSec);

    if (effectiveStart !== rangeStartSeconds || effectiveEnd !== rangeEndSeconds) {
      const fmtDate = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);

      console.log(`  Data range: ${fmtDate(dataStartSec)} to ${fmtDate(dataEndSec)}`);
      console.log(`  Clamped fitting range: ${fmtDate(effectiveStart)} to ${fmtDate(effectiveEnd)}`);
    }

    const segments = compressData(helioData, nCoeffs, bodySegDuration, oversampleFactor, effectiveStart, effectiveEnd, body.lagrangeOrder);

    console.log(`  ${segments.length} segments generated`);

    const accuracy = validateAccuracy(helioData, segments, body.name);

    // NaN must fail too (NaN > threshold is false) - a parse problem otherwise slips through
    if (!Number.isFinite(accuracy.maxError) || accuracy.maxError > maxAcceptableError) {
      console.error(`  WARNING: Max error is ${accuracy.maxError} km (threshold ${maxAcceptableError} km)!`);
      anyExceeded = true;
    }

    if (body.outputFormat === 'json') {
      const json = generateJSON(segments);
      const outPath = path.join(publicDir, body.outFile);

      writePromises.push(fs.promises.writeFile(outPath, json, 'utf-8'));
      console.log(`  Written: ${outPath} (${(json.length / 1024).toFixed(1)} KB)`);
    } else {
      const ts = generateTypeScript(segments, body.exportName);
      const outPath = path.join(celestialDir, body.outFile);

      writePromises.push(fs.promises.writeFile(outPath, ts, 'utf-8'));
      console.log(`  Written: ${outPath} (${(ts.length / 1024).toFixed(1)} KB)`);
    }
  }

  await Promise.all(writePromises);

  if (anyExceeded) {
    console.error(`\nSome bodies exceeded the ${maxAcceptableError} km error threshold.`);
  } else {
    console.log(`\nAll errors within ${maxAcceptableError} km threshold.`);
  }
}

const __dirname = path.dirname(new URL(import.meta.url).pathname).replace(/^\/+/u, '');

// Check if __dirname is a Windows path
if (!(/^[a-zA-Z]:/u).test(__dirname)) {
  // POSIX path -- do nothing
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
