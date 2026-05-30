import { vi } from 'vitest';
import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { MissileObject } from '@app/app/data/catalog-manager/MissileObject';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { Satellite, SpaceObjectType, TleLine1 } from '@ootk/src/main';
import { defaultSat } from '@test/environment/apiMocks';

/*
 * ObjectGroup turns a query (year, name regex, country, shape, …) into a list
 * of internal catalog ids by delegating to CatalogManager + CatalogSearch. The
 * SCC_NUM path is exercised separately in object-group-sccnum.test.ts; this
 * file pins the wiring of every other GroupType plus hasObject/updateOrbits.
 */
describe('ObjectGroup', () => {
  // sat0: 1998 PAYLOAD, USA, Box/BusA, named ALPHA.
  // sat1: 2005 ROCKET_BODY, CN, Sphere/BusB, named BETA DEB.
  let sat0: Satellite;
  let sat1: Satellite;
  let intlDes2id: ReturnType<typeof vi.fn>;

  const buildSat = (id: number, overrides: Partial<Satellite>, tleYear: string): Satellite => {
    const sat = defaultSat.clone() as Satellite;

    sat.id = id;
    // CatalogSearch.year reads the 2-digit year from TLE1 columns 10-11.
    sat.tle1 = `1 25544U ${tleYear}067A   21203.40407588  .00003453  00000-0  71172-4 0  9991` as TleLine1;
    Object.assign(sat, overrides);

    return sat;
  };

  let catalogStub: {
    objectCache: unknown[];
    getSats: () => Satellite[];
    intlDes2id: (intlDes: string) => number | null;
    sccNum2Id: (scc: string | number) => number | null;
  };

  beforeEach(() => {
    sat0 = buildSat(0, { country: 'US', shape: 'Box', bus: 'BusA', type: SpaceObjectType.PAYLOAD, name: 'ALPHA' } as Partial<Satellite>, '98');
    sat1 = buildSat(1, { country: 'CN', shape: 'Sphere', bus: 'BusB', type: SpaceObjectType.ROCKET_BODY, name: 'BETA DEB' } as Partial<Satellite>, '05');

    intlDes2id = vi.fn((intlDes: string) => (intlDes === '1998-067A' ? 0 : null));

    catalogStub = {
      objectCache: [sat0, sat1],
      getSats: () => [sat0, sat1],
      intlDes2id,
      sccNum2Id: vi.fn(() => null),
    };

    vi.spyOn(ServiceLocator, 'getCatalogManager').mockReturnValue(catalogStub as never);
  });

  it('ALL collects every satellite id', () => {
    const group = new ObjectGroup(GroupType.ALL);

    expect(group.ids).toStrictEqual([0, 1]);
  });

  it('YEAR keeps only sats launched in the given year', () => {
    const group = new ObjectGroup(GroupType.YEAR, 98);

    expect(group.ids).toStrictEqual([0]);
  });

  it('YEAR_OR_LESS filters out static objects', () => {
    sat1.isStatic = () => true;
    const group = new ObjectGroup(GroupType.YEAR_OR_LESS, 99);

    expect(group.ids).toContain(0);
    expect(group.ids).not.toContain(1);
  });

  it('INTLDES resolves designators and drops unresolved ones', () => {
    const group = new ObjectGroup(GroupType.INTLDES, ['1998-067A', '1900-001Z']);

    expect(intlDes2id).toHaveBeenCalledWith('1998-067A');
    expect(group.ids).toStrictEqual([0]);
  });

  it('NAME_REGEX matches object names', () => {
    const group = new ObjectGroup(GroupType.NAME_REGEX, /ALPHA/u);

    expect(group.ids).toStrictEqual([0]);
  });

  it('PAYLOAD_NAME_REGEX matches names but only payloads', () => {
    // Both names contain "A"; only sat0 is a PAYLOAD.
    const group = new ObjectGroup(GroupType.PAYLOAD_NAME_REGEX, /A/u);

    expect(group.ids).toStrictEqual([0]);
  });

  it('COUNTRY matches the country code', () => {
    const group = new ObjectGroup(GroupType.COUNTRY, 'US');

    expect(group.ids).toStrictEqual([0]);
  });

  it('COUNTRY excludes analyst satellites (ANALSAT)', () => {
    sat0.country = 'ANALSAT';
    const group = new ObjectGroup(GroupType.COUNTRY, 'ANALSAT');

    expect(group.ids).toStrictEqual([]);
  });

  it('COUNTRY_REGEX matches the country via regex', () => {
    const group = new ObjectGroup(GroupType.COUNTRY_REGEX, /US/u);

    expect(group.ids).toStrictEqual([0]);
  });

  it('SHAPE_STRING matches the shape property', () => {
    const group = new ObjectGroup(GroupType.SHAPE_STRING, 'Box');

    expect(group.ids).toStrictEqual([0]);
  });

  it('BUS_STRING matches the bus property', () => {
    const group = new ObjectGroup(GroupType.BUS_STRING, 'BusB');

    expect(group.ids).toStrictEqual([1]);
  });

  it('ID_LIST passes ids through (capped at maxOrbitsDisplayed)', () => {
    const group = new ObjectGroup(GroupType.ID_LIST, [5, 6, 7]);

    expect(group.ids).toStrictEqual([5, 6, 7]);
  });

  it('throws on an unknown group type', () => {
    // eslint-disable-next-line no-new
    expect(() => new ObjectGroup(999 as GroupType, null)).toThrow('Unknown group type');
  });

  describe('hasObject', () => {
    it('reports membership', () => {
      const group = new ObjectGroup(GroupType.ID_LIST, [3, 4]);

      expect(group.hasObject(4)).toBe(true);
      expect(group.hasObject(99)).toBe(false);
    });
  });

  describe('updateOrbits', () => {
    it('routes satellites and missiles to the orbit manager differently', () => {
      const missile = new MissileObject({
        id: 1,
        active: false,
        name: 'M',
        latList: [],
        lonList: [],
        altList: [],
        timeList: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      catalogStub.objectCache = [sat0, missile];
      const updateOrbitBuffer = vi.fn();

      vi.spyOn(ServiceLocator, 'getOrbitManager').mockReturnValue({ updateOrbitBuffer } as never);

      const group = new ObjectGroup(GroupType.ID_LIST, [0, 1]);

      group.updateOrbits();

      // Satellite -> updateOrbitBuffer(id); Missile -> updateOrbitBuffer(id, missile).
      expect(updateOrbitBuffer).toHaveBeenCalledWith(0);
      expect(updateOrbitBuffer).toHaveBeenCalledWith(missile.id, missile);
    });
  });
});
