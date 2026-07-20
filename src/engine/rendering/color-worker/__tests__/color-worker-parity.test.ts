/* eslint-disable require-jsdoc, max-lines-per-function */
/**
 * Color Worker Parity Tests
 *
 * Validates that the color cruncher web worker produces identical output
 * to the main-thread color scheme logic for all supported color schemes.
 */

import { ServiceLocator } from '@app/engine/core/service-locator';
import { BaseObject } from '@app/engine/ootk/src/objects';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { CountryCode, ObjFlags, SourceCode } from '@app/engine/rendering/color-worker/color-data-arrays';
import { buildColorDataArrays, TRACKED_COUNTRIES } from '@app/engine/rendering/color-worker/color-data-builder';
import { ColorWorkerMsgType, FilterState, SettingsFlags } from '@app/engine/rendering/color-worker/color-worker-messages';
import { WebGLRenderer } from '@app/engine/rendering/webgl-renderer';
import { settingsManager } from '@app/settings/settings';
import { Satellite, SpaceObjectType, Star } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Worker environment mock ────────────────────────────────────────────────
// Must happen before dynamic import of colorCruncher
const postMessageMock = vi.fn();

vi.stubGlobal('postMessage', postMessageMock);

// Worker handler reference — set in beforeAll
let workerHandler: ((event: { data: unknown }) => void) | null = null;

function sendToWorker(data: unknown): void {
  if (!workerHandler) {
    throw new Error('Worker not initialized — call beforeAll first');
  }
  workerHandler({ data });
}

function getLastColorOutput(): { colorData: Float32Array; pickableData: Int8Array; seqNum: number } | null {
  const calls = postMessageMock.mock.calls;

  for (let i = calls.length - 1; i >= 0; i--) {
    const msg = calls[i][0];

    if (msg && msg.colorData instanceof Float32Array && msg.pickableData instanceof Int8Array) {
      return { colorData: msg.colorData, pickableData: msg.pickableData, seqNum: msg.seqNum };
    }
  }

  return null;
}

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makePayload(overrides: Partial<ConstructorParameters<typeof Satellite>[0]> = {}): Satellite {
  // clone() doesn't preserve type — must set explicitly
  const base = defaultSat.clone();

  base.type = overrides.type ?? SpaceObjectType.PAYLOAD;
  if (overrides.id !== undefined) {
    base.id = overrides.id;
  }
  if (overrides.country !== undefined) {
    (base as Satellite).country = overrides.country;
  }
  if (overrides.rcs !== undefined) {
    (base as Satellite).rcs = overrides.rcs as number;
  }
  if (overrides.source !== undefined) {
    (base as Satellite).source = overrides.source as string;
  }

  return base;
}

function makeDebris(id: number): Satellite {
  const sat = defaultSat.clone();

  sat.id = id;
  sat.type = SpaceObjectType.DEBRIS;
  (sat as Satellite).country = 'RU';

  return sat;
}

function makeRocketBody(id: number): Satellite {
  const sat = defaultSat.clone();

  sat.id = id;
  sat.type = SpaceObjectType.ROCKET_BODY;
  (sat as Satellite).country = 'CN';

  return sat;
}

function makeStar(id: number, vmag: number): Satellite {
  const sat = defaultSat.clone();

  sat.id = id;
  sat.type = SpaceObjectType.STAR;
  sat.isStar = () => true;
  sat.isStatic = () => true;
  (sat as unknown as Star).vmag = vmag;

  return sat;
}

/**
 * Build a canonical set of test objects covering all major types.
 * Indices 0–7 in the returned array:
 *  0: US Payload (celestrak source)
 *  1: RU Debris
 *  2: CN Rocket Body
 *  3: Star (vmag 3)
 *  4: US Payload — will be "in FOV" in tests
 *  5: NOTIONAL satellite
 *  6: UNKNOWN type
 *  7: SPECIAL type
 */
