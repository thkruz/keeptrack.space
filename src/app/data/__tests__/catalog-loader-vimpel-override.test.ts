import { CatalogLoader, JsSat } from '@app/app/data/catalog-loader';
import { CatalogSource, Satellite, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
import { setupStandardEnvironment } from '@test/environment/standard-env';

const ISS_TLE1 = '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9002';
const ISS_TLE2 = '2 25544  51.6400 208.9163 0006703 300.3030  59.7403 15.49560830434827';

function checksum(body: string): number {
  let sum = 0;

  for (const ch of body.substring(0, 68)) {
    if (ch >= '0' && ch <= '9') {
      sum += Number(ch);
    } else if (ch === '-') {
      sum += 1;
    }
  }

  return sum % 10;
}

/** Line 1 with its epoch moved to `daysAgo` days before now. */
function line1At(base: string, daysAgo: number): TleLine1 {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = (d.getTime() - startOfYear) / 86_400_000 + 1;
  const epoch = `${String(d.getUTCFullYear() % 100).padStart(2, '0')}${doy.toFixed(8).padStart(12, '0')}`;
  const body = `${base.substring(0, 18)}${epoch}${base.substring(32, 68)}`;

  return `${body}${checksum(body)}` as TleLine1;
}

// Vimpel writes its own object number (78304) where the designator goes.
const vimpelLine1 = (daysAgo: number) => line1At('1 25544V 78304    26272.19097222 +.00000000 +00000+0 +00000-0 0  9997', daysAgo);

type LoaderInternals = {
  createSatellite_: (params: ConstructorParameters<typeof Satellite>[0]) => Satellite;
  applyVimpelOverride_: (existing: Satellite, element: JsSat) => void;
};
const loader = CatalogLoader as unknown as LoaderInternals;

const catalogSat = (daysAgo: number) =>
  new Satellite({ id: 0, name: 'ISS', sccNum: '25544', tle1: line1At(ISS_TLE1, daysAgo), tle2: ISS_TLE2 as TleLine2, source: CatalogSource.USSF });

describe('CatalogLoader Vimpel override', () => {
  beforeAll(() => {
    setupStandardEnvironment();
  });

  it('hasRealSccNum separates real NORAD numbers from synthetic JSC objects', () => {
    expect(CatalogLoader.hasRealSccNum('25544')).toBe(true);
    expect(CatalogLoader.hasRealSccNum('00000')).toBe(false);
    expect(CatalogLoader.hasRealSccNum('')).toBe(false);
    expect(CatalogLoader.hasRealSccNum(undefined)).toBe(false);
  });

  it('keeps the NORAD number in the TLE of a real object served from Vimpel', () => {
    const sat = loader.createSatellite_({ id: 0, name: 'X', sccNum: '25544', tle1: vimpelLine1(15), tle2: ISS_TLE2 as TleLine2, source: CatalogSource.VIMPEL });

    expect(sat.source).toBe(CatalogSource.VIMPEL);
    expect(sat.sccNum).toBe('25544');
    expect(sat.tle1.substring(2, 7)).toBe('25544');
  });

  it('still zeroes the TLE number of a synthetic Vimpel object', () => {
    const sat = loader.createSatellite_({ id: 0, name: 'JSC', sccNum: '00000', tle1: vimpelLine1(15), tle2: ISS_TLE2 as TleLine2, source: CatalogSource.VIMPEL });

    expect(sat.source).toBe(CatalogSource.VIMPEL);
    expect(sat.tle1.substring(2, 7)).toBe('00000');
  });

  it('swaps a catalog elset over 30 days old for a newer Vimpel elset', () => {
    const sat = catalogSat(400);
    const intlDes = sat.intlDes;

    loader.applyVimpelOverride_(sat, { TLE1: vimpelLine1(15), TLE2: ISS_TLE2 } as JsSat);

    expect(sat.source).toBe(CatalogSource.VIMPEL);
    expect(sat.ageOfElset(new Date(), 'days')).toBeCloseTo(15, 0);
    expect(sat.sccNum).toBe('25544');
    expect(sat.intlDes).toBe(intlDes);
  });

  it('keeps a fresh catalog elset', () => {
    const sat = catalogSat(2);
    const tle1 = sat.tle1;

    loader.applyVimpelOverride_(sat, { TLE1: vimpelLine1(1), TLE2: ISS_TLE2 } as JsSat);

    expect(sat.source).toBe(CatalogSource.USSF);
    expect(sat.tle1).toBe(tle1);
  });

  it('keeps a stale catalog elset when the Vimpel one is older', () => {
    const sat = catalogSat(60);
    const tle1 = sat.tle1;

    loader.applyVimpelOverride_(sat, { TLE1: vimpelLine1(90), TLE2: ISS_TLE2 } as JsSat);

    expect(sat.source).toBe(CatalogSource.USSF);
    expect(sat.tle1).toBe(tle1);
  });
});
