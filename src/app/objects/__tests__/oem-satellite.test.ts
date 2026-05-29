import { OemSatellite, ParsedOem } from '@app/app/objects/oem-satellite';
import { EpochUTC, J2000, Kilometers, KilometersPerSecond, Seconds, SpaceObjectType, Vector3D } from '@ootk/src/main';

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
