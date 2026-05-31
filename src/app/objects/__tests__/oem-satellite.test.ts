import { ServiceLocator } from '@app/engine/core/service-locator';
import { OemSatellite, ParsedOem } from '@app/app/objects/oem-satellite';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, SpaceObjectType, Vector3D } from '@ootk/src/main';
import { defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const makeStateVector = (epochSec: number): J2000 => new J2000(
  EpochUTC.fromDateTime(new Date(epochSec * 1000)),
  new Vector3D(7000 as Kilometers, 0 as Kilometers, 0 as Kilometers),
  new Vector3D(0 as KilometersPerSecond, 7.5 as KilometersPerSecond, 0 as KilometersPerSecond),
);

const makeOem = (commentLines: string[] = []): ParsedOem => {
  const startSec = Date.UTC(2026, 0, 1) / 1000 as Seconds;

  return {
    header: {
      START_TIME: new Date(2026, 0, 1),
      STOP_TIME: new Date(2026, 0, 2),
      CCSDS_OEM_VERS: '2.0',
      CREATION_DATE: '2026-01-01T00:00:00',
      ORIGINATOR: 'TEST',
      COMMENT: commentLines,
    },
    dataBlocks: [
      {
        metadata: {
          OBJECT_NAME: 'TEST SAT',
          OBJECT_ID: '2026-001A',
          CENTER_NAME: 'EARTH',
          REF_FRAME: 'EME2000',
          TIME_SYSTEM: 'UTC',
          START_TIME: '2026-01-01T00:00:00',
          STOP_TIME: '2026-01-02T00:00:00',
        },
        ephemeris: [
          makeStateVector(startSec),
          makeStateVector(startSec + 60),
        ],
      },
    ],
  };
};

describe('OemSatellite NORAD_ID extraction from COMMENT lines', () => {
  it('extracts a legacy 5-digit NORAD_ID and marks the satellite as PAYLOAD', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 25544']));

    expect(sat.sccNum).toBe('25544');
    expect(sat.sccNum5).toBe('25544');
    expect(sat.sccNum6).toBe('25544');
    expect(sat.type).toBe(SpaceObjectType.PAYLOAD);
  });

  // Pre-fix the regex was `(?<id>\d+)` which only matched digits. Real-world
  // OEM files (CelesTrak supplemental, SpaceTrack-derived) may carry alpha-5
  // NORAD_IDs in the COMMENT block and would have been silently dropped.
  // The captured alpha-5 string is then normalized to its 6-digit numeric
  // form on sccNum (the alpha-5 string is preserved on sccNum5).
  it('extracts an alpha-5 NORAD_ID and normalizes it to the numeric form on sccNum', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = T0001']));

    expect(sat.sccNum).toBe('270001');
    expect(sat.sccNum5).toBe('T0001');
    expect(sat.sccNum6).toBe('270001');
    expect(sat.type).toBe(SpaceObjectType.PAYLOAD);
  });

  it('extracts a 9-digit extended NORAD_ID and emits null for alpha-5 forms', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 799500766']));

    expect(sat.sccNum).toBe('799500766');
    expect(sat.sccNum5).toBeNull();
    expect(sat.sccNum6).toBeNull();
    expect(sat.type).toBe(SpaceObjectType.PAYLOAD);
  });

  it('extracts a 6-digit numeric NORAD_ID in the alpha-5 range', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 270001']));

    expect(sat.sccNum).toBe('270001');
    expect(sat.sccNum5).toBe('T0001');
    expect(sat.sccNum6).toBe('270001');
    expect(sat.type).toBe(SpaceObjectType.PAYLOAD);
  });

  // A 6-digit value above the alpha-5 capacity (340000-999999) classifies as
  // 'extended'. Tle.convertA5to6Digit THROWS for this range (it cannot be
  // represented in TLE columns), so the NORAD parse must guard the call the
  // same way Satellite.assignAlpha5Forms_ does. Pre-fix the unguarded call
  // crashed the entire OemSatellite constructor for these IDs.
  it('extracts a 6-digit extended NORAD_ID above the alpha-5 range without throwing', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 400000']));

    expect(sat.sccNum).toBe('400000');
    expect(sat.sccNum5).toBeNull();
    expect(sat.sccNum6).toBeNull();
    expect(sat.type).toBe(SpaceObjectType.PAYLOAD);
  });

  it('leaves the satellite NOTIONAL when no NORAD_ID is present', () => {
    const sat = new OemSatellite(makeOem(['some other comment']));

    expect(sat.sccNum).toBe('');
    expect(sat.sccNum5).toBeNull();
    expect(sat.sccNum6).toBeNull();
    expect(sat.type).toBe(SpaceObjectType.NOTIONAL);
  });

  // If the COMMENT block has a malformed value ("NORAD_ID = 12A45" — bad
  // alpha-5 format), Tle.classifySatNum returns 'invalid' and the field is
  // skipped rather than corrupting sccNum.
  it('skips a malformed NORAD_ID and continues searching subsequent COMMENT lines', () => {
    const sat = new OemSatellite(makeOem([
      'NORAD_ID = 12A45', // invalid by classifySatNum
      'NORAD_ID = 25544', // good fallback
    ]));

    expect(sat.sccNum).toBe('25544');
    expect(sat.type).toBe(SpaceObjectType.PAYLOAD);
  });

  it('takes the first valid NORAD_ID when multiple COMMENT lines have one', () => {
    const sat = new OemSatellite(makeOem([
      'NORAD_ID = 25544',
      'NORAD_ID = 99999', // ignored — first match wins
    ]));

    expect(sat.sccNum).toBe('25544');
  });

  it('searches COMMENT lines in subsequent data blocks (not just header)', () => {
    const oem = makeOem([]);

    // Move the NORAD_ID into a data block's metadata.COMMENT instead of header.
    oem.dataBlocks[0].metadata.COMMENT = ['NORAD_ID = T0001'];

    const sat = new OemSatellite(oem);

    expect(sat.sccNum).toBe('270001');
    expect(sat.sccNum5).toBe('T0001');
  });
});

