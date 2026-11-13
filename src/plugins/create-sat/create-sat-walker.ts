/**
 * Walker delta constellation planning for the Create Satellite plugin. The orbit math is ootk's
 * ConstellationGenerator; this file only validates the form values, turns each generated TLE into
 * the Advanced-tab parameter set that the shared create path consumes, and names the members.
 * DOM-free so it can be unit-tested.
 */

import { t7e } from '@app/locales/keys';
import { ConstellationGenerator, Degrees, Kilometers } from '@ootk/src/main';
import { dateToEpochFields, rawIntlDesFromTle, tleToElementFields } from './create-sat-orbits';
import type { TleInputParams } from './create-sat-validation';

/** Raw Walker form values (strings straight from the inputs). */
export interface WalkerInputValues {
  altitude: string;
  inclination: string;
  total: string;
  planes: string;
  phasing: string;
  prefix: string;
}

/** Error codes the UI maps to localized text. */
export type WalkerErrorCode = 'altitude' | 'inclination' | 'total' | 'planes' | 'phasing' | 'divisible' | 'tooMany' | 'noSlots' | 'failed';

export interface WalkerError {
  code: WalkerErrorCode;
  /** Values for the message placeholders (e.g. max, free). */
  detail?: Record<string, string | number>;
}

export interface WalkerMember {
  params: TleInputParams;
  intl: string;
}

/** Cap so one click cannot flood the 10,000 analyst slots or freeze the UI. */
export const WALKER_MAX_SATS = 500;
export const WALKER_NAME_MAX = 24;

/** Parse an integer field; NaN when it is not a plain integer. */
function parseIntStrict(text: string): number {
  return /^\s*\d+\s*$/u.test(text) ? Number.parseInt(text, 10) : Number.NaN;
}

/** Validate the form values. Returns the first error found, or the parsed numbers. */
export function parseWalkerInputs(raw: WalkerInputValues): WalkerError | { altitude: number; inclination: number; total: number; planes: number; phasing: number } {
  const altitude = Number.parseFloat(raw.altitude);
  const inclination = Number.parseFloat(raw.inclination);
  const total = parseIntStrict(raw.total);
  const planes = parseIntStrict(raw.planes);
  const phasing = parseIntStrict(raw.phasing);

  if (!Number.isFinite(altitude) || altitude < 160 || altitude > 400_000) {
    return { code: 'altitude' };
  }
  if (!Number.isFinite(inclination) || inclination < 0 || inclination > 180) {
    return { code: 'inclination' };
  }
  if (!Number.isInteger(total) || total < 1) {
    return { code: 'total' };
  }
  if (total > WALKER_MAX_SATS) {
    return { code: 'tooMany', detail: { max: WALKER_MAX_SATS } };
  }
  if (!Number.isInteger(planes) || planes < 1 || planes > total) {
    return { code: 'planes' };
  }
  if (total % planes !== 0) {
    return { code: 'divisible' };
  }
  if (!Number.isInteger(phasing) || phasing < 0 || phasing >= planes) {
    return { code: 'phasing', detail: { max: planes - 1 } };
  }

  return { altitude, inclination, total, planes, phasing };
}

/** Member name: "<prefix>-P<plane>-S<slot>", trimmed so the prefix gives way before the suffix. */
export function walkerMemberName(prefix: string, plane: number, slot: number): string {
  const suffix = `-P${plane}-S${slot}`;
  const base = (prefix.trim() || 'WALKER').slice(0, Math.max(1, WALKER_NAME_MAX - suffix.length));

  return `${base}${suffix}`;
}

/**
 * Build the satellites of a Walker delta pattern as create-path parameter sets, one per supplied free SCC.
 * @param freeSccs Free analyst SCCs in ascending order; at least `total` are needed.
 */
export function planWalker(raw: WalkerInputValues, epoch: Date, freeSccs: string[]): WalkerError | WalkerMember[] {
  const parsed = parseWalkerInputs(raw);

  if ('code' in parsed) {
    return parsed;
  }
  if (freeSccs.length === 0) {
    return { code: 'noSlots' };
  }
  if (freeSccs.length < parsed.total) {
    return { code: 'noSlots', detail: { free: freeSccs.length, needed: parsed.total } };
  }

  let generated;

  try {
    generated = ConstellationGenerator.walker(parsed.altitude as Kilometers, parsed.inclination as Degrees, parsed.total, parsed.planes, parsed.phasing, epoch);
  } catch {
    return { code: 'failed' };
  }

  const perPlane = parsed.total / parsed.planes;
  const { year } = dateToEpochFields(epoch);

  return generated.map((sat, i) => {
    const el = tleToElementFields(sat.tle1, sat.tle2);
    const plane = Math.floor(i / perPlane) + 1;
    const slot = (i % perPlane) + 1;
    const params: TleInputParams = {
      scc: freeSccs[i],
      type: '1',
      country: 'TBD',
      inc: el.inc,
      meanmo: el.meanmo,
      rasc: el.rasc,
      ecen: el.ecen,
      argPe: el.argPe,
      meana: el.meana,
      epochyr: el.year,
      epochday: el.day,
      source: `Walker ${parsed.total}/${parsed.planes}/${parsed.phasing}`,
      name: walkerMemberName(raw.prefix, plane, slot),
      period: el.period,
    };

    return { params, intl: rawIntlDesFromTle(sat.tle1) || `${year}69B` };
  });
}

/** Localized text for a Walker form error. */
export function walkerErrorMessage(error: WalkerError): string {
  let text = t7e(`plugins.CreateSat.walker.errors.${error.code}` as Parameters<typeof t7e>[0]);

  for (const [key, value] of Object.entries(error.detail ?? {})) {
    text = text.replace(`{${key}}`, String(value));
  }

  return text;
}
