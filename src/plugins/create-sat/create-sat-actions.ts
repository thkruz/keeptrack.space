/**
 * DOM-facing action helpers for the Create Satellite plugin, split out of the
 * plugin class to keep it under the line budget. Each function reads/writes the
 * Advanced-tab form fields by id and is shared across the OSS flows (presets,
 * clone, sun-sync, live preview) and the Pro import flows (TLE / OMM).
 */
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { selectSideMenuTab } from '@app/engine/ui/side-menu-tabs';
import { getEl } from '@app/engine/utils/get-el';
import { Earth, FormatTle, Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  computePresetElements,
  OrbitPresetId,
  rawIntlDesFromTle,
  sunSyncInclinationDeg,
  tleToElementFields,
} from './create-sat-orbits';

/** Advanced-tab element-id suffixes that the write helper accepts. */
export interface AdvancedFieldWrite {
  scc?: string;
  intl?: string;
  year?: string;
  day?: string;
  inc?: string;
  rasc?: string;
  ecen?: string;
  argPe?: string;
  meana?: string;
  meanmo?: string;
  per?: string;
  type?: string;
  country?: string;
  name?: string;
  src?: string;
}

/**
 * Find the lowest free analyst slot SCC (90000-99999), or null if all are in
 * use. A slot is free while it still holds its untouched template object, which
 * carries the 'ANALSAT' country.
 */
export function getFreeAnalystScc(): string | null {
  const objData = ServiceLocator.getCatalogManager().objectCache;
  let lowest: number | null = null;

  for (const obj of objData) {
    if (!obj?.isSatellite?.()) {
      continue;
    }

    const sat = obj as Satellite;

    if (sat.country !== 'ANALSAT') {
      continue;
    }

    const num = parseInt(sat.sccNum, 10);

    if (!isNaN(num) && num >= 90_000 && num <= 99_999 && (lowest === null || num < lowest)) {
      lowest = num;
    }
  }

  return lowest === null ? null : lowest.toString();
}

/** Write the supplied Advanced-tab fields and refresh the derived readout. */
export function writeAdvancedFields(prefix: string, fields: AdvancedFieldWrite): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    const el = getEl(`${prefix}-${key}`, true) as HTMLInputElement | HTMLSelectElement | null;

    if (el) {
      el.value = value;
    }
  }

  // Recompute the calculated-parameters readout and live validation.
  getEl(`${prefix}-meanmo`, true)?.dispatchEvent(new Event('input'));
  getEl(`${prefix}-ecen`, true)?.dispatchEvent(new Event('input'));
}

/** Fill the Advanced tab from a built-in orbit preset (lands in a free slot). */
export function applyOrbitPreset(prefix: string, presetId: OrbitPresetId): void {
  const el = computePresetElements(presetId);
  const free = getFreeAnalystScc();

  writeAdvancedFields(prefix, {
    inc: el.inc,
    rasc: el.rasc,
    ecen: el.ecen,
    argPe: el.argPe,
    meana: el.meana,
    meanmo: el.meanmo,
    per: el.period,
    intl: '',
    ...(free ? { scc: free } : {}),
  });
}

/**
 * Set the inclination field to the sun-synchronous value for the orbit's current
 * mean altitude (derived from mean motion + eccentricity).
 * @returns false if the mean motion is missing/invalid.
 */
export function applySunSyncInclination(prefix: string): boolean {
  const meanmo = parseFloat((getEl(`${prefix}-meanmo`, true) as HTMLInputElement | null)?.value ?? '');
  const ecenRaw = parseInt((getEl(`${prefix}-ecen`, true) as HTMLInputElement | null)?.value ?? '', 10) / 1e7;

  if (isNaN(meanmo) || meanmo <= 0) {
    return false;
  }

  const ecc = isNaN(ecenRaw) ? 0 : ecenRaw;
  const n = (meanmo * 2 * Math.PI) / 86_400; // rad/s
  const sma = (Earth.mu / (n * n)) ** (1 / 3); // km
  const meanAltKm = sma - Earth.radiusEquator;
  const incDeg = sunSyncInclinationDeg(meanAltKm, ecc);

  writeAdvancedFields(prefix, { inc: incDeg.toFixed(4).padStart(8, '0') });

  return true;
}

/** Map an ootk SpaceObjectType to the Create Satellite type-select value (1-4). */
function spaceObjectTypeToFormType(type: SpaceObjectType): string {
  switch (type) {
    case SpaceObjectType.PAYLOAD:
      return '1';
    case SpaceObjectType.ROCKET_BODY:
      return '2';
    case SpaceObjectType.DEBRIS:
      return '3';
    default:
      return '4';
  }
}

/**
 * Clone the currently selected satellite into the Advanced tab for what-if edits
 * (remapped to a free analyst slot, real intl designator preserved). Switches to
 * the Advanced tab; does not submit.
 * @returns false if there is no selected satellite with a TLE.
 */
export function cloneSelectedSatellite(prefix: string): boolean {
  const sat = PluginRegistry.getPlugin(SelectSatManager)?.getSelectedSat();

  if (!sat?.isSatellite?.() || !(sat as Satellite).tle1) {
    return false;
  }

  const s = sat as Satellite;
  const fields = tleToElementFields(s.tle1, s.tle2);
  const free = getFreeAnalystScc();

  writeAdvancedFields(prefix, {
    year: fields.year,
    day: fields.day,
    inc: fields.inc,
    rasc: fields.rasc,
    ecen: fields.ecen,
    argPe: fields.argPe,
    meana: fields.meana,
    meanmo: fields.meanmo,
    per: fields.period,
    intl: rawIntlDesFromTle(s.tle1),
    name: (s.name ?? '').substring(0, 24),
    type: spaceObjectTypeToFormType(s.type),
    country: s.country || 'TBD',
    ...(free ? { scc: free } : {}),
  });

  selectSideMenuTab('createSat-tabs', 'createSat-advanced-tab');

  return true;
}

/**
 * Build a TLE from the Advanced tab's current (raw, unnormalized) values for the
 * live orbit preview. Returns null if the element set isn't yet a propagable
 * orbit. Deliberately avoids fixInputFormatting_ so it never rewrites the fields
 * the user is editing.
 */
export function buildPreviewTleFromForm(prefix: string): { tle1: TleLine1; tle2: TleLine2 } | null {
  const v = (id: string): string => (getEl(`${prefix}-${id}`, true) as HTMLInputElement | null)?.value?.trim() ?? '';
  const inc = parseFloat(v('inc'));
  const meanmo = parseFloat(v('meanmo'));
  const rasc = parseFloat(v('rasc'));
  const argPe = parseFloat(v('argPe'));
  const meana = parseFloat(v('meana'));
  const ecen = parseInt(v('ecen'), 10) / 1e7;

  if ([inc, meanmo, rasc, argPe, meana].some(isNaN) || isNaN(ecen) || meanmo <= 0 || ecen < 0 || ecen >= 1) {
    return null;
  }

  try {
    const { tle1, tle2 } = FormatTle.createTle({
      scc: '90000',
      inc,
      meanmo,
      rasc,
      argPe,
      meana,
      ecen,
      epochyr: v('year') || '24',
      epochday: v('day') || '001.00000000',
      intl: '00000A',
    });

    return (tle1 as string) === 'Error' ? null : { tle1, tle2 };
  } catch {
    return null;
  }
}
