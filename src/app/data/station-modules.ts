/**
 * Station modules that are catalogued as their own NORAD objects but are physically part of a
 * station. They carry the same elset as the station core, so they draw as extra dots on top of it
 * and make the station look like it is shedding pieces (#459).
 *
 * This one map is the single source of truth. The catalog loader skips these entries (no dot, no
 * orbit, not selectable), search folds them into the host row, and `?sat=` / select redirect to
 * the host. Free-flying objects (ISS OBJECT, ISS DEB, visiting vehicles) are NOT listed.
 */

export interface StationModule {
  /** Module NORAD id (canonical, no leading zeros). */
  sccNum: string;
  /** Short module name used for search matching and the "part of" hint. */
  name: string;
  /** NORAD id of the station core object the module is merged into. */
  host: string;
}

/** Short display label of each host object. */
export const STATION_HOST_LABELS: Readonly<Record<string, string>> = {
  25544: 'ISS',
  48274: 'Tiangong',
};

export const STATION_MODULES: readonly StationModule[] = [
  { sccNum: '25575', name: 'Unity', host: '25544' },
  { sccNum: '26400', name: 'Zvezda', host: '25544' },
  { sccNum: '26700', name: 'Destiny', host: '25544' },
  { sccNum: '36086', name: 'Poisk', host: '25544' },
  { sccNum: '49044', name: 'Nauka', host: '25544' },
  { sccNum: '53239', name: 'Wentian', host: '48274' },
  { sccNum: '54216', name: 'Mengtian', host: '48274' },
];

const BY_SCC = new Map<string, StationModule>(STATION_MODULES.map((m) => [m.sccNum, m]));

const normalize = (sccNum: string | number | null | undefined): string =>
  String(sccNum ?? '')
    .trim()
    .replace(/^0+(?=\d)/u, '');

/** The module record for a NORAD id, or undefined when it is not an attached module. */
export function getStationModule(sccNum: string | number | null | undefined): StationModule | undefined {
  return BY_SCC.get(normalize(sccNum));
}

/** True when the NORAD id is an attached station module that is merged into its host. */
export function isStationModule(sccNum: string | number | null | undefined): boolean {
  return BY_SCC.has(normalize(sccNum));
}

/** The NORAD id a module is merged into; any other id is returned unchanged. */
export function resolveStationHost(sccNum: string | number): string {
  return BY_SCC.get(normalize(sccNum))?.host ?? String(sccNum);
}

/** Modules merged into a host NORAD id (empty for every other object). */
export function getModulesOfHost(hostSccNum: string | number | null | undefined): readonly StationModule[] {
  const host = normalize(hostSccNum);

  return STATION_MODULES.filter((m) => m.host === host);
}

/** Display label of a module's host ("ISS", "Tiangong"). */
export function getHostLabel(host: string): string {
  return STATION_HOST_LABELS[host] ?? host;
}