describe('OemSatellite.applyUserDefinedMetadata_', () => {
  it('maps every USER_DEFINED_ field onto the satellite', () => {
    const sat = new OemSatellite(makeOem());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).applyUserDefinedMetadata_({
      COUNTRY: 'US',
      LAUNCH_SITE: 'KSC',
      LAUNCH_VEHICLE: 'Saturn V',
      MISSION: 'Apollo',
      USER: 'NASA',
      CONTRACTOR: 'Boeing',
      BUS: 'S-IVB',
      SHAPE: 'Cylinder',
      SOURCE: 'CustomSource',
    });

    expect(sat.country).toBe('US');
    expect(sat.launchSite).toBe('KSC');
    expect(sat.launchVehicle).toBe('Saturn V');
    expect(sat.mission).toBe('Apollo');
    expect(sat.owner).toBe('NASA');
    expect(sat.manufacturer).toBe('Boeing');
    expect(sat.bus).toBe('S-IVB');
    expect(sat.shape).toBe('Cylinder');
    expect(sat.source).toBe('CustomSource');
  });

  it('maps OBJECT_TYPE onto the SpaceObjectType enum', () => {
    const sat = new OemSatellite(makeOem());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).applyUserDefinedMetadata_({ OBJECT_TYPE: 'rocket_body' });
    expect(sat.type).toBe(SpaceObjectType.ROCKET_BODY);
  });

  it('leaves the type unchanged for an unrecognized OBJECT_TYPE', () => {
    const sat = new OemSatellite(makeOem());
    const before = sat.type;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).applyUserDefinedMetadata_({ OBJECT_TYPE: 'NONSENSE' });
    expect(sat.type).toBe(before);
  });

  it('is a no-op when no USER_DEFINED block is present', () => {
    const sat = new OemSatellite(makeOem());

    sat.country = 'PRESET';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).applyUserDefinedMetadata_(undefined);
    expect(sat.country).toBe('PRESET');
  });

  it('applies USER_DEFINED metadata through the constructor', () => {
    const oem = makeOem();

    oem.dataBlocks[0].metadata.USER_DEFINED = { COUNTRY: 'JP', OBJECT_TYPE: 'DEBRIS' };
    const sat = new OemSatellite(oem);

    expect(sat.country).toBe('JP');
    expect(sat.type).toBe(SpaceObjectType.DEBRIS);
  });
});

describe('OemSatellite.toJ2000', () => {
  const startSec = Date.UTC(2026, 0, 1) / 1000;

  it('returns the first state vector at/after the requested time (before range)', () => {
    const sat = new OemSatellite(makeOem());
    const result = sat.toJ2000(new Date((startSec - 100) * 1000));

    expect(result).toBe(sat.OemDataBlocks[0].ephemeris[0]);
  });

  it('returns the next state vector when the time falls between samples', () => {
    const sat = new OemSatellite(makeOem());
    const result = sat.toJ2000(new Date((startSec + 30) * 1000));

    expect(result).toBe(sat.OemDataBlocks[0].ephemeris[1]);
  });

  it('returns the last state vector when the time is beyond the ephemeris', () => {
    const sat = new OemSatellite(makeOem());
    const last = sat.OemDataBlocks[0].ephemeris[1];

    expect(sat.toJ2000(new Date((startSec + 99999) * 1000))).toBe(last);
  });
});

