import { ModelResolver, SatelliteModels } from '@app/app/rendering/mesh/model-resolver';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { Satellite, SpaceObjectType, TleLine1, TleLine2 } from '@ootk/src/main';

// Real Satellite construction requires valid TLEs; this test only exercises
// the sccNum-string switch, so use Object.assign on the prototype to keep
// instanceof Satellite truthy without paying the SGP4 init cost.
const makeSat = (sccNum: string, type: SpaceObjectType, extra: Partial<Satellite> = {}): Satellite =>
  Object.assign(Object.create(Satellite.prototype) as Satellite, {
    id: 0,
    name: 'TEST',
    sccNum,
    type,
    tle1: '' as TleLine1,
    tle2: '' as TleLine2,
    diameter: '',
    length: '',
    shape: '',
    launchVehicle: '',
    ...extra,
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

  it('buckets ROCKET_BODY by catalog diameter into the gray size variants', () => {
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { diameter: '1.5' }))).toBe(SatelliteModels['rb-cyl-gray-s']);
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { diameter: '2.4' }))).toBe(SatelliteModels['rb-cyl-gray-m']);
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { diameter: '3.2' }))).toBe(SatelliteModels['rb-cyl-gray-m']);
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { diameter: '4.1' }))).toBe(SatelliteModels['rb-cyl-gray-l']);
  });

  it('falls back to catalog length when diameter is missing', () => {
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { length: '3.0' }))).toBe(SatelliteModels['rb-cyl-gray-s']);
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { length: '7.0' }))).toBe(SatelliteModels['rb-cyl-gray-m']);
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { length: '12.0' }))).toBe(SatelliteModels['rb-cyl-gray-l']);
  });

  it('defaults ROCKET_BODY to the medium gray regardless of sccNum form when dims are missing', () => {
    expect(resolver.resolve(makeSat('25544', SpaceObjectType.ROCKET_BODY))).toBe(SatelliteModels['rb-cyl-gray-m']);
    expect(resolver.resolve(makeSat('T0001', SpaceObjectType.ROCKET_BODY))).toBe(SatelliteModels['rb-cyl-gray-m']);
    expect(resolver.resolve(makeSat('799500766', SpaceObjectType.ROCKET_BODY))).toBe(SatelliteModels['rb-cyl-gray-m']);
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { diameter: 'unknown', length: 'n/a' }))).toBe(SatelliteModels['rb-cyl-gray-m']);
  });

  it('routes ROCKET_BODY silhouettes from the shape field across spacing/case variants', () => {
    const rb = (extra: Partial<Satellite>) => resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, extra));

    expect(rb({ shape: 'Sphere + Cone' })).toBe(SatelliteModels['rb-sphercone-kick']);
    expect(rb({ shape: 'sphere+cone' })).toBe(SatelliteModels['rb-sphercone-kick']);
    expect(rb({ shape: 'Trunc Cone' })).toBe(SatelliteModels['rb-trunccone-gray']);
    expect(rb({ shape: 'Step Cyl' })).toBe(SatelliteModels['rb-stepcyl-soviet']);
    expect(rb({ shape: 'Cyl + Cyl' })).toBe(SatelliteModels['rb-stepcyl-soviet']);
    expect(rb({ shape: 'Cyl + Cone' })).toBe(SatelliteModels['rb-cylcone-soviet']);
    expect(rb({ shape: 'Cyl + 2 Nozzle' })).toBe(SatelliteModels['rb-cyl2n-legacy']);
  });

  it('routes ROCKET_BODY cylinder palettes from the launchVehicle family', () => {
    const rb = (extra: Partial<Satellite>) => resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, extra));

    expect(rb({ launchVehicle: 'Falcon 9' })).toBe(SatelliteModels['rb-cyl-kerolox']);
    expect(rb({ launchVehicle: 'Electron' })).toBe(SatelliteModels['rb-cyl-electron']);
    expect(rb({ launchVehicle: 'Ariane 5ECA' })).toBe(SatelliteModels['rb-cyl-euro']);
    expect(rb({ launchVehicle: 'Chang Zheng 3B' })).toBe(SatelliteModels['rb-cyl-china']);
    expect(rb({ launchVehicle: 'Atlas Centaur' })).toBe(SatelliteModels['rb-cyl-centaur']);
    expect(rb({ launchVehicle: 'Titan IIIC' })).toBe(SatelliteModels['rb-cyl-centaur']);
    expect(rb({ launchVehicle: 'Delta 7925' })).toBe(SatelliteModels['rb-cyl-delta']);
    expect(rb({ launchVehicle: 'Proton-K/DM-2' })).toBe(SatelliteModels['rb-cyl-proton']);
    expect(rb({ launchVehicle: 'Fregat' })).toBe(SatelliteModels['rb-cyl-proton']);
  });

  it('splits Soviet vehicles by length into the standard and squat variants', () => {
    const rb = (extra: Partial<Satellite>) => resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, extra));

    expect(rb({ launchVehicle: 'Kosmos 11K65M', length: '6.5' })).toBe(SatelliteModels['rb-cyl-soviet']);
    expect(rb({ launchVehicle: 'Tsiklon-3', length: '2.7' })).toBe(SatelliteModels['rb-cyl-soviet-b']);
    expect(rb({ launchVehicle: 'Molniya 8K78M' })).toBe(SatelliteModels['rb-cyl-soviet']);
  });

  it('opts hydrolox Delta IV out of the teal family into the size buckets', () => {
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { launchVehicle: 'Delta IV Heavy', diameter: '5.1' })))
      .toBe(SatelliteModels['rb-cyl-gray-l']);
  });

  it('prefers the shape silhouette over the launchVehicle family', () => {
    // A PAM-D kick stage deployed from a named vehicle is still a sphere+cone
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { shape: 'Sphere + Cone', launchVehicle: 'Delta 7925' })))
      .toBe(SatelliteModels['rb-sphercone-kick']);
  });

  it('falls back to size buckets for unknown vehicles and plain cyl shapes', () => {
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { shape: 'Cyl', launchVehicle: 'H-2A', diameter: '4.0' })))
      .toBe(SatelliteModels['rb-cyl-gray-l']);
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