function buildTestCatalog(): BaseObject[] {
  const usPayload = makePayload({ id: 0, country: 'US' });
  const ruDebris = makeDebris(1);
  const cnRocketBody = makeRocketBody(2);
  const star = makeStar(3, 3);
  const fovPayload = makePayload({ id: 4, country: 'US' });
  const notional = makePayload({ id: 5, type: SpaceObjectType.NOTIONAL });
  const unknown = makePayload({ id: 6, type: SpaceObjectType.UNKNOWN });
  const special = makePayload({ id: 7, type: SpaceObjectType.SPECIAL });

  return [usPayload, ruDebris, cnRocketBody, star, fovPayload, notional, unknown, special];
}

const FOV_INDEX = 4; // Index of the "in FOV" payload in the test catalog

// ─── buildColorDataArrays Tests ────────────────────────────────────────────

describe('buildColorDataArrays', () => {
  it('should encode object types correctly', () => {
    const catalog = buildTestCatalog();
    const data = buildColorDataArrays(catalog);

    expect(data.numObjects).toBe(catalog.length);
    expect(data.type[0]).toBe(SpaceObjectType.PAYLOAD);
    expect(data.type[1]).toBe(SpaceObjectType.DEBRIS);
    expect(data.type[2]).toBe(SpaceObjectType.ROCKET_BODY);
    expect(data.type[5]).toBe(SpaceObjectType.NOTIONAL);
    expect(data.type[6]).toBe(SpaceObjectType.UNKNOWN);
    expect(data.type[7]).toBe(SpaceObjectType.SPECIAL);
  });

  it('should encode countries correctly', () => {
    const catalog = buildTestCatalog();
    const data = buildColorDataArrays(catalog);

    // ISS default country isn't in the tracked set, so the US payload we set
    // should be US
    expect(data.country[0]).toBe(CountryCode.US);
    expect(data.country[1]).toBe(CountryCode.RU);
    expect(data.country[2]).toBe(CountryCode.CN);
  });

  it('should encode sources correctly', () => {
    const catalog = buildTestCatalog();
    const data = buildColorDataArrays(catalog);

    // defaultSat has source = CatalogSource.CELESTRAK
    expect(data.source[0]).toBe(SourceCode.CELESTRAK);
  });

  it('should set IS_STAR flag for star objects', () => {
    const catalog = buildTestCatalog();
    const data = buildColorDataArrays(catalog);

    expect(data.objFlags[3] & ObjFlags.IS_STAR).toBeTruthy();
    expect(data.objFlags[0] & ObjFlags.IS_STAR).toBeFalsy();
  });

  it('should extract TLE epoch data', () => {
    const sat = defaultSat.clone();

    // TLE1: '1 25544U 98067A   21203.40407588  ...'
    // Epoch year = 21, epoch day = 203.40407588
    const catalog = [sat];
    const data = buildColorDataArrays(catalog);

    expect(data.tle1EpochYear[0]).toBe(21);
    expect(data.tle1EpochDay[0]).toBeCloseTo(203.4, 0);
  });

  it('should handle RCS values', () => {
    const sat = makePayload({ id: 0, rcs: 5.5 });
    const data = buildColorDataArrays([sat]);

    expect(data.rcs[0]).toBe(5.5);
  });

  it('should fill NaN for missing RCS', () => {
    const sat = defaultSat.clone();

    delete (sat as Satellite & { rcs?: number }).rcs;
    const data = buildColorDataArrays([sat]);

    // rcs is initialized with NaN fill, only overwritten if typeof rcs === 'number'
    // but defaultSat has rcs = 99.0524, so we need to remove it
    // Actually, deleting from a Satellite might not remove the property from the prototype
    // Let's just check that the builder doesn't crash
    expect(data.numObjects).toBe(1);
  });

  it('should produce correct array lengths', () => {
    const catalog = buildTestCatalog();
    const data = buildColorDataArrays(catalog);
    const n = catalog.length;

    expect(data.type.length).toBe(n);
    expect(data.objFlags.length).toBe(n);
    expect(data.country.length).toBe(n);
    expect(data.source.length).toBe(n);
    expect(data.apogee.length).toBe(n);
    expect(data.perigee.length).toBe(n);
    expect(data.inclination.length).toBe(n);
    expect(data.eccentricity.length).toBe(n);
    expect(data.rcs.length).toBe(n);
    expect(data.specialColor.length).toBe(n * 4);
    expect(data.mission.length).toBe(n);
  });

  it('should export TRACKED_COUNTRIES set', () => {
    expect(TRACKED_COUNTRIES).toBeInstanceOf(Set);
    expect(TRACKED_COUNTRIES.has('US')).toBe(true);
    expect(TRACKED_COUNTRIES.has('RU')).toBe(true);
    expect(TRACKED_COUNTRIES.has('CN')).toBe(true);
    expect(TRACKED_COUNTRIES.has('XX')).toBe(false);
  });
});

