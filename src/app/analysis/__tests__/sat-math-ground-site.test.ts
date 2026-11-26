import { GROUND_SITE_MAX_ALT_KM, SatMath } from '@app/app/analysis/sat-math';
import { DEG2RAD, Kilometers, llaRad2eci, Radians, StateVectorSgp4, SunStatus, TemeVec3 } from '@ootk/src/main';

/*
 * Rows SM1 and SM3 of AUDIT-wgs84.md. Ground sites now sit on the WGS84 ellipsoid (llaRad2eci), so an equatorial site
 * is at r = 6378.137 km + alt, above the old `r <= 6378.1363` ground-site cut. The classification uses the geodetic
 * altitude band instead, and the ground-site Sun elevation is measured from the geodetic normal.
 */

const site = (latDeg: number, lonDeg: number, altKm: number): TemeVec3 =>
  llaRad2eci({ lat: (latDeg * DEG2RAD) as Radians, lon: (lonDeg * DEG2RAD) as Radians, alt: altKm as Kilometers }, 0.4);

const SUN_DIST_KM = 1.5e8;

describe('SatMath.isGroundSitePosition (row SM1)', () => {
  it('classifies an equatorial site at alt 1 km as ground (r = 6379.137 km, above the old cut)', () => {
    const p = site(0, 30, 1);

    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(6379.137, 6);
    expect(SatMath.isGroundSitePosition(p.x, p.y, p.z)).toBe(true);
  });

  it('classifies a polar site at alt 0 as ground', () => {
    const p = site(90, 0, 0);

    expect(SatMath.isGroundSitePosition(p.x, p.y, p.z)).toBe(true);
  });

  it('classifies LEO satellites over the equator, 45 N and the pole as satellites', () => {
    for (const lat of [0, 45, 90]) {
      const p = site(lat, 0, 400);

      expect(SatMath.isGroundSitePosition(p.x, p.y, p.z)).toBe(false);
    }
  });

  it('puts the cut at the geodetic altitude GROUND_SITE_MAX_ALT_KM at the equator, 45 N and the pole', () => {
    expect(GROUND_SITE_MAX_ALT_KM).toBe(100);
    for (const lat of [0, 45, 90]) {
      const below = site(lat, 10, 99);
      const above = site(lat, 10, 101);

      expect(SatMath.isGroundSitePosition(below.x, below.y, below.z)).toBe(true);
      expect(SatMath.isGroundSitePosition(above.x, above.y, above.z)).toBe(false);
    }
  });

  it('uses hand values: a + 99 km on the x axis is ground, b + 101 km on the z axis is not', () => {
    expect(SatMath.isGroundSitePosition(6378.137 + 99, 0, 0)).toBe(true);
    expect(SatMath.isGroundSitePosition(0, 0, 6356.752314 + 101)).toBe(false);
  });
});

describe('SatMath.calculateIsInSun ground-site path (row SM1)', () => {
  it('sends an equatorial site at alt 1 km down the ground path, not the shadow cone', () => {
    // Sun exactly on the site's horizon: the ground path reads PENUMBRAL (disk straddling the horizon); the
    // satellite shadow cone would read SUN for a point beside Earth.
    const pos = { x: 6379.137, y: 0, z: 0 } as TemeVec3;
    const sun = { x: 0, y: SUN_DIST_KM, z: 0 } as TemeVec3;

    expect(SatMath.calculateIsInSun({ position: pos } as unknown as StateVectorSgp4, sun)).toBe(SunStatus.PENUMBRAL);
  });

  it('keeps the shadow cone for a LEO satellite beside Earth', () => {
    const pos = { x: 6878.137, y: 0, z: 0 } as TemeVec3;
    const sun = { x: 0, y: SUN_DIST_KM, z: 0 } as TemeVec3;

    expect(SatMath.calculateIsInSun({ position: pos } as unknown as StateVectorSgp4, sun)).toBe(SunStatus.SUN);
  });
});

