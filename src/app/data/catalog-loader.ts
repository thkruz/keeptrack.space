/* eslint-disable max-lines */
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { rgbaArray, SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { StringPad } from '@app/engine/utils/stringPad';
import { CruncherSat } from '@app/webworker/positionCruncher';
import {
  BaseObject,
  CatalogSource,
  LandObject,
  Marker,
  OmmDataFormat,
  PayloadStatus,
  Satellite,
  SpaceObjectType,
  Star,
  Tle,
  TleLine1,
  TleLine2,
} from '@ootk/src/main';
import Papa from 'papaparse';
import { EventBus } from '../../engine/events/event-bus';
import { EventBusEvent } from '../../engine/events/event-bus-events';
import { SettingsManager } from '../../settings/settings';
import { Planet } from '../objects/planet';
import { apiFetch } from './api-fetch';
import { CatalogManager } from './catalog-manager';
import { LaunchSite } from './catalog-manager/LaunchFacility';
import { MissileObject } from './catalog-manager/MissileObject';
import { orgDataService } from './catalogs/org-data-service';

export interface JsSat {
  TLE1: string;
  TLE2: string;
  vmag?: number;
}

interface ExtraSat {
  ON?: string;
  OT?: SpaceObjectType;
  SCC: string;
  TLE1: string;
  TLE2: string;
  vmag?: number;
}

export interface AsciiTleSat {
  ON?: string;
  OT?: SpaceObjectType;
  SCC: string;
  TLE1: TleLine1;
  TLE2: TleLine2;
}

export interface KeepTrackTLEFile {
  /** First TLE line */
  tle1: TleLine1;
  /** Second TLE line */
  tle2: TleLine2;
  /** Satellite Bus */
  bus?: string;
  /** Lift vehicle configuration */
  configuration?: string;
  /** Owner country of the object */
  country?: string;
  /** Length of the object in meters */
  length?: string;
  /** Size of the object's diameter in meters */
  diameter?: string;
  /** Size of the object's width in meters */
  span?: string;
  /** Dry mass of the object in kilograms */
  dryMass?: string;
  /** Equipment on the object */
  equipment?: string;
  /** Date launched into space in YYYY-MM-DD */
  launchDate?: string;
  /**
   * Stable Date in YYYY-MM-DD.
   * This is mainly for identifying fragment creation dates
   */
  stableDate?: string;
  /** Launch mass including fuel in kilograms */
  launchMass?: string;
  /** Launch site */
  launchSite?: string;
  /** Launch Pad */
  launchPad?: string;
  /** Launch vehicle */
  launchVehicle?: string;
  /** Lifetime of the object in years */
  lifetime?: string | number;
  /** Manufacturer of the object */
  manufacturer?: string;
  /** Mission of the object */
  mission?: string;
  /** Motor of the object */
  motor?: string;
  /** Primary Name of the object */
  name: string;
  /** Alternate name of the object */
  altName?: string;
  /** Owner of the object */
  owner?: string;
  /** Payload of the object */
  payload?: string;
  /** Power information */
  power?: string;
  /** Purpose of the object */
  purpose?: string;
  /** Size of the object in Radar Cross Section (RCS) in meters squared */
  rcs?: string | null;
  /** Shape of the object */
  shape?: string;
  /** Current status of the object */
  status?: PayloadStatus;
  /** Type of the object */
  type?: SpaceObjectType;
  /** Visual magnitude of the object */
  vmag?: number | null;
  /**
   * Used internally only and deleted before saving
   * @deprecated Not really, but it makes it clear that this is not saved to disk
   */
  JCAT?: string;
  altId?: string;
  /** This is added in addSccNum_ */
  sccNum?: string;
  /** This is added in parseIntlDes_ */
  intlDes?: string;
  /** This is added in this file */
  active?: boolean;
  /** This is added in this file */
  source?: CatalogSource;
  /** This is added in this file */
  id?: number;
}

export class CatalogLoader {
  static filterTLEDatabase(resp: KeepTrackTLEFile[], extraSats: ExtraSat[] | null, asciiCatalog: AsciiTleSat[] | null, jsCatalog: JsSat[] | null): void {
    let tempObjData: Satellite[] = [];
    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
    catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

    const notionalSatNum = 400000; // Start at 400,000 to avoid conflicts with real satellites

    for (let i = 0; i < resp.length; i++) {
      CatalogLoader.addSccNum_(resp, i);

      // Check if first digit is a letter. Bad upstream data (e.g. Unicode
      // lookalikes in the SCC column) can throw here — skip the row so one
      // corrupt entry doesn't abort the whole catalog load.
      try {
        resp[i].sccNum = Tle.convertA5to6Digit(resp[i]?.sccNum ?? '');
      } catch (err) {
        errorManagerInstance.info(`Skipping catalog entry ${i} with malformed SCC: ${JSON.stringify(resp[i]?.sccNum)} — ${(err as Error).message}`);
        continue;
      }

      CatalogLoader.processAllSats_(resp, i, catalogManagerInstance, tempObjData, notionalSatNum);
    }

    if ((extraSats?.length ?? 0) > 0) {
      CatalogLoader.processExtraSats_(extraSats as ExtraSat[], catalogManagerInstance, tempObjData);
    }

    if (asciiCatalog && asciiCatalog?.length > 0) {
      tempObjData = CatalogLoader.processAsciiCatalog_(asciiCatalog, catalogManagerInstance, tempObjData);
    }

    if ((jsCatalog?.length ?? 0) > 0) {
      CatalogLoader.processJsCatalog_(jsCatalog as JsSat[], catalogManagerInstance, tempObjData);
    }

    CatalogLoader.addNonSatelliteObjects_(catalogManagerInstance, tempObjData);

    catalogManagerInstance.objectCache = tempObjData;
  }

  /**
   *  This function will load the catalog, additional catalogs, and merge them together.
   *
   *  Primary Catalogs
   *  1. tle.json - this contains extended object information including launch location and RCS.
   *  2. tleDebris.json - this contains all non-payload data from TLE.json
   *  Secondary Catalogs
   *  1. extra.json - this contains supplemental information about the catalog in json format.
   *  2. TLE.txt - this contains a local ASCII TLE file.
   *  3. externalTLEs - this contains an external TLE file.
   *  4. vimpel.json - this contains JSC Vimpel TLE data.
   *
   *  The catalog is loaded in the above order appending/overwriting the information each step of the way.
   *
   *  If a file is missing, the function will skip it and continue loading the next file.
   *
   *  If all files are missing, the function will return an error.
   */
  static async load(): Promise<void> {
    const settingsManager: SettingsManager = window.settingsManager;

    // Loading the live catalog measures GP age against the wall clock again.
    settingsManager.catalogReferenceTime = null;

    // Fire-and-forget: fetch org data from R2 in parallel with catalog loading
    orgDataService.init();

    try {
      // TODO: Which sources can use this should be definied in the settings (Celestrak Rebase)
      if (
        (/^https?:\/\/(?:api\.keeptrack\.space|localhost:8787)\/v4\/sats(?:\/celestrak)?$/u).test(settingsManager.dataSources.tle)
      ) {
        const limitSegment = settingsManager.limitSats ? `/${settingsManager.limitSats}` : '';

        settingsManager.dataSources.tle = `${settingsManager.dataSources.tle}${limitSegment}?format=keeptrack`;
      }

      const {
        extraSats,
        asciiCatalog,
        jsCatalog,
        externalCatalog,
      } =
        CatalogLoader.getAdditionalCatalogs_(settingsManager);

      if (settingsManager.dataSources.externalTLEsOnly) {
        if (settingsManager.dataSources.isSupplementExternal) {
          // Load our database for the extra information - the satellites will be filtered out
          await apiFetch(settingsManager.dataSources.tle)
            .then((response) => response.json())
            .then((data) => CatalogLoader.parse({
              keepTrackTle: data,
              externalCatalog,
            }))
            .catch((error) => {
              errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
            });
        } else {
          // Load the external TLEs only
          await CatalogLoader.parse({
            externalCatalog,
          });
        }
      } else if (settingsManager.isUseDebrisCatalog) {
        // Load the debris catalog
        await apiFetch(settingsManager.dataSources.tleDebris)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            vimpelCatalog: jsCatalog,
          }))
          .catch((error) => {
            errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
          });
      } else if (settingsManager.offlineMode) {
        await fetch(`${settingsManager.installDirectory}tle/tle.json`)
          .then((response) => response.json())
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            externalCatalog,
            vimpelCatalog: jsCatalog,
          }));
      } else {
        // Load the primary catalog
        await apiFetch(settingsManager.dataSources.tle)
          .then((response) => {
            if (response.status === 401) {
              throw new Error('Failed to fetch');
            }

            return response.json();
          })
          .then((data) => CatalogLoader.parse({
            keepTrackTle: data,
            keepTrackExtra: extraSats,
            keepTrackAscii: asciiCatalog,
            externalCatalog,
            vimpelCatalog: jsCatalog,
          }))
          .catch(async (error) => {
            if (error.message === 'Failed to fetch') {
              errorManagerInstance.warn('Failed to download latest catalog! Using offline catalog which may be out of date!');
              await fetch(`${settingsManager.installDirectory}tle/tle.json`)
                .then((response) => response.json())
                .then((data) => CatalogLoader.parse({
                  keepTrackTle: data,
                  keepTrackExtra: extraSats,
                  keepTrackAscii: asciiCatalog,
                  externalCatalog,
                  vimpelCatalog: jsCatalog,
                }));
            } else {
              errorManagerInstance.error(error, 'tleManagerInstance.loadCatalog');
            }
          });
      }
    } catch {
      errorManagerInstance.warn('Failed to load TLE catalog(s)!');
    }
  }

  /**
   * Parses the satellite catalog data and filters TLEs based on the given parameters.
   * @param resp - An array of SatObject containing the satellite catalog data.
   * @param extraSats - A Promise that resolves to an array of ExtraSat objects.
   * @param altCatalog - An object containing alternate catalogs. It has the following properties:
   *    - asciiCatalog: A Promise that resolves to an array of AsciiTleSat objects.
   *    - externalCatalog: (optional) A Promise that resolves to an array of AsciiTleSat objects or void.
   * @param jsCatalog - A Promise that resolves to an array of JsSat objects.
   */
  static async parse({
    keepTrackTle: resp = [],
    keepTrackExtra: extraSats = Promise.resolve([]),
    keepTrackAscii: asciiCatalog = Promise.resolve([]),
    externalCatalog = Promise.resolve([]),
    vimpelCatalog: jsCatalog = Promise.resolve([]),
  }: {
    keepTrackTle?: KeepTrackTLEFile[];
    keepTrackExtra?: Promise<ExtraSat[]> | null;
    keepTrackAscii?: Promise<AsciiTleSat[]> | null;
    externalCatalog?: Promise<AsciiTleSat[] | null> | null;
    vimpelCatalog?: Promise<JsSat[]> | null;
  }): Promise<void> {
    await Promise.all([extraSats, asciiCatalog, externalCatalog, jsCatalog]).then(async ([extraSats, asciiCatalog, externalCatalog, jsCatalog]) => {
      asciiCatalog = externalCatalog || asciiCatalog;

      // Make sure everyone agrees on what time it is
      ServiceLocator.getTimeManager().init();
      ServiceLocator.getTimeManager().synchronize();

      // Allow data plugins (e.g., pro StarsPlugin) to inject static catalog data
      // before TLE filtering runs.
      await EventBus.getInstance().emitAsync(EventBusEvent.beforeFilterTLEDatabase);

      /*
       * Filter TLEs
       * Sets catalogManagerInstance.satData internally to reduce memory usage
       */
      CatalogLoader.filterTLEDatabase(resp, extraSats, asciiCatalog, jsCatalog);

      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      catalogManagerInstance.numObjects = catalogManagerInstance.objectCache.length;

      const satDataString = CatalogLoader.getSatDataString_(catalogManagerInstance.objectCache);

      /** Send satDataString to satCruncher to begin propagation loop */
      catalogManagerInstance.satCruncherThread.sendCatalogData(
        satDataString,
        catalogManagerInstance.fieldOfViewSet.length,
        settingsManager.lowPerf,
      );
    });
  }

  /**
   * Parses raw TLE text content (2-line or 3-line format) into AsciiTleSat objects.
   * Supports .tce files (2-line TLE pairs) and 3LE files (name + TLE pair).
   */
  static parseTceContent(content: string): AsciiTleSat[] {
    const lines = content.split('\n');

    CatalogLoader.cleanAsciiCatalogFile_(lines);

    const catalog: AsciiTleSat[] = [];

    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
      return catalog;
    }

    if (lines[0].startsWith('1 ')) {
      CatalogLoader.parseAsciiTLE_(lines, catalog);
    } else if (lines.length > 1 && lines[1].startsWith('1 ')) {
      CatalogLoader.parseAscii3LE_(lines, catalog);
    } else {
      throw new Error('Unrecognized TLE format: first data line must start with "1 "');
    }

    CatalogLoader.sortByScc_(catalog);

    return catalog;
  }

  /**
   * Reloads the entire satellite catalog from raw TLE text content.
   * Resets all rendering subsystems and re-initializes the propagation worker.
   * Supports .tce (2-line), .tle (3-line), and .txt TLE files.
   */
  static async reloadCatalog(tceContent: string): Promise<void> {
    const asciiCatalog = CatalogLoader.parseTceContent(tceContent);

    if (asciiCatalog.length === 0) {
      throw new Error('No valid TLE data found in file');
    }

    // Must pass as externalCatalog because parse() uses `externalCatalog || asciiCatalog`
    // and externalCatalog defaults to Promise.resolve([]) which is truthy, discarding keepTrackAscii
    await CatalogLoader.reloadFromParseArgs_({
      keepTrackTle: [],
      externalCatalog: Promise.resolve(asciiCatalog),
    });
  }

  /**
   * Reloads the catalog from raw JSC Vimpel (vimpel.json) data.
   *
   * Routes the data through the same {@link processJsCatalog_} pipeline used at
   * initial boot, so altIds, "JSC Vimpel" labels, source, and object types match.
   * Passing Vimpel data as raw TLE text to {@link reloadCatalog} instead routes it
   * through the ASCII pipeline, which cannot recover the Vimpel altId (the catalog
   * number column is blank) and ends up assigning incorrect labels and launch years.
   */
  static async reloadVimpelCatalog(jsCatalog: JsSat[]): Promise<void> {
    if (jsCatalog.length === 0) {
      throw new Error('No valid Vimpel data found');
    }

    await CatalogLoader.reloadFromParseArgs_({
      keepTrackTle: [],
      vimpelCatalog: Promise.resolve(jsCatalog),
    });
  }

  /**
   * Shared scaffolding for live catalog swaps: resets selection/orbit/hover state,
   * tears down and rebuilds the rendering subsystems, re-parses via {@link parse},
   * and keeps the loading screen up until the propagation worker reports ready.
   */
  private static async reloadFromParseArgs_(parseArgs: Parameters<typeof CatalogLoader.parse>[0]): Promise<void> {
    const { showLoadingSticky, hideLoading } = await import('../../engine/utils/showLoading');
    const { SelectSatManager } = await import('../../plugins/select-sat-manager/select-sat-manager');
    const { EventBus } = await import('../../engine/events/event-bus');
    const { EventBusEvent } = await import('../../engine/events/event-bus-events');
    const { PluginRegistry } = await import('../../engine/core/plugin-registry');

    showLoadingSticky();

    // Reloading from raw TLEs measures GP age against the wall clock again.
    settingsManager.catalogReferenceTime = null;

    try {
      // Deselect current satellite
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

      if (selectSatManager) {
        selectSatManager.selectSat(-1);
      }

      // Clear orbits and hover state
      const orbitManager = ServiceLocator.getOrbitManager();

      orbitManager.clearSelectOrbit(false);
      orbitManager.clearSelectOrbit(true);
      orbitManager.clearHoverOrbit();
      orbitManager.clearInViewOrbit();
      orbitManager.orbitCache.clear();

      // Reset hover ID so stale IDs from the old catalog don't reference
      // out-of-bounds indices in the new color data
      ServiceLocator.getHoverManager().setHoverId(-1);

      // Clear search results
      settingsManager.lastSearchResults = [];

      // Reset rendering subsystems
      const dotsManager = ServiceLocator.getDotsManager();
      const colorSchemeManager = ServiceLocator.getColorSchemeManager();

      dotsManager.resetForCatalogSwap();
      colorSchemeManager.resetForCatalogSwap();

      // Re-parse the catalog via existing pipeline
      await CatalogLoader.parse(parseArgs);

      // Re-init GPU buffers with the new catalog size
      // This must run after parse (which sets objectCache/numObjects) but before
      // onCruncherReady — matching the startup flow in keeptrack.ts
      dotsManager.initBuffers(colorSchemeManager.colorBuffer!);

      // Re-init orbit cruncher with new catalog TLE data and resize GL buffers
      orbitManager.resetForCatalogSwap();

      // Clear position/velocity data AGAIN after parse returns.
      // During the await inside parse(), stale worker messages from the old
      // propagation loop can set positionData/velocityData. If these persist
      // when cruncherReady is set to false below, the next stale worker message
      // would satisfy the onCruncherReady check and trigger it prematurely
      // with old catalog positions.
      dotsManager.positionData = null as unknown as Float32Array;
      dotsManager.velocityData = null as unknown as Float32Array;
      dotsManager.isReady = false;

      // Reset cruncherReady AFTER clearing stale data so that the NEXT worker
      // message (from the new OBJ_DATA) is the first to satisfy onCruncherReady
      settingsManager.cruncherReady = false;

      // Keep loading screen up until the position cruncher finishes processing
      // and onCruncherReady fires (which triggers ColorSchemeManager to rebuild colors)
      const eventBus = EventBus.getInstance();
      const onReady = () => {
        eventBus.unregister(EventBusEvent.onCruncherReady, onReady);
        eventBus.emit(EventBusEvent.catalogReloaded);
        hideLoading();
      };

      eventBus.on(EventBusEvent.onCruncherReady, onReady);
    } catch (error) {
      hideLoading();
      throw error;
    }
  }

  /**
   * Merges incoming TLE data into the existing catalog, preserving satellite
   * metadata (name, country, mission, etc.) for satellites that appear in both
   * the current catalog and the incoming file.
   *
   * Satellites not present in the incoming TLE file are removed.
   * New satellites from the incoming file are added with minimal metadata.
   */
  static async mergeAndReloadCatalog(tceContent: string): Promise<void> {
    const { showLoadingSticky, hideLoading } = await import('../../engine/utils/showLoading');
    const { SelectSatManager } = await import('../../plugins/select-sat-manager/select-sat-manager');
    const { EventBus } = await import('../../engine/events/event-bus');
    const { EventBusEvent } = await import('../../engine/events/event-bus-events');
    const { PluginRegistry } = await import('../../engine/core/plugin-registry');

    showLoadingSticky();

    // Reloading from raw TLEs measures GP age against the wall clock again.
    settingsManager.catalogReferenceTime = null;

    try {
      // Deselect current satellite
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

      if (selectSatManager) {
        selectSatManager.selectSat(-1);
      }

      // Clear orbits and hover state
      const orbitManager = ServiceLocator.getOrbitManager();

      orbitManager.clearSelectOrbit(false);
      orbitManager.clearSelectOrbit(true);
      orbitManager.clearHoverOrbit();
      orbitManager.clearInViewOrbit();
      orbitManager.orbitCache.clear();

      ServiceLocator.getHoverManager().setHoverId(-1);
      settingsManager.lastSearchResults = [];

      // Parse the incoming TLE content
      const asciiCatalog = CatalogLoader.parseTceContent(tceContent);

      if (asciiCatalog.length === 0) {
        throw new Error('No valid TLE data found in file');
      }

      // Build lookup map: 6-digit SCC → AsciiTleSat
      const incomingMap = new Map<string, AsciiTleSat>();

      for (const entry of asciiCatalog) {
        let scc6: string;

        try {
          scc6 = Tle.convertA5to6Digit(entry.SCC);
        } catch (err) {
          errorManagerInstance.info(`Skipping incoming TLE entry with malformed SCC: ${JSON.stringify(entry.SCC)} — ${(err as Error).message}`);
          continue;
        }

        incomingMap.set(scc6, entry);
      }

      // Snapshot existing satellite metadata and merge with new TLEs
      const catalogManager = ServiceLocator.getCatalogManager();
      const merged: KeepTrackTLEFile[] = [];
      const matchedSccs = new Set<string>();

      for (const obj of catalogManager.objectCache) {
        if (!obj.isSatellite()) {
          continue;
        }
        const sat = obj as Satellite;
        const incoming = incomingMap.get(sat.sccNum);

        if (!incoming) {
          continue; // satellite not in new TLE → remove it
        }

        matchedSccs.add(sat.sccNum);

        // Preserve metadata, update TLE lines
        merged.push({
          tle1: incoming.TLE1,
          tle2: incoming.TLE2,
          name: sat.name,
          altName: sat.altName,
          country: sat.country,
          owner: sat.owner,
          mission: sat.mission,
          purpose: sat.purpose,
          type: sat.type,
          bus: sat.bus,
          configuration: sat.configuration,
          dryMass: sat.dryMass,
          equipment: sat.equipment,
          lifetime: sat.lifetime,
          manufacturer: sat.manufacturer,
          motor: sat.motor,
          payload: sat.payload,
          power: sat.power,
          shape: sat.shape,
          span: sat.span,
          launchDate: sat.launchDate,
          launchMass: sat.launchMass,
          launchSite: sat.launchSite,
          launchPad: sat.launchPad,
          launchVehicle: sat.launchVehicle,
          length: sat.length,
          diameter: sat.diameter,
          rcs: typeof sat.rcs === 'number' ? sat.rcs.toString() : null,
          vmag: sat.vmag ?? null,
          status: sat.status,
          altId: sat.altId,
        });
      }

      // Add incoming satellites not found in the current catalog
      for (const [scc6, entry] of incomingMap) {
        if (matchedSccs.has(scc6)) {
          continue;
        }
        merged.push({
          tle1: entry.TLE1,
          tle2: entry.TLE2,
          name: entry.ON ?? 'Unknown',
          type: entry.OT,
        });
      }

      // Reset rendering subsystems
      const dotsManager = ServiceLocator.getDotsManager();
      const colorSchemeManager = ServiceLocator.getColorSchemeManager();

      dotsManager.resetForCatalogSwap();
      colorSchemeManager.resetForCatalogSwap();

      // Re-parse via the primary pipeline (keepTrackTle path preserves metadata)
      await CatalogLoader.parse({
        keepTrackTle: merged,
      });

      // Re-init GPU buffers with the new catalog size
      dotsManager.initBuffers(colorSchemeManager.colorBuffer!);
      orbitManager.resetForCatalogSwap();

      // Clear stale position/velocity data after parse returns
      dotsManager.positionData = null as unknown as Float32Array;
      dotsManager.velocityData = null as unknown as Float32Array;
      dotsManager.isReady = false;

      settingsManager.cruncherReady = false;

      const eventBus = EventBus.getInstance();
      const onReady = () => {
        eventBus.unregister(EventBusEvent.onCruncherReady, onReady);
        eventBus.emit(EventBusEvent.catalogReloaded);
        hideLoading();
      };

      eventBus.on(EventBusEvent.onCruncherReady, onReady);
    } catch (error) {
      hideLoading();
      throw error;
    }
  }

  /**
   * Reloads the catalog from pre-built KeepTrackTLEFile data (with full metadata).
   * Use this when merging has already been done externally (e.g., against a cached catalog).
   */
  static async reloadCatalogFromData(data: KeepTrackTLEFile[]): Promise<void> {
    const { showLoadingSticky, hideLoading } = await import('../../engine/utils/showLoading');
    const { SelectSatManager } = await import('../../plugins/select-sat-manager/select-sat-manager');
    const { EventBus } = await import('../../engine/events/event-bus');
    const { EventBusEvent } = await import('../../engine/events/event-bus-events');
    const { PluginRegistry } = await import('../../engine/core/plugin-registry');

    showLoadingSticky();

    // Default to wall-clock GP age; callers loading a historic snapshot (e.g. the
    // HistoricCatalogPlugin) re-establish settingsManager.catalogReferenceTime afterward.
    settingsManager.catalogReferenceTime = null;

    try {
      const selectSatManager = PluginRegistry.getPlugin(SelectSatManager);

      if (selectSatManager) {
        selectSatManager.selectSat(-1);
      }

      const orbitManager = ServiceLocator.getOrbitManager();

      orbitManager.clearSelectOrbit(false);
      orbitManager.clearSelectOrbit(true);
      orbitManager.clearHoverOrbit();
      orbitManager.clearInViewOrbit();
      orbitManager.orbitCache.clear();

      ServiceLocator.getHoverManager().setHoverId(-1);
      settingsManager.lastSearchResults = [];

      const dotsManager = ServiceLocator.getDotsManager();
      const colorSchemeManager = ServiceLocator.getColorSchemeManager();

      dotsManager.resetForCatalogSwap();
      colorSchemeManager.resetForCatalogSwap();

      await CatalogLoader.parse({
        keepTrackTle: data,
      });

      dotsManager.initBuffers(colorSchemeManager.colorBuffer!);
      orbitManager.resetForCatalogSwap();

      dotsManager.positionData = null as unknown as Float32Array;
      dotsManager.velocityData = null as unknown as Float32Array;
      dotsManager.isReady = false;

      settingsManager.cruncherReady = false;

      const eventBus = EventBus.getInstance();
      const onReady = () => {
        eventBus.unregister(EventBusEvent.onCruncherReady, onReady);
        eventBus.emit(EventBusEvent.catalogReloaded);
        hideLoading();
      };

      eventBus.on(EventBusEvent.onCruncherReady, onReady);
    } catch (error) {
      hideLoading();
      throw error;
    }
  }

  /**
   * Adds non-satellite objects to the catalog manager instance.
   * @param catalogManagerInstance - The catalog manager instance to add the objects to.
   * @param tempObjData - An array of temporary satellite data.
   */
  private static addNonSatelliteObjects_(catalogManagerInstance: CatalogManager, tempObjData: BaseObject[]) {
    catalogManagerInstance.orbitalSats = tempObjData.length + settingsManager.maxAnalystSats;
    const dotsManagerInstance = ServiceLocator.getDotsManager();

    dotsManagerInstance.starIndex1 = catalogManagerInstance.starIndex1 + catalogManagerInstance.orbitalSats;
    dotsManagerInstance.starIndex2 = catalogManagerInstance.starIndex2 + catalogManagerInstance.orbitalSats;

    let i = 0;

    for (const staticSat of catalogManagerInstance.staticSet) {
      staticSat.id = tempObjData.length;
      catalogManagerInstance.staticSet[i].id = tempObjData.length;
      i++;

      if (staticSat.maxRng) {
        const sensor = new DetailedSensor({
          id: tempObjData.length,
          ...staticSat,
        });

        tempObjData.push(sensor);
      } else if (staticSat instanceof LaunchSite) {
        tempObjData.push(staticSat);
      } else if (staticSat.type === SpaceObjectType.STAR) {
        const star = new Star({
          id: tempObjData.length,
          ...staticSat,
        });

        tempObjData.push(star);
      } else {
        const landObj = new LandObject({
          id: tempObjData.length,
          ...staticSat,
        });

        tempObjData.push(landObj);
      }
    }
    for (const analSat of catalogManagerInstance.analSatSet) {
      analSat.id = tempObjData.length;
      tempObjData.push(analSat);
    }

    catalogManagerInstance.numSatellites = tempObjData.length;

    for (let i = 0; i < settingsManager.maxOemSatellites; i++) {
      tempObjData.push(new Planet({
        id: tempObjData.length,
        name: `OEM Satellite ${i + 1}`,
      }));
    }

    dotsManagerInstance.planetDot1 = tempObjData.length;

    const planetList = ServiceLocator.getScene().planets;
    const dwarfPlanetList = ServiceLocator.getScene().dwarfPlanets;

    if (planetList) {
      Object.keys(planetList).forEach((planet) => {
        const planetDot = new Planet({
          id: tempObjData.length,
          name: planet,
          type: planetList[planet]?.type ?? SpaceObjectType.UNKNOWN,
        });

        planetDot.color = planetList[planet]?.color ?? [1.0, 1.0, 1.0, 1.0] as rgbaArray;
        if (planetList[planet]) {
          (planetList[planet] as CelestialBody).planetObject = planetDot;
        }

        tempObjData.push(planetDot);
      });

      // Add the Moon if Earth is present
      const earthDot = new Planet({
        id: tempObjData.length,
        name: SolarBody.Earth,
        type: SpaceObjectType.TERRESTRIAL_PLANET,
      });

      earthDot.color = (planetList[SolarBody.Earth]?.color ?? [0.0, 0.5, 1.0, 1.0]) as rgbaArray;
      ServiceLocator.getScene().earth.planetObject = earthDot;
      tempObjData.push(earthDot);

      // const moonDot = new Planet({
      //   id: tempObjData.length,
      //   name: SolarBody.Moon,
      // });

      // moonDot.color = (planetList[SolarBody.Moon]?.color ?? [1.0, 1.0, 1.0, 1.0]);
      // ServiceLocator.getScene().planets.Moon.planetObject = moonDot;

      // tempObjData.push(moonDot);
    }

    if (dwarfPlanetList) {
      Object.keys(dwarfPlanetList).forEach((dwarfPlanet) => {
        const dwarfPlanetDot = new Planet({
          id: tempObjData.length,
          name: dwarfPlanet,
          type: dwarfPlanetList[dwarfPlanet]?.type ?? SpaceObjectType.UNKNOWN,
        });

        dwarfPlanetDot.color = dwarfPlanetList[dwarfPlanet]?.color ?? [1.0, 1.0, 1.0, 1.0] as rgbaArray;
        if (dwarfPlanetList[dwarfPlanet]) {
          (dwarfPlanetList[dwarfPlanet] as CelestialBody).planetObject = dwarfPlanetDot;
        }

        tempObjData.push(dwarfPlanetDot);
      });
    }

    const deepSpaceSatellites = ServiceLocator.getScene().deepSpaceSatellites;

    if (deepSpaceSatellites) {
      Object.keys(deepSpaceSatellites).forEach((satKey) => {
        const sat = deepSpaceSatellites[satKey];
        const satDot = new Planet({
          id: tempObjData.length,
          name: satKey,
          type: sat?.type ?? SpaceObjectType.NOTIONAL,
        });

        satDot.color = sat?.color ?? [1.0, 1.0, 1.0, 1.0] as rgbaArray;
        if (sat) {
          sat.planetObject = satDot;
        }

        tempObjData.push(satDot);
      });
    }

    dotsManagerInstance.planetDot2 = tempObjData.length;

    for (const missileObj of catalogManagerInstance.missileSet) {
      tempObjData.push(missileObj);
    }

    catalogManagerInstance.missileSats = tempObjData.length; // This is the end of the missiles index

    // FOV Markers must go last!!!

    for (const fieldOfViewMarker of catalogManagerInstance.fieldOfViewSet) {
      fieldOfViewMarker.id = tempObjData.length;
      const marker = new Marker(fieldOfViewMarker);

      tempObjData.push(marker);
    }
  }

  /**
   * Removes any extra lines and \r characters from the given string array.
   * @param content - The string array to be cleaned.
   */
  private static cleanAsciiCatalogFile_(content: string[]) {
    // Check for extra line at the end of the file
    if (content[content.length - 1] === '') {
      content.pop();
    }

    // Remove any \r characters
    for (let i = 0; i < content.length; i++) {
      content[i] = content[i].replace('\r', '');
    }
  }

  /**
   * Fix missing zeros in the SCC number.
   *
   * Only safe for legacy 5-digit numeric sccNums: the source is TLE columns 3-7,
   * which physically hold only 5 chars. Extended (7+ digit) IDs and the alpha-5
   * forms should come from CSV/OMM/JSON ingestion paths that carry the canonical
   * sccNum in a dedicated column — never through this helper.
   *
   * TODO: This should be done by the catalog-manager itself
   */
  private static addSccNum_(resp: KeepTrackTLEFile[], i: number) {
    resp[i].sccNum = StringPad.pad0(resp[i].tle1.substring(2, 7).trim(), 5);
    // Also update TLE1
    resp[i].tle1 = <TleLine1>(resp[i].tle1.substring(0, 2) + resp[i].sccNum + resp[i].tle1.substring(7));
    // Also update TLE2
    resp[i].tle2 = <TleLine2>(resp[i].tle2.substring(0, 2) + resp[i].sccNum + resp[i].tle2.substring(7));
  }

  /**
   * Returns an object containing promises for extraSats, asciiCatalog, jsCatalog, and externalCatalog.
   * @param settingsManager - The settings manager object.
   * @returns An object containing promises for extraSats, asciiCatalog, jsCatalog, and externalCatalog.
   */
  private static getAdditionalCatalogs_(settingsManager: SettingsManager) {
    let extraSats: Promise<ExtraSat[]> | null = null;
    let externalCatalog: Promise<AsciiTleSat[] | null> | null = null;
    let asciiCatalog: Promise<AsciiTleSat[]> | null = null;
    let jsCatalog: Promise<JsSat[]> | null = null;

    if (settingsManager.offlineMode && !settingsManager.isDisableExtraCatalog) {
      extraSats = CatalogLoader.getExtraCatalog_(settingsManager);
    }
    if (!settingsManager.dataSources.externalTLEs && !settingsManager.isDisableAsciiCatalog) {
      asciiCatalog = CatalogLoader.getAsciiCatalog_(settingsManager);
    }
    if (settingsManager.isEnableJscCatalog) {
      jsCatalog = CatalogLoader.getJscCatalog_(settingsManager);
    }
    if (settingsManager.dataSources.externalTLEs) {
      externalCatalog = CatalogLoader.getExternalCatalog_(settingsManager);
    }

    return { extraSats, asciiCatalog, jsCatalog, externalCatalog };
  }

  /**
   * Retrieves the ASCII catalog from the TLE.txt file in the install directory.
   * @param settingsManager - The settings manager instance.
   * @returns An array of AsciiTleSat objects representing the catalog.
   */
  private static async getAsciiCatalog_(settingsManager: SettingsManager) {
    const asciiCatalog: AsciiTleSat[] = [];
    const resp = await fetch(`${settingsManager.installDirectory}tle/TLE.txt`);

    if (resp.ok) {
      const asciiCatalogFile = await resp.text();
      const content = asciiCatalogFile.split('\n');

      for (let i = 0; i < content.length; i += 2) {
        asciiCatalog.push({
          SCC: StringPad.pad0(content[i].substring(2, 7).trim(), 5),
          TLE1: <TleLine1>content[i],
          TLE2: <TleLine2>content[i + 1],
        });
      }

      // Sort asciiCatalog by SCC
      CatalogLoader.sortByScc_(asciiCatalog);
    }

    return asciiCatalog;
  }

  /**
   * Asynchronously retrieves an external catalog of satellite TLEs from a URL specified in the settingsManager.
   * @param {SettingsManager} settingsManager - The settings manager containing the URL for the external TLEs.
   * @returns {Promise<AsciiTleSat[]>} - A promise that resolves to an array of AsciiTleSat objects representing the satellite TLEs.
   */
  // eslint-disable-next-line require-await
  private static async getExternalCatalog_(settingsManager: SettingsManager): Promise<AsciiTleSat[] | null> {
    return fetch(settingsManager.dataSources.externalTLEs)
      .then((resp) => {
        if (resp.ok) {
          const externalCatalog: AsciiTleSat[] = [];

          return resp.text().then((data) => {
            const content = data.split('\n');
            // Check if last line is empty and remove it if so

            CatalogLoader.cleanAsciiCatalogFile_(content);

            if (CatalogLoader.isCsvGpHeader_(content[0])) {
              CatalogLoader.parseAsciiCsv_(data, externalCatalog);
            } else if (content[0].startsWith('1 ')) {
              CatalogLoader.parseAsciiTLE_(content, externalCatalog);
            } else if (content[1].startsWith('1 ')) {
              CatalogLoader.parseAscii3LE_(content, externalCatalog);
            } else {
              errorManagerInstance.warn('External TLEs are not in the correct format');
            }

            CatalogLoader.sortByScc_(externalCatalog);

            return externalCatalog;
          });
        }
        errorManagerInstance.warn(`Error loading external TLEs from ${settingsManager.dataSources.externalTLEs}`);
        errorManagerInstance.info('Reverting to internal TLEs');
        settingsManager.dataSources.externalTLEs = '';

        return [];
      })
      .catch(() => {
        errorManagerInstance.warn(`Error loading external TLEs from ${settingsManager.dataSources.externalTLEs}`);
        errorManagerInstance.info('Reverting to internal TLEs');
        settingsManager.dataSources.externalTLEs = '';

        return null;
      });
  }

  /**
   * Retrieves the extra catalog from the specified install directory.
   * @param settingsManager - The settings manager instance.
   * @returns A promise that resolves to an array of ExtraSat objects.
   */
  private static async getExtraCatalog_(settingsManager: SettingsManager): Promise<ExtraSat[]> {
    return (await fetch(`${settingsManager.installDirectory}tle/extra.json`)).json().catch(() => {
      errorManagerInstance.warn('Error loading extra.json');
    });
  }

  /**
   * Retrieves the JSC catalog by fetching the `vimpel.json` file from the specified data source.
   * If the primary source fails, it attempts to load a fallback `vimpel.json` file from the offline directory.
   * Logs warnings if both the primary and/or fallback sources fail.
   *
   * @param settingsManager - An instance of `SettingsManager` containing configuration details,
   *                          including the data source URL and installation directory.
   * @returns A promise that resolves to an array of `JsSat` objects representing the catalog.
   *          If both the primary and fallback sources fail, an empty array is returned.
   * @throws An error if the fallback `vimpel.json` cannot be loaded.
   */
  private static async getJscCatalog_(settingsManager: SettingsManager): Promise<JsSat[]> {
    const vimpelJson = await apiFetch(settingsManager.dataSources.vimpel)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        if (response.status === 401) {
          return [];
        }
        throw new Error('Error loading vimpel.json');
      })
      .catch(async () => {
        errorManagerInstance.warn('Failed to download latest vimpel.json ! Using offline vimpel.json which may be out of date!');

        const vimpelJson = await fetch(`${settingsManager.installDirectory}tle/vimpel.json`)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Error loading fallback vimpel.json');
          }).catch(() => {
            errorManagerInstance.warn('Error loading fallback vimpel.json');

            return [];
          }) as JsSat[];

        return vimpelJson;
      }) as JsSat[];

    return vimpelJson;
  }

  /**
   * Consolidate the satData into a string to send to satCruncher
   *
   * There is a lot of extra data that we don't need to send to satCruncher.
   */
  private static getSatDataString_(objData: BaseObject[]) {
    return JSON.stringify(
      objData.map((obj) => {
        let data: CruncherSat = {};

        // Order matters here
        if (obj.isSatellite()) {
          data = {
            tle1: (obj as Satellite).tle1,
            tle2: (obj as Satellite).tle2,
            active: obj.active,
          };
        } else if (obj.isMissile()) {
          data = {
            latList: (obj as MissileObject).latList,
            lonList: (obj as MissileObject).lonList,
            altList: (obj as MissileObject).altList,
          };
        } else if (obj.isStar()) {
          data.ra = (obj as Star).ra;
          data.dec = (obj as Star).dec;
        } else if (obj.isMarker()) {
          data = {
            isMarker: true,
          };
        } else if ((obj as DetailedSensor | LandObject).isStatic()) {
          data = {
            lat: (obj as DetailedSensor | LandObject).lat,
            lon: (obj as DetailedSensor | LandObject).lon,
            alt: (obj as DetailedSensor | LandObject).alt,
          };
        } else {
          throw new Error('Unknown object type');
        }

        return data;
      }),
    );
  }

  private static makeDebris(notionalDebris: Satellite, meanAnom: number, notionalSatNum: number, tempSatData: BaseObject[]) {
    const debris = { ...notionalDebris };

    debris.id = tempSatData.length;
    debris.sccNum = notionalSatNum.toString();

    if (notionalSatNum < 1300000) {
      /*
       * ESA estimates 1300000 objects larger than 1cm
       * Random number between 0.01 and 0.1
       */
      debris.rcs = 0.01 + Math.random() * 0.09;
    } else {
      // Random number between 0.001 and 0.01
      debris.name = `${notionalDebris.name} (1mm Notional)`; // 1mm
      debris.rcs = 0.001 + Math.random() * 0.009;
    }

    notionalSatNum++;

    meanAnom = parseFloat(debris.tle2.substr(43, 51)) + meanAnom;
    if (meanAnom > 360) {
      meanAnom -= 360;
    }
    if (meanAnom < 0) {
      meanAnom += 360;
    }

    debris.tle2 =
      debris.tle2.substr(0, 17) + // Columns 1-18
      StringPad.pad0((Math.random() * 360).toFixed(4), 8) + // New RAAN
      debris.tle2.substr(25, 18) + // Columns 25-44
      StringPad.pad0(meanAnom.toFixed(4), 8) + // New Mean Anomaly
      debris.tle2.substr(51) as TleLine2; // Columns 51-69

    const debrisObj = new Satellite(debris);

    tempSatData.push(debrisObj);
  }

  private static parseAscii3LE_(content: string[], externalCatalog: AsciiTleSat[]) {
    for (let i = 0; i < content.length; i += 3) {
      externalCatalog.push({
        SCC: StringPad.pad0(content[i + 1].substring(2, 7).trim(), 5),
        ON: content[i].trim(),
        TLE1: <TleLine1>content[i + 1],
        TLE2: <TleLine2>content[i + 2],
      });
    }
  }

  private static parseAsciiTLE_(content: string[], externalCatalog: AsciiTleSat[]) {
    for (let i = 0; i < content.length; i += 2) {
      externalCatalog.push({
        SCC: StringPad.pad0(content[i].substring(2, 7).trim(), 5),
        TLE1: <TleLine1>content[i],
        TLE2: <TleLine2>content[i + 1],
      });
    }
  }

  private static isCsvGpHeader_(firstLine: string | undefined): boolean {
    if (!firstLine || !firstLine.includes(',')) {
      return false;
    }
    const upper = firstLine.toUpperCase();

    return upper.includes('NORAD_CAT_ID') || upper.includes('OBJECT_NAME') || upper.includes('MEAN_MOTION');
  }

  private static parseAsciiCsv_(rawCsv: string, externalCatalog: AsciiTleSat[]) {
    const result = Papa.parse<OmmDataFormat>(rawCsv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      const firstError = result.errors[0];
      const rowInfo = typeof firstError.row === 'number' ? ` at row ${firstError.row}` : '';

      errorManagerInstance.info(
        `External CSV parse reported ${result.errors.length} error(s); first error${rowInfo}: ${firstError.code} - ${firstError.message}`,
      );
    }

    for (const row of result.data) {
      if (!row.NORAD_CAT_ID || !row.OBJECT_NAME) {
        continue;
      }
      try {
        // ootk handles extended (7+ digit) IDs natively: the full ID stays on
        // Satellite.sccNum, and the TLE string carries the last-5-digit tail.
        const sat = Satellite.fromOmm(row);

        externalCatalog.push({
          SCC: sat.sccNum,
          ON: row.OBJECT_NAME,
          TLE1: sat.tle1,
          TLE2: sat.tle2,
        });
      } catch (err) {
        errorManagerInstance.info(`Skipping external CSV row for ${row.OBJECT_NAME ?? row.NORAD_CAT_ID}: ${(err as Error).message}`);
      }
    }
  }

  private static parseIntlDes_(TLE1: string) {
    let year = TLE1.substring(9, 17).trim().substring(0, 2); // clean up intl des for display

    if (year === '') {
      errorManagerInstance.debug(`intlDes is empty for ${TLE1}`);

      return 'None';
    }
    if (isNaN(parseInt(year))) {
      // eslint-disable-next-line no-debugger
      debugger;
    }
    const prefix = parseInt(year) > 50 ? '19' : '20';

    year = prefix + year;
    const rest = TLE1.substring(9, 17).trim().substring(2);


    return `${year}-${rest}`;
  }

  private static processAllSats_(resp: KeepTrackTLEFile[], i: number, catalogManagerInstance: CatalogManager, tempObjData: BaseObject[], notionalSatNum: number): void {
    if (typeof resp[i]?.name !== 'string') {
      errorManagerInstance.debug(`Catalog entry ${i} (SCC ${resp[i]?.sccNum ?? 'unknown'}) is missing 'name'; using placeholder`);
      resp[i].name = `Unknown ${resp[i]?.sccNum ?? i}`;
    }
    if (settingsManager.isStarlinkOnly && resp[i].name.indexOf('STARLINK') === -1) {
      return;
    }

    if (CatalogLoader.shouldSkipRegime_(resp[i].tle2)) {
      return;
    }

    // If pulling from celestrak.org directly or TLE source is the celestrak endpoint of our API, assume Celestrak source
    if (settingsManager.dataSources.externalTLEs.includes('celestrak.org') || settingsManager.dataSources.tle.includes('sats/celestrak')) {
      resp[i].source = CatalogSource.CELESTRAK;
    } else if (!resp[i].source) {
      resp[i].source = CatalogSource.UNKNOWN;
    }

    const intlDes = CatalogLoader.parseIntlDes_(resp[i].tle1);

    resp[i].intlDes = intlDes;
    resp[i].active = true;
    if (!settingsManager.isDebrisOnly || (settingsManager.isDebrisOnly && (resp[i].type === SpaceObjectType.ROCKET_BODY || resp[i].type === SpaceObjectType.DEBRIS))) {
      /*
       * Embed a confidence level into the 64th character of the TLE1
       * All 9s is the default value
       * TODO: Generate a better confidence level system
       */
      if (resp[i].source === CatalogSource.CELESTRAK) {
        resp[i].tle1 = `${resp[i].tle1.substring(0, 64)}9${resp[i].tle1.substring(65)}` as TleLine1;
      } else {
        resp[i].tle1 = `${resp[i].tle1.substring(0, 64)}5${resp[i].tle1.substring(65)}` as TleLine1;
      }

      let rcs: number | null = null;

      // TODO: Celestrak does not include these rough estimates, so we need to get them from somewhere else
      rcs = resp[i].rcs === 'LARGE' ? 5 : rcs;
      rcs = resp[i].rcs === 'MEDIUM' ? 0.5 : rcs;
      rcs = resp[i].rcs === 'SMALL' ? 0.05 : rcs;
      rcs = resp[i].rcs && !isNaN(parseFloat(resp[i].rcs)) ? parseFloat(resp[i].rcs) : rcs;

      // Never fail just because of one bad satellite
      let isAddedToCatalog = false;

      try {
        const satellite = new Satellite({
          ...resp[i],
          id: tempObjData.length,
          tle1: resp[i].tle1,
          tle2: resp[i].tle2,
          rcs,
        });

        tempObjData.push(satellite);
        isAddedToCatalog = true;
      } catch (e) {
        errorManagerInstance.log(e);
      }

      if (isAddedToCatalog) {
        // Canonicalize so the keepTrack-bundled TLE catalog and external
        // CelesTrak updates share a single sccIndex entry per satellite.
        const key = CatalogLoader.canonicalSccKey(resp[i].sccNum) ?? resp[i].sccNum;

        catalogManagerInstance.sccIndex[key] = tempObjData.length - 1;
        catalogManagerInstance.cosparIndex[`${resp[i].intlDes}`] = tempObjData.length - 1;
      }
    }

    if (settingsManager.isNotionalDebris && resp[i].type === SpaceObjectType.DEBRIS) {
      const notionalDebris = new Satellite({
        id: 0,
        name: `${resp[i].name} (1cm Notional)`,
        tle1: resp[i].tle1,
        tle2: resp[i].tle2,
        sccNum: '',
        type: SpaceObjectType.NOTIONAL,
        source: 'Notional',
        active: true,
      });

      for (let i = 0; i < 8; i++) {
        if (tempObjData.length > settingsManager.maxNotionalDebris) {
          break;
        }
        CatalogLoader.makeDebris(notionalDebris, 15 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -15 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 30 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -30 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 45 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -45 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 60 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -60 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 75 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -75 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 90 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -90 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 105 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -105 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 120 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -120 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 135 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -135 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 150 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -150 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 165 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -165 - Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, 180 + Math.random() * 15, notionalSatNum, tempObjData);
        CatalogLoader.makeDebris(notionalDebris, -180 - Math.random() * 15, notionalSatNum, tempObjData);
      }
    }
  }

  private static processAsciiCatalogKnown_(catalogManagerInstance: CatalogManager, element: AsciiTleSat, tempSatData: Satellite[]) {
    // sccIndex is keyed by the canonical 6-digit numeric form. element.SCC may
    // be alpha-5 ("T0001") — canonicalize before the lookup so an external
    // update for an alpha-5 satellite still finds the existing slot instead
    // of silently inserting a duplicate via processAsciiCatalogUnknown_.
    const canonicalKey = CatalogLoader.canonicalSccKey(element.SCC);

    if (canonicalKey === null) {
      // Malformed SCC — let the unknown-path handle the error reporting.
      CatalogLoader.processAsciiCatalogUnknown_(element, tempSatData, catalogManagerInstance);

      return;
    }

    const i = catalogManagerInstance.sccIndex[canonicalKey];

    if (typeof i === 'undefined' || !tempSatData[i]) {
      CatalogLoader.processAsciiCatalogUnknown_(element, tempSatData, catalogManagerInstance);

      return;
    }

    tempSatData[i].tle1 = element.TLE1;
    tempSatData[i].tle2 = element.TLE2;
    tempSatData[i].name = element.ON || tempSatData[i].name || 'Unknown';
    tempSatData[i].source = settingsManager.dataSources.externalTLEs ? settingsManager.dataSources.externalTLEs.split('/')[2] : CatalogSource.TLE_TXT;
    if (settingsManager.dataSources.externalTLEs === 'https://storage.keeptrack.space/data/celestrak.txt') {
      tempSatData[i].source = CatalogSource.CELESTRAK;
    }
    tempSatData[i].altId = 'EXTERNAL_SAT'; // TODO: This is a hack to make sure the satellite is not removed by the filter

    try {
      const satellite = new Satellite(tempSatData[i]);

      tempSatData[i] = satellite;
    } catch {
      errorManagerInstance.warn(`Failed to process satellite: ${element.ON} (${element.SCC})`);
    }
  }

  private static processAsciiCatalogUnknown_(element: AsciiTleSat, tempSatData: BaseObject[], catalogManagerInstance: CatalogManager) {
    if (CatalogLoader.shouldSkipRegime_(element.TLE2)) {
      return;
    }

    if (typeof element.ON === 'undefined') {
      element.ON = 'Unknown';
    }
    if (typeof element.OT === 'undefined') {
      element.OT = SpaceObjectType.UNKNOWN;
    }
    const intlDes = this.parseIntlDes_(element.TLE1);
    // sccNum here is the display-canonical numeric form (6-digit for alpha-5
    // inputs, passthrough otherwise). The Satellite class itself enforces
    // this invariant inside assignAlpha5Forms_, but pre-computing the
    // canonical key here lets us dedup before constructing a Satellite.
    const sccNum = CatalogLoader.canonicalSccKey(element.SCC);

    if (sccNum === null) {
      errorManagerInstance.info(`Skipping satellite with malformed SCC: ${element.ON} (${JSON.stringify(element.SCC)})`);

      return;
    }
    // If the canonical key is already claimed (e.g. by an earlier load path
    // that wrote the same satellite under either its alpha-5 or numeric form),
    // route through Known_ to update in place instead of orphaning the prior slot.
    if (typeof catalogManagerInstance.sccIndex[sccNum] !== 'undefined' &&
        tempSatData[catalogManagerInstance.sccIndex[sccNum]]) {
      CatalogLoader.processAsciiCatalogKnown_(catalogManagerInstance, element, tempSatData as Satellite[]);

      return;
    }
    const asciiSatInfo = {
      static: false,
      missile: false,
      active: true,
      // Analyst-slot detection is by the legacy 90000-99999 numeric range.
      // sccNum is already the canonical numeric form so parseInt works for
      // alpha-5 inputs too (alpha-5 sats that land in the analyst range get
      // labeled accordingly). Extended (7+ digit) IDs parse to large numbers
      // and fall through to element.ON.
      name: parseInt(sccNum) >= 90000 && parseInt(sccNum) <= 99999 ? `Analyst ${sccNum}` : element.ON,
      type: element.OT,
      country: 'Unknown',
      rocket: 'Unknown',
      site: 'Unknown',
      sccNum,
      tle1: element.TLE1,
      tle2: element.TLE2,
      source: settingsManager.dataSources.externalTLEs ? settingsManager.dataSources.externalTLEs.split('/')[2] : CatalogSource.TLE_TXT,
      intlDes,
      typ: 'sat', // TODO: What is this?
      id: tempSatData.length,
    };

    if (settingsManager.dataSources.externalTLEs === 'https://storage.keeptrack.space/data/celestrak.txt') {
      asciiSatInfo.source = CatalogSource.CELESTRAK;
    }

    catalogManagerInstance.sccIndex[sccNum] = tempSatData.length;
    catalogManagerInstance.cosparIndex[`${intlDes}`] = tempSatData.length;

    try {
      const satellite = new Satellite({
        ...asciiSatInfo,
        tle1: asciiSatInfo.tle1,
        tle2: asciiSatInfo.tle2,
      });

      satellite.id = tempSatData.length;
      satellite.altId = 'EXTERNAL_SAT'; // TODO: This is a hack to make sure the satellite is not removed by the filter

      tempSatData.push(satellite);
    } catch {
      errorManagerInstance.warn(`Failed to process satellite: ${element.ON} (${element.SCC})`);
    }
  }

  private static processAsciiCatalog_(asciiCatalog: AsciiTleSat[], catalogManagerInstance: CatalogManager, tempSatData: Satellite[]) {
    if (settingsManager.dataSources.externalTLEs) {
      if (settingsManager.dataSources.externalTLEs !== 'https://storage.keeptrack.space/data/celestrak.txt') {
        errorManagerInstance.log(`Processing ${settingsManager.dataSources.externalTLEs}`);
      }
    } else {
      errorManagerInstance.log('Processing ASCII Catalog');
    }

    // If asciiCatalog catalogue
    for (const element of asciiCatalog) {
      if (!element.TLE1 || !element.TLE2) {
        continue;
      } // Don't Process Bad Satellite Information

      // processAsciiCatalogKnown_ canonicalizes element.SCC before the index
      // lookup and falls through to Unknown_ if no match — so we can route
      // everything through Known_. The previous "raw element.SCC" dispatch
      // would mis-route alpha-5 updates whose canonical key was already
      // present, silently inserting duplicates.
      CatalogLoader.processAsciiCatalogKnown_(catalogManagerInstance, element, tempSatData);
    }

    if (settingsManager.dataSources.externalTLEs) {
      if (settingsManager.dataSources.externalTLEsOnly) {
        tempSatData = tempSatData.filter((sat) => {
          if (sat.altId === 'EXTERNAL_SAT') {
            sat.altId = ''; // Reset the altId

            return true;
          }

          return false;
        });
      }
      catalogManagerInstance.sccIndex = <{ [key: string]: number }>{};
      catalogManagerInstance.cosparIndex = <{ [key: string]: number }>{};

      for (let idx = 0; idx < tempSatData.length; idx++) {
        tempSatData[idx].id = idx;
        const key = CatalogLoader.canonicalSccKey(tempSatData[idx].sccNum) ?? tempSatData[idx].sccNum;

        catalogManagerInstance.sccIndex[key] = idx;
        catalogManagerInstance.cosparIndex[`${tempSatData[idx].intlDes}`] = idx;
      }
    }

    return tempSatData;
  }

  private static processExtraSats_(extraSats: ExtraSat[], catalogManagerInstance: CatalogManager, tempSatData: Satellite[]) {
    // If extra catalogue
    for (const element of extraSats) {
      if (!element.SCC || !element.TLE1 || !element.TLE2) {
        continue;
      } // Don't Process Bad Satellite Information
      const canonicalKey = CatalogLoader.canonicalSccKey(element.SCC) ?? element.SCC.toString();

      if (typeof catalogManagerInstance.sccIndex[canonicalKey] !== 'undefined') {
        const i = catalogManagerInstance.sccIndex[canonicalKey];

        if (typeof tempSatData[i] === 'undefined') {
          continue;
        }
        tempSatData[i].tle1 = element.TLE1 as TleLine1;
        tempSatData[i].tle2 = element.TLE2 as TleLine2;
        tempSatData[i].source = CatalogSource.EXTRA_JSON;
      } else {
        if (CatalogLoader.shouldSkipRegime_(element.TLE2)) {
          continue;
        }

        const intlDes = CatalogLoader.parseIntlDes_(element.TLE1);
        const extrasSatInfo = {
          static: false,
          missile: false,
          active: true,
          name: element.ON ?? 'Unknown',
          type: element.OT ?? SpaceObjectType.UNKNOWN,
          country: 'Unknown',
          rocket: 'Unknown',
          site: 'Unknown',
          sccNum: element.SCC.toString(),
          tle1: element.TLE1 as TleLine1,
          tle2: element.TLE2 as TleLine2,
          source: 'extra.json',
          intlDes,
          typ: 'sat', // TODO: What is this?
          id: tempSatData.length,
          vmag: element.vmag,
        };

        catalogManagerInstance.sccIndex[canonicalKey] = tempSatData.length;
        catalogManagerInstance.cosparIndex[`${intlDes}`] = tempSatData.length;

        const satellite = new Satellite({
          ...extrasSatInfo,
          tle1: extrasSatInfo.tle1,
          tle2: extrasSatInfo.tle2,
        });

        satellite.id = tempSatData.length;

        tempSatData.push(satellite);
      }
    }
  }

  private static processJsCatalog_(jsCatalog: JsSat[], catalogManagerInstance: CatalogManager, tempObjData: BaseObject[]) {
    errorManagerInstance.debug(`Processing ${settingsManager.isEnableJscCatalog ? 'JSC Vimpel' : 'Extended'} Catalog`);
    // If jsCatalog catalogue
    for (const element of jsCatalog) {
      if (!element.TLE1 || !element.TLE2) {
        continue;
      } // Don't Process Bad Satellite Information
      let scc: string;

      try {
        scc = Tle.convertA5to6Digit(element.TLE1.substring(2, 7).trim());
      } catch (err) {
        errorManagerInstance.info(`Skipping jsCatalog entry with malformed SCC in TLE1: ${JSON.stringify(element.TLE1.substring(2, 7))} — ${(err as Error).message}`);
        continue;
      }

      if (typeof catalogManagerInstance.sccIndex[`${scc}`] !== 'undefined') {
        /*
         * console.warn('Duplicate Satellite Found in jsCatalog');
         * NOTE: We don't trust the jsCatalog, so we don't update the TLEs
         * i = catalogManagerInstance.sccIndex[`${jsCatalog[s].SCC}`];
         * tempSatData[i].TLE1 = jsCatalog[s].TLE1;
         * tempSatData[i].TLE2 = jsCatalog[s].TLE2;
         */
      } else {
        // Check if the 8th character is 'V' for Vimpel
        const isVimpel = element.TLE1[7] === 'V';

        if (isVimpel) {
          if (CatalogLoader.shouldSkipRegime_(element.TLE2)) {
            continue;
          }

          const altId = element.TLE1.substring(9, 17).trim();
          const jsSatInfo = {
            static: false,
            missile: false,
            active: true,
            name: `JSC Vimpel ${altId}`,
            type: SpaceObjectType.DEBRIS,
            country: 'Unknown',
            rocket: 'Unknown',
            site: 'Unknown',
            sccNum: '',
            TLE1: element.TLE1,
            TLE2: element.TLE2,
            source: CatalogSource.VIMPEL,
            altId,
            intlDes: '',
            id: tempObjData.length,
          };

          try {
            const satellite = new Satellite({
              tle1: jsSatInfo.TLE1 as TleLine1,
              tle2: jsSatInfo.TLE2 as TleLine2,
              ...jsSatInfo,
            });

            satellite.id = tempObjData.length;

            tempObjData.push(satellite);
          } catch (err) {
            errorManagerInstance.info(`Skipping jsCatalog Vimpel entry (altId ${altId}): ${(err as Error).message}`);
          }
        } else {
          errorManagerInstance.debug('Skipping non-Vimpel satellite in JSC Vimpel catalog');
        }
      }
    }
  }

  private static readonly EARTH_GM_ = 398600.4415;
  private static readonly TAU_ = 2 * Math.PI;
  private static readonly SECONDS_PER_DAY_ = 86400;
  private static readonly EARTH_RADIUS_ = 6371;

  /**
   * Classify a satellite's orbital regime from raw TLE line 2 string.
   * Uses the same apogee/eccentricity thresholds as color-scheme-manager.ts.
   */
  private static getRegimeFromTle_(tle2: string): string {
    const n = parseFloat(tle2.substring(52, 63)); // mean motion (rev/day)
    const ecc = parseFloat(`0.${tle2.substring(26, 33).trim()}`); // eccentricity (implied decimal)

    if (isNaN(n) || isNaN(ecc) || n <= 0) {
      return 'unknown';
    }

    const sma = CatalogLoader.EARTH_GM_ ** (1 / 3) / ((CatalogLoader.TAU_ * n / CatalogLoader.SECONDS_PER_DAY_) ** (2 / 3));
    const apogee = sma * (1 + ecc) - CatalogLoader.EARTH_RADIUS_;

    if (apogee < 400) {
      return 'vleo';
    }
    if (apogee < 6000) {
      return 'leo';
    }
    if (ecc >= 0.1 && apogee <= 39786) {
      return 'heo';
    }
    if (ecc < 0.1 && apogee >= 6000 && apogee < 34786) {
      return 'meo';
    }
    if (ecc < 0.1 && apogee >= 34786 && apogee < 36786) {
      return 'geo';
    }
    if ((ecc < 0.1 && apogee > 36786) || apogee > 39786) {
      return 'xgeo';
    }

    return 'unknown';
  }

  /**
   * Returns true if the satellite should be skipped based on the regime filter.
   * When regimeFilter is empty, no satellites are skipped.
   */
  private static shouldSkipRegime_(tle2: string): boolean {
    if (settingsManager.core.regimeFilter.length === 0) {
      return false;
    }

    const regime = CatalogLoader.getRegimeFromTle_(tle2);

    return !settingsManager.core.regimeFilter.includes(regime);
  }

  private static sortByScc_(catalog: AsciiTleSat[] | ExtraSat[]) {
    catalog.sort((a: { SCC: string }, b: { SCC: string }) => {
      if (a.SCC < b.SCC) {
        return -1;
      }
      if (a.SCC > b.SCC) {
        return 1;
      }

      return 0;
    });
  }

  /**
   * Returns the canonical sccIndex key for a satellite identifier, or null
   * if the input is malformed. All sccIndex reads and writes inside the
   * loader must go through this helper so alpha-5 ("T0001") and its 6-digit
   * numeric equivalent ("270001") collapse to the same key — otherwise
   * different ingestion paths would assign the same satellite to different
   * keys and silently insert duplicates.
   *
   * Canonicalization rules:
   * 1. Alpha-5 → its 6-digit numeric form via Tle.convertA5to6Digit.
   * 2. Numerics → leading zeros stripped, so "00005" and "5" share a key.
   *    Matches Satellite.sccNum's display-canonical form so plugins can
   *    use either sat.sccNum or canonicalSccKey(...) interchangeably.
   */
  static canonicalSccKey(scc: string | number): string | null {
    const raw = scc.toString();

    try {
      return Tle.convertA5to6Digit(raw).replace(/^0+(?=\d)/u, '');
    } catch {
      // Tle.convertA5to6Digit throws for IDs beyond TLE alpha-5 capacity —
      // specifically a 6-digit numeric value > 339999. These are still valid
      // "extended" catalog numbers: Satellite.assignAlpha5Forms_ catches the
      // same throw and keeps them verbatim on sat.sccNum. Return the stripped
      // numeric form here too so this key stays interchangeable with
      // sat.sccNum (as the doc promises). Only genuinely malformed
      // (non-numeric) input — e.g. Satnogs-style Unicode corruption — yields
      // null so callers can skip it.
      const trimmed = raw.trim();

      return (/^\d+$/u).test(trimmed) ? trimmed.replace(/^0+(?=\d)/u, '') : null;
    }
  }
}
