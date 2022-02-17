import { RAD2DEG } from '@app/js/lib/constants';
import { saveAs } from '@app/js/lib/external/file-saver.min.js';
import { saveCsv } from '@app/js/lib/helpers';

export const exportTle2Csv = (satData: any[]) => {
  try {
    const catalogTLE2 = [];
    satData.sort((a: { sccNum: string }, b: { sccNum: string }) => parseInt(a.sccNum) - parseInt(b.sccNum));
    for (let s = 0; s < satData.length; s++) {
      const sat = satData[s];
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        continue;
      }
      if (sat.C == 'ANALSAT') continue;
      catalogTLE2.push({
        satId: sat.sccNum,
        TLE1: sat.TLE1,
        TLE2: sat.TLE2,
        inclination: sat.inclination * RAD2DEG,
        eccentricity: sat.eccentricity,
        period: sat.period,
        raan: sat.raan * RAD2DEG,
        apogee: sat.apogee,
        perigee: sat.perigee,
        site: sat.LS,
        country: sat.C,
        name: sat.ON,
        mission: sat.M,
        purpose: sat.P,
        user: sat.U,
        rocket: sat.LV,
        contractor: sat.Con,
        dryMass: sat.DM,
        liftMass: sat.LM,
        lifeExpected: sat.Li,
        power: sat.Pw,
        visualMagnitude: sat.vmag,
        source1: sat.S1,
        source2: sat.S2,
        source3: sat.S3,
        source4: sat.S4,
        source5: sat.S5,
        source6: sat.S6,
        source7: sat.S7,
        source8: sat.URL,
      });
    }
    saveCsv(catalogTLE2, 'catalogInfo');
  } catch {
    // DEBUG:
    // console.warn('Failed to Export TLEs!');
  }
};
export const exportTle2Txt = (satData: any[]) => {
  try {
    const catalogTLE2 = [];
    satData.sort((a: { sccNum: string }, b: { sccNum: string }) => parseInt(a.sccNum) - parseInt(b.sccNum));
    for (let s = 0; s < satData.length; s++) {
      const sat = satData[s];
      if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
        continue;
      }
      if (sat.C == 'ANALSAT') continue;
      catalogTLE2.push(sat.TLE1);
      catalogTLE2.push(sat.TLE2);
    }
    const catalogTLE2Str = catalogTLE2.join('\n');
    const blob = new Blob([catalogTLE2Str], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, 'TLE.txt');
  } catch {
    // DEBUG:
    // console.warn('Failed to Export TLEs!');
  }
};