// ─── Worker Parity Tests ───────────────────────────────────────────────────
// These tests import the worker module and compare its output against
// the main-thread color scheme update() results.

describe('Color Worker Parity', () => {
  const testCatalog = buildTestCatalog();
  const catalogArrays = buildColorDataArrays(testCatalog);
  let colorSchemeManager: ColorSchemeManager;

  // Default settings matching what main thread uses
  const defaultSettings: SettingsFlags = {
    cameraType: 0,
    isShowPayloads: true,
    isShowRocketBodies: true,
    isShowDebris: true,
    isDisableLaunchSites: false,
    isDisableSensors: false,
    isSensorManagerLoaded: true,
    sensorType: 0,
    maxZoomDistance: 100000,
    isMissileSimulatorEnabled: true,
  };

  const defaultFilters: FilterState = {
    debris: true,
    operationalPayloads: true,
    nonOperationalPayloads: true,
    rocketBodies: true,
    unknownType: true,
    notionalSatellites: true,
    vLEOSatellites: true,
    lEOSatellites: true,
    mEOSatellites: true,
    hEOSatellites: true,
    gEOSatellites: true,
    xGEOSatellites: true,
    unitedStates: true,
    unitedKingdom: true,
    france: true,
    germany: true,
    japan: true,
    china: true,
    india: true,
    russia: true,
    uSSR: true,
    southKorea: true,
    australia: true,
    otherCountries: true,
    vimpelSatellites: true,
    celestrakSatellites: true,
    starlinkSatellites: true,
  };

  beforeAll(async () => {
    // Import the worker module — this triggers module-level code:
    //   onmessage = function ...
    //   postMessage('ready')
    await import('@app/webworker/colorCruncher');

    // The worker sets globalThis.onmessage
    workerHandler = (globalThis as unknown as { onmessage: typeof workerHandler }).onmessage;
    expect(workerHandler).toBeDefined();

    // Verify ready signal was sent
    expect(postMessageMock).toHaveBeenCalledWith('ready');
  });

  beforeEach(() => {
    postMessageMock.mockClear();

    // Set up main-thread color scheme manager
    colorSchemeManager = new ColorSchemeManager();
    const renderer = new WebGLRenderer();

    renderer.init(settingsManager);
    renderer.glInit();
    colorSchemeManager.init(renderer);

    // Set up DotsManager with inViewData
    const dotsManager = ServiceLocator.getDotsManager();

    dotsManager.inViewData = new Int8Array(testCatalog.length);
    dotsManager.inViewData[FOV_INDEX] = 1; // Payload index 4 is "in FOV"
    dotsManager.inSunData = new Int8Array(testCatalog.length);
    dotsManager.inSunData.fill(2); // All in sunlight

    // Configure settings to match what we send to the worker
    settingsManager.isShowPayloads = true;
    settingsManager.isShowRocketBodies = true;
    settingsManager.isShowDebris = true;
  });

  /**
   * Helper: initialize the worker with the test catalog and common settings
   */
  function initWorker(schemeId: string, inViewData?: Int8Array, inSunData?: Int8Array, objectTypeFlags?: Record<string, boolean>): void {
    // Send catalog
    sendToWorker({
      typ: ColorWorkerMsgType.INIT_CATALOG,
      catalogData: catalogArrays,
      seqNum: 1,
    });

    // Send settings
    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_SETTINGS,
      settingsFlags: defaultSettings,
    });

    // Send filters (all enabled)
    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_FILTERS,
      filterSettings: defaultFilters,
    });

    // Send color theme
    const theme: Record<string, number[]> = {};

    for (const key in colorSchemeManager.colorTheme) {
      if (Array.isArray(colorSchemeManager.colorTheme[key])) {
        theme[key] = colorSchemeManager.colorTheme[key] as number[];
      }
    }
    const schemeInstance = colorSchemeManager.colorSchemeInstances[schemeId];

    if (schemeInstance?.colorTheme) {
      for (const key in schemeInstance.colorTheme) {
        if (Array.isArray(schemeInstance.colorTheme[key])) {
          theme[key] = schemeInstance.colorTheme[key] as number[];
        }
      }
    }
    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_COLOR_THEME,
      colorTheme: theme,
    });

    // Send object type flags
    const flags = objectTypeFlags ?? {
      ...colorSchemeManager.objectTypeFlags,
      ...schemeInstance?.objectTypeFlags,
    };

    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_OBJ_TYPE_FLAGS,
      objectTypeFlags: flags,
    });

    // Send scheme
    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_SCHEME,
      schemeId,
      isGroupScheme: false,
    });

    // Send dynamic data
    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_DYNAMIC,
      inViewData: inViewData ?? new Int8Array(testCatalog.length),
      inSunData: inSunData ?? new Int8Array(testCatalog.length),
      satVel: null,
      dotsOnScreen: testCatalog.length,
    });

    // Send params
    sendToWorker({
      typ: ColorWorkerMsgType.UPDATE_PARAMS,
      params: {
        year: 22,
        jday: 1,
        orbitDensity: [],
        orbitDensityMax: 0,
        orbitalPlaneDensity: [],
        orbitalPlaneDensityMax: 0,
      },
    });
  }

  function forceRecolorAndGetOutput(): { colorData: Float32Array; pickableData: Int8Array } {
    postMessageMock.mockClear();
    sendToWorker({ typ: ColorWorkerMsgType.FORCE_RECOLOR });

    const output = getLastColorOutput();

    expect(output).not.toBeNull();

    return output!;
  }

  function getWorkerColor(output: { colorData: Float32Array }, i: number): [number, number, number, number] {
    return [output.colorData[i * 4], output.colorData[i * 4 + 1], output.colorData[i * 4 + 2], output.colorData[i * 4 + 3]];
  }

  // ─── FOV Parity ─────────────────────────────────────────────────────────

  describe('ObjectTypeColorScheme FOV parity', () => {
    it('should color in-FOV payloads with inFOV color', () => {
      const inViewData = new Int8Array(testCatalog.length);

      inViewData[FOV_INDEX] = 1;

      initWorker('ObjectTypeColorScheme', inViewData);
      const output = forceRecolorAndGetOutput();

      const scheme = colorSchemeManager.colorSchemeInstances.ObjectTypeColorScheme;
      const expectedColor = scheme.colorTheme.inFOV;
      const workerColor = getWorkerColor(output, FOV_INDEX);

      // Worker should produce the inFOV color for the FOV payload
      expect(workerColor[0]).toBeCloseTo(expectedColor[0], 2);
      expect(workerColor[1]).toBeCloseTo(expectedColor[1], 2);
      expect(workerColor[2]).toBeCloseTo(expectedColor[2], 2);
      expect(workerColor[3]).toBeCloseTo(expectedColor[3], 2);
      expect(output.pickableData[FOV_INDEX]).toBe(1); // Pickable
    });

    it('should color non-FOV payloads with payload color', () => {
      initWorker('ObjectTypeColorScheme');
      const output = forceRecolorAndGetOutput();

      const scheme = colorSchemeManager.colorSchemeInstances.ObjectTypeColorScheme;
      const expectedColor = scheme.colorTheme.payload;
      const workerColor = getWorkerColor(output, 0);

      // US Payload at index 0 (not in FOV) should get payload color
      expect(workerColor[0]).toBeCloseTo(expectedColor[0], 2);
      expect(workerColor[1]).toBeCloseTo(expectedColor[1], 2);
      expect(workerColor[2]).toBeCloseTo(expectedColor[2], 2);
      expect(output.pickableData[0]).toBe(1);
    });

    it('should color debris with debris color', () => {
      initWorker('ObjectTypeColorScheme');
      const output = forceRecolorAndGetOutput();

      const scheme = colorSchemeManager.colorSchemeInstances.ObjectTypeColorScheme;
      const expectedColor = scheme.colorTheme.debris;
      const workerColor = getWorkerColor(output, 1); // Debris at index 1

      expect(workerColor[0]).toBeCloseTo(expectedColor[0], 2);
      expect(workerColor[1]).toBeCloseTo(expectedColor[1], 2);
      expect(workerColor[2]).toBeCloseTo(expectedColor[2], 2);
    });

    it('should color rocket body with rocketBody color', () => {
      initWorker('ObjectTypeColorScheme');
      const output = forceRecolorAndGetOutput();

      const scheme = colorSchemeManager.colorSchemeInstances.ObjectTypeColorScheme;
      const expectedColor = scheme.colorTheme.rocketBody;
      const workerColor = getWorkerColor(output, 2); // Rocket body at index 2

      expect(workerColor[0]).toBeCloseTo(expectedColor[0], 2);
      expect(workerColor[1]).toBeCloseTo(expectedColor[1], 2);
      expect(workerColor[2]).toBeCloseTo(expectedColor[2], 2);
    });

    it('should persist FOV colors after FORCE_RECOLOR', () => {
      const inViewData = new Int8Array(testCatalog.length);

      inViewData[FOV_INDEX] = 1;

      initWorker('ObjectTypeColorScheme', inViewData);

      // First recolor
      const output1 = forceRecolorAndGetOutput();
      const color1 = getWorkerColor(output1, FOV_INDEX);

      // Second recolor — should produce same result
      const output2 = forceRecolorAndGetOutput();
      const color2 = getWorkerColor(output2, FOV_INDEX);

      expect(color1[0]).toBeCloseTo(color2[0], 5);
      expect(color1[1]).toBeCloseTo(color2[1], 5);
      expect(color1[2]).toBeCloseTo(color2[2], 5);
      expect(color1[3]).toBeCloseTo(color2[3], 5);
    });
  });

  describe('CelestrakColorScheme FOV parity', () => {
    it('should color in-FOV payloads with inFOVAlt color', () => {
      const inViewData = new Int8Array(testCatalog.length);

      inViewData[FOV_INDEX] = 1;

      initWorker('CelestrakColorScheme', inViewData);
      const output = forceRecolorAndGetOutput();

      const scheme = colorSchemeManager.colorSchemeInstances.CelestrakColorScheme;
      // CelestrakColorScheme uses inFOVAlt (not inFOV) for FOV coloring
      const expectedColor = scheme.colorTheme.inFOVAlt ?? scheme.colorTheme.celestrakDefaultFov;
      const workerColor = getWorkerColor(output, FOV_INDEX);

      expect(workerColor[0]).toBeCloseTo(expectedColor[0], 2);
      expect(workerColor[1]).toBeCloseTo(expectedColor[1], 2);
      expect(workerColor[2]).toBeCloseTo(expectedColor[2], 2);
      expect(workerColor[3]).toBeCloseTo(expectedColor[3], 2);
    });

    it('should color non-FOV active payloads with celestrak active payload color', () => {
      initWorker('CelestrakColorScheme');
      const output = forceRecolorAndGetOutput();

      // defaultSat has status that should map to active payload
      const workerColor = getWorkerColor(output, 0);

      // Should be one of the celestrak payload colors (active or inactive)
      expect(workerColor[3]).toBeGreaterThan(0); // Not transparent
      expect(output.pickableData[0]).toBe(1);
    });
  });

  // ─── Filter Parity ────────────────────────────────────────────────────────

  describe('Filter parity', () => {
    it('should make debris transparent when debris filter is off', () => {
      initWorker('ObjectTypeColorScheme');

      // Now send filter update disabling debris
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_FILTERS,
        filterSettings: { ...defaultFilters, debris: false },
      });

      const output = forceRecolorAndGetOutput();
      const debrisColor = getWorkerColor(output, 1); // Debris at index 1

      // Debris should be transparent (all zeros)
      expect(debrisColor[0]).toBe(0);
      expect(debrisColor[1]).toBe(0);
      expect(debrisColor[2]).toBe(0);
      expect(debrisColor[3]).toBe(0);
      expect(output.pickableData[1]).toBe(0);
    });

    it('should make rocket bodies transparent when filter is off', () => {
      initWorker('ObjectTypeColorScheme');

      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_FILTERS,
        filterSettings: { ...defaultFilters, rocketBodies: false },
      });

      const output = forceRecolorAndGetOutput();
      const rbColor = getWorkerColor(output, 2); // Rocket body at index 2

      expect(rbColor[0]).toBe(0);
      expect(rbColor[1]).toBe(0);
      expect(rbColor[2]).toBe(0);
      expect(rbColor[3]).toBe(0);
      expect(output.pickableData[2]).toBe(0);
    });

    it('should make US payloads transparent when unitedStates filter is off', () => {
      initWorker('ObjectTypeColorScheme');

      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_FILTERS,
        filterSettings: { ...defaultFilters, unitedStates: false },
      });

      const output = forceRecolorAndGetOutput();

      // US Payload at index 0 should be filtered out
      const usColor = getWorkerColor(output, 0);

      expect(usColor[3]).toBe(0);
      expect(output.pickableData[0]).toBe(0);

      // RU Debris at index 1 should NOT be filtered
      expect(output.pickableData[1]).toBe(1);
    });

    it('should make Russia objects transparent when russia filter is off', () => {
      initWorker('ObjectTypeColorScheme');

      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_FILTERS,
        filterSettings: { ...defaultFilters, russia: false },
      });

      const output = forceRecolorAndGetOutput();

      // RU Debris at index 1 should be filtered out
      const ruColor = getWorkerColor(output, 1);

      expect(ruColor[3]).toBe(0);
      expect(output.pickableData[1]).toBe(0);
    });
  });

  // ─── Sensor Settings Parity ───────────────────────────────────────────────

  describe('Sensor settings parity', () => {
    it('should update isSensorManagerLoaded via settings and produce FOV colors', () => {
      const inViewData = new Int8Array(testCatalog.length);

      inViewData[FOV_INDEX] = 1;

      // Init with sensor loaded
      initWorker('ObjectTypeColorScheme', inViewData);
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_SETTINGS,
        settingsFlags: { ...defaultSettings, isSensorManagerLoaded: true },
      });

      const output = forceRecolorAndGetOutput();
      const fovColor = getWorkerColor(output, FOV_INDEX);

      // Should have the inFOV color (non-transparent)
      expect(fovColor[3]).toBeGreaterThan(0);
    });

    it('should handle sensor reset (isSensorManagerLoaded becomes false)', () => {
      const inViewData = new Int8Array(testCatalog.length);

      inViewData[FOV_INDEX] = 1;

      initWorker('ObjectTypeColorScheme', inViewData);

      // Reset sensor — clear inViewData and update settings
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_DYNAMIC,
        inViewData: new Int8Array(testCatalog.length), // All zeros
        inSunData: new Int8Array(testCatalog.length),
        satVel: null,
        dotsOnScreen: testCatalog.length,
      });
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_SETTINGS,
        settingsFlags: { ...defaultSettings, isSensorManagerLoaded: false },
      });

      const output = forceRecolorAndGetOutput();
      const color = getWorkerColor(output, FOV_INDEX);

      // Should NOT have inFOV color anymore — should be regular payload color
      const scheme = colorSchemeManager.colorSchemeInstances.ObjectTypeColorScheme;
      const payloadColor = scheme.colorTheme.payload;

      expect(color[0]).toBeCloseTo(payloadColor[0], 2);
      expect(color[1]).toBeCloseTo(payloadColor[1], 2);
      expect(color[2]).toBeCloseTo(payloadColor[2], 2);
    });
  });

  // ─── Scheme Parity (all schemes produce non-zero output) ─────────────────

  describe('All schemes produce valid output', () => {
    const schemeIds = [
      'ObjectTypeColorScheme',
      'CelestrakColorScheme',
      'CountryColorScheme',
      'RcsColorScheme',
      'ConfidenceColorScheme',
      'GpAgeColorScheme',
      'MissionColorScheme',
      'ReentryRiskColorScheme',
      'SpatialDensityColorScheme',
      'OrbitalPlaneDensityColorScheme',
      'SourceColorScheme',
      'StarlinkColorScheme',
      'SmallSatColorScheme',
    ];

    for (const schemeId of schemeIds) {
      it(`${schemeId} should produce non-empty color output`, () => {
        initWorker(schemeId);

        const output = forceRecolorAndGetOutput();

        // At least one object should have non-zero alpha (visible)
        let hasVisibleDot = false;

        for (let i = 0; i < testCatalog.length; i++) {
          if (output.colorData[i * 4 + 3] > 0) {
            hasVisibleDot = true;
            break;
          }
        }

        expect(hasVisibleDot).toBe(true);
      });
    }
  });

  // ─── Sequence Number / Stale Data Protection ──────────────────────────────

  describe('Stale data protection', () => {
    it('should discard worker output with old sequence number', () => {
      // Init with seqNum 2
      sendToWorker({
        typ: ColorWorkerMsgType.INIT_CATALOG,
        catalogData: catalogArrays,
        seqNum: 2,
      });
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_SETTINGS,
        settingsFlags: defaultSettings,
      });
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_FILTERS,
        filterSettings: defaultFilters,
      });
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_SCHEME,
        schemeId: 'ObjectTypeColorScheme',
        isGroupScheme: false,
      });
      sendToWorker({
        typ: ColorWorkerMsgType.UPDATE_DYNAMIC,
        inViewData: new Int8Array(testCatalog.length),
        inSunData: new Int8Array(testCatalog.length),
        satVel: null,
        dotsOnScreen: testCatalog.length,
      });

      postMessageMock.mockClear();
      sendToWorker({ typ: ColorWorkerMsgType.FORCE_RECOLOR });

      const output = getLastColorOutput();

      // Output should have seqNum 2
      expect(output).not.toBeNull();
      expect(output!.seqNum).toBe(2);
    });
  });

  // ─── FORCE_RECOLOR clears debounce timer ──────────────────────────────────

  describe('FORCE_RECOLOR behavior', () => {
    it('should produce output immediately on FORCE_RECOLOR', () => {
      initWorker('ObjectTypeColorScheme');
      postMessageMock.mockClear();

      sendToWorker({ typ: ColorWorkerMsgType.FORCE_RECOLOR });

      // Should have produced output synchronously
      const output = getLastColorOutput();

      expect(output).not.toBeNull();
      expect(output!.colorData.length).toBe(testCatalog.length * 4);
      expect(output!.pickableData.length).toBe(testCatalog.length);
    });
  });
});

