/**
 * DOM-light action helpers for the Edit Satellite plugin, split out of the plugin
 * class so it stays a thin wiring/lifecycle layer. These functions own the orbit
 * math and the catalog/cruncher side effects; the plugin reads the form, calls
 * these, and renders toasts. Shared across the three entry points (Update
 * Satellite, Update Epoch to Now, Load TLE) so the apply pipeline lives in one
 * place.
 */
import { SatMath } from '@app/app/analysis/sat-math';
import { GetSatType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { StringPad } from '@app/engine/utils/stringPad';
import {
  Earth,
  FormatTle,
  OrbitFinder,
  Satellite,
  SatelliteRecord,
  Sgp4,
  Tle,
  TleLine1,
  TleLine2,
  ZoomValue,
  eci2lla,
} from '@ootk/src/main';

/** Outcome of pushing a TLE onto a catalog satellite. */
export type ApplyTleResult = 'applied' | 'satrec-error' | 'too-low';

/** Derived (read-only) orbital parameters shown in the calculated-params card. */
export interface DerivedParams {
  apogee: number;
  perigee: number;
  period: number;
  semimajorAxis: number;
  velocity: number;
}

/** Raw form values needed to rebuild a satellite's TLE. */
export interface EditFormValues {
  scc: string;
  inc: string;
  meanmo: string;
  rasc: string;
  ecen: string;
  argPe: string;
  meana: string;
  epochyr: string;
  epochday: string;
}

/**
 * Push an edited TLE onto a catalog satellite: validate it propagates above the
 * atmosphere, hand it to the position cruncher + orbit buffer, refresh the dot,
 * and keep the Satellite object's own elements in sync. Returns a status so the
 * caller can toast (or zoom) appropriately; never throws.
 * @param satId - Catalog id of the satellite to edit.
 * @param tle1 - New TLE line 1.
 * @param tle2 - New TLE line 2.
 * @param country - Optional country override applied to the Satellite object.
 */
export function applyTleToSat(satId: number, tle1: TleLine1, tle2: TleLine2, country?: string): ApplyTleResult {
  const catalogManagerInstance = ServiceLocator.getCatalogManager();
  const timeManagerInstance = ServiceLocator.getTimeManager();

  let satrec: SatelliteRecord;

  try {
    satrec = Sgp4.createSatrec(tle1, tle2);
  } catch (e) {
    errorManagerInstance.error(e as Error, 'edit-sat-actions.ts', 'Error creating satellite record!');

    return 'satrec-error';
  }

  if (SatMath.altitudeCheck(satrec, timeManagerInstance.simulationTimeObj) <= 1) {
    return 'too-low';
  }

  catalogManagerInstance.satCruncherThread.sendSatEdit(satId, tle1, tle2, true);
  ServiceLocator.getOrbitManager().changeOrbitBufferData(satId, tle1, tle2);

  const obj = catalogManagerInstance.getObject(satId, GetSatType.EXTRA_ONLY);

  if (obj?.isSatellite()) {
    const sat = obj as Satellite;

    sat.active = true;
    sat.editTle(tle1, tle2);

    if (typeof country === 'string') {
      sat.country = country;
    }
  }

  catalogManagerInstance.seedDotPosition(satId);

  return 'applied';
}

/**
 * Build a TLE from the Edit Satellite form's element fields, preserving the
 * satellite's real international designator.
 *
 * FormatTle runs scc through Tle.convert6DigitToA5, which throws for extended
 * (7+ digit) ids, so we pass the trailing 5 chars on the TLE line; the canonical
 * id stays on the Satellite object.
 */
export function buildEditedTle(sat: Satellite, v: EditFormValues): { tle1: TleLine1; tle2: TleLine2 } {
  const intl = sat.tle1.substr(9, 8);
  const tleScc = Tle.classifySatNum(v.scc) === 'extended' ? v.scc.slice(-5) : v.scc;

  return FormatTle.createTle({
    sat,
    inc: v.inc,
    meanmo: v.meanmo,
    rasc: v.rasc,
    argPe: v.argPe,
    meana: v.meana,
    ecen: v.ecen,
    epochyr: v.epochyr,
    epochday: v.epochday,
    intl,
    scc: tleScc,
  });
}

/** Result of re-timing a satellite's orbit to the current simulation time. */
export type ReEpochResult =
  | { ok: true; tle1: TleLine1; tle2: TleLine2; directionUnknown: boolean }
  | { ok: false; error: string };

/**
 * Re-epoch a satellite to the current simulation time, rotating its orbit so it
 * stays over its present sub-point. Mutates the satellite's epoch on tle1 (the
 * OrbitFinder reads it back) and returns the rotated TLE pair, or an error string
 * when the search fails to converge.
 */
export function reEpochToNow(sat: Satellite): ReEpochResult {
  const timeManagerInstance = ServiceLocator.getTimeManager();
  const gmst = timeManagerInstance.gmst;
  const lla = eci2lla(sat.position, gmst);
  const launchLon = lla.lon;
  const launchLat = lla.lat;
  const alt = lla.alt;

  const upOrDown = SatMath.getDirection(sat, timeManagerInstance.simulationTimeObj);
  const directionUnknown = upOrDown === 'Error';

  const simulationTimeObj = timeManagerInstance.simulationTimeObj;
  const currentEpoch = TimeManager.currentEpoch(simulationTimeObj);

  sat.tle1 = (sat.tle1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + sat.tle1.substr(32)) as TleLine1;

  const finder = sat.apogee - sat.perigee < 300
    ? new OrbitFinder(sat, launchLat, launchLon, upOrDown as 'N' | 'S', simulationTimeObj)
    : new OrbitFinder(sat, launchLat, launchLon, upOrDown as 'N' | 'S', simulationTimeObj, alt);
  const tles = finder.rotateOrbitToLatLon();

  if (tles[0] === 'Error') {
    return { ok: false, error: `${tles[1]}` };
  }

  return { ok: true, tle1: tles[0] as TleLine1, tle2: tles[1] as TleLine2, directionUnknown };
}

/** Serialize a satellite to the save-file payload (canonical sccNum included). */
export function buildSaveBlob(sat: Satellite): string {
  return JSON.stringify({ sccNum: sat.sccNum, tle1: sat.tle1, tle2: sat.tle2 });
}

/**
 * Parse a previously saved TLE file. Prefers the canonical sccNum field; falls
 * back to the TLE column for legacy exports without it (the column only carries
 * 5 chars and loses identity for extended catalog numbers). Returns null when the
 * payload is missing TLE lines.
 */
export function parseLoadedTle(text: string): { sccNum: string; tle1: TleLine1; tle2: TleLine2 } | null {
  let object: { sccNum?: unknown; tle1?: unknown; tle2?: unknown };

  try {
    object = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof object?.tle1 !== 'string' || typeof object?.tle2 !== 'string') {
    return null;
  }

  const sccNum = typeof object.sccNum === 'string' || typeof object.sccNum === 'number'
    ? String(object.sccNum)
    : StringPad.pad0(object.tle1.substr(2, 5).trim(), 5);

  return { sccNum, tle1: object.tle1 as TleLine1, tle2: object.tle2 as TleLine2 };
}

/**
 * Choose a camera zoom band for the edited orbit. LEO orbits stay zoomed in;
 * MEO/GEO orbits zoom out (mirrors the GEO-vs-LEO choice the sensor plugins make
 * rather than always snapping to GEO).
 * @param apogeeKm - Apogee altitude in km.
 */
export function pickZoomForApogee(apogeeKm: number): ZoomValue {
  return apogeeKm > 6000 ? ZoomValue.GEO : ZoomValue.LEO;
}

/**
 * Derive read-only orbital parameters from mean motion + eccentricity for the
 * calculated-parameters readout.
 * @param meanMotion - Mean motion in revolutions per day.
 * @param eccentricity - Orbital eccentricity (0-1).
 */
export function calculateDerivedParams(meanMotion: number, eccentricity: number): DerivedParams {
  const n = (meanMotion * 2 * Math.PI) / 86_400; // rad/s
  const a = (Earth.mu / (n * n)) ** (1 / 3); // km
  const apogee = a * (1 + eccentricity) - Earth.radiusEquator;
  const perigee = a * (1 - eccentricity) - Earth.radiusEquator;
  const velocity = Math.sqrt(Earth.mu / a); // circular approximation

  return { apogee, perigee, period: 1440 / meanMotion, semimajorAxis: a, velocity };
}

/**
 * Build a TLE from the form's raw (unnormalized) element values for the live
 * orbit preview. Returns null until the element set is a propagable orbit.
 * Deliberately avoids reformatting the fields the user is editing.
 * @param read - Reader returning a field's trimmed value by id suffix.
 * @param sat - The satellite being edited. Passing it carries its B-star and
 *   mean-motion derivatives (TLE1 cols 33-71) into the preview TLE, exactly as
 *   {@link buildEditedTle} does. Without it the drag terms default to zero, which
 *   leaves the preview dot 1-2 km off the real satellite once SGP4 propagates the
 *   several days from epoch to the current time.
 */
export function buildPreviewTleFromForm(read: (idSuffix: string) => string, sat?: Satellite): { tle1: TleLine1; tle2: TleLine2 } | null {
  const inc = parseFloat(read('inc'));
  const meanmo = parseFloat(read('meanmo'));
  const rasc = parseFloat(read('rasc'));
  const argPe = parseFloat(read('argPe'));
  const meana = parseFloat(read('meana'));
  const ecen = parseInt(read('ecen'), 10) / 1e7;

  if ([inc, meanmo, rasc, argPe, meana].some(isNaN) || isNaN(ecen) || meanmo <= 0 || ecen < 0 || ecen >= 1) {
    return null;
  }

  try {
    const { tle1, tle2 } = FormatTle.createTle({
      sat,
      scc: '90000',
      inc,
      meanmo,
      rasc,
      argPe,
      meana,
      ecen,
      epochyr: read('year') || '24',
      epochday: read('day') || '001.00000000',
      intl: '00000A',
    });

    return (tle1 as string) === 'Error' ? null : { tle1, tle2 };
  } catch {
    return null;
  }
}
