/* eslint-disable @typescript-eslint/no-explicit-any */
import { SatMath } from '@app/app/analysis/sat-math';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { findTca } from '@app/engine/math/tca-search';
import { CloseObjectsPlugin } from '@app/plugins/close-objects/close-objects';
import { CatalogScreener, DEFAULT_SHELL_PAD_KM, EpochUTC, Kilometers, Satellite, Seconds, TemeVec3, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

/*
 * UX validation iteration 2, scenario 3: "Find all objects within 200 km" of TEVEL2-3 (63218) at
 * 2026-10-15 06:40:31 UTC listed ION SCV-017, 246 km away. The neighbour searches tested an
 * axis-aligned cube of half-width R, whose corners reach sqrt(3) R (346 km for 200 km). Close
 * Objects now tests the true 3D distance, and its distances agree with Debris Screening's.
 */
const TLES: Record<string, [string, string]> = {
  '63218': ['1 63218U 25052J   26287.66755778  .00021227  00000+0  57454-3 0  9991', '2 63218  97.3706 183.8828 0004506  73.8412 286.3329 15.37700197 88438'],
  '63230': ['1 63230U 25052W   26289.95531293  .00004427  00000+0  16066-3 0  9990', '2 63230  97.3735 184.0358 0020940 343.6582  16.3980 15.28646924 88634'],
  '57084': ['1 57084U 23088AN  26289.70245948  .00000075  00000+0  12233-4 0  9997', '2 57084  43.0021 287.7732 0000657 278.6354  81.4424 15.27580190184302'],
};
const INSTANT_MS = Date.UTC(2026, 9, 15, 6, 40, 31);
const START_MS = Date.UTC(2026, 9, 15, 6, 15, 0);
const END_MS = START_MS + 3_600_000;

const satAt = (id: string, catalogId: number, ms: number): Satellite => {
  const sat = new Satellite({ id: catalogId, tle1: TLES[id][0] as TleLine1, tle2: TLES[id][1] as TleLine2 });

  sat.position = SatMath.getEci(sat, new Date(ms)).position as TemeVec3;

  return sat;
};
const statics = CloseObjectsPlugin as any;

describe('Close Objects distance (scenario 3)', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  it('keeps a pair inside the bounding cube but outside the radius out of the candidates', () => {
    const a = { position: { x: 0, y: 0, z: 0 }, sccNum: 'a' };
    const b = { position: { x: 40, y: 40, z: 40 }, sccNum: 'b' }; // 69.3 km away, inside a 50 km cube

    expect(statics.getPossibleCSOs_([a, b], 50)).toHaveLength(0);
    expect(statics.getPossibleCSOs_([a, b], 70)).toHaveLength(2);
  });

  it('a 200 km search at 06:40:31 keeps STARLINK-6240 (129 km) and drops ION SCV-017 (246 km)', () => {
    const list = ['63218', '63230', '57084'].map((id, i) => satAt(id, i, INSTANT_MS)).sort((p, q) => p.position.x - q.position.x);
    const pairs = statics.getPossibleCSOs_(list, 200) as { sat1: Satellite; sat2: Satellite }[];
    // Pairs with the selected satellite (the other two are also within 200 km of each other).
    const keys = new Set(pairs.filter((p) => p.sat1.sccNum === '63218' || p.sat2.sccNum === '63218').map((p) => [p.sat1.sccNum, p.sat2.sccNum].sort().join('|')));

    expect(keys).toEqual(new Set(['57084|63218']));
    expect(CloseObjectsPlugin.distanceKm(list.find((s) => s.sccNum === '63218')!.position, list.find((s) => s.sccNum === '63230')!.position)).toBeCloseTo(245.851, 2);
  });

  it('verifies 30 min after the simulation time, not the wall clock', () => {
    const timeManager = ServiceLocator.getTimeManager();
    const getOffset = vi.spyOn(timeManager, 'getOffsetTimeObj');

    statics.getActualCSOs_([], 50);
    expect(getOffset).toHaveBeenCalledWith(30 * 60 * 1000);
  });

  it('agrees with Debris Screening on the same pair: range at an instant and miss distance over a window', () => {
    // Same instant: Close Objects range (SatMath) vs the ootk TLE propagation Debris Screening uses.
    const primary = satAt('63218', 0, INSTANT_MS);
    const secondary = satAt('63230', 1, INSTANT_MS);
    const ootkPrimary = primary.toTle().propagate(EpochUTC.fromDateTime(new Date(INSTANT_MS))).position;
    const ootkSecondary = secondary.toTle().propagate(EpochUTC.fromDateTime(new Date(INSTANT_MS))).position;

    expect(CloseObjectsPlugin.distanceKm(primary.position, secondary.position)).toBeCloseTo(
      Math.hypot(ootkPrimary.x - ootkSecondary.x, ootkPrimary.y - ootkSecondary.y, ootkPrimary.z - ootkSecondary.z),
      3
    );

    // Same window: Close Objects Pro's TCA refine (findTca on SatMath ranges) vs the Debris Screening miss distance.
    const distFn = (tMs: number): number =>
      CloseObjectsPlugin.distanceKm(
        SatMath.getEci(primary, new Date(START_MS + tMs)).position as TemeVec3,
        SatMath.getEci(secondary, new Date(START_MS + tMs)).position as TemeVec3
      );
    const tca = findTca(distFn, 0, END_MS - START_MS, 60_000, 50);
    const [screening] = CatalogScreener.screenOneToMany({ tle: primary.toTle(), name: '63218' }, [{ tle: secondary.toTle(), name: '63230' }], {
      startTime: EpochUTC.fromDateTime(new Date(START_MS)),
      endTime: EpochUTC.fromDateTime(new Date(END_MS)),
      searchStepSize: 60 as Seconds,
      shellPad: (Math.hypot(500, 500, 500) + DEFAULT_SHELL_PAD_KM) as Kilometers,
    });

    expect(tca?.missKm).toBeCloseTo(screening.event.missDistance, 2);
    expect(tca?.missKm).toBeCloseTo(109.984, 1);
    expect(Math.abs(START_MS + tca!.tcaMs - screening.event.tca.toDateTime().getTime())).toBeLessThan(1000);
  });
});
