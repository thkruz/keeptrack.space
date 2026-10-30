import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { ProximityOps } from '@app/plugins/proximity-ops/proximity-ops';
import { computeEventPc, findRpoPairs, RpoSearchParams } from '@app/plugins/proximity-ops/proximity-ops-core';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Satellite, TleLine1, TleLine2 } from '@ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** Recomputes the TLE checksum digit (column 69) after editing a line. */
const withChecksum = (line: string): string => {
  const body = line.slice(0, 68);
  let sum = 0;

  for (const ch of body) {
    if (ch >= '0' && ch <= '9') {
      sum += parseInt(ch, 10);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return `${body}${sum % 10}`;
};

/*
 * The ISS pair of the Pc goldens (debris-screening and TOCA/POCA): 90001 meets 25544 at about
 * 12:47 UTC with a Pc near 2e-4. The primary here is an analyst clone of 25544 whose fitted TLE
 * has BSTAR 0, so its own TLE-derived covariance differs from its parent's.
 */
const PARENT_TLE1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const PARENT_TLE2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537';
const CLONE_TLE1 = withChecksum('1 90000U 98067A   08264.51782528  .00000000  00000-0  00000-0 0  2920');
const CLONE_TLE2 = withChecksum(PARENT_TLE2.replace('2 25544', '2 90000'));
const SEC_TLE1 = '1 90001U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927';
const SEC_TLE2 = '2 90001  53.6416 247.4627 0006703 130.5360 325.0298 15.72125391563530';
const APPROACH = new Date('2008-09-20T12:47:07.042Z');
const EPOCH_MS = Date.UTC(2008, 8, 20, 12, 25, 40, 104);

describe('proximity-ops-core: analyst clone Pc uses the parent covariance', () => {
  const clone = new Satellite({ id: 7, name: 'ISS (burn 1)', tle1: CLONE_TLE1 as TleLine1, tle2: CLONE_TLE2 as TleLine2 });
  const secondary = new Satellite({ id: 8, name: 'TEST 90001', tle1: SEC_TLE1 as TleLine1, tle2: SEC_TLE2 as TleLine2 });
  const parentTles = { '7': { tle1: PARENT_TLE1, tle2: PARENT_TLE2 } };

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(EPOCH_MS + 86_400_000);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('computes a different Pc when the clone takes its parent covariance', () => {
    const own = computeEventPc(clone, secondary, APPROACH, 1);
    const assumed = computeEventPc(clone, secondary, APPROACH, 1, parentTles);

    expect(typeof own).toBe('number');
    expect(typeof assumed).toBe('number');
    expect(assumed!).toBeGreaterThan(0);
    expect(assumed).not.toBe(own);
  });

  it('keeps an object without a covariance-TLE entry (keyed by catalog id) on its own covariance', () => {
    expect(computeEventPc(clone, secondary, APPROACH, 1, { '999': { tle1: PARENT_TLE1, tle2: PARENT_TLE2 } })).toBe(computeEventPc(clone, secondary, APPROACH, 1));
  });

  it('findRpoPairs passes the covariance TLEs through to the Pc of reported events', () => {
    const params: RpoSearchParams = {
      maxDis: 1e6,
      maxVel: 1e6,
      durationSec: 3600,
      baseTimeMs: APPROACH.getTime() - 1_800_000,
      stepSeconds: 60,
      refineToleranceMs: 500,
      confidenceLevel: 1,
    };
    const [own] = findRpoPairs([clone, secondary], params, new Date(params.baseTimeMs), false);
    const [assumed] = findRpoPairs([clone, secondary], { ...params, covarianceTles: parentTles }, new Date(params.baseTimeMs), false);

    expect(assumed.date.getTime()).toBe(own.date.getTime());
    expect(assumed.pc).toBe(computeEventPc(clone, secondary, assumed.date, 1, parentTles));
    expect(assumed.pc).not.toBe(own.pc);
  });
});

describe('ProximityOps: analyst clone uncertainty from the parent', () => {
  let plugin: ProximityOps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const parent = new Satellite({ id: 3, name: 'ISS (ZARYA)', tle1: PARENT_TLE1 as TleLine1, tle2: PARENT_TLE2 as TleLine2 });
  const clone = new Satellite({ id: 7, name: 'ISS (burn 1)', tle1: CLONE_TLE1 as TleLine1, tle2: CLONE_TLE2 as TleLine2 });
  const secondary = new Satellite({ id: 8, name: 'TEST 90001', tle1: SEC_TLE1 as TleLine1, tle2: SEC_TLE2 as TleLine2 });

  clone.derivedFromSccNum = '25544';

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'sccNum2Sat').mockImplementation(((scc: string) => (scc === '25544' ? parent : null)) as never);
    plugin = new ProximityOps();
    websiteInit(plugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const rpo = (sat1: Satellite, sat2: Satellite) => ({
    sat1Id: sat1.id,
    sat1SccNum: sat1.sccNum,
    sat1Name: sat1.name,
    sat2Id: sat2.id,
    sat2SccNum: sat2.sccNum,
    sat2Name: sat2.name,
    date: APPROACH,
    ric: { position: { x: 1, y: 2, z: 3 }, velocity: { x: 0, y: 0, z: 0 } },
    dist: 1,
    vel: 0.1,
    pc: null,
  });

  it('hands the clone parent TLE to the search, keyed by catalog id', () => {
    const request = { sats: [clone, secondary], params: { confidenceLevel: 1 } as RpoSearchParams };

    p().applyCovarianceSources_(request);

    expect(request.params.covarianceTles).toEqual({ '7': { tle1: PARENT_TLE1, tle2: PARENT_TLE2 } });
  });

  it('sends no covariance TLEs when no searched object is a clone', () => {
    const request = { sats: [parent, secondary], params: { confidenceLevel: 1 } as RpoSearchParams };

    p().applyCovarianceSources_(request);

    expect(request.params.covarianceTles).toBeUndefined();
  });

  it('notes the assumed parent under the results count when a reported approach involves the clone', () => {
    p().applyCovarianceSources_({ sats: [clone, secondary], params: {} as RpoSearchParams });
    p().finalizeResults_([rpo(clone, secondary)]);

    const note = getEl('proximity-ops-uncertainty-note')!;

    expect(note.style.display).toBe('');
    expect(note.textContent).toBe('Uncertainty assumed from parent ISS (ZARYA) (25544)');

    p().finalizeResults_([rpo(parent, secondary)]);
    expect(note.style.display).toBe('none');
  });
});
