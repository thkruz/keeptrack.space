import { CatalogLoader, JsSat, KeepTrackTLEFile } from '@app/app/data/catalog-loader';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { isSyntheticVimpel } from '@app/app/data/synthetic-vimpel';
import { BaseObject, CatalogSource, Satellite, TleLine1, TleLine2 } from '@app/engine/ootk/src/main';
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

/*
 * Vimpel id 26100 sits where the designator goes; ootk would read it as
 * "2026-100", which is a real launch designator.
 */
const syntheticVimpelLine1 = (daysAgo: number) => line1At('1 00000V 26100    26272.19097222 +.00000000 +00000+0 +00000-0 0  9997', daysAgo);
// A Vimpel elset for a real NORAD object (78304 in the designator field).
const realVimpelLine1 = (daysAgo: number) => line1At('1 25544V 78304    26272.19097222 +.00000000 +00000+0 +00000-0 0  9997', daysAgo);

type LoaderInternals = {
  createSatellite_: (params: ConstructorParameters<typeof Satellite>[0]) => Satellite;
  processJsCatalog_: (jsCatalog: JsSat[], catalogManagerInstance: CatalogManager, tempObjData: BaseObject[]) => void;
  processAllSats_: (resp: KeepTrackTLEFile[], i: number, catalogManagerInstance: CatalogManager, tempObjData: BaseObject[], notionalSatNum: number) => void;
};
const loader = CatalogLoader as unknown as LoaderInternals;

const freshCatalog = (): CatalogManager => {
  const catalog = new CatalogManager();

  catalog.objectCache = [];
  catalog.sccIndex = {};
  catalog.cosparIndex = {};

  return catalog;
};

describe('CatalogLoader synthetic JSC Vimpel COSPAR', () => {
  beforeAll(() => {
    setupStandardEnvironment();
  });

  it('isSyntheticVimpel only flags Vimpel objects without a real NORAD number', () => {
    expect(isSyntheticVimpel({ source: CatalogSource.VIMPEL, sccNum: '' })).toBe(true);
    expect(isSyntheticVimpel({ source: CatalogSource.VIMPEL, sccNum: '0' })).toBe(true);
    expect(isSyntheticVimpel({ source: CatalogSource.VIMPEL, sccNum: '00000' })).toBe(true);
    expect(isSyntheticVimpel({ source: CatalogSource.VIMPEL, sccNum: '25544' })).toBe(false);
    expect(isSyntheticVimpel({ source: CatalogSource.USSF, sccNum: '' })).toBe(false);
    expect(isSyntheticVimpel(null)).toBe(false);
  });

  it('clears the designator ootk parses from a vimpel.json object and never indexes it', () => {
    const catalog = freshCatalog();
    const tempObjData: BaseObject[] = [];

    loader.processJsCatalog_([{ TLE1: syntheticVimpelLine1(10), TLE2: ISS_TLE2 }], catalog, tempObjData);

    expect(tempObjData).toHaveLength(1);
    const sat = tempObjData[0] as Satellite;

    expect(sat.source).toBe(CatalogSource.VIMPEL);
    expect(sat.altId).toBe('26100');
    expect(sat.intlDes).toBe('');
    expect(Object.keys(catalog.cosparIndex)).not.toContain('2026-100');

    catalog.objectCache = tempObjData;
    expect(catalog.intlDes2id('2026-100')).toBeNull();
  });

  it('keeps the real COSPAR ID of a catalog object that takes a Vimpel elset override', () => {
    const catalog = freshCatalog();
    const real = new Satellite({ id: 0, name: 'ISS', sccNum: '25544', tle1: line1At(ISS_TLE1, 400), tle2: ISS_TLE2 as TleLine2, source: CatalogSource.USSF });

    catalog.sccIndex['25544'] = 0;
    catalog.cosparIndex[real.intlDes] = 0;
    const tempObjData: BaseObject[] = [real];

    loader.processJsCatalog_([{ TLE1: realVimpelLine1(15), TLE2: ISS_TLE2 }], catalog, tempObjData);

    expect(real.source).toBe(CatalogSource.VIMPEL);
    expect(real.intlDes).toBe('1998-067A');
    expect(catalog.intlDes2id('1998-067A')).toBe(0);
    expect(catalog.intlDes2id('1978-304')).toBeNull();
  });

  it('createSatellite_ blanks a synthetic Vimpel designator but keeps a real one', () => {
    const synthetic = loader.createSatellite_({ id: 0, name: 'JSC', sccNum: '00000', tle1: syntheticVimpelLine1(15), tle2: ISS_TLE2 as TleLine2, source: CatalogSource.VIMPEL });
    // The API rewrites the real designator into line 1 for overridden objects.
    const real = loader.createSatellite_({ id: 1, name: 'ISS', sccNum: '25544', tle1: line1At(ISS_TLE1, 15), tle2: ISS_TLE2 as TleLine2, source: CatalogSource.VIMPEL });

    expect(synthetic.intlDes).toBe('');
    expect(real.intlDes).toBe('1998-067A');
  });

  it('does not index an API-served synthetic Vimpel row under its Vimpel id', () => {
    const catalog = freshCatalog();
    const tempObjData: BaseObject[] = [];
    const resp: KeepTrackTLEFile[] = [
      {
        name: 'JSC Vimpel 26100',
        sccNum: '',
        altId: '26100',
        tle1: syntheticVimpelLine1(10),
        tle2: ISS_TLE2 as TleLine2,
        source: CatalogSource.VIMPEL,
      } as KeepTrackTLEFile,
    ];

    loader.processAllSats_(resp, 0, catalog, tempObjData, 0);

    expect(tempObjData).toHaveLength(1);
    expect((tempObjData[0] as Satellite).intlDes).toBe('');
    expect(Object.keys(catalog.cosparIndex)).toHaveLength(0);
    expect(catalog.intlDes2id('2026-100')).toBeNull();
  });
});
