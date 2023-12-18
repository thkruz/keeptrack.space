import { SatObject } from '@app/js/interfaces';
import { RAD2DEG } from '@app/js/lib/constants';
import { saveCsv } from '@app/js/lib/saveVariable';
import { saveAs } from 'file-saver';
import { keepTrackApi } from '../keepTrackApi';
import { errorManagerInstance } from '../singletons/errorManager';

export class CatalogExporter {
  static exportTle2Csv(satData: SatObject[], isDeleteAnalysts = true) {
    try {
      const catalogTLE2 = [];
      const satOnlyData = satData.filter((sat: SatObject) => sat.sccNum && typeof sat.TLE1 != 'undefined' && typeof sat.TLE2 != 'undefined');

      if (satOnlyData.length == 0) {
        errorManagerInstance.info('No TLE data to export');
        return;
      }

      satOnlyData.sort((a: SatObject, b: SatObject) => parseInt(a.sccNum) - parseInt(b.sccNum));
      for (let s = 0; s < satOnlyData.length; s++) {
        const sat = <SatObject>satOnlyData[s];
        if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
          continue;
        }
        if (isDeleteAnalysts && sat.country == 'ANALSAT') continue;
        catalogTLE2.push({
          satId: sat.sccNum,
          name: sat.name,
          TLE1: sat.TLE1,
          TLE2: sat.TLE2,
          inclination: sat.inclination * RAD2DEG,
          eccentricity: sat.eccentricity,
          period: sat.period,
          raan: sat.raan * RAD2DEG,
          apogee: sat.apogee,
          perigee: sat.perigee,
          country: sat.country,
          site: sat.launchSite,
          rocket: sat.launchVehicle,
          rcs: sat.rcs,
          visualMagnitude: sat.vmag,
          user: sat.user,
          mission: sat.mission,
          purpose: sat.purpose,
          contractor: sat.manufacturer,
          dryMass: sat.dryMass,
          liftMass: sat.launchMass,
          lifeExpected: sat.lifetime,
          power: sat.power,
        });
      }
      saveCsv(catalogTLE2, 'catalogInfo');
    } catch {
      // DEBUG:
      // console.warn('Failed to Export TLEs!');
    }
  }

  static exportSatInFov2Csv(satData: SatObject[]) {
    const data = satData
      .filter((sat: SatObject) => keepTrackApi.getDotsManager().inViewData?.[sat.id] === 1 && sat.sccNum && typeof sat.TLE1 != 'undefined' && typeof sat.TLE2 != 'undefined')
      .map((sat: SatObject) => ({
        satId: sat.sccNum,
        name: sat.name,
        country: sat.country,
        apogee: sat.apogee,
        perigee: sat.perigee,
      }));

    saveCsv(data, 'satInView');
  }

  static exportTle2Txt(satData: SatObject[], numberOfLines = 2, isDeleteAnalysts = true) {
    try {
      const catalogTLE2 = [];
      const satOnlyData = satData.filter((sat: SatObject) => sat.sccNum && typeof sat.TLE1 != 'undefined' && typeof sat.TLE2 != 'undefined');

      if (satOnlyData.length == 0) {
        errorManagerInstance.info('No TLE data to export');
        return;
      }

      satOnlyData.sort((a: SatObject, b: SatObject) => parseInt(a.sccNum) - parseInt(b.sccNum));
      for (let s = 0; s < satOnlyData.length; s++) {
        const sat = satOnlyData[s];
        if (typeof sat.TLE1 == 'undefined' || typeof sat.TLE2 == 'undefined') {
          continue;
        }
        if (isDeleteAnalysts && sat.country == 'ANALSAT') continue;
        if (numberOfLines == 3) {
          catalogTLE2.push(sat.name);
        }

        if (sat.TLE1.includes('NO TLE')) {
          console.log(sat.sccNum);
        }
        if (sat.TLE2.includes('NO TLE')) {
          console.log(sat.sccNum);
        }

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
  }
}
