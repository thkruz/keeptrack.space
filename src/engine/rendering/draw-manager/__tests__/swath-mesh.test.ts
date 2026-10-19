import { ServiceLocator } from '@app/engine/core/service-locator';
import { SwathMesh } from '@app/engine/rendering/draw-manager/swath-mesh';
import { SwathMeshFactory, SwathParams } from '@app/engine/rendering/draw-manager/swath-mesh-factory';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const A = 6378.137;
// b = a (1 - 1/298.257223563)
const B = 6356.752314;
const DEG = Math.PI / 180;

const params = (over: Partial<SwathParams> = {}): SwathParams => ({
  fovDeg: 14,
  maxOffNadirDeg: 0,
  minSunElevDeg: 0,
  isDaylightOnly: false,
  ...over,
});

/**
 * Polar circular orbit in the x-z plane at radius a + 500 km, u_i = (10 i + 5) deg for
 * i = 0..35, so no sample sits exactly on the terminator of a Sun at +x.
 */
const polarSamples = (count = 36, stepDeg = 10, offsetDeg = 5): Float64Array => {
  const out = new Float64Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = (stepDeg * i + offsetDeg) * DEG;

    out[i * 3] = (A + 500) * Math.cos(u);
    out[i * 3 + 2] = (A + 500) * Math.sin(u);
  }

  return out;
};

const sunAlongX = (count: number): Float64Array => {
  const out = new Float64Array(count * 3);

  for (let i = 0; i < count; i++) {
    out[i * 3] = 1;
  }

  return out;
};