describe('OemSatellite.computeGlobalIndex_', () => {
  const makeMultiBlockOem = (): ParsedOem => {
    const startSec = Date.UTC(2026, 0, 1) / 1000 as Seconds;
    const base = makeOem();
    const block0 = base.dataBlocks[0]; // 2 ephemeris points

    return {
      header: base.header,
      dataBlocks: [
        block0,
        {
          metadata: { ...block0.metadata, OBJECT_NAME: 'BLOCK 2' },
          ephemeris: [
            makeStateVector(startSec + 120),
            makeStateVector(startSec + 180),
            makeStateVector(startSec + 240),
          ],
        },
      ],
    };
  };

  it('sums the ephemeris lengths of preceding blocks plus the current index', () => {
    const sat = new OemSatellite(makeMultiBlockOem());

    // Set the private indices directly to avoid the setters' orbit-path rebuild.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).dataBlockIdx_ = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).stateVectorIdx_ = 2;

    // block0 has 2 points, so global index = 2 + 2 = 4.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((sat as any).computeGlobalIndex_()).toBe(4);
  });

  it('returns the state-vector index for the first block', () => {
    const sat = new OemSatellite(makeMultiBlockOem());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).dataBlockIdx_ = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).stateVectorIdx_ = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((sat as any).computeGlobalIndex_()).toBe(1);
  });
});

describe('OemSatellite type predicates', () => {
  it('reports satellite-kind but not the other kinds', () => {
    const sat = new OemSatellite(makeOem());

    expect(sat.isSatellite()).toBe(true);
    expect(sat.isStatic()).toBe(false);
    expect(sat.isMissile()).toBe(false);
    expect(sat.isSensor()).toBe(false);
    expect(sat.isMarker()).toBe(false);
    expect(sat.isStar()).toBe(false);
  });
});

describe('OemSatellite.clone', () => {
  it('produces an independent copy that preserves identity fields', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 25544']));
    const copy = sat.clone();

    expect(copy).not.toBe(sat);
    expect(copy.sccNum).toBe('25544');
    expect(copy.header.ORIGINATOR).toBe(sat.header.ORIGINATOR);
    expect(copy.OemDataBlocks).toHaveLength(sat.OemDataBlocks.length);

    // Mutating the original header must not bleed into the clone.
    sat.header.ORIGINATOR = 'MUTATED';
    expect(copy.header.ORIGINATOR).not.toBe('MUTATED');
  });
});

describe('OemSatellite.serializeSpecific', () => {
  it('emits the OEM-specific snapshot fields', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 25544']));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (sat as any).serializeSpecific() as Record<string, unknown>;

    expect(data.sccNum).toBe('25544');
    expect(data.source).toBe('OEM File');
    expect(data).toHaveProperty('header');
    expect(data).toHaveProperty('OemDataBlocks');
  });
});

describe('OemSatellite.findStateVectorTime_ (binary search over ephemeris)', () => {
  const startSec = Date.UTC(2026, 0, 1) / 1000;

  const makeMultiVectorOem = (): ParsedOem => {
    const base = makeOem();

    return {
      header: base.header,
      dataBlocks: [
{
        metadata: base.dataBlocks[0].metadata,
        // Vectors at +0, +60, +120, +180, +240 seconds.
        ephemeris: [0, 60, 120, 180, 240].map((dt) => makeStateVector(startSec + dt)),
      },
],
    };
  };

  // The index setters rebuild the orbit path (heavy + GL); stub it so the search
  // logic is isolated.
  const buildSat = (): OemSatellite => {
    const sat = new OemSatellite(makeMultiVectorOem());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).getOrbitPath = () => new Float32Array();

    return sat;
  };

  const search = (sat: OemSatellite, simSec: number): number => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sat as any).findStateVectorTime_(simSec);

    return sat.stateVectorIdx;
  };

  it('lands in the interval containing the requested time', () => {
    const sat = buildSat();

    // +90s falls in [60,120) -> index 1.
    expect(search(sat, startSec + 90)).toBe(1);
  });

  it('advances to a later interval on a forward jump', () => {
    const sat = buildSat();

    // +200s falls in [180,240) -> index 3.
    expect(search(sat, startSec + 200)).toBe(3);
  });

  it('clamps to the last vector when the time is beyond the ephemeris', () => {
    const sat = buildSat();

    expect(search(sat, startSec + 100000)).toBe(4);
  });

  it('searches backward after a forward jump', () => {
    const sat = buildSat();

    search(sat, startSec + 200); // jump forward to index 3
    expect(search(sat, startSec + 30)).toBe(0); // back to [0,60)
  });
});

