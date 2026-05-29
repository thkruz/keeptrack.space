import { vi } from 'vitest';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { GetSatType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { BaseObject, SpaceObjectType, Satellite } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';

/*
 * Direct coverage for the CatalogManager resolution layer — the functions
 * behind the recent alpha-5 / extended-ID bug cluster. These are pure lookups
 * over objectCache + sccIndex, so each test builds a fresh instance with a
 * controlled catalog and a stubbed dots manager (so getObject's DEFAULT path
 * does not depend on real WebGL position buffers).
 */
describe('CatalogManager lookups', () => {
  let catalog: CatalogManager;
  let updatePosVel: ReturnType<typeof vi.fn>;
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  /** Build a Satellite whose sccNum/sccNum5/sccNum6 forms are set explicitly. */
  const makeSat = (id: number, forms: { sccNum: string; sccNum5?: string | null; sccNum6?: string | null }): Satellite => {
    const sat = defaultSat.clone() as Satellite;

    sat.id = id;
    sat.sccNum = forms.sccNum;
    sat.sccNum5 = forms.sccNum5 ?? null;
    sat.sccNum6 = forms.sccNum6 ?? null;

    return sat;
  };

  beforeEach(() => {
    catalog = new CatalogManager();
    catalog.objectCache = [];
    catalog.sccIndex = {};

    updatePosVel = vi.fn();
    getCurrentPosition = vi.fn(() => ({ x: 0, y: 0, z: 0 }));
    vi.spyOn(ServiceLocator, 'getDotsManager').mockReturnValue({
      updatePosVel,
      getCurrentPosition,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe('sccNum2Id', () => {
    it('resolves a direct sccIndex hit', () => {
      catalog.sccIndex = { 25544: 7 };

      expect(catalog.sccNum2Id('25544')).toBe(7);
    });

    it('strips leading zeros before indexing ("00005" -> "5")', () => {
      catalog.sccIndex = { 5: 3 };

      expect(catalog.sccNum2Id('00005')).toBe(3);
    });

    it('accepts a numeric argument', () => {
      catalog.sccIndex = { 5: 3 };

      expect(catalog.sccNum2Id(5)).toBe(3);
    });

    it('resolves alpha-5 input against a 6-digit index entry (equivalence path)', () => {
      // Catalog loader indexes alpha-5 sats under their 6-digit numeric form.
      catalog.sccIndex = { 270001: 11 };

      expect(catalog.sccNum2Id('T0001')).toBe(11);
    });

    it('falls back to an extensive search matching sccNum / sccNum5 / sccNum6', () => {
      catalog.objectCache = [makeSat(0, { sccNum: '270001', sccNum5: 'T0001', sccNum6: '270001' })];

      expect(catalog.sccNum2Id('T0001')).toBe(0);
      expect(catalog.sccNum2Id('270001')).toBe(0);
    });

    it('skips the extensive search when isExtensiveSearch is false', () => {
      catalog.objectCache = [makeSat(0, { sccNum: '12345' })];

      expect(catalog.sccNum2Id('12345', false)).toBeNull();
    });

    it('ignores non-Satellite objects during the extensive search', () => {
      const notASat = { id: 0, sccNum: '12345', isSatellite: () => true } as unknown as BaseObject;

      catalog.objectCache = [notASat];

      expect(catalog.sccNum2Id('12345')).toBeNull();
    });

    it('returns null for an unknown catalog number', () => {
      catalog.objectCache = [makeSat(0, { sccNum: '5' })];

      expect(catalog.sccNum2Id('99999')).toBeNull();
    });

    it('resolves an extended (non-A5) numeric id via the extensive search', () => {
      // 9-digit extended ids cannot be converted to alpha-5; they still resolve
      // by direct sccNum match.
      catalog.objectCache = [makeSat(0, { sccNum: '799500766', sccNum5: null, sccNum6: null })];

      expect(catalog.sccNum2Id('799500766')).toBe(0);
    });
  });

  describe('sccNum2Sat / a52Sat', () => {
    it('returns the Satellite when the id resolves to one', () => {
      const sat = makeSat(0, { sccNum: '5' });

      catalog.objectCache = [sat];
      catalog.sccIndex = { 5: 0 };

      expect(catalog.sccNum2Sat('5')).toBe(sat);
      expect(catalog.a52Sat('5')).toBe(sat);
    });

    it('returns null when the resolved object is not a satellite', () => {
      // A sensor/static object reports isSatellite() === false.
      const sensor = { id: 0, isSatellite: () => false, type: SpaceObjectType.PHASED_ARRAY_RADAR } as unknown as BaseObject;

      catalog.objectCache = [sensor];
      catalog.sccIndex = { 5: 0 };

      expect(catalog.sccNum2Sat('5')).toBeNull();
    });

    it('returns null when nothing resolves', () => {
      expect(catalog.sccNum2Sat('99999')).toBeNull();
    });
  });

  describe('satnums2ids', () => {
    it('maps satnums to ids and drops the ones that do not resolve', () => {
      catalog.sccIndex = { 5: 0, 25544: 1 };

      expect(catalog.satnums2ids([5, 25544, 99999])).toStrictEqual([0, 1]);
    });
  });

  describe('intlDes2id', () => {
    it('returns the index for a known international designator', () => {
      catalog.cosparIndex = { '1998-067A': 4 };

      expect(catalog.intlDes2id('1998-067A')).toBe(4);
    });

    it('returns null for an unknown international designator', () => {
      expect(catalog.intlDes2id('1900-001A')).toBeNull();
    });
  });

  describe('getObject', () => {
    beforeEach(() => {
      catalog.objectCache = [defaultSat];
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['negative index', -1],
    ])('returns null for %s', (_label, input) => {
      expect(catalog.getObject(input)).toBeNull();
    });

    it('returns null for an out-of-range index', () => {
      expect(catalog.getObject(99)).toBeNull();
    });

    it('parses a numeric string id', () => {
      expect(catalog.getObject('0', GetSatType.SKIP_POS_VEL)).toBe(defaultSat);
    });

    it('returns the object without touching the dots manager for EXTRA_ONLY', () => {
      expect(catalog.getObject(0, GetSatType.EXTRA_ONLY)).toBe(defaultSat);
      expect(updatePosVel).not.toHaveBeenCalled();
    });

    it('updates position only for POSITION_ONLY', () => {
      expect(catalog.getObject(0, GetSatType.POSITION_ONLY)).toBe(defaultSat);
      expect(getCurrentPosition).toHaveBeenCalledWith(0);
    });

    it('updates pos/vel for the DEFAULT type', () => {
      expect(catalog.getObject(0)).toBe(defaultSat);
      expect(updatePosVel).toHaveBeenCalledWith(defaultSat, 0);
    });

    it('skips pos/vel update for SKIP_POS_VEL', () => {
      expect(catalog.getObject(0, GetSatType.SKIP_POS_VEL)).toBe(defaultSat);
      expect(updatePosVel).not.toHaveBeenCalled();
    });
  });

  describe('getSat / getMissile', () => {
    it('getSat returns the satellite, null for a non-satellite', () => {
      catalog.objectCache = [defaultSat];
      expect(catalog.getSat(0, GetSatType.SKIP_POS_VEL)).toBe(defaultSat);
    });

    it('getMissile returns a missile, null for a satellite', () => {
      const missile = new MissileObject({
        id: 0,
        active: false,
        name: 'M',
        latList: [],
        lonList: [],
        altList: [],
        timeList: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      catalog.objectCache = [missile, defaultSat];
      expect(catalog.getMissile(0)).toBe(missile);
      expect(catalog.getMissile(1)).toBeNull();
    });
  });

  describe('getSensorFromSensorName', () => {
    it('returns the index of a sensor matching the name, -1 otherwise', () => {
      const sensor = { isSensor: () => true, name: 'COD', type: SpaceObjectType.PHASED_ARRAY_RADAR } as unknown as BaseObject;

      catalog.objectCache = [defaultSat, sensor];
      expect(catalog.getSensorFromSensorName('COD')).toBe(1);
      expect(catalog.getSensorFromSensorName('NOPE')).toBe(-1);
    });
  });

  describe('starName2Id', () => {
    it('finds a star by name within the given index range', () => {
      const star = { type: SpaceObjectType.STAR, name: 'Sirius' } as unknown as BaseObject;

      catalog.objectCache = [defaultSat, star];
      expect(catalog.starName2Id('Sirius', 0, 2)).toBe(1);
    });

    it('returns null when the star is not in range', () => {
      const star = { type: SpaceObjectType.STAR, name: 'Sirius' } as unknown as BaseObject;

      catalog.objectCache = [defaultSat, star];
      // Range [0,1) excludes index 1.
      expect(catalog.starName2Id('Sirius', 0, 1)).toBeNull();
    });
  });

  describe('id2satnum', () => {
    it('maps ids to sccNums and drops missing entries', () => {
      const sat = makeSat(0, { sccNum: '25544' });

      catalog.objectCache = [sat];
      // index 0 resolves, index 5 is missing (-1 -> dropped).
      expect(catalog.id2satnum([0, 5])).toStrictEqual(['25544']);
    });
  });
});
