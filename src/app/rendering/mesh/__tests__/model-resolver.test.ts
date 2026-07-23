import * as fs from 'node:fs';
import * as path from 'node:path';
import { OemSatellite } from '@app/app/objects/oem-satellite';
import { ModelResolver, SatelliteModels } from '@app/app/rendering/mesh/model-resolver';
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

  // Debris carries almost no catalog signal (shape empty on ~96% of records,
  // rcs null), so the legacy sccNum era-buckets are gone: routing is now a
  // stable FNV hash of the sccNum across the generic archetype pool (the
  // deb-panel-* family in this Phase 2 slice). The hash handles every sccNum
  // form uniformly - no more parseInt collapsing alpha-5/extended ids into one
  // bucket.
  const DEBRIS_POOL: string[] = [
    SatelliteModels['deb-panel-01'],
    SatelliteModels['deb-panel-02'],
    SatelliteModels['deb-panel-03'],
    SatelliteModels['deb-bracket-01'],
    SatelliteModels['deb-bracket-02'],
    SatelliteModels['deb-bracket-03'],
    SatelliteModels['deb-skin-01'],
    SatelliteModels['deb-skin-02'],
    SatelliteModels['deb-skin-03'],
    SatelliteModels['deb-clampband-01'],
    SatelliteModels['deb-clampband-02'],
    SatelliteModels['deb-clampband-03'],
    SatelliteModels['deb-mli-01'],
    SatelliteModels['deb-mli-02'],
    SatelliteModels['deb-mli-03'],
    SatelliteModels['deb-mli-04'],
    SatelliteModels['deb-strut-01'],
    SatelliteModels['deb-strut-02'],
    SatelliteModels['deb-strut-03'],
  ];
  const CONE_POOL = [SatelliteModels['deb-cone-01'], SatelliteModels['deb-cone-02']];
  const CYL_POOL = [SatelliteModels['deb-cyl-01'], SatelliteModels['deb-cyl-02']];
  const TORUS_POOL = [SatelliteModels['deb-torus-01'], SatelliteModels['deb-torus-02']];

  it('routes debris into the generic archetype pool for every sccNum form', () => {
    const forms = ['00005', '25544', '99999', '123456', '339999', 'T0001', 'Z9999', '1234567', '799500766', '', 'not-a-number'];

    for (const scc of forms) {
      expect(DEBRIS_POOL).toContain(resolver.resolve(makeSat(scc, SpaceObjectType.DEBRIS)));
    }
  });

  it('is deterministic: a given debris object always resolves to the same mesh', () => {
    for (const scc of ['25544', 'T0001', '', '799500766']) {
      const first = resolver.resolve(makeSat(scc, SpaceObjectType.DEBRIS));

      expect(resolver.resolve(makeSat(scc, SpaceObjectType.DEBRIS))).toBe(first);
      // A fresh resolver instance must agree (no per-instance state in the hash)
      expect(new ModelResolver().resolve(makeSat(scc, SpaceObjectType.DEBRIS))).toBe(first);
    }
  });

  it('does not throw on alpha-5, extended, empty, or non-numeric debris sccNums', () => {
    const r = resolver;

    for (const scc of ['T0001', 'A0000', '1234567', '999999', '', 'not-a-number']) {
      expect(() => r.resolve(makeSat(scc, SpaceObjectType.DEBRIS))).not.toThrow();
    }
  });

  it('spreads debris broadly across the variant pool (hash distribution)', () => {
    const seen = new Set<string>();

    for (let i = 0; i < 400; i++) {
      seen.add(resolver.resolve(makeSat(String(10000 + i), SpaceObjectType.DEBRIS)));
    }

    // The FNV hash should reach most of the pool; require broad (not perfect) coverage.
    expect(seen.size).toBeGreaterThanOrEqual(Math.ceil(DEBRIS_POOL.length * 0.75));
    for (const model of seen) {
      expect(DEBRIS_POOL).toContain(model);
    }
  });

  it('routes debris by catalog shape special before the generic hash', () => {
    const shaped = (shape: string): string => resolver.resolve(makeSat('54321', SpaceObjectType.DEBRIS, { shape }));

    expect(CONE_POOL).toContain(shaped('Cone'));
    expect(CYL_POOL).toContain(shaped('Cyl'));
    expect(CYL_POOL).toContain(shaped('Cylinder'));
    expect(TORUS_POOL).toContain(shaped('Torus'));
    // whitespace/case variants normalize the same way
    expect(TORUS_POOL).toContain(shaped('  torus '));
    // unknown or empty shape falls through to the generic pool
    expect(DEBRIS_POOL).toContain(shaped(''));
    expect(DEBRIS_POOL).toContain(shaped('Disk + Cable'));
  });

  it('varies within a shape special by sccNum but stays in-family', () => {
    const seen = new Set<string>();

    for (let i = 0; i < 40; i++) {
      const model = resolver.resolve(makeSat(String(60000 + i), SpaceObjectType.DEBRIS, { shape: 'Torus' }));

      expect(TORUS_POOL).toContain(model);
      seen.add(model);
    }
    expect(seen.size).toBe(TORUS_POOL.length);
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
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { launchVehicle: 'Delta IV Heavy', diameter: '5.1' }))).toBe(SatelliteModels['rb-cyl-gray-l']);
  });

  it('prefers the shape silhouette over the launchVehicle family', () => {
    // A PAM-D kick stage deployed from a named vehicle is still a sphere+cone
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { shape: 'Sphere + Cone', launchVehicle: 'Delta 7925' }))).toBe(SatelliteModels['rb-sphercone-kick']);
  });

  it('falls back to size buckets for unknown vehicles and plain cyl shapes', () => {
    expect(resolver.resolve(makeSat('12345', SpaceObjectType.ROCKET_BODY, { shape: 'Cyl', launchVehicle: 'H-2A', diameter: '4.0' }))).toBe(SatelliteModels['rb-cyl-gray-l']);
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

describe('ModelResolver mesh registry disk consistency', () => {
  // Registered names that intentionally ship no mesh: issmodel is an aspirational
  // alias the resolver never returns, so it can't 404 at runtime. Every other
  // registered name MUST have a matching OBJ+MTL so any resolved (or
  // meshOverride) name loads.
  const KNOWN_UNBACKED = new Set<string>(['issmodel']);

  it('has a matching OBJ and MTL in public/meshes for every registered model', () => {
    const meshDir = path.join(process.cwd(), 'public', 'meshes');
    const missing: string[] = [];

    for (const name of Object.values(SatelliteModels)) {
      if (KNOWN_UNBACKED.has(name)) {
        continue;
      }
      // eslint-disable-next-line no-sync -- one-time filesystem assertion in a test
      if (!fs.existsSync(path.join(meshDir, `${name}.obj`))) {
        missing.push(`${name}.obj`);
      }
      // eslint-disable-next-line no-sync -- one-time filesystem assertion in a test
      if (!fs.existsSync(path.join(meshDir, `${name}.mtl`))) {
        missing.push(`${name}.mtl`);
      }
    }

    expect(missing).toEqual([]);
  });
});
