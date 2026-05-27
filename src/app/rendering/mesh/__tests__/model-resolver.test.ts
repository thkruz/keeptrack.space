import { ModelResolver, SatelliteModels } from '@app/app/rendering/mesh/model-resolver';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';

// Real Satellite construction requires valid TLEs; this test only exercises
// the sccNum-string switch, so use Object.assign on the prototype to keep
// instanceof Satellite truthy without paying the SGP4 init cost.
const makeSat = (sccNum: string, type: SpaceObjectType): Satellite =>
  Object.assign(Object.create(Satellite.prototype) as Satellite, {
    id: 0,
    name: 'TEST',
    sccNum,
    type,
    tle1: '' as TleLine1,
    tle2: '' as TleLine2,
  });

describe('ModelResolver debris model selection across sccNum forms', () => {
  let resolver: ModelResolver;

  beforeEach(() => {
    resolver = new ModelResolver();
  });

  // The legacy numeric-bucket logic only makes sense for numeric5 / numeric6
  // sccNums. Alpha-5 ("T0001") would parseInt to NaN and previously hit the
  // always-true `else if (parseInt > 35000)` branch returning debris2. Extended
  // (9-digit) IDs parseInt to a huge number and likewise always landed on
  // debris2. Both now route to the safe default (debris0).
  it('routes numeric5 sccNums by 20000/35000 thresholds', () => {
    expect(resolver.resolve(makeSat('00005', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    expect(resolver.resolve(makeSat('20000', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    expect(resolver.resolve(makeSat('25544', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris1);
    expect(resolver.resolve(makeSat('35000', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris1);
    expect(resolver.resolve(makeSat('35001', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris2);
    expect(resolver.resolve(makeSat('99999', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris2);
  });

  it('routes numeric6 sccNums through the same numeric thresholds', () => {
    // 6-digit numerics ≤ 339999 are A5-capable and have a meaningful parseInt.
    expect(resolver.resolve(makeSat('123456', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris2);
    expect(resolver.resolve(makeSat('339999', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris2);
  });

  it('routes alpha-5 sccNums to the default debris model (debris0)', () => {
    expect(resolver.resolve(makeSat('T0001', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    expect(resolver.resolve(makeSat('A0000', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    expect(resolver.resolve(makeSat('Z9999', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
  });

  it('routes extended (7+ digit) sccNums to the default debris model (debris0)', () => {
    expect(resolver.resolve(makeSat('1234567', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    expect(resolver.resolve(makeSat('799500766', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    // 6-digit > 339999 also classifies as extended.
    expect(resolver.resolve(makeSat('999999', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
  });

  it('routes invalid sccNums to the default debris model (debris0)', () => {
    expect(resolver.resolve(makeSat('', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
    expect(resolver.resolve(makeSat('not-a-number', SpaceObjectType.DEBRIS))).toBe(SatelliteModels.debris0);
  });

  it('returns rocketbody for ROCKET_BODY type regardless of sccNum form', () => {
    expect(resolver.resolve(makeSat('25544', SpaceObjectType.ROCKET_BODY))).toBe(SatelliteModels.rocketbody);
    expect(resolver.resolve(makeSat('T0001', SpaceObjectType.ROCKET_BODY))).toBe(SatelliteModels.rocketbody);
    expect(resolver.resolve(makeSat('799500766', SpaceObjectType.ROCKET_BODY))).toBe(SatelliteModels.rocketbody);
  });

  it('does not crash on an OemSatellite and returns the aehf default', () => {
    const oem = Object.assign(Object.create(OemSatellite.prototype) as OemSatellite, {
      id: 1,
      sccNum: '',
      type: SpaceObjectType.PAYLOAD,
      model: null,
    });

    expect(() => resolver.resolve(oem)).not.toThrow();
    expect(resolver.resolve(oem)).toBe(SatelliteModels.aehf);
  });
});
