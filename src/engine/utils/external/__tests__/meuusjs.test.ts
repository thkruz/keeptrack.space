/* eslint-disable new-cap */
import { A } from '@app/engine/utils/external/meuusjs';

/*
 * meuusjs is a pure (minified) implementation of Jean Meeus' astronomical
 * algorithms. There is no DOM or service dependency — every function is
 * deterministic given a Julian day and an observer location, so we drive the
 * main computational cascades and assert the outputs are finite and in range.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ax = A as any;

const refDate = new Date(Date.UTC(2022, 5, 21, 12, 0, 0));
const jd = () => new Ax.JulianDay(refDate);
// Observer near the Kennedy Space Center (deg lat/lon, km alt).
const observer = () => Ax.EclCoordfromWgs84(28.5, -80.6, 0);

const isFiniteNum = (n: number) => typeof n === 'number' && Number.isFinite(n);

describe('meuusjs A.Math', () => {
  it('pMod wraps negatives into [0, b)', () => {
    expect(Ax.Math.pMod(-1, 24)).toBe(23);
    expect(Ax.Math.pMod(25, 24)).toBe(1);
  });

  it('modF splits whole and fractional parts (incl. negatives)', () => {
    expect(Ax.Math.modF(3.25)).toEqual([3, 0.25]);
    const [whole, frac] = Ax.Math.modF(-3.25);

    expect(whole).toBe(-3);
    expect(frac).toBeCloseTo(-0.25, 10);
  });

  it('horner evaluates a polynomial and rejects empty arrays', () => {
    // 1 + 2x + 3x^2 at x=2 => 1 + 4 + 12 = 17
    expect(Ax.Math.horner(2, [1, 2, 3])).toBe(17);
    expect(() => Ax.Math.horner(2, [5])).toThrow();
  });

  it('formatNum rounds to a fixed precision', () => {
    expect(Ax.Math.formatNum(1.23456)).toBeCloseTo(1.2346, 4);
  });
});

describe('meuusjs A.JulianDay', () => {
  it('constructs from a Date and exposes jd/jde/century', () => {
    const j = jd();

    expect(isFiniteNum(j.jd)).toBe(true);
    expect(isFiniteNum(j.jde)).toBe(true);
    expect(isFiniteNum(j.jdJ2000Century())).toBe(true);
    expect(isFiniteNum(j.jdeJ2000Century())).toBe(true);
  });

  it('round-trips a date through dateToJD / jdToDate', () => {
    const jdNum = Ax.JulianDay.dateToJD(refDate);
    const back = Ax.JulianDay.jdToDate(jdNum);

    expect(back.getUTCFullYear()).toBe(2022);
    expect(back.getUTCMonth()).toBe(5);
  });

  it('jdToCalendar returns year/month/day', () => {
    const cal = Ax.JulianDay.jdToCalendar(Ax.JulianDay.dateToJD(refDate));

    expect(cal.y).toBe(2022);
    expect(cal.m).toBe(6);
  });

  it('handles pre-Gregorian dates via the Julian calendar branch', () => {
    const old = new Date(Date.UTC(1500, 0, 1));

    expect(isFiniteNum(Ax.JulianDay.dateToJD(old))).toBe(true);
  });

  it('leapYearGregorian and dayOfYear behave', () => {
    expect(Ax.JulianDay.leapYearGregorian(2020)).toBe(true);
    expect(Ax.JulianDay.leapYearGregorian(2021)).toBe(false);
    expect(isFiniteNum(Ax.JulianDay.dayOfYear(2022, 6, 21, true))).toBe(true);
  });

  it('prototype helpers (toCalendar/toDate/startOfDay) work', () => {
    const j = jd();

    expect(j.toCalendar().y).toBe(2022);
    expect(j.toDate()).toBeInstanceOf(Date);
    expect(isFiniteNum(j.startOfDay().jd)).toBe(true);
  });
});

describe('meuusjs A.Coord conversions', () => {
  it('dmsToDeg / calcAngle / calcRA produce radians', () => {
    expect(Ax.Coord.dmsToDeg(false, 1, 30, 0)).toBeCloseTo(1.5, 6);
    expect(Ax.Coord.dmsToDeg(true, 1, 0, 0)).toBeCloseTo(-1, 6);
    expect(isFiniteNum(Ax.Coord.calcAngle(false, 23, 26, 0))).toBe(true);
    expect(isFiniteNum(Ax.Coord.calcRA(10, 0, 0))).toBe(true);
  });

  it('eqToEcl / eclToEq / eqToHz round-trip through coordinate frames', () => {
    const eq = new Ax.EqCoord(1.0, 0.4);
    const obliquity = 0.409;
    const ecl = Ax.Coord.eqToEcl(eq, obliquity);

    expect(isFiniteNum(ecl.lat)).toBe(true);

    const eq2 = Ax.Coord.eclToEq(ecl, obliquity);

    expect(eq2.ra).toBeCloseTo(eq.ra, 6);

    const hz = Ax.Coord.eqToHz(eq, { lat: 0.5, lng: -1.4 }, 2.0);

    expect(isFiniteNum(hz.az)).toBe(true);
  });

  it('secondsToHMSStr / secondsToHMStr format durations', () => {
    expect(Ax.Coord.secondsToHMSStr(3661)).toBe('01:01:01');
    expect(typeof Ax.Coord.secondsToHMStr(90000)).toBe('string');
  });

  it('coordinate constructors reject NaN', () => {
    expect(() => new Ax.EqCoord(NaN, 0)).toThrow();
    expect(() => new Ax.HzCoord(NaN, 0)).toThrow();
    expect(() => new Ax.EclCoord(NaN, 0)).toThrow();
  });
});

describe('meuusjs leaf utilities', () => {
  it('DeltaT estimates across multiple epoch branches', () => {
    for (const year of [1500, 1750, 1850, 1910, 1955, 1990, 2030, 2200]) {
      // estimate() takes the numeric Julian day (as the JulianDay constructor calls it).
      const jdNum = Ax.JulianDay.dateToJD(new Date(Date.UTC(year, 0, 1)));

      expect(isFiniteNum(Ax.DeltaT.estimate(jdNum))).toBe(true);
    }
  });

  it('Globe.parallaxConstants returns rho terms', () => {
    const c = Ax.Globe.parallaxConstants(0.5, 0.1);

    expect(isFiniteNum(c.rhoslat)).toBe(true);
    expect(isFiniteNum(c.rhoclat)).toBe(true);
  });

  it('Interp newLen3 + interpolate', () => {
    const tab = Ax.Interp.newLen3(-1, 1, [10, 20, 30]);

    expect(isFiniteNum(Ax.Interp.interpolateX(tab, 0))).toBe(true);
    expect(() => Ax.Interp.newLen3(0, 1, [1, 2])).toThrow();
  });

  it('Refraction bennett/bennett2/saemundsson are finite', () => {
    expect(isFiniteNum(Ax.Refraction.bennett(0.5))).toBe(true);
    expect(isFiniteNum(Ax.Refraction.bennett2(0.5))).toBe(true);
    expect(isFiniteNum(Ax.Refraction.saemundsson(0.5))).toBe(true);
  });

  it('Parallax horizontal/topocentric/topocentric2 are finite', () => {
    const eq = new Ax.EqCoord(1.0, 0.4);

    expect(isFiniteNum(Ax.Parallax.horizontal(1))).toBe(true);
    expect(Ax.Parallax.topocentric(eq, 0.01, 0.5, 0.86, -1.4, 2.0).ra).toBeDefined();
    expect(Ax.Parallax.topocentric2(eq, 0.01, 0.5, 0.86, -1.4, 2.0).ra).toBeDefined();
  });

  it('Sidereal mean/apparent/apparent0UT/apparentLocal are finite', () => {
    const j = jd();

    expect(isFiniteNum(Ax.Sidereal.mean(j))).toBe(true);
    expect(isFiniteNum(Ax.Sidereal.apparent(j))).toBe(true);
    expect(isFiniteNum(Ax.Sidereal.apparent0UT(j))).toBe(true);
    expect(isFiniteNum(Ax.Sidereal.mean0UT(j))).toBe(true);
    expect(isFiniteNum(Ax.Sidereal.apparentLocal(j, -1.4))).toBe(true);
  });

  it('Nutation nutation/obliquity helpers are finite', () => {
    const j = jd();

    expect(isFiniteNum(Ax.Nutation.nutation(j).deltalng)).toBe(true);
    expect(isFiniteNum(Ax.Nutation.nutationInRA(j))).toBe(true);
    expect(isFiniteNum(Ax.Nutation.trueObliquity(j))).toBe(true);
    expect(isFiniteNum(Ax.Nutation.meanObliquity(j))).toBe(true);
  });

  it('Rise.circumpolar returns null outside [-1, 1]', () => {
    expect(Ax.Rise.circumpolar(1.4, -1.4, 1.4)).toBeNull();
  });
});

describe('meuusjs Solar cascade', () => {
  it('apparentEquatorial / topocentricPosition compute a sun position', () => {
    const eq = Ax.Solar.apparentEquatorial(jd());

    expect(isFiniteNum(eq.ra)).toBe(true);
    expect(isFiniteNum(eq.dec)).toBe(true);

    const tp = Ax.Solar.topocentricPosition(jd(), observer(), true);

    expect(isFiniteNum(tp.hz.az)).toBe(true);
    expect(isFiniteNum(tp.hz.alt)).toBe(true);
  });

  it('meanAnomaly / trueLongitude / apparentLongitude / node are finite', () => {
    const T = jd().jdJ2000Century();

    expect(isFiniteNum(Ax.Solar.meanAnomaly(T))).toBe(true);
    expect(isFiniteNum(Ax.Solar.trueLongitude(T).s)).toBe(true);
    expect(isFiniteNum(Ax.Solar.apparentLongitude(T))).toBe(true);
    expect(isFiniteNum(Ax.Solar.node(T))).toBe(true);
  });

  it('rise/transit/times routines run', () => {
    expect(isFiniteNum(Ax.Solar.approxTransit(jd(), observer()))).toBe(true);
    // approxTimes / times may return null for circumpolar geometry; just ensure no throw.
    expect(() => Ax.Solar.approxTimes(jd(), observer())).not.toThrow();
    expect(() => Ax.Solar.times(jd(), observer())).not.toThrow();
  });
});

describe('meuusjs Moon cascade', () => {
  it('geocentricPosition computes lng/lat/delta (drives the big ta/tb tables)', () => {
    const pos = Ax.Moon.geocentricPosition(jd());

    expect(isFiniteNum(pos.lng)).toBe(true);
    expect(isFiniteNum(pos.lat)).toBe(true);
    expect(pos.delta).toBeGreaterThan(300000);
  });

  it('apparentEquatorial / topocentricPosition compute a moon position', () => {
    const eq = Ax.Moon.apparentEquatorial(jd());

    expect(isFiniteNum(eq.eq.ra)).toBe(true);

    const tp = Ax.Moon.topocentricPosition(jd(), observer(), true);

    expect(isFiniteNum(tp.hz.alt)).toBe(true);
    expect(isFiniteNum(tp.q)).toBe(true);
  });

  it('parallax / parallacticAngle are finite', () => {
    expect(isFiniteNum(Ax.Moon.parallax(385000))).toBe(true);
    expect(isFiniteNum(Ax.Moon.parallacticAngle(0.5, 1.0, 0.4))).toBe(true);
  });

  it('rise/transit/times routines run', () => {
    expect(() => Ax.Moon.approxTransit(jd(), observer())).not.toThrow();
    expect(() => Ax.Moon.approxTimes(jd(), observer())).not.toThrow();
    expect(() => Ax.Moon.times(jd(), observer())).not.toThrow();
  });
});

describe('meuusjs MoonIllum + Solstice', () => {
  it('MoonIllum illuminated/phaseAngle/positionAngle are finite', () => {
    const sun = new Ax.EqCoord(1.0, 0.3);
    const moon = new Ax.EqCoord(1.2, 0.35);

    expect(Ax.MoonIllum.illuminated(1.0)).toBeGreaterThan(0);
    expect(isFiniteNum(Ax.MoonIllum.phaseAngleEq2(sun, moon))).toBe(true);
    expect(isFiniteNum(Ax.MoonIllum.positionAngle(sun, moon))).toBe(true);
  });

  it('Solstice march/june/september/december return Julian days', () => {
    for (const fn of ['march', 'june', 'september', 'december']) {
      expect(isFiniteNum(Ax.Solistice[fn](2022))).toBe(true);
      // The pre-1000 branch uses the mc0/jc0/... coefficient sets.
      expect(isFiniteNum(Ax.Solistice[fn](500))).toBe(true);
    }
  });
});