describe('ground-site Sun elevation from the geodetic normal (row SM3)', () => {
  // Hand-computed WGS84 surface point at 45 N, 0 E: (4517.5909, 0, 4487.3484); geodetic normal (cos 45, 0, sin 45).
  // Its geocentric latitude is atan(4487.3484 / 4517.5909) = 44.808 deg, so the radial up is 0.192 deg south of it.
  const s45 = { x: 4517.5909, y: 0, z: 4487.3484 } as TemeVec3;
  const sunAtGeodeticEl = (elDeg: number): TemeVec3 => {
    const el = elDeg * DEG2RAD;
    const c = Math.SQRT1_2;
    // north tangent t = (-sin 45, 0, cos 45), normal n = (cos 45, 0, sin 45)
    const d = { x: Math.cos(el) * -c + Math.sin(el) * c, y: 0, z: Math.cos(el) * c + Math.sin(el) * c };

    return { x: s45.x + d.x * SUN_DIST_KM, y: 0, z: s45.z + d.z * SUN_DIST_KM } as TemeVec3;
  };

  it('measures the default elevation against the geodetic normal', () => {
    expect(SatMath.calculateGroundSiteSunElevation(s45, sunAtGeodeticEl(-0.2))).toBeCloseTo(-0.2, 4);
    expect(SatMath.calculateGroundSiteSunElevation(s45, sunAtGeodeticEl(5))).toBeCloseTo(5, 4);
  });

  it('reads PENUMBRAL with the Sun centre 0.2 deg below the geodetic horizon (radial up would give UMBRAL at -0.39)', () => {
    expect(SatMath.calculateGroundSiteSunStatus(s45, sunAtGeodeticEl(-0.2))).toBe(SunStatus.PENUMBRAL);
  });

  it('reads UMBRAL and SUN well below and above the horizon', () => {
    expect(SatMath.calculateGroundSiteSunStatus(s45, sunAtGeodeticEl(-1))).toBe(SunStatus.UMBRAL);
    expect(SatMath.isGroundSiteInNight(s45, sunAtGeodeticEl(-1))).toBe(true);
    expect(SatMath.calculateGroundSiteSunStatus(s45, sunAtGeodeticEl(1))).toBe(SunStatus.SUN);
  });
});

describe('degenerate inputs', () => {
  const sun = { x: SUN_DIST_KM, y: 0, z: 0 } as TemeVec3;
  const sv = (x: number, y: number, z: number) => ({ position: { x, y, z } }) as unknown as StateVectorSgp4;

  it('calculateIsInSun returns UNKNOWN without an object, a position, a Sun vector or a finite non-zero radius', () => {
    expect(SatMath.calculateIsInSun(null as unknown as StateVectorSgp4, sun)).toBe(SunStatus.UNKNOWN);
    expect(SatMath.calculateIsInSun({} as unknown as StateVectorSgp4, sun)).toBe(SunStatus.UNKNOWN);
    expect(SatMath.calculateIsInSun(sv(7000, 0, 0), null as unknown as TemeVec3)).toBe(SunStatus.UNKNOWN);
    expect(SatMath.calculateIsInSun(sv(Number.NaN, 0, 0), sun)).toBe(SunStatus.UNKNOWN);
    expect(SatMath.calculateIsInSun(sv(0, 0, 0), sun)).toBe(SunStatus.UNKNOWN);
  });

  it('calculateIsInSun keeps the shadow-cone statuses for satellites on the day and night side', () => {
    expect(SatMath.calculateIsInSun(sv(7000, 0, 0), sun)).toBe(SunStatus.SUN);
    expect(SatMath.calculateIsInSun(sv(-7000, 0, 0), sun)).toBe(SunStatus.UMBRAL);
  });

  it('calculateGroundSiteSunElevation returns null for missing or zero-length vectors', () => {
    const s = { x: 6378.137, y: 0, z: 0 } as TemeVec3;

    expect(SatMath.calculateGroundSiteSunElevation(null as unknown as TemeVec3, sun)).toBeNull();
    expect(SatMath.calculateGroundSiteSunElevation(s, null as unknown as TemeVec3)).toBeNull();
    expect(SatMath.calculateGroundSiteSunElevation({ x: 0, y: 0, z: 0 } as TemeVec3, sun)).toBeNull();
    expect(SatMath.calculateGroundSiteSunElevation(s, s)).toBeNull();
    expect(SatMath.calculateGroundSiteSunElevation(s, sun, { x: 0, y: 0, z: 0 } as TemeVec3)).toBeNull();
    expect(SatMath.calculateGroundSiteSunElevation(s, sun, { x: Number.NaN, y: 0, z: 0 } as TemeVec3)).toBeNull();
  });
});
