import { CatalogLoader, KeepTrackTLEFile } from '@app/app/data/catalog-loader';
import { CatalogManager } from '@app/app/data/catalog-manager';
import {
  DEFAULT_DOCK_TOLERANCE,
  elsetsMatch,
  findDockedVehicles,
  getDockedHost,
  getDockedHostLabel,
  isDocked,
  parseElset,
  refreshDockedVehicles,
  setDockedVehicles,
} from '@app/app/data/docked-vehicles';
import { Pickable } from '@app/engine/core/interfaces';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';

// Real elsets from the 2026-03 catalog snapshot (public/tle/tle.json).
const ISS = { tle1: '1 25544U 98067A   26068.70691881  .00010000  00000-0  10000-3 0  9990', tle2: '2 25544  51.6323  72.2710 0008020 174.6781 185.4294 15.48547200556336' };
// Docked Crew Dragon: a copy of the host's elset (same epoch, same six elements, different rev count).
const DRAGON = { tle1: '1 67796U 26001A   26068.70691881  .00010000  00000-0  10000-3 0  9990', tle2: '2 67796  51.6323  72.2710 0008020 174.6781 185.4294 15.48547200556229' };
// HTV-X1 is docked but carries its own older fit: RAAN +1.3, mean anomaly +1.1 deg.
const HTV = { tle1: '1 66174U 25001A   26068.44878279  .00010000  00000-0  10000-3 0  9990', tle2: '2 66174  51.6321  73.5472 0008026 173.5451 186.5642 15.48542052554477' };
// Free-flying ISS OBJECT with a recent elset on the same inclination.
const ISS_OBJECT = { tle1: '1 67683U 26001B   26068.27683825  .00010000  00000-0  10000-3 0  9990', tle2: '2 67683  51.6309  73.9008 0009391 184.4289 175.6619 15.51788436  4727' };
const CSS = { tle1: '1 48274U 21035A   26068.58759433  .00010000  00000-0  10000-3 0  9990', tle2: '2 48274  41.4666 208.7841 0006982 272.7102  87.2938 15.60651211277595' };
const TIANZHOU = { tle1: '1 64786U 25001A   26068.58759433  .00010000  00000-0  10000-3 0  9990', tle2: '2 64786  41.4666 208.7841 0006982 272.7102  87.2938 15.60651211277300' };

const obj = (id: number, sccNum: string, t: { tle1: string; tle2: string }) => ({ id, sccNum, ...t });

describe('parseElset', () => {
  it('reads the six elements, the epoch and the mean motion', () => {
    const e = parseElset(ISS.tle1, ISS.tle2)!;

    expect(e.inclination).toBeCloseTo(51.6323, 4);
    expect(e.raan).toBeCloseTo(72.271, 3);
    expect(e.eccentricity).toBeCloseTo(0.000802, 7);
    expect(e.argPerigee).toBeCloseTo(174.6781, 4);
    expect(e.meanAnomaly).toBeCloseTo(185.4294, 4);
    expect(e.meanMotion).toBeCloseTo(15.485472, 6);
  });

  it('puts the epoch on a continuous day scale across a year change', () => {
    const dec = parseElset('1 25544U 98067A   25365.50000000  .0  0  0 0  9990', ISS.tle2)!;
    const jan = parseElset('1 25544U 98067A   26001.50000000  .0  0  0 0  9990', ISS.tle2)!;

    expect(jan.epochDays - dec.epochDays).toBeCloseTo(1, 6);
  });

  it('returns null for missing or malformed lines', () => {
    expect(parseElset(undefined, ISS.tle2)).toBeNull();
    expect(parseElset(ISS.tle1, 'short')).toBeNull();
    expect(parseElset(ISS.tle1, `${ISS.tle2.substring(0, 8)}  bad${ISS.tle2.substring(14)}`)).toBeNull();
  });
});