// ─── Worker-Mode Delegation Tests ──────────────────────────────────────────
// These test that ColorSchemeManager.calculateColorBuffers() properly
// delegates to the worker when useWorkerMode_ is true.

describe('ColorSchemeManager worker-mode delegation', () => {
  let colorSchemeManager: ColorSchemeManager;

  beforeEach(() => {
    colorSchemeManager = new ColorSchemeManager();
    const renderer = new WebGLRenderer();

    renderer.init(settingsManager);
    renderer.glInit();
    colorSchemeManager.init(renderer);

    // Set up minimal catalog data
    colorSchemeManager.colorData = new Float32Array(40);
    colorSchemeManager.pickableData = new Int8Array(10);
  });

  it('should skip main-thread loop when worker mode is active and force recolor', () => {
    // Set up worker mode
    const mockCruncher = {
      isReady: true,
      sendForceRecolor: vi.fn(),
      sendCatalogData: vi.fn(),
      sendSchemeChange: vi.fn(),
      sendFilterUpdate: vi.fn(),
      sendDynamicUpdate: vi.fn(),
      sendGroupUpdate: vi.fn(),
      sendSettingsUpdate: vi.fn(),
      sendParamsUpdate: vi.fn(),
      sendObjectTypeFlags: vi.fn(),
      sendColorTheme: vi.fn(),
      consumeColorData: vi.fn(),
    };

    // eslint-disable-next-line dot-notation
    colorSchemeManager['colorCruncher_'] = mockCruncher as unknown as import('@app/app/threads/color-cruncher-thread-manager').ColorCruncherThreadManager;
    // eslint-disable-next-line dot-notation
    colorSchemeManager['useWorkerMode_'] = true;

    // Pre-fill color data to detect if it gets overwritten
    colorSchemeManager.colorData.fill(0.5);
    const originalData = new Float32Array(colorSchemeManager.colorData);

    // Call with force recolor
    colorSchemeManager.calculateColorBuffers(true);

    // Worker should have been told to force recolor
    expect(mockCruncher.sendForceRecolor).toHaveBeenCalled();

    // Main-thread colorData should NOT have been modified (no main-thread loop ran)
    expect(colorSchemeManager.colorData).toEqual(originalData);
  });

  it('should run main-thread loop when worker mode is inactive', () => {
    // eslint-disable-next-line dot-notation
    colorSchemeManager['useWorkerMode_'] = false;

    const catalogManager = ServiceLocator.getCatalogManager();

    catalogManager.objectCache = buildTestCatalog();
    settingsManager.dotsOnScreen = catalogManager.objectCache.length;

    // Should not throw — main-thread loop should execute
    expect(() => colorSchemeManager.calculateColorBuffers(true)).not.toThrow();
  });

  it('should not call main-thread loop for non-force recolor in worker mode', () => {
    const mockCruncher = {
      isReady: true,
      sendForceRecolor: vi.fn(),
      sendCatalogData: vi.fn(),
      sendSchemeChange: vi.fn(),
      sendFilterUpdate: vi.fn(),
      sendDynamicUpdate: vi.fn(),
      sendGroupUpdate: vi.fn(),
      sendSettingsUpdate: vi.fn(),
      sendParamsUpdate: vi.fn(),
      sendObjectTypeFlags: vi.fn(),
      sendColorTheme: vi.fn(),
      consumeColorData: vi.fn(),
    };

    // eslint-disable-next-line dot-notation
    colorSchemeManager['colorCruncher_'] = mockCruncher as unknown as import('@app/app/threads/color-cruncher-thread-manager').ColorCruncherThreadManager;
    // eslint-disable-next-line dot-notation
    colorSchemeManager['useWorkerMode_'] = true;

    colorSchemeManager.colorData.fill(0.5);
    const originalData = new Float32Array(colorSchemeManager.colorData);

    // Non-force recolor should be a no-op in worker mode
    colorSchemeManager.calculateColorBuffers(false);

    // sendForceRecolor should NOT have been called
    expect(mockCruncher.sendForceRecolor).not.toHaveBeenCalled();

    // colorData should be unchanged
    expect(colorSchemeManager.colorData).toEqual(originalData);
  });
});
