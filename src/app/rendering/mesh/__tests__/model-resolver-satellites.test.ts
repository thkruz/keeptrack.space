import { ModelResolver, SatelliteModels } from '@app/app/rendering/mesh/model-resolver';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';

// Real Satellite construction needs valid TLEs; these tests only exercise the
// name/sccNum/payload/bus/rcs routing, so build on the prototype to keep
// `instanceof Satellite` truthy without the SGP4 cost.
const makeSat = (over: Partial<Satellite> = {}): Satellite =>
  Object.assign(Object.create(Satellite.prototype) as Satellite, {
    id: 0,
    name: 'GENERIC SAT',
    sccNum: '99990',
    type: SpaceObjectType.PAYLOAD,
    payload: undefined,
    bus: 'Unknown',
    intlDes: '2020-001A',
    rcs: undefined,
    shape: '',
    span: '',
    tle1: '' as TleLine1,
    tle2: '' as TleLine2,
    ...over,
  });

describe('ModelResolver satellite model selection', () => {
  let resolver: ModelResolver;

  beforeEach(() => {
    resolver = new ModelResolver();
  });

  describe('resolveByName_ (name prefixes)', () => {
    const cases: [string, string][] = [
      ['STARLINK-1234', SatelliteModels.starlink],
      ['GLOBALSTAR M001', SatelliteModels.globalstar],
      ['IRIDIUM 100', SatelliteModels.iridium],
      ['ORBCOMM FM-1', SatelliteModels.orbcomm],
      ['SES 5', SatelliteModels.ses],
      ['O3B FM10', SatelliteModels.o3b],
      ['NAVSTAR 80', SatelliteModels.gps],
      ['GALILEO 22', SatelliteModels.galileo],
      ['COSMOS GLONASS', SatelliteModels.glonass],
      ['SBIRS GEO-5', SatelliteModels.sbirs],
      ['FLOCK 4P-1', SatelliteModels.flock],
      ['LEMUR-2', SatelliteModels.lemur],
    ];

    it.each(cases)('maps %s to the right model', (name, expected) => {
      expect(resolver.resolve(makeSat({ name }))).toBe(expected);
    });
  });

  describe('Starlink version routing', () => {
    it('routes v2 Mini bus variants to the starlink-v2mini model', () => {
      expect(resolver.resolve(makeSat({ name: 'STARLINK-30107', bus: 'Starlink V2M' }))).toBe(SatelliteModels['starlink-v2mini']);
      expect(resolver.resolve(makeSat({ name: 'STARLINK-11347', bus: 'Starlink V2MD' }))).toBe(SatelliteModels['starlink-v2mini']);
      expect(resolver.resolve(makeSat({ name: 'STARLINK-33531', bus: 'Starlink V2MO' }))).toBe(SatelliteModels['starlink-v2mini']);
    });

    it('routes the v1.x bus to the original starlink model', () => {
      expect(resolver.resolve(makeSat({ name: 'STARLINK-1008', bus: 'Starlink' }))).toBe(SatelliteModels.starlink);
    });

    it('falls back on the name number when bus metadata is missing', () => {
      expect(resolver.resolve(makeSat({ name: 'STARLINK-30107', bus: '' }))).toBe(SatelliteModels['starlink-v2mini']);
      expect(resolver.resolve(makeSat({ name: 'STARLINK-6380', bus: '' }))).toBe(SatelliteModels.starlink);
    });
  });

  describe('Kuiper routing', () => {
    it('routes the Kuiper bus to the amazon-leo model', () => {
      expect(resolver.resolve(makeSat({ name: 'KUIPER-00008', bus: 'Kuiper' }))).toBe(SatelliteModels['amazon-leo']);
    });

    it('falls back on the KUIPER name prefix when bus metadata is missing', () => {
      expect(resolver.resolve(makeSat({ name: 'KUIPER-P2', bus: 'Unknown' }))).toBe(SatelliteModels['amazon-leo']);
    });

    it('matches the Kuiper bus even when the name does not start with KUIPER', () => {
      expect(resolver.resolve(makeSat({ name: 'OBJECT A', bus: 'Kuiper' }))).toBe(SatelliteModels['amazon-leo']);
    });
  });

  describe('special sccNum lookups', () => {
    it('maps the ISS, Hubble and Tiangong catalog numbers', () => {
      expect(resolver.resolve(makeSat({ sccNum: '25544' }))).toBe(SatelliteModels.iss);
      expect(resolver.resolve(makeSat({ sccNum: '20580' }))).toBe(SatelliteModels.hubble);
      expect(resolver.resolve(makeSat({ sccNum: '48274' }))).toBe(SatelliteModels.tiangong);
    });

    it('maps known AEHF and DSP catalog numbers', () => {
      expect(resolver.resolve(makeSat({ sccNum: '36868' }))).toBe(SatelliteModels.aehf);
      expect(resolver.resolve(makeSat({ sccNum: '04630' }))).toBe(SatelliteModels.dsp);
    });
  });

  describe('payload-based routing', () => {
    it('routes Sateliot payloads to the sateliot models', () => {
      expect(resolver.resolve(makeSat({ payload: 'Sateliot-1' }))).toBe(SatelliteModels.sateliotsat);
      expect(resolver.resolve(makeSat({ payload: 'Sateliot-3' }))).toBe(SatelliteModels.sateliotsat2);
    });
  });

  describe('bus-based routing', () => {
    const cases: [Partial<Satellite>, string][] = [
      [{ bus: 'GPS IIF' }, SatelliteModels.gps],
      [{ bus: 'Iridium' }, SatelliteModels.iridium],
      [{ bus: 'Cubesat 2U' }, SatelliteModels.s2u],
      [{ bus: 'ARROW' }, SatelliteModels.oneweb],
      [{ bus: 'DSP B14' }, SatelliteModels.dsp],
      [{ bus: 'sateliotsat' }, SatelliteModels.sateliotsat],
    ];

    it.each(cases)('routes %o to its model', (over, expected) => {
      expect(resolver.resolve(makeSat(over))).toBe(expected);
    });
  });

  describe('cubesat size + variant routing', () => {
    // Every bus size lands inside its pool; sizes with -b/-w variants have a
    // multi-entry pool the sccNum hash spreads across (base at index 0).
    const pools: Record<string, string[]> = {
      'Cubesat 0.5U': [SatelliteModels['s0.5u']],
      'Cubesat 0.3U': [SatelliteModels['s0.5u']],
      'Cubesat 1U': [SatelliteModels.s1u, SatelliteModels['s1u-b']],
      'Cubesat 1.5U': [SatelliteModels['s1.5u']],
      'Cubesat 2U': [SatelliteModels.s2u],
      'Cubesat 3U': [SatelliteModels.s3u, SatelliteModels['s3u-b'], SatelliteModels['s3u-w']],
      'Cubesat 3U+': [SatelliteModels.s3u, SatelliteModels['s3u-b'], SatelliteModels['s3u-w']],
      'Cubesat 4U': [SatelliteModels.s4u],
      'Cubesat 6U': [SatelliteModels.s6u, SatelliteModels['s6u-b'], SatelliteModels['s6u-w']],
      'Cubesat 8U': [SatelliteModels.s8u],
      'Cubesat 12U': [SatelliteModels.s12u, SatelliteModels['s12u-w']],
      'Cubesat 16U': [SatelliteModels.s16u, SatelliteModels['s16u-b']],
    };

    it.each(Object.entries(pools))('routes bus %s into its size pool', (bus, pool) => {
      expect(pool).toContain(resolver.resolve(makeSat({ bus, name: 'GENERIC', sccNum: '54321' })));
    });

    it('is deterministic: the same sccNum always maps to the same variant', () => {
      const first = resolver.resolve(makeSat({ bus: 'Cubesat 3U', name: 'GENERIC', sccNum: '43210' }));
      const second = resolver.resolve(makeSat({ bus: 'Cubesat 3U', name: 'GENERIC', sccNum: '43210' }));

      expect(first).toBe(second);
    });

    it('spreads a multi-variant size across more than one mesh', () => {
      const results = new Set<string>();

      for (let i = 0; i < 60; i++) {
        results.add(resolver.resolve(makeSat({ bus: 'Cubesat 6U', name: 'GENERIC', sccNum: String(10_000 + i) })));
      }
      expect(results.size).toBeGreaterThan(1);
    });

    it('does not throw on alpha-5 sccNums', () => {
      expect(() => resolver.resolve(makeSat({ bus: 'Cubesat 3U', name: 'GENERIC', sccNum: 'E1234' }))).not.toThrow();
    });

    it('keeps the SPACEBEE and 2018 0.25U specials ahead of the generic pool', () => {
      expect(resolver.resolve(makeSat({ bus: 'Cubesat 1U', name: 'SPACEBEE-7' }))).toBe(SatelliteModels.spacebee2gen);
      expect(resolver.resolve(makeSat({ bus: 'Cubesat 0.25U', intlDes: '2018-099A', name: 'GENERIC' })))
        .toBe(SatelliteModels.spacebee1gen);
    });
  });

  describe('rcs-based fallback routing', () => {
    it('buckets generic payloads by radar cross section into the cubesat pools', () => {
      expect([SatelliteModels.s1u, SatelliteModels['s1u-b']]).toContain(resolver.resolve(makeSat({ rcs: 0.05 })));
      expect(resolver.resolve(makeSat({ rcs: 0.15 }))).toBe(SatelliteModels.s2u);
      expect([SatelliteModels.s3u, SatelliteModels['s3u-b'], SatelliteModels['s3u-w']])
        .toContain(resolver.resolve(makeSat({ rcs: 0.25 })));
    });

    it('falls back to the generic sat2 model when the shape is empty', () => {
      expect(resolver.resolve(makeSat({ rcs: 5, shape: '' }))).toBe(SatelliteModels.sat2);
    });
  });

  describe('generic payload shape routing', () => {
    const cases: [Partial<Satellite>, string][] = [
      // box + panels, sized by span
      [{ shape: 'Box + pan', span: '1.2' }, SatelliteModels['gen-box-s']],
      [{ shape: 'Box + pan', span: '6' }, SatelliteModels['gen-box-m']],
      [{ shape: 'Box + 2 Pan', span: '14' }, SatelliteModels['gen-box-l']],
      // box, no panels
      [{ shape: 'Box + Ant', span: '3' }, SatelliteModels['gen-box-dish']],
      [{ shape: 'Box', span: '1' }, SatelliteModels['gen-box-solar']],
      // other buses
      [{ shape: 'Trapezoid+2 pan', span: '12' }, SatelliteModels['gen-trap-geo']],
      [{ shape: 'Cyl + Ant', span: '6' }, SatelliteModels['gen-cyl-dish']],
      [{ shape: 'Cyl + 2 Pan', span: '7' }, SatelliteModels['gen-cyl-pan']],
      [{ shape: 'Cyl', span: '5' }, SatelliteModels['gen-cyl']],
      [{ shape: 'Poly', span: '1.5' }, SatelliteModels['gen-poly']],
      [{ shape: 'Half Hex Prism+2 pan', span: '6' }, SatelliteModels['gen-hex-pan']],
      [{ shape: 'Sphere', span: '1' }, SatelliteModels['gen-sphere']],
      // unrecognized silhouette keeps the legacy mesh
      [{ shape: 'Cone', span: '2' }, SatelliteModels.sat2],
    ];

    it.each(cases)('routes shape %o to its archetype', (over, expected) => {
      expect(resolver.resolve(makeSat(over))).toBe(expected);
    });

    it('routes a huge box span into one of the two XL variants, deterministically', () => {
      const xl = [SatelliteModels['gen-box-xl'], SatelliteModels['gen-box-xl-b']];
      const first = resolver.resolve(makeSat({ shape: 'Box + 2 pan', span: '22', sccNum: '55123' }));

      expect(xl).toContain(first);
      expect(resolver.resolve(makeSat({ shape: 'Box + 2 pan', span: '22', sccNum: '55123' }))).toBe(first);
    });

    it('tolerates messy shape spellings and casing', () => {
      expect(resolver.resolve(makeSat({ shape: 'BOX+2PAN', span: '6' }))).toBe(SatelliteModels['gen-box-m']);
      expect(resolver.resolve(makeSat({ shape: '  cyl  ', span: '5' }))).toBe(SatelliteModels['gen-cyl']);
    });
  });

  describe('OemSatellite with an explicit model', () => {
    it('returns the satellite-provided model name', () => {
      const oem = Object.assign(Object.create(OemSatellite.prototype) as OemSatellite, {
        id: 1, sccNum: '', type: SpaceObjectType.PAYLOAD, model: 'starlink',
      });

      expect(resolver.resolve(oem)).toBe('starlink');
    });
  });

  describe('missile model selection', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mislName = (name: string, over: Record<string, unknown> = {}) => ({
      isGoingUp: () => true,
      lastTime: 0,
      name,
      ...over,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    it('returns an RV once the missile is descending past its apex', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = resolver as any;

      expect(r.resolveMislModelName_(mislName('THREAT 5', { isGoingUp: () => false, lastTime: 30 })))
        .toBe(SatelliteModels.rv);
    });

    it('buckets ascending missiles by the trailing number in the name', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = resolver as any;

      expect(r.resolveMislModelName_(mislName('THREAT 2'))).toBe(SatelliteModels.misl);
      expect(r.resolveMislModelName_(mislName('THREAT 4'))).toBe(SatelliteModels.misl2);
      expect(r.resolveMislModelName_(mislName('THREAT 6'))).toBe(SatelliteModels.misl3);
      expect(r.resolveMislModelName_(mislName('THREAT 8'))).toBe(SatelliteModels.misl4);
      expect(r.resolveMislModelName_(mislName('THREAT 9'))).toBe(SatelliteModels.misl);
      expect(r.resolveMislModelName_(mislName('NO NUMBER'))).toBe(SatelliteModels.misl);
    });
  });
});
