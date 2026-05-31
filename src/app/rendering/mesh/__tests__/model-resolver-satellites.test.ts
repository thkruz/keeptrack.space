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
      [{ bus: 'Cubesat 3U' }, SatelliteModels.s3u],
      [{ bus: 'Cubesat 6U' }, SatelliteModels.s6u],
      [{ bus: 'Cubesat 12U' }, SatelliteModels.s12u],
      [{ bus: 'ARROW' }, SatelliteModels.oneweb],
      [{ bus: 'DSP B14' }, SatelliteModels.dsp],
      [{ bus: 'sateliotsat' }, SatelliteModels.sateliotsat],
    ];

    it.each(cases)('routes %o to its model', (over, expected) => {
      expect(resolver.resolve(makeSat(over))).toBe(expected);
    });

    it('routes a plain Cubesat 1U to s1u, but a SPACEBEE 1U to spacebee2gen', () => {
      expect(resolver.resolve(makeSat({ bus: 'Cubesat 1U', name: 'GENERIC' }))).toBe(SatelliteModels.s1u);
      expect(resolver.resolve(makeSat({ bus: 'Cubesat 1U', name: 'SPACEBEE-7' }))).toBe(SatelliteModels.spacebee2gen);
    });

    it('routes a 2018 Cubesat 0.25U to spacebee1gen', () => {
      expect(resolver.resolve(makeSat({ bus: 'Cubesat 0.25U', intlDes: '2018-099A', name: 'GENERIC' })))
        .toBe(SatelliteModels.spacebee1gen);
    });
  });

  describe('rcs-based fallback routing', () => {
    it('buckets generic payloads by radar cross section', () => {
      expect(resolver.resolve(makeSat({ rcs: 0.05 }))).toBe(SatelliteModels.s1u);
      expect(resolver.resolve(makeSat({ rcs: 0.15 }))).toBe(SatelliteModels.s2u);
      expect(resolver.resolve(makeSat({ rcs: 0.25 }))).toBe(SatelliteModels.s3u);
    });

    it('falls back to the generic sat2 model when nothing matches', () => {
      expect(resolver.resolve(makeSat({ rcs: 5 }))).toBe(SatelliteModels.sat2);
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