describe('SwathMeshFactory ribbon', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.swathLiftKm = 2 as never;
    settingsManager.isDrawSwathFieldOfRegard = true;
  });

  afterEach(() => vi.restoreAllMocks());

  const build = (p: SwathParams, samples = polarSamples()) => {
    const factory = new SwathMeshFactory();
    const n = samples.length / 3;

    factory.params = p;
    factory.targetId = 0;
    factory.loadSamples(samples, sunAlongX(n), n);

    return factory;
  };

  it('emits 2 vertices per sample for each lit/unlit run, sharing boundary samples', () => {
    const factory = build(params());
    const ranges = factory.meshes[0].ranges;

    /*
     * Sun at +x with minSunElev 0: a sample is lit when cos(u) >= 0, i.e. u = 5..85 (i 0..8) and
     * u = 275..355 (i 27..35). Runs with shared boundaries: lit 0..8, unlit 8..26, lit 26..35,
     * so 9, 19 and 10 samples -> 18, 38 and 20 vertices.
     */
    expect(ranges.map((r) => [r.lit, r.count])).toEqual([
      [true, 18],
      [false, 38],
      [true, 20],
    ]);
    expect(factory.meshes[0].vertexCount).toBe(18 + 38 + 20);
  });

  it('keeps every vertex lifted just above the surface', () => {
    const factory = build(params({ maxOffNadirDeg: 20 }));
    const mesh = factory.meshes[0];
    const v = mesh.vertices;
    const lift = 2;

    for (let i = 0; i < mesh.vertexCount; i++) {
      const r = Math.hypot(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);

      /*
       * The plan's bound [b + lift, a + lift + 0.01] km (less 1 m of float32 rounding). Vertices sit
       * on the drawn 6371 km globe + lift, which lies inside it.
       */
      expect(r).toBeGreaterThanOrEqual(B + lift - 0.001);
      expect(r).toBeLessThanOrEqual(A + lift + 0.01);
    }
  });

  it('keeps a width-mode swath at its ground width at every latitude', () => {
    // 185 km from a polar orbit: samples run from 5 deg to 355 deg of argument of latitude.
    const factory = build(params({ swathKm: 185 }));
    const mesh = factory.meshes[0];
    const v = mesh.vertices;
    let worst = 0;

    for (const range of mesh.ranges.filter((r) => r.kind === 'nadir')) {
      for (let k = range.first; k < range.first + range.count; k += 2) {
        const l = [v[k * 3], v[k * 3 + 1], v[k * 3 + 2]];
        const r = [v[k * 3 + 3], v[k * 3 + 4], v[k * 3 + 5]];
        const cos = (l[0] * r[0] + l[1] * r[1] + l[2] * r[2]) / (Math.hypot(l[0], l[1], l[2]) * Math.hypot(r[0], r[1], r[2]));
        // Central angle on the 6371 km mean sphere, the convention the coverage grid uses.
        const width = Math.acos(Math.min(1, cos)) * 6371.0088;

        worst = Math.max(worst, Math.abs(width - 185) / 185);
      }
    }
    // A fixed 14 deg FOV would vary by about 3% between the equator and the poles here.
    expect(worst).toBeLessThan(0.005);
  });

  it('draws the field of regard first so the nadir strip sits on top', () => {
    const factory = build(params({ maxOffNadirDeg: 20 }));
    const kinds = factory.meshes[0].ranges.map((r) => r.kind);

    expect(kinds).toEqual(['regard', 'regard', 'regard', 'nadir', 'nadir', 'nadir']);
  });

  it('omits the field of regard when the graphics flag is off', () => {
    settingsManager.isDrawSwathFieldOfRegard = false;
    const factory = build(params({ maxOffNadirDeg: 20 }));

    expect(factory.meshes[0].ranges.every((r) => r.kind === 'nadir')).toBe(true);
  });

  it('hides unlit runs in daylight-only mode', () => {
    const factory = build(params({ isDaylightOnly: true }));

    expect(factory.meshes[0].ranges.map((r) => r.lit)).toEqual([true, true]);
  });

  it('splits a long ribbon into meshes of at most 32 000 vertices', () => {
    // 20 000 samples, all lit (minSunElev -90 deg -> sin = -1): one run of 20 000 pairs.
    const n = 20000;
    const factory = build(params({ minSunElevDeg: -90 }), polarSamples(n, 0.018, 0));

    /*
     * Mesh 1 takes 16 000 pairs (32 000 vertices); the strip continues from pair 15 999
     * (one pair repeated), leaving 4 001 pairs = 8 002 vertices for mesh 2.
     */
    expect(factory.meshes.length).toBe(2);
    expect(factory.meshes[0].vertexCount).toBe(SwathMesh.MAX_VERTICES);
    expect(factory.meshes[1].vertexCount).toBe(8002);
  });

  it('reuses the mesh and its GPU buffer on a same-size rebuild', () => {
    const factory = build(params());
    const mesh = factory.meshes[0];

    // The first setParams also creates the fan triangle's buffers; only the rebuild after it counts.
    factory.setParams(params());
    const createSpy = vi.spyOn(global.mocks.glMock, 'createBuffer');

    factory.setParams(params({ minSunElevDeg: 1 }));

    expect(factory.meshes[0]).toBe(mesh);
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe('SwathMeshFactory cruncher hook', () => {
  beforeEach(() => setupStandardEnvironment());

  it('rebuilds only when the sample timing changes, not on every orbit response', () => {
    const factory = new SwathMeshFactory();
    const samples = polarSamples();
    const points = new Float32Array(36 * 4);

    for (let i = 0; i < 36; i++) {
      points.set([samples[i * 3], samples[i * 3 + 1], samples[i * 3 + 2], 1], i * 4);
    }
    factory.setTarget(7, params());
    const before = factory.rebuildCount;

    factory.onOrbitPath(7, points, [0, 0, 0], 2454730.0, 2.6, false);
    factory.onOrbitPath(7, points, [0, 0, 0], 2454730.0, 2.6, false);
    // Another satellite's orbit is ignored.
    factory.onOrbitPath(8, points, [0, 0, 0], 2454731.0, 2.6, false);

    expect(factory.rebuildCount - before).toBe(1);

    factory.onOrbitPath(7, points, [0, 0, 0], 2454730.1, 2.6, false);
    expect(factory.rebuildCount - before).toBe(2);
  });
});

describe('SwathFanMesh', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    settingsManager.isDrawSwath = true;
    const pos = new Float32Array(6);
    const vel = new Float32Array(6);

    pos.set([A + 500, 0, 0], 0);
    vel.set([0, 7.6, 0], 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dots = ServiceLocator.getDotsManager() as any;

    dots.positionData = pos;
    dots.velocityData = vel;
  });

  afterEach(() => {
    settingsManager.isDrawSwath = false;
    vi.restoreAllMocks();
  });

  it('recomputes the fan in place without allocating', () => {
    const factory = new SwathMeshFactory();

    factory.setTarget(0, params());
    const fan = factory.fan!;

    fan.update();
    const first = fan.vertices;

    fan.update();

    expect(fan.vertices).toBe(first);
    expect(fan.isValid).toBe(true);
    // Apex sits on the satellite (world shift 0 in the test scene).
    expect(first[0]).toBeCloseTo(A + 500, 0);
  });
});
