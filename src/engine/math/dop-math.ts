import numeric from 'numeric';
import { AzEl, DEG2RAD, Degrees, DetailedSatellite, Kilometers, MILLISECONDS_PER_SECOND, ecf2rae, eci2ecf } from '@ootk/src/main';
import { SatMath } from '../../app/analysis/sat-math';
import { dateFormat } from '../utils/dateFormat';
import { getEl } from '../utils/get-el';

export type DopList = {
  time: Date;
  dops: {
    pdop: string;
    hdop: string;
    gdop: string;
    vdop: string;
    tdop: string;
  };
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
  public static calculateDops(azElList: AzEl<Degrees>[]): { pdop: string; hdop: string; gdop: string; vdop: string; tdop: string } {
    const dops = { pdop: '50.00', hdop: '50.00', gdop: '50.00', vdop: '50.00', tdop: '50.00' };

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
  public static getDops(propTime: Date, gpsSatObjects: DetailedSatellite[], lat: Degrees, lon: Degrees, alt?: Kilometers, gpsElevationMask = <Degrees>10) {
    if (typeof lat === 'undefined' || typeof lon === 'undefined') {
      return { pdop: 'N/A', hdop: 'N/A', gdop: 'N/A', vdop: 'N/A', tdop: 'N/A' };
    }

    alt ??= <Kilometers>0;

    const { gmst } = SatMath.calculateTimeVariables(propTime);

    const inViewList = <AzEl<Degrees>[]>[];

    gpsSatObjects.forEach((sat: DetailedSatellite) => {
      const lookAngles = ecf2rae({ lon, lat, alt }, eci2ecf(sat.position, gmst));
      const azel = {
        az: lookAngles.az,
        el: lookAngles.el,
      };

      if (azel.el > gpsElevationMask) {
        inViewList.push(azel);
      }
    });

    return DopMath.calculateDops(inViewList);
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

    tdT.appendChild(document.createTextNode('Time'));
    let tdH = tr.insertCell();

    tdH.appendChild(document.createTextNode('HDOP'));
    let tdP = tr.insertCell();

    tdP.appendChild(document.createTextNode('PDOP'));
    let tdG = tr.insertCell();

    tdG.appendChild(document.createTextNode('GDOP'));

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

  public static getDopsList(getOffsetTimeObj: (offset: number) => Date, gpsSats: DetailedSatellite[], lat: Degrees, lon: Degrees, alt: Kilometers, el: Degrees): DopList {
    const dopsResults = [] as DopList;

    for (let t = 0; t < 1440; t++) {
      const offset = t * 60 * MILLISECONDS_PER_SECOND;
      const now = getOffsetTimeObj(offset);

      const dops = DopMath.getDops(now, gpsSats, lat, lon, alt, el);

      dopsResults.push({ time: now, dops });
    }

    return dopsResults;
  }
}
