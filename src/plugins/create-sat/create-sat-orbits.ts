/**
 * Pure orbit helpers for the Create Satellite plugin: preset orbit definitions,
 * the sun-synchronous inclination helper, and TLE/epoch conversions. Kept free
 * of DOM access so the math can be unit-tested and reused by the OSS and Pro
 * flows (presets, clone, OMM import).
 */
import { Earth, Kilometers, RepeatGroundTrack, Tle, TleLine1, TleLine2 } from '@ootk/src/main';

/** Formatted Advanced-tab element strings (already padded for the TLE form). */
export interface AdvancedElementValues {
  inc: string;
  rasc: string;
  ecen: string;
  argPe: string;
  meana: string;
  meanmo: string;
  period: string;
}

/** Identifiers for the built-in orbit presets. */
export type OrbitPresetId = 'leo-iss' | 'sso-800' | 'geo' | 'gto' | 'molniya' | 'polar-600';

interface OrbitPresetDef {
  id: OrbitPresetId;
  /** Suffix under plugins.CreateSat.presets.* */
  labelKey: string;
  perigeeAltKm: number;
  apogeeAltKm: number;
  /** Inclination in degrees, or 'sso' to derive a sun-synchronous inclination. */
  inclinationDeg: number | 'sso';
  argPeDeg: number;
  raanDeg: number;
  meanAnomalyDeg: number;
}

/**
 * Built-in orbit presets spanning the common mission profiles. Apogee/perigee
 * altitudes drive eccentricity and mean motion; the remaining angles capture the
 * defining geometry (e.g. Molniya's 270 deg argument of perigee at the critical
 * 63.4 deg inclination).
 */
export const ORBIT_PRESETS: readonly OrbitPresetDef[] = [
  { id: 'leo-iss', labelKey: 'leoIss', perigeeAltKm: 417, apogeeAltKm: 423, inclinationDeg: 51.64, argPeDeg: 0, raanDeg: 0, meanAnomalyDeg: 0 },
  { id: 'sso-800', labelKey: 'sso', perigeeAltKm: 800, apogeeAltKm: 800, inclinationDeg: 'sso', argPeDeg: 0, raanDeg: 0, meanAnomalyDeg: 0 },
  { id: 'geo', labelKey: 'geo', perigeeAltKm: 35786, apogeeAltKm: 35786, inclinationDeg: 0, argPeDeg: 0, raanDeg: 0, meanAnomalyDeg: 0 },
  { id: 'gto', labelKey: 'gto', perigeeAltKm: 250, apogeeAltKm: 35786, inclinationDeg: 28.5, argPeDeg: 178, raanDeg: 0, meanAnomalyDeg: 0 },
  { id: 'molniya', labelKey: 'molniya', perigeeAltKm: 1000, apogeeAltKm: 39360, inclinationDeg: 63.4, argPeDeg: 270, raanDeg: 0, meanAnomalyDeg: 0 },
  { id: 'polar-600', labelKey: 'polar', perigeeAltKm: 600, apogeeAltKm: 600, inclinationDeg: 90, argPeDeg: 0, raanDeg: 0, meanAnomalyDeg: 0 },
];

/** Eccentricity + mean motion (rev/day) + semi-major axis from altitudes (km). */
function altitudesToElements(perigeeAltKm: number, apogeeAltKm: number): { ecc: number; meanMotion: number; sma: number } {
  const ra = apogeeAltKm + Earth.radiusEquator;
  const rp = perigeeAltKm + Earth.radiusEquator;
  const sma = (ra + rp) / 2;
  const ecc = (ra - rp) / (ra + rp);
  const meanMotion = (Math.sqrt(Earth.mu / (sma * sma * sma)) * 86400) / (2 * Math.PI);

  return { ecc, meanMotion, sma };
}

/**
 * Sun-synchronous inclination (degrees) for a near-circular orbit at the given
 * mean altitude. Thin wrapper over ootk's RepeatGroundTrack so callers don't
 * need the Kilometers brand.
 */
export function sunSyncInclinationDeg(meanAltitudeKm: number, eccentricity = 0.0001): number {
  return RepeatGroundTrack.sunSynchronousInclination(meanAltitudeKm as Kilometers, Math.max(eccentricity, 0.0001));
}

/** Mean motion (rev/day) from a semi-major axis (km). */
export function smaToMeanMotion(smaKm: number): number {
  return (Math.sqrt(Earth.mu / (smaKm * smaKm * smaKm)) * 86400) / (2 * Math.PI);
}

/** Compute the padded Advanced-tab element strings for a preset. */
export function computePresetElements(id: OrbitPresetId): AdvancedElementValues {
  const def = ORBIT_PRESETS.find((p) => p.id === id);

  if (!def) {
    throw new Error(`Unknown orbit preset: ${id}`);
  }

  const { ecc, meanMotion } = altitudesToElements(def.perigeeAltKm, def.apogeeAltKm);
  const incDeg = def.inclinationDeg === 'sso' ? sunSyncInclinationDeg((def.perigeeAltKm + def.apogeeAltKm) / 2, ecc) : def.inclinationDeg;

  return {
    inc: incDeg.toFixed(4).padStart(8, '0'),
    rasc: def.raanDeg.toFixed(4).padStart(8, '0'),
    ecen: Math.round(ecc * 1e7)
      .toString()
      .padStart(7, '0')
      .slice(0, 7),
    argPe: def.argPeDeg.toFixed(4).padStart(8, '0'),
    meana: def.meanAnomalyDeg.toFixed(4).padStart(8, '0'),
    meanmo: meanMotion.toFixed(5).padStart(8, '0'),
    period: (1440 / meanMotion).toFixed(4).padStart(8, '0'),
  };
}

