import { computeHorizonMask, destinationPoint, EARTH_RADIUS_M, type ElevationProvider, K_RADAR, MASK_MAX_EL_DEG, MASK_MAX_VERTICES, reduceHorizonMask } from '../terrain-horizon';

const DEG = Math.PI / 180;
const SITE_LAT = 40;
const SITE_LON = -105;

/** Great-circle distance in metres on the model sphere. */
const sphereDistance = (lat: number, lon: number): number => {
  const p1 = SITE_LAT * DEG;
  const p2 = lat * DEG;
  const dl = (lon - SITE_LON) * DEG;
  const c = Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)));

  return c * EARTH_RADIUS_M;
};

/** Terrain that depends only on the distance from the site, so every azimuth sees the same thing. */
const ringProvider = (heightOfDistance: (s: number) => number): ElevationProvider => ({
  metadata: { name: 'synthetic', verticalDatum: 'synthetic', resolutionM: 20, attribution: 'none' },
  heightAt: (lat, lon) => heightOfDistance(sphereDistance(lat, lon)),
  heightsAt: (lats, lons, out, count) => {
    for (let i = 0; i < count; i++) {
      out[i] = heightOfDistance(sphereDistance(lats[i], lons[i]));
    }
  },
});

const site = { latDeg: SITE_LAT, lonDeg: SITE_LON, mountHeightM: 10 };
const coarse = { azimuthStepDeg: 90, rangeStepM: 10 };

describe('computeHorizonMask', () => {
  it('gives the geometric dip over a flat sphere', () => {
    const p = computeHorizonMask(
      ringProvider(() => 0),
      site,
      { ...coarse, refractionK: 1 }
    );
    // Hand value: dip = sqrt(2 * h0 / R) = sqrt(20 / 6371008.8) = 1.7718e-3 rad = 0.10151 deg,
    // at ground distance sqrt(2 * R * h0) = 11288 m.
    expect(p.elevationDeg[0]).toBeCloseTo(-0.10152, 2);
    expect(Math.abs(p.limitingDistanceM[0] - 11288)).toBeLessThan(30);

    for (const el of p.elevationDeg) {
      expect(el).toBeLessThan(0);
    }
  });

  it('shrinks the dip with radar refraction (k = 4/3)', () => {
    const p = computeHorizonMask(
      ringProvider(() => 0),
      site,
      { ...coarse, refractionK: K_RADAR }
    );

    // sqrt(2 * 10 / (4/3 * R)) = 1.5344e-3 rad = 0.08792 deg
    expect(p.elevationDeg[1]).toBeCloseTo(-0.08792, 2);
  });

  it('measures a wall of known distance and height, without refraction', () => {
    // 500 m wall starting at 9995 m; the first sample on it is at 10000 m. Antenna 10 m above flat ground at 0 m.
    // x = (490 - 10000^2 / (2 * 6371008.8)) / 10000 = 0.0482152; atan(x) = 0.0481779 rad = 2.76037 deg.
    const p = computeHorizonMask(
      ringProvider((s) => (s >= 9995 ? 500 : 0)),
      site,
      { ...coarse, refractionK: 1 }
    );

    expect(Math.abs(p.elevationDeg[2] - 2.76037)).toBeLessThan(0.003);
    expect(Math.abs(p.limitingDistanceM[2] - 10000)).toBeLessThan(15);
  });

  it('measures the same wall with radar refraction', () => {
    // x = (490 - 10000^2 / (2 * 4/3 * 6371008.8)) / 10000 = 0.0484114; atan(x) = 0.0483736 rad = 2.77158 deg.
    const p = computeHorizonMask(
      ringProvider((s) => (s >= 9995 ? 500 : 0)),
      site,
      { ...coarse, refractionK: K_RADAR }
    );

    expect(Math.abs(p.elevationDeg[3] - 2.77158)).toBeLessThan(0.003);
  });

  it('adds the DEM height at the site to the mount height', () => {
    // Site on a 100 m plateau, wall 600 m: same 500 m rise over the 10 m mast as the case above.
    const p = computeHorizonMask(
      ringProvider((s) => (s >= 9995 ? 600 : 100)),
      site,
      { ...coarse, refractionK: 1 }
    );

    expect(p.groundHeightM).toBe(100);
    expect(p.antennaHeightM).toBe(110);
    expect(Math.abs(p.elevationDeg[0] - 2.76037)).toBeLessThan(0.003);
  });

  it('lets curvature hide a far peak that a near copy of it would show', () => {
    // 1000 m ring. Radio horizon from 10 m is about 11.3 km, plus sqrt(2 * R * 1000) = 112.9 km, so 140 km is hidden at k = 1.
    const far = computeHorizonMask(
      ringProvider((s) => (s >= 139_990 ? 1000 : 0)),
      site,
      { ...coarse, refractionK: 1 }
    );
    const near = computeHorizonMask(
      ringProvider((s) => (s >= 19_990 ? 1000 : 0)),
      site,
      { ...coarse, refractionK: 1 }
    );

    expect(far.elevationDeg[0]).toBeLessThan(0);
    // The far ring is lower than the ground-level dip would be if it were not there: the horizon is the ground.
    expect(far.limitingDistanceM[0]).toBeLessThan(15_000);
    // Near copy: (990 - 20000^2 / (2R)) / 20000 = 0.0479 rad, about 2.74 deg.
    expect(near.elevationDeg[0]).toBeGreaterThan(2.5);
    expect(near.elevationDeg[0]).toBeLessThan(3);
  });

  it('ignores terrain inside the clear radius', () => {
    const tree = ringProvider((s) => (s < 60 ? 30 : 0));
    const bare = { ...site, groundHeightM: 0 };
    const withTree = computeHorizonMask(tree, bare, { ...coarse, refractionK: 1, clearRadiusM: 5 });
    const cleared = computeHorizonMask(tree, bare, { ...coarse, refractionK: 1, clearRadiusM: 100 });

    expect(withTree.elevationDeg[0]).toBeGreaterThan(10);
    expect(cleared.elevationDeg[0]).toBeLessThan(0);
  });

  it('walks rays along the bearing it was asked for', () => {
    const lat = 10;
    const east = destinationPoint(lat * DEG, 0, 90 * DEG, 100_000, EARTH_RADIUS_M);
    const north = destinationPoint(lat * DEG, 0, 0, 100_000, EARTH_RADIUS_M);

    expect(east.lonRad / DEG).toBeGreaterThan(0.85);
    expect(Math.abs(east.latRad / DEG - lat)).toBeLessThan(0.05);
    expect(north.latRad / DEG - lat).toBeCloseTo(100_000 / EARTH_RADIUS_M / DEG, 4);
    expect(Math.abs(north.lonRad)).toBeLessThan(1e-12);
  });

  it('rejects non-positive steps', () => {
    expect(() =>
      computeHorizonMask(
        ringProvider(() => 0),
        site,
        { azimuthStepDeg: 0 }
      )
    ).toThrow();
  });
});

