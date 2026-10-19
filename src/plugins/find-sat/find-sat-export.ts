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
import { DecayedPredicate, getOperationalStatus, OperationalStatus } from './find-sat-filters';

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

/** Localized "Decayed" label for the detailed status column. */
const decayedLabel = (): string => t7e('plugins.FindSatPlugin.labels.statusDecayed' as Parameters<typeof t7e>[0]);

/**
 * The detailed status text the satellite info box shows on its "Status" row.
 * Only payloads carry a catalog status code, so other object types get ''.
 * A payload that has decayed at the current simulation time reads "Decayed"
 * whatever its catalog code says, matching the search results list.
 */
const payloadStatusDetail = (sat: Satellite, isDecayed?: DecayedPredicate): string => {
  if (sat.type !== SpaceObjectType.PAYLOAD) {
    return '';
  }

  if (isDecayed?.(sat)) {
    return decayedLabel();
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
    case PayloadStatus.DECAYED:
      return decayedLabel();
    default:
      return t7e('SatInfoBoxObject.Status.unknown');
  }
};

/**
 * Builds the export rows: satellites with TLEs only, analyst objects dropped,
 * sorted by catalog number. `isDecayed` marks objects that have decayed at the
 * current simulation time so their status columns match the results list.
 */
export const buildFindSatExportRows = (objs: BaseObject[], isDecayed?: DecayedPredicate): FindSatExportRow[] => {
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
      operationalStatus: operationalStatusLabel(getOperationalStatus(sat, isDecayed)),
      status: payloadStatusDetail(sat, isDecayed),
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
export const exportFindSatResults = (objs: BaseObject[], isDecayed?: DecayedPredicate): void => {
  const rows = buildFindSatExportRows(objs, isDecayed);

  if (rows.length === 0) {
    errorManagerInstance.info(t7e('plugins.FindSatPlugin.errorMsgs.NothingToExport' as Parameters<typeof t7e>[0]));

    return;
  }

  saveXlsx(rows, 'catalogInfo');
};
