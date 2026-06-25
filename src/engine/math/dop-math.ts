import numeric from 'numeric';
import { AzEl, DEG2RAD, Degrees, Satellite, Kilometers, MILLISECONDS_PER_SECOND, ecef2rae, eci2ecef } from '@ootk/src/main';
import { t7e } from '@app/locales/keys';
import { SatMath } from '../../app/analysis/sat-math';
import { dateFormat } from '../utils/dateFormat';
import { getEl } from '../utils/get-el';

export type DopValues = {
  pdop: string;
  hdop: string;
  gdop: string;
  vdop: string;
  tdop: string;
};

export type DopResult = DopValues & {
  visibleSats: number;
  allSatAzEl?: SatAzEl[];
};

export type SatAzEl = {
  az: Degrees;
  el: Degrees;
  isVisible: boolean;
  /** Catalog name of the satellite, used for sky plot identity labels */
  name?: string;
};

/** Supported GNSS constellations for DOP analysis. */
export type GnssConstellation = 'gps' | 'galileo' | 'glonass' | 'beidou' | 'all';

/**
 * Catalog-name matchers for each GNSS constellation.
 * GLONASS satellites are cataloged as COSMOS objects; CelesTrak-style names carry
 * a GLONASS tag or a 7xx Uragan series number in parentheses/brackets.
 */
