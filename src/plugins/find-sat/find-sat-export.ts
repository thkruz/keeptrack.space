/**
 * Spreadsheet export for Find Satellite results.
 *
 * Mirrors the column set of CatalogExporter.exportTle2Csv and adds the
 * operational status columns that back the Operational Status filter. Exports
 * are never capped by the search-limit setting: that cap exists to limit the
 * number of orbit lines drawn on the globe, and a spreadsheet draws nothing.
 */
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { saveXlsx } from '@app/engine/utils/saveVariable';
import { t7e } from '@app/locales/keys';
import { BaseObject, PayloadStatus, Satellite, SpaceObjectType } from '@ootk/src/main';
import { getOperationalStatus, OperationalStatus } from './find-sat-filters';

/** One exported spreadsheet row. */
export type FindSatExportRow = Record<string, unknown>;

/** Localized coarse status bucket label (Active / Inactive / Unknown). */
export const operationalStatusLabel = (status: OperationalStatus): string => {
  switch (status) {
    case 'active':
      return t7e('plugins.FindSatPlugin.labels.statusActive' as Parameters<typeof t7e>[0]);
    case 'inactive':
      return t7e('plugins.FindSatPlugin.labels.statusInactive' as Parameters<typeof t7e>[0]);
    default:
      return t7e('plugins.FindSatPlugin.labels.statusUnknown' as Parameters<typeof t7e>[0]);
  }
};

/**
 * The detailed status text the satellite info box shows on its "Status" row.
 * Only payloads carry a catalog status code, so other object types get ''.
 */
const payloadStatusDetail = (sat: Satellite): string => {
  if (sat.type !== SpaceObjectType.PAYLOAD) {
    return '';
  }

  switch (sat.status) {
    case PayloadStatus.OPERATIONAL:
      return t7e('SatInfoBoxObject.Status.operational');
    case PayloadStatus.NONOPERATIONAL:
      return t7e('SatInfoBoxObject.Status.nonOperational');
    case PayloadStatus.PARTIALLY_OPERATIONAL:
      return t7e('SatInfoBoxObject.Status.partiallyOperational');
    case PayloadStatus.EXTENDED_MISSION:
      return t7e('SatInfoBoxObject.Status.extendedMission');
    case PayloadStatus.BACKUP_STANDBY:
      return t7e('SatInfoBoxObject.Status.backupStandby');
    case PayloadStatus.SPARE:
      return t7e('SatInfoBoxObject.Status.spare');
    default:
      return t7e('SatInfoBoxObject.Status.unknown');
  }
};

/**
 * Builds the export rows: satellites with TLEs only, analyst objects dropped,
 * sorted by catalog number.
 */
export const buildFindSatExportRows = (objs: BaseObject[]): FindSatExportRow[] => {
  const sats = objs.filter((obj) => obj.isSatellite() && (obj as Satellite).tle1 && (obj as Satellite).tle2 && (obj as Satellite).country !== 'ANALSAT') as Satellite[];

  return [...sats]
    .sort((a, b) => a.sccNum.localeCompare(b.sccNum, 'en', { numeric: true }))
    .map((sat) => ({
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
      operationalStatus: operationalStatusLabel(getOperationalStatus(sat)),
      status: payloadStatusDetail(sat),
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
    }));
};

/** Saves every supplied match to an .xlsx file. */
export const exportFindSatResults = (objs: BaseObject[]): void => {
  const rows = buildFindSatExportRows(objs);

  if (rows.length === 0) {
    errorManagerInstance.info(t7e('plugins.FindSatPlugin.errorMsgs.NothingToExport' as Parameters<typeof t7e>[0]));

    return;
  }

  saveXlsx(rows, 'catalogInfo');
};