/** Parse a TLE pair into padded Advanced-tab element strings (+ epoch). */
export function tleToElementFields(tle1: TleLine1, tle2: TleLine2): AdvancedElementValues & { year: string; day: string } {
  const meanMotion = Tle.meanMotion(tle2);

  return {
    year: Tle.epochYear(tle1).toString().padStart(2, '0'),
    day: Tle.epochDay(tle1).toFixed(8).padStart(12, '0'),
    inc: Tle.inclination(tle2).toFixed(4).padStart(8, '0'),
    rasc: Tle.rightAscension(tle2).toFixed(4).padStart(8, '0'),
    ecen: (Tle.eccentricity(tle2) * 1e7).toFixed(0).padStart(7, '0'),
    argPe: Tle.argOfPerigee(tle2).toFixed(4).padStart(8, '0'),
    meana: Tle.meanAnomaly(tle2).toFixed(4).padStart(8, '0'),
    meanmo: meanMotion.toFixed(8).padStart(11, '0'),
    period: (1440 / meanMotion).toFixed(4).padStart(8, '0'),
  };
}

/** Convert a Date to the TLE epoch fields: 2-digit year and fractional day-of-year. */
export function dateToEpochFields(date: Date): { year: string; day: string } {
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear = (date.getTime() - startOfYear) / 86_400_000 + 1; // 1-based

  return {
    year: year.toString().slice(-2),
    day: dayOfYear.toFixed(8).padStart(12, '0'),
  };
}

/**
 * Parse an ISO date-time (UTC) into the TLE epoch fields. A string without a zone designator is read as UTC; a
 * date-only string is rejected so a typo cannot silently become midnight. Returns null when it is not a valid ISO date-time.
 */
export function isoToEpochFields(text: string): { year: string; day: string } | null {
  const s = text.trim();
  const m = /^(?<date>\d{4}-\d{2}-\d{2})[T ](?<time>\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?<zone>Z|[+-]\d{2}:?\d{2})?$/iu.exec(s);

  if (!m?.groups) {
    return null;
  }
  const zone = m.groups.zone ? m.groups.zone.toUpperCase() : 'Z';
  const time = m.groups.time.length === 5 ? `${m.groups.time}:00` : m.groups.time;
  const zoneIso = zone === 'Z' || zone.includes(':') ? zone : `${zone.slice(0, 3)}:${zone.slice(3)}`;
  const date = new Date(`${m.groups.date}T${time}${zoneIso}`);

  const [y, mo, d] = m.groups.date.split('-').map(Number);
  const wall = new Date(Date.UTC(y, mo - 1, d));

  // Date rolls 30 Feb over to 2 Mar instead of failing, so check the calendar date as typed.
  if (Number.isNaN(date.getTime()) || wall.getUTCMonth() !== mo - 1 || wall.getUTCDate() !== d) {
    return null;
  }

  return dateToEpochFields(date);
}

/** Raw TLE international-designator columns (10-17 of line 1), e.g. "98067A". */
export function rawIntlDesFromTle(tle1: TleLine1): string {
  return tle1.substring(9, 17).trim();
}

/** Convert a COSPAR id ("1998-067A") to raw TLE intl-des columns ("98067A"). */
export function cosparToRawIntlDes(objectId: string | undefined): string {
  if (!objectId) {
    return '';
  }

  const match = /^(?<year>\d{4})-(?<rest>\d{3}[A-Z]{0,3})$/u.exec(objectId.trim());

  if (!match?.groups) {
    return '';
  }

  return `${match.groups.year.slice(-2)}${match.groups.rest}`;
}

/** Earliest and latest calendar year a TLE epoch can name (two-digit years 57-99 are 19xx, 00-56 are 20xx). */
export const MIN_EPOCH_YEAR = 1957;
export const MAX_EPOCH_YEAR = 2056;

/**
 * Read the Epoch Year field: two digits ("26") or a four-digit calendar year inside 1957-2056 ("2026").
 * @returns the full calendar year, or null when the text is not a plausible TLE epoch year.
 */
export function epochYearToFull(raw: string): number | null {
  const text = raw.trim();

  if (/^\d{2}$/u.test(text)) {
    const yy = Number.parseInt(text, 10);

    return yy >= 57 ? 1900 + yy : 2000 + yy;
  }
  if (/^\d{4}$/u.test(text)) {
    const full = Number.parseInt(text, 10);

    return full >= MIN_EPOCH_YEAR && full <= MAX_EPOCH_YEAR ? full : null;
  }

  return null;
}

/**
 * The ISO UTC timestamp for an Epoch Year + Epoch Day pair, so both inputs can describe the same instant.
 * @returns null when either field is not a valid epoch.
 */
export function epochFieldsToIso(yearText: string, dayText: string): string | null {
  const year = epochYearToFull(yearText);
  const day = dayText.trim() === '' ? Number.NaN : Number(dayText.trim());

  if (year === null || !(day >= 1 && day < 367)) {
    return null;
  }
  const date = new Date(Date.UTC(year, 0, 1) + (day - 1) * 86_400_000);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().replace(/\.000Z$/u, 'Z');
}