export const GNSS_CONSTELLATION_PATTERNS: Record<GnssConstellation, RegExp> = {
  gps: /NAVSTAR|\bGPS[\s-]/iu,
  galileo: /GALILEO|\bGSAT-?\d{3,4}\b/iu,
  glonass: /GLONASS|URAGAN|COSMOS\s*\d+\s*[([](?:GLONASS|7\d{2})/iu,
  beidou: /BEIDOU|\bBDS[\s-]\d/iu,
  all: /NAVSTAR|\bGPS[\s-]|GALILEO|\bGSAT-?\d{3,4}\b|GLONASS|URAGAN|COSMOS\s*\d+\s*[([](?:GLONASS|7\d{2})|BEIDOU|\bBDS[\s-]\d/iu,
};

/** Function that returns the minimum elevation at a given azimuth */
export type ElevationMaskFn = (az: Degrees) => Degrees;

export type DopList = {
  time: Date;
  dops: DopValues;
  /** Number of satellites visible above the elevation mask at this time */
  visibleSats: number;
}[];

/**
 * The `DopMath` class provides methods for calculating dilution of precision (DOP) values for GPS satellites.
 */
export abstract class DopMath {
  /**
   * Calculates the DOP values for a list of GPS satellites.
   * @param azElList The list of GPS satellites to use for the calculation.
   * @returns An object containing the calculated DOP values.
   */
  public static calculateDops(azElList: AzEl<Degrees>[]): DopValues {
    const dops: DopValues = { pdop: '50.00', hdop: '50.00', gdop: '50.00', vdop: '50.00', tdop: '50.00' };

    const nsat = azElList.length;

    if (nsat < 4) {
      return dops;
    }

    const A = numeric.rep([nsat, 4], 0) as number[][];

    for (let n = 1; n <= nsat; n++) {
      const { az, el } = azElList[n - 1];

      const B = [Math.cos(el * DEG2RAD) * Math.sin(az * DEG2RAD), Math.cos(el * DEG2RAD) * Math.cos(az * DEG2RAD), Math.sin(el * DEG2RAD), 1];

      numeric.setBlock(A, [n - 1, 0], [n - 1, 3], [B]);
    }
    const Q = <number[][]>numeric.dot(numeric.transpose(A), A);
    const Qinv = numeric.inv(Q);
    const pdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2]);
    const hdop = Math.sqrt(Qinv[0][0] + Qinv[1][1]);
    const gdop = Math.sqrt(Qinv[0][0] + Qinv[1][1] + Qinv[2][2] + Qinv[3][3]);
    const vdop = Math.sqrt(Qinv[2][2]);
    const tdop = Math.sqrt(Qinv[3][3]);

    dops.pdop = (Math.round(pdop * 100) / 100).toFixed(2);
    dops.hdop = (Math.round(hdop * 100) / 100).toFixed(2);
    dops.gdop = (Math.round(gdop * 100) / 100).toFixed(2);
    dops.vdop = (Math.round(vdop * 100) / 100).toFixed(2);
    dops.tdop = (Math.round(tdop * 100) / 100).toFixed(2);

    return dops;
  }

  /**
   * Calculates the DOP values for a specific time and location.
   * @param propTime The time to use for the calculation.
   * @param gpsSats The GPS satellites to use for the calculation.
   * @param lat The latitude of the observer.
   * @param lon The longitude of the observer.
   * @param alt The altitude of the observer.
   * @returns An object containing the calculated DOP values.
   * @throws An error if the latitude or longitude is undefined.
   */
  public static getDops(
    propTime: Date,
    gpsSatObjects: Satellite[],
    lat: Degrees,
    lon: Degrees,
    alt?: Kilometers,
    gpsElevationMask: Degrees | ElevationMaskFn = <Degrees>10,
    includeAllSatPositions = false,
  ): DopResult {
    if (typeof lat === 'undefined' || typeof lon === 'undefined') {
      return { pdop: 'N/A', hdop: 'N/A', gdop: 'N/A', vdop: 'N/A', tdop: 'N/A', visibleSats: 0 };
    }

    alt ??= <Kilometers>0;

    const { gmst } = SatMath.calculateTimeVariables(propTime);
    const isFunction = typeof gpsElevationMask === 'function';

    const inViewList = <AzEl<Degrees>[]>[];
    const allSatAzEl: SatAzEl[] | undefined = includeAllSatPositions ? [] : undefined;

    gpsSatObjects.forEach((sat: Satellite) => {
      const lookAngles = ecef2rae({ lon, lat, alt }, eci2ecef(sat.position, gmst));
      const az = lookAngles.az;
      const el = lookAngles.el;
      const minEl = isFunction ? (gpsElevationMask as ElevationMaskFn)(az) : gpsElevationMask;
      const isVisible = el > minEl;

      if (isVisible) {
        inViewList.push({ az, el });
      }

      if (allSatAzEl) {
        allSatAzEl.push({ az, el, isVisible, name: sat.name });
      }
    });

    const dops = DopMath.calculateDops(inViewList);

    return { ...dops, visibleSats: inViewList.length, allSatAzEl };
  }

  /**
   * Updates the DOPs table with new values.
   * @param gpsSats The GPS satellites to use for the calculation.
   * @param lat The latitude of the observer.
   * @param lon The longitude of the observer.
   * @param alt The altitude of the observer.
   */
  public static updateDopsTable(dopsResults: DopList) {
    if (!dopsResults || dopsResults.length === 0) {
      throw new Error('No DOPs results found!');
    }

    const tbl = <HTMLTableElement>getEl('dops'); // Identify the table to update

    if (!tbl) {
      throw new Error('Table not found!');
    }
    tbl.innerHTML = ''; // Clear the table from old object data

    let tr = tbl.insertRow();
    let tdT = tr.insertCell();

    tdT.appendChild(document.createTextNode(t7e('plugins.DopsPlugin.table.time')));
    let tdH = tr.insertCell();

    tdH.appendChild(document.createTextNode(t7e('plugins.DopsPlugin.table.hdop')));
    let tdP = tr.insertCell();

    tdP.appendChild(document.createTextNode(t7e('plugins.DopsPlugin.table.pdop')));
    let tdG = tr.insertCell();

    tdG.appendChild(document.createTextNode(t7e('plugins.DopsPlugin.table.gdop')));

    for (const result of dopsResults) {
      tr = tbl.insertRow();
      tdT = tr.insertCell();
      tdT.appendChild(document.createTextNode(dateFormat(result.time, 'isoDateTime', true)));
      tdH = tr.insertCell();
      tdH.appendChild(document.createTextNode(result.dops.hdop));
      tdP = tr.insertCell();
      tdP.appendChild(document.createTextNode(result.dops.pdop));
      tdG = tr.insertCell();
      tdG.appendChild(document.createTextNode(result.dops.gdop));
    }
  }

  /**
   * Builds a short identity label for a sky plot dot from a satellite catalog name.
   * Prefers a PRN designator when one is parseable, otherwise shortens the name by
   * stripping parenthetical/bracketed suffixes and truncating.
   */
  public static getSatelliteShortLabel(name?: string): string {
    if (!name) {
      return '';
    }

    const prnMatch = (/PRN\s*(?<prn>\d+)/iu).exec(name);

    if (prnMatch) {
      return `PRN ${prnMatch.groups?.prn}`;
    }

    const shortened = name
      .replace(/\s*[([].*$/u, '')
      .trim();

    return shortened.length > 12 ? `${shortened.slice(0, 11)}…` : shortened;
  }

  public static getDopsList(
    getOffsetTimeObj: (offset: number) => Date,
    gpsSats: Satellite[],
    lat: Degrees,
    lon: Degrees,
    alt: Kilometers,
    el: Degrees | ElevationMaskFn,
  ): DopList {
    const dopsResults = [] as DopList;

    for (let t = 0; t < 1440; t++) {
      const offset = t * 60 * MILLISECONDS_PER_SECOND;
      const now = getOffsetTimeObj(offset);

      const dops = DopMath.getDops(now, gpsSats, lat, lon, alt, el);

      dopsResults.push({ time: now, dops, visibleSats: dops.visibleSats });
    }

    return dopsResults;
  }
}