describe('elsetsMatch', () => {
  const host = parseElset(ISS.tle1, ISS.tle2)!;

  it('matches the host against itself and a copied elset', () => {
    expect(elsetsMatch(host, host)).toBe(true);
    expect(elsetsMatch(parseElset(DRAGON.tle1, DRAGON.tle2)!, host)).toBe(true);
  });

  it('rejects a vehicle on its own older fit (HTV-X1) and a free-flying ISS OBJECT', () => {
    expect(elsetsMatch(parseElset(HTV.tle1, HTV.tle2)!, host)).toBe(false);
    expect(elsetsMatch(parseElset(ISS_OBJECT.tle1, ISS_OBJECT.tle2)!, host)).toBe(false);
  });

  it.each([
    ['inclination', { inclination: host.inclination + DEFAULT_DOCK_TOLERANCE.inclination * 2 }],
    ['RAAN', { raan: host.raan + DEFAULT_DOCK_TOLERANCE.raan * 2 }],
    ['eccentricity', { eccentricity: host.eccentricity + DEFAULT_DOCK_TOLERANCE.eccentricity * 2 }],
    ['argument of perigee', { argPerigee: host.argPerigee + DEFAULT_DOCK_TOLERANCE.argPerigee * 2 }],
    ['mean anomaly', { meanAnomaly: host.meanAnomaly + DEFAULT_DOCK_TOLERANCE.meanAnomaly * 2 }],
    ['mean motion', { meanMotion: host.meanMotion + DEFAULT_DOCK_TOLERANCE.meanMotion * 2 }],
    ['epoch', { epochDays: host.epochDays + DEFAULT_DOCK_TOLERANCE.epochDays + 0.5 }],
  ])('rejects a difference in %s alone', (_name, change) => {
    expect(elsetsMatch({ ...host, ...change }, host)).toBe(false);
  });

  it('accepts differences inside every tolerance, and wraps angles at 360', () => {
    const near = {
      ...host,
      epochDays: host.epochDays + 0.5,
      inclination: host.inclination + 0.004,
      raan: host.raan + 0.009,
      eccentricity: host.eccentricity + 1e-5,
      argPerigee: host.argPerigee + 0.09,
      meanAnomaly: host.meanAnomaly + 0.04,
      meanMotion: host.meanMotion + 4e-6,
    };

    expect(elsetsMatch(near, host)).toBe(true);
    expect(elsetsMatch({ ...host, raan: 359.995 }, { ...host, raan: 0.003 })).toBe(true);
  });
});

describe('findDockedVehicles', () => {
  const catalog = [
    obj(0, '25544', ISS),
    obj(1, '67796', DRAGON),
    obj(2, '66174', HTV),
    obj(3, '67683', ISS_OBJECT),
    obj(4, '48274', CSS),
    obj(5, '64786', TIANZHOU),
    obj(6, '99999', { tle1: '', tle2: '' }),
  ];

  it('folds vehicles whose elset equals a host and nothing else', () => {
    const docked = findDockedVehicles(catalog);

    expect([...docked.entries()]).toEqual([
      [1, '25544'],
      [5, '48274'],
    ]);
  });

  it('never marks a host itself as docked', () => {
    expect(findDockedVehicles(catalog).has(0)).toBe(false);
    expect(findDockedVehicles(catalog).has(4)).toBe(false);
  });

  it('folds nothing when no host is in the catalog', () => {
    expect(findDockedVehicles(catalog.slice(1, 4)).size).toBe(0);
  });

  it('shows the vehicle again once its elset diverges (re-evaluated on reload)', () => {
    refreshDockedVehicles(catalog);
    expect(isDocked(1)).toBe(true);
    expect(getDockedHost(1)).toBe('25544');
    expect(getDockedHostLabel(5)).toBe('Tiangong');

    const undocked = catalog.map((o) => (o.id === 1 ? obj(1, '67796', { tle1: DRAGON.tle1, tle2: DRAGON.tle2.replace(' 72.2710 ', ' 75.0000 ') }) : o));

    refreshDockedVehicles(undocked);
    expect(isDocked(1)).toBe(false);
    expect(getDockedHostLabel(1)).toBeUndefined();
  });
});

describe('docked vehicles stay in the catalog but lose their dot (#463)', () => {
  afterEach(() => {
    setDockedVehicles(new Map());
  });

  it('the loader keeps a docked vehicle (modules are dropped, vehicles are not)', () => {
    setupStandardEnvironment();
    const catalog = new CatalogManager();

    catalog.objectCache = [];
    catalog.sccIndex = {};
    catalog.cosparIndex = {};
    const loader = CatalogLoader as unknown as {
      processAllSats_: (resp: KeepTrackTLEFile[], i: number, c: CatalogManager, t: unknown[], n: number) => void;
    };
    const rows = [
      { name: 'ISS (ZARYA)', sccNum: '25544', ...ISS },
      { name: 'CREW DRAGON 12', sccNum: '67796', ...DRAGON },
    ] as KeepTrackTLEFile[];
    const temp: { sccNum: string }[] = [];

    rows.forEach((_, i) => loader.processAllSats_(rows, i, catalog, temp, 0));

    expect(temp.map((o) => o.sccNum)).toEqual(['25544', '67796']);
  });

  it('the color manager returns a transparent, unpickable dot for a docked vehicle only', () => {
    setupStandardEnvironment();
    setDockedVehicles(new Map([[1, '25544']]));
    const manager = new ColorSchemeManager() as unknown as { getColorIfDisabledSat_: (d: unknown[], i: number) => { color: number[]; pickable: Pickable } | null };
    const data = [{ id: 0 }, { id: 1 }];

    expect(manager.getColorIfDisabledSat_(data, 1)).toEqual({ color: [0, 0, 0, 0], pickable: Pickable.No });
    expect(manager.getColorIfDisabledSat_(data, 0)).not.toEqual({ color: [0, 0, 0, 0], pickable: Pickable.No });
  });
});