describe('OemSatellite ephemeris math', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sat: any;
  const inRange = new Date(Date.UTC(2026, 0, 1, 0, 0, 30));

  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.isOrbitCruncherInEcf = false;
    ServiceLocator.getUiManager().toast = vi.fn();
    sat = new OemSatellite(makeOem());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('eci interpolates a position and velocity within the ephemeris window', () => {
    const pv = sat.eci(inRange);

    expect(pv).not.toBeNull();
    expect(Number.isFinite(pv.position.x)).toBe(true);
    expect(Number.isFinite(pv.velocity.y)).toBe(true);
  });

  it('eci tolerates an out-of-range date', () => {
    expect(() => sat.eci(new Date(Date.UTC(2030, 0, 1)))).not.toThrow();
  });

  it('updatePosAndVel returns null when there are no data blocks', () => {
    sat.OemDataBlocks = [];
    expect(sat.updatePosAndVel(inRange.getTime() / 1000)).toBeNull();
  });

  it('ecef, lla, toITRF and toClassicalElements derive from the state vector', () => {
    expect(() => sat.ecef(inRange)).not.toThrow();
    expect(() => sat.lla(inRange)).not.toThrow();
    expect(() => sat.toITRF(inRange)).not.toThrow();
    expect(() => sat.toClassicalElements(inRange)).not.toThrow();
  });

  it('getOrbitPath builds a TEME path cache', () => {
    expect(sat.getOrbitPath()).toBeInstanceOf(Float32Array);
  });

  it('getRae and getTearData compute look angles for a sensor', () => {
    expect(() => sat.getRae(inRange, defaultSensor)).not.toThrow();
    expect(() => sat.getTearData(inRange, [defaultSensor])).not.toThrow();
  });

  it('type predicates report it as a satellite', () => {
    expect(sat.isSatellite()).toBe(true);
    expect(sat.isStatic()).toBe(false);
    expect(sat.isMissile()).toBe(false);
    expect(sat.isSensor()).toBe(false);
    expect(sat.isMarker()).toBe(false);
    expect(sat.isStar()).toBe(false);
    expect(sat.isGroundObject()).toBe(false);
    expect(sat.isPayload()).toBe(false);
    expect(sat.isRocketBody()).toBe(false);
    expect(sat.isDebris()).toBe(false);
  });

  it('stateVectorIdx and dataBlockIdx setters refresh the orbit cache', () => {
    expect(() => {
 sat.stateVectorIdx = 1;
}).not.toThrow();
    expect(() => {
 sat.stateVectorIdx = 1;
}).not.toThrow();
    expect(() => {
 sat.dataBlockIdx = 0;
}).not.toThrow();
    expect(sat.stateVectorIdx).toBe(1);
    expect(sat.dataBlockIdx).toBe(0);
  });
});

describe('OemSatellite runtime (eci / rae / predicates)', () => {
  // The fixture ephemeris only spans the first 60 seconds (two state vectors).
  const inRange = new Date(Date.UTC(2026, 0, 1, 0, 0, 30));

  it('eci returns a position/velocity inside the ephemeris window and null outside it', () => {
    const sat = new OemSatellite(makeOem());

    expect(sat.eci(inRange)).not.toBeNull();
    // A date well past STOP_TIME falls outside the ephemeris coverage.
    expect(sat.eci(new Date(Date.UTC(2030, 0, 1)))).toBeNull();
  });

  it('getRae returns look angles for an in-range time or null when the eci is unavailable', () => {
    const sat = new OemSatellite(makeOem());
    const rae = sat.getRae(inRange, defaultSensor);

    expect(rae === null || typeof rae.az === 'number').toBe(true);
  });

  it('getTearData returns a TearrData record for the sensor list', () => {
    const sat = new OemSatellite(makeOem());
    const tear = sat.getTearData(inRange, [defaultSensor]);

    expect(tear).toHaveProperty('time');
  });

  it('exposes consistent object-type predicates', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 25544']));

    expect(sat.isSatellite()).toBe(true);
    expect(sat.isGroundObject()).toBe(false);
    expect(sat.isSensor()).toBe(false);
    expect(sat.isMarker()).toBe(false);
    expect(sat.isStar()).toBe(false);
    expect(sat.isMissile()).toBe(false);
    expect(sat.isStatic()).toBe(false);
  });

  it('reports the fixed payload/rocket/debris predicates (always false for OEM objects)', () => {
    const sat = new OemSatellite(makeOem(['NORAD_ID = 25544']));

    expect(sat.isPayload()).toBe(false);
    expect(sat.isRocketBody()).toBe(false);
    expect(sat.isDebris()).toBe(false);
  });
});
