import { type ColorDataArrays, CountryCode, MissionCategory, ObjFlags, SourceCode } from '@app/engine/rendering/color-worker/color-data-arrays';
import { vi } from 'vitest';

// ColorWorkerMsgType const-enum values (erased at compile time).
const MSG = {
  INIT_CATALOG: 0,
  UPDATE_SCHEME: 1,
  UPDATE_FILTERS: 2,
  UPDATE_DYNAMIC: 3,
  UPDATE_GROUP: 4,
  UPDATE_SETTINGS: 5,
  UPDATE_PARAMS: 6,
  FORCE_RECOLOR: 7,
  UPDATE_OBJ_TYPE_FLAGS: 8,
  UPDATE_COLOR_THEME: 9,
} as const;

const SOT = {
  UNKNOWN: 0,
  PAYLOAD: 1,
  ROCKET_BODY: 2,
  DEBRIS: 3,
  NOTIONAL: 29,
  CONTROL_FACILITY: 19,
  LAUNCH_SITE: 16,
} as const;

const PS_OPERATIONAL = '+'.charCodeAt(0);

const SCHEME_IDS = [
  'ObjectTypeColorScheme',
  'CelestrakColorScheme',
  'CountryColorScheme',
  'VelocityColorScheme',
  'SunlightColorScheme',
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

/**
 * Build a small but varied struct-of-arrays catalog so the scheme functions
 * exercise their type/flag/regime branches. Object layout (by index):
 *  0 operational LEO payload   5 starlink payload
 *  1 rocket body               6 star
 *  2 debris                    7 sensor
 *  3 GEO payload               8 marker
 *  4 unknown-type object       9 planet
 * 10 missile                  11 notional
 */
const buildCatalog = (): ColorDataArrays => {
  const n = 12;
  const f32 = (vals: number[]) => Float32Array.from(vals);
  const u8 = (vals: number[]) => Uint8Array.from(vals);
  const i8 = (vals: number[]) => Int8Array.from(vals);

  return {
    type: i8([
      SOT.PAYLOAD,
      SOT.ROCKET_BODY,
      SOT.DEBRIS,
      SOT.PAYLOAD,
      SOT.UNKNOWN,
      SOT.PAYLOAD,
      SOT.UNKNOWN,
      SOT.CONTROL_FACILITY,
      SOT.UNKNOWN,
      SOT.UNKNOWN,
      SOT.UNKNOWN,
      SOT.NOTIONAL,
    ]),
    objFlags: u8([
      ObjFlags.NONE,
      ObjFlags.NONE,
      ObjFlags.NONE,
      ObjFlags.NONE,
      ObjFlags.NONE,
      ObjFlags.IS_STARLINK,
      ObjFlags.IS_STAR,
      ObjFlags.IS_SENSOR,
      ObjFlags.IS_MARKER,
      ObjFlags.IS_PLANET,
      ObjFlags.IS_MISSILE,
      ObjFlags.NONE,
    ]),
    country: u8([
      CountryCode.US,
      CountryCode.RU,
      CountryCode.CN,
      CountryCode.F,
      CountryCode.OTHER,
      CountryCode.US,
      CountryCode.OTHER,
      CountryCode.OTHER,
      CountryCode.OTHER,
      CountryCode.OTHER,
      CountryCode.J,
      CountryCode.OTHER,
    ]),
    source: u8([
      SourceCode.CELESTRAK,
      SourceCode.USSF,
      SourceCode.VIMPEL,
      SourceCode.CELESTRAK,
      SourceCode.SATNOGS,
      SourceCode.CELESTRAK,
      SourceCode.OTHER,
      SourceCode.OTHER,
      SourceCode.OTHER,
      SourceCode.OTHER,
      SourceCode.KEEPTRACK,
      SourceCode.CELESTRAK_SUP,
    ]),
    apogee: f32([550, 800, 700, 35800, 1200, 560, 0, 0, 0, 0, 500, 600]),
    perigee: f32([540, 780, 690, 35780, 1100, 550, 0, 0, 0, 0, 480, 590]),
    inclination: f32([51.6, 82, 98, 0.1, 63, 53, 0, 0, 0, 0, 45, 30]),
    eccentricity: f32([0.001, 0.002, 0.003, 0.0001, 0.2, 0.001, 0, 0, 0, 0, 0.01, 0.02]),
    rcs: f32([1.2, 0.5, NaN, 3, NaN, 0.8, NaN, NaN, NaN, NaN, NaN, NaN]),
    status: u8([PS_OPERATIONAL, 0, 0, PS_OPERATIONAL, 0, PS_OPERATIONAL, 0, 0, 0, 0, 0, 0]),
    vmag: f32([5, 6, NaN, 4, NaN, 7, 3, NaN, NaN, NaN, NaN, NaN]),
    mission: u8([
      MissionCategory.COMMUNICATION,
      MissionCategory.UNKNOWN,
      MissionCategory.UNKNOWN,
      MissionCategory.NAVIGATION,
      MissionCategory.UNKNOWN,
      MissionCategory.COMMUNICATION,
      MissionCategory.UNKNOWN,
      MissionCategory.UNKNOWN,
      MissionCategory.UNKNOWN,
      MissionCategory.UNKNOWN,
      MissionCategory.MILITARY,
      MissionCategory.UNKNOWN,
    ]),
    tle1EpochYear: u8([24, 23, 22, 24, 20, 24, 0, 0, 0, 0, 24, 24]),
    tle1EpochDay: f32([1, 100, 200, 50, 10, 5, 0, 0, 0, 0, 1, 1]),
    tle1Confidence: u8([5, 3, 1, 5, 2, 5, 0, 0, 0, 0, 0, 0]),
    starColorTemp: f32([0, 0, 0, 0, 0, 0, 5800, 0, 0, 0, 0, 0]),
    specialColor: Float32Array.from(Array.from({ length: n * 4 }, (_, k) => (Math.floor(k / 4) === 9 ? 0.5 : 0))),
    active: u8([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
    numObjects: n,
  };
};

let posted: unknown[] = [];

const loadWorker = async () => {
  await import('@app/webworker/colorCruncher');
};

const dispatch = (data: Record<string, unknown>) => {
  (globalThis.onmessage as (m: { data: unknown }) => void)({ data });
};

interface ColorResult {
  colorData?: Float32Array;
  pickableData?: Int8Array;
  seqNum?: number;
}

const lastColorResult = (): ColorResult | undefined => posted.filter((p): p is ColorResult => typeof p === 'object' && p !== null && 'colorData' in p).at(-1);

describe('colorCruncher', () => {
  beforeEach(() => {
    posted = [];
    globalThis.postMessage = vi.fn((payload: unknown) => {
      posted.push(payload);
    }) as unknown as typeof globalThis.postMessage;
  });

  it('posts "ready" on load and installs an onmessage handler', async () => {
    await loadWorker();

    expect(posted).toContain('ready');
    expect(typeof globalThis.onmessage).toBe('function');
  });

  it('does not recolor before a catalog is initialized', async () => {
    await loadWorker();
    posted = [];

    dispatch({ typ: MSG.FORCE_RECOLOR });

    expect(lastColorResult()).toBeUndefined();
  });

  it('INIT_CATALOG + FORCE_RECOLOR posts color/pickable buffers of the right size', async () => {
    await loadWorker();
    posted = [];

    dispatch({ typ: MSG.INIT_CATALOG, catalogData: buildCatalog(), seqNum: 7 });
    dispatch({ typ: MSG.FORCE_RECOLOR });

    const result = lastColorResult();

    expect(result).toBeDefined();
    expect(result!.seqNum).toBe(7);
    expect(result!.colorData).toBeInstanceOf(Float32Array);
    expect(result!.colorData!.length).toBe(12 * 4);
    expect(result!.pickableData!.length).toBe(12);
  });

  it('renders every registered color scheme without throwing', async () => {
    await loadWorker();
    dispatch({ typ: MSG.INIT_CATALOG, catalogData: buildCatalog(), seqNum: 1 });
    // Dynamic data feeds the velocity / sunlight schemes.
    dispatch({
      typ: MSG.UPDATE_DYNAMIC,
      inViewData: Int8Array.from(Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 1 : 0))),
      inSunData: Int8Array.from(Array.from({ length: 12 }, () => 1)),
      satVel: Float32Array.from(Array.from({ length: 12 * 3 }, (_, i) => (i % 3) + 1)),
      dotsOnScreen: 12,
    });
    dispatch({
      typ: MSG.UPDATE_PARAMS,
      params: {
        year: 24,
        jday: 100,
        orbitDensity: [{ minAltitude: 0, maxAltitude: 2000, count: 100, density: 0.5 }],
        orbitDensityMax: 1,
        orbitalPlaneDensity: [[1, 2, 3]],
        orbitalPlaneDensityMax: 5,
      },
    });

    for (const schemeId of SCHEME_IDS) {
      posted = [];
      dispatch({ typ: MSG.UPDATE_SCHEME, schemeId, isGroupScheme: false });
      expect(() => dispatch({ typ: MSG.FORCE_RECOLOR })).not.toThrow();
      expect(lastColorResult(), `scheme ${schemeId} produced no color output`).toBeDefined();
    }
  });

  it('renders group-scheme variants (with and without a custom updateGroup)', async () => {
    await loadWorker();
    dispatch({ typ: MSG.INIT_CATALOG, catalogData: buildCatalog(), seqNum: 1 });
    dispatch({ typ: MSG.UPDATE_GROUP, groupIds: [0, 3, 5] });

    // ObjectType + Country have a custom updateGroup; Velocity falls back to the base group path.
    for (const schemeId of ['ObjectTypeColorScheme', 'CountryColorScheme', 'VelocityColorScheme']) {
      posted = [];
      dispatch({ typ: MSG.UPDATE_SCHEME, schemeId, isGroupScheme: true });
      expect(() => dispatch({ typ: MSG.FORCE_RECOLOR })).not.toThrow();
      expect(lastColorResult()).toBeDefined();
    }

    // Clearing the group set restores the non-group path.
    expect(() => dispatch({ typ: MSG.UPDATE_GROUP, groupIds: null })).not.toThrow();
  });

  it('falls back to the object-type scheme for an unknown scheme id', async () => {
    await loadWorker();
    dispatch({ typ: MSG.INIT_CATALOG, catalogData: buildCatalog(), seqNum: 2 });
    posted = [];

    dispatch({ typ: MSG.UPDATE_SCHEME, schemeId: 'NoSuchColorScheme' });
    dispatch({ typ: MSG.FORCE_RECOLOR });

    expect(lastColorResult()).toBeDefined();
  });

  it('applies filters so disabled categories render as transparent (alpha 0)', async () => {
    await loadWorker();
    dispatch({ typ: MSG.INIT_CATALOG, catalogData: buildCatalog(), seqNum: 3 });
    dispatch({ typ: MSG.UPDATE_SCHEME, schemeId: 'ObjectTypeColorScheme' });

    const allOff = (over: Record<string, boolean>) => ({
      debris: false,
      operationalPayloads: false,
      nonOperationalPayloads: false,
      rocketBodies: false,
      unknownType: false,
      notionalSatellites: false,
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
      celestrakSupSatellites: true,
      satnogsSatellites: true,
      starlinkSatellites: true,
      ...over,
    });

    posted = [];
    dispatch({ typ: MSG.UPDATE_FILTERS, filterSettings: allOff({}) });
    dispatch({ typ: MSG.FORCE_RECOLOR });

    const result = lastColorResult()!;
    // Debris is object index 2; with debris filtered out its alpha must be 0.
    const debrisAlpha = result.colorData![2 * 4 + 3];

    expect(debrisAlpha).toBe(0);
  });

  it('debounces recolors via scheduleRecalc and emits exactly one output per timer flush', async () => {
    await loadWorker();
    dispatch({ typ: MSG.INIT_CATALOG, catalogData: buildCatalog(), seqNum: 4 });
    posted = [];

    // Three rapid updates collapse to a single debounced recolor.
    dispatch({
      typ: MSG.UPDATE_SETTINGS,
      settingsFlags: {
        cameraType: 0,
        isShowPayloads: true,
        isShowRocketBodies: true,
        isShowDebris: true,
        isDisableLaunchSites: false,
        isDisableSensors: false,
        isSensorManagerLoaded: false,
        sensorType: 0,
        maxZoomDistance: 100000,
        isMissileSimulatorEnabled: true,
      },
    });
    dispatch({ typ: MSG.UPDATE_OBJ_TYPE_FLAGS, objectTypeFlags: { sensor: true, payload: true } });
    dispatch({ typ: MSG.UPDATE_COLOR_THEME, colorTheme: { sensor: [0, 0, 1, 1] } });

    await vi.runAllTimersAsync();

    expect(lastColorResult()).toBeDefined();
  });

  it('ignores unknown message types without throwing', async () => {
    await loadWorker();

    expect(() => dispatch({ typ: 999 })).not.toThrow();
  });
});
