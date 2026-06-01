import { saveXlsx } from '@app/engine/utils/saveVariable';
import { BaseObject, Satellite, Tle } from '@ootk/src/main';
import { saveAs } from 'file-saver';
import { errorManagerInstance } from '../../engine/utils/errorManager';
import { ServiceLocator } from '@app/engine/core/service-locator';

/**
 * Warns when extended (7+ digit / >339999 6-digit) sccNums are in the export
 * selection but the export format is pure-TLE-text. The TLE format physically
 * caps cols 3-7 at 5 chars, so extended IDs only round-trip via formats that
 * carry the canonical sccNum in a dedicated column (CSV / OMM / TCE+JSON).
 *
 * The export still proceeds — the warning is informational so users know
 * why a re-imported pure-TLE file would lose precision.
 */
function warnIfExtendedInTleTextExport_(sats: Satellite[]): void {
  const extendedCount = sats.filter((sat) => Tle.classifySatNum(sat.sccNum) === 'extended').length;

  if (extendedCount > 0) {
    errorManagerInstance.warn(
      `${extendedCount} extended (7+ digit) sccNum satellite(s) in this export — ` +
      'TLE-format cols 3-7 only fit 5 chars, so re-importing this file will ' +
      'lose the canonical id. Use CSV/OMM export to preserve extended IDs.',
    );
  }
}

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
      const satOnlyData = objData.filter((obj: BaseObject) => obj.isSatellite() && (obj as Satellite).tle1) as Satellite[];

      if (satOnlyData.length === 0) {
        errorManagerInstance.info('No TLE data to export');

        return;
      }

      satOnlyData.sort((a, b) => a.sccNum.localeCompare(b.sccNum, 'en', { numeric: true }));
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
      saveXlsx(catalogTLE2, 'catalogInfo');
    } catch {
      /*
       * DEBUG:
       * console.warn('Failed to Export TLEs!');
       */
    }
  }

  static exportSatInFov2Csv(objData: BaseObject[]) {
    const data = objData
      .filter((obj) => obj.isSatellite() && (obj as Satellite).tle1 && ServiceLocator.getDotsManager().inViewData?.[obj.id] === 1)
      .map((obj) => {
        const sat = obj as Satellite;


        return {
          satId: sat.sccNum,
          name: sat.name,
          country: sat.country,
          apogee: sat.apogee,
          perigee: sat.perigee,
        };
      });

    saveXlsx(data, 'satInView');
  }

  static exportTle2Txt(objData: BaseObject[], numberOfLines = 2, isDeleteAnalysts = true) {
    try {
      const catalogTLE2 = [] as string[];
      const satOnlyData = objData.filter((obj: BaseObject) => obj.isSatellite() && (obj as Satellite).tle1) as Satellite[];

      if (satOnlyData.length === 0) {
        errorManagerInstance.info('No TLE data to export');

        return;
      }

      satOnlyData.sort((a, b) => a.sccNum.localeCompare(b.sccNum, 'en', { numeric: true }));
      warnIfExtendedInTleTextExport_(satOnlyData);
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

  static exportTce(objData: BaseObject[], isDeleteAnalysts = true) {
    try {
      const tleLines = [] as string[];
      const satOnlyData = objData.filter((obj: BaseObject) => obj.isSatellite() && (obj as Satellite).tle1) as Satellite[];

      if (satOnlyData.length === 0) {
        errorManagerInstance.info('No TLE data to export');

        return;
      }

      satOnlyData.sort((a, b) => a.sccNum.localeCompare(b.sccNum, 'en', { numeric: true }));
      warnIfExtendedInTleTextExport_(satOnlyData);
      for (const sat of satOnlyData) {
        if (typeof sat.tle1 === 'undefined' || typeof sat.tle2 === 'undefined') {
          continue;
        }
        if (isDeleteAnalysts && sat.country === 'ANALSAT') {
          continue;
        }
        if (sat.tle1.includes('NO TLE') || sat.tle2.includes('NO TLE')) {
          continue;
        }

        tleLines.push(sat.tle1);
        tleLines.push(sat.tle2);
      }

      const blob = new Blob([tleLines.join('\n')], {
        type: 'text/plain;charset=utf-8',
      });

      saveAs(blob, 'stkSatDb.tce');
    } catch {
      // intentionally empty
    }
  }
}