/** Independent linear interpolation of returned vertices (sorted by azimuth, wraps at 360). */
const maskAt = (vertices: { startAz: number; minEl: number }[], az: number): number => {
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const bAz = b.startAz > a.startAz ? b.startAz : b.startAz + 360;
    const x = az >= a.startAz ? az : az + 360;

    if (x >= a.startAz && x <= bAz) {
      return a.minEl + ((b.minEl - a.minEl) * (x - a.startAz)) / (bAz - a.startAz);
    }
  }

  throw new Error('azimuth not covered');
};

const rays = 720;
const azimuths = Float64Array.from({ length: rays }, (_, i) => i * 0.5);

describe('reduceHorizonMask', () => {
  const check = (profile: Float64Array, maxUnder = 0.1) => {
    const r = reduceHorizonMask(azimuths, profile, { maxUnderDeg: maxUnder });
    let under = 0;

    for (let i = 0; i < rays; i++) {
      const clamped = Math.min(MASK_MAX_EL_DEG, Math.max(0, profile[i]));

      under = Math.max(under, clamped - maskAt(r.vertices, azimuths[i]));
    }

    expect(r.vertices.length).toBeLessThanOrEqual(MASK_MAX_VERTICES);
    expect(r.vertices.length).toBeGreaterThanOrEqual(3);
    expect(under).toBeLessThanOrEqual(maxUnder + 1e-9);
    expect(r.maxUnderDeg).toBeLessThanOrEqual(maxUnder + 1e-9);
    expect(Math.abs(r.maxUnderDeg - under)).toBeLessThan(1e-9);
    expect(new Set(r.vertices.map((v) => v.startAz)).size).toBe(r.vertices.length);

    for (const v of r.vertices) {
      expect(v.startAz).toBeGreaterThanOrEqual(0);
      expect(v.startAz).toBeLessThan(360);
      expect(v.minEl).toBeGreaterThanOrEqual(0);
      expect(v.minEl).toBeLessThanOrEqual(MASK_MAX_EL_DEG);
    }

    return r;
  };

  it('returns three zero vertices for a flat profile and clamps negative dips to 0', () => {
    const r = check(new Float64Array(rays).fill(-0.1));

    expect(r.vertices).toHaveLength(3);
    expect(r.vertices.every((v) => v.minEl === 0)).toBe(true);
  });

  it('keeps the error bound on a smooth ridge line', () => {
    const p = Float64Array.from(azimuths, (az) => Math.max(0, 3 + 2 * Math.sin(az * DEG * 3) + Math.sin(az * DEG * 7)));

    check(p);
  });

  it('keeps the error bound on a narrow spike (a chord must not cut it off)', () => {
    const p = new Float64Array(rays);

    p[100] = 6;
    p[101] = 4;
    p[300] = 2.5;
    const r = check(p);

    expect(maskAt(r.vertices, azimuths[100])).toBeGreaterThanOrEqual(6 - 0.1);
  });

  it('keeps the bound by lifting vertices when the budget is too small for jagged terrain', () => {
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;

      return seed / 4294967296;
    };
    const p = Float64Array.from({ length: rays }, () => rnd() * 8);
    const r = check(p);

    // Jagged: the cap binds, and any excess shows up as hiding more sky, never less.
    expect(r.vertices).toHaveLength(MASK_MAX_VERTICES);
    expect(r.maxOverDeg).toBeGreaterThan(1);
  });

  it('caps the elevation at 89 degrees', () => {
    const p = new Float64Array(rays).fill(0);

    p[10] = 95;
    const r = check(p);

    expect(Math.max(...r.vertices.map((v) => v.minEl))).toBe(MASK_MAX_EL_DEG);
  });

  it('uses fewer vertices when asked', () => {
    const p = Float64Array.from(azimuths, (az) => Math.max(0, 2 * Math.sin(az * DEG * 5)));
    const r = reduceHorizonMask(azimuths, p, { maxVertices: 12 });

    expect(r.vertices.length).toBeLessThanOrEqual(12);
    expect(r.maxUnderDeg).toBeLessThanOrEqual(0.1 + 1e-9);
  });
});
