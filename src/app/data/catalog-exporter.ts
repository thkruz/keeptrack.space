import { saveCsv } from '@app/engine/utils/saveVariable';
import { BaseObject, DetailedSatellite } from '@ootk/src/main';
import { saveAs } from 'file-saver';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { ServiceLocator } from '@app/engine/core/service-locator';

interface CatalogExportCsvFields {
  [key: string]: unknown; // Add string index signature
  satId: string;
  name: string;
  tle1: string;
  tle2: string;
  inclination: number;
  eccentricity: number;
  period: number;
  raan: number;
  apogee: number;
  perigee: number;
  country: string;
  site: string;
  rocket: string;
  rcs: number | null;
  visualMagnitude: number | null;
  user: string;
  mission: string;
  purpose: string;
  contractor: string;
  dryMass: string;
  liftMass: string;
  lifeExpected: string | number;
  power: string;
}

export class CatalogExporter {
  static exportTle2Csv(objData: BaseObject[], isDeleteAnalysts = true) {
    try {
      const catalogTLE2 = [] as CatalogExportCsvFields[];
      const satOnlyData = objData.filter((obj: BaseObject) => obj.isSatellite() && (obj as DetailedSatellite).tle1) as DetailedSatellite[];

      if (satOnlyData.length === 0) {
        errorManagerInstance.info('No TLE data to export');

        return;
      }

      satOnlyData.sort((a, b) => parseInt(a.sccNum) - parseInt(b.sccNum));
      for (const sat of satOnlyData) {
        if (typeof sat.tle1 === 'undefined' || typeof sat.tle2 === 'undefined') {
          continue;
        }
        if (isDeleteAnalysts && sat.country === 'ANALSAT') {
          continue;
        }
        catalogTLE2.push({
          satId: sat.sccNum,
          name: sat.name,
          tle1: sat.tle1,
          tle2: sat.tle2,
          inclination: sat.inclination,
          eccentricity: sat.eccentricity,
          period: sat.period,
          raan: sat.rightAscension,
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
      /*
       * DEBUG:
       * console.warn('Failed to Export TLEs!');
       */
    }
  }

  static exportSatInFov2Csv(objData: BaseObject[]) {
    const data = objData
      .filter((obj) => obj.isSatellite() && (obj as DetailedSatellite).tle1 && ServiceLocator.getDotsManager().inViewData?.[obj.id] === 1)
      .map((obj) => {
        const sat = obj as DetailedSatellite;


        return {
          satId: sat.sccNum,
          name: sat.name,
          country: sat.country,
          apogee: sat.apogee,
          perigee: sat.perigee,
        };
      });

    saveCsv(data, 'satInView');
  }

  static exportTle2Txt(objData: BaseObject[], numberOfLines = 2, isDeleteAnalysts = true) {
    try {
      const catalogTLE2 = [] as string[];
      const satOnlyData = objData.filter((obj: BaseObject) => obj.isSatellite() && (obj as DetailedSatellite).tle1) as DetailedSatellite[];

      if (satOnlyData.length === 0) {
        errorManagerInstance.info('No TLE data to export');

        return;
      }

      satOnlyData.sort((a, b) => parseInt(a.sccNum) - parseInt(b.sccNum));
      for (const sat of satOnlyData) {
        if (typeof sat.tle1 === 'undefined' || typeof sat.tle2 === 'undefined') {
          continue;
        }
        if (isDeleteAnalysts && sat.country === 'ANALSAT') {
          continue;
        }
        if (numberOfLines === 3) {
          catalogTLE2.push(sat.name);
        }

        if (sat.tle1.includes('NO TLE')) {
          errorManagerInstance.log(sat.sccNum);
        }
        if (sat.tle2.includes('NO TLE')) {
          errorManagerInstance.log(sat.sccNum);
        }

        catalogTLE2.push(sat.tle1);
        catalogTLE2.push(sat.tle2);
      }
      const catalogTLE2Str = catalogTLE2.join('\n');
      const blob = new Blob([catalogTLE2Str], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, 'TLE.txt');
    } catch {
      /*
       * DEBUG:
       * console.warn('Failed to Export TLEs!');
       */
    }
  }
}
