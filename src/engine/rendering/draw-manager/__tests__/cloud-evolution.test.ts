import { describe, expect, it } from 'vitest';
import {
  applyCloudHide,
  CLOUD_DETAIL_ROTATIONS,
  CLOUD_EVOLUTION,
  cloudDetailLod,
  cloudEvolutionDetail,
  cloudEvolutionHashU,
  cloudEvolutionHide,
  cloudEvolutionNoise,
  cloudEvolutionOffset,
  cloudEvolutionPhase,
  cloudEvolutionStormNoise,
  directionFromUv,
  evolveCloudCoverage,
  uvFromDirection,
} from '../cloud-evolution';
import { CLOUD_EVOLUTION_GLSL } from '../painted-clouds-glsl';

// Deterministic pseudo-random sequence so a failure reproduces.
function rng(seed: number) {
  let s = seed;

  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;

    return s / 4294967296;
  };
}

function randomDirection(r: () => number): [number, number, number] {
  return directionFromUv(r(), Math.acos(1 - 2 * r()) / Math.PI);
}

describe('cloud evolution', () => {
  const r = rng(12345);
  const samples = Array.from({ length: 2000 }, () => ({ p: randomDirection(r), c: r(), t: r() * 20000, d: r() }));

  it('never exceeds the input coverage', () => {
    for (const s of samples) {
      for (const k of [0.25, 0.5, 1]) {
        expect(evolveCloudCoverage(s.p, s.c, s.t, k, s.d)).toBeLessThanOrEqual(s.c + 1e-12);
      }
    }
  });

  it('keeps zero coverage at zero', () => {
    for (const s of samples) {
      expect(evolveCloudCoverage(s.p, 0, s.t, 1)).toBe(0);
    }
  });

  it('is the identity at strength 0', () => {
    for (const s of samples) {
      expect(evolveCloudCoverage(s.p, s.c, s.t, 0, s.d)).toBe(s.c);
      // Nothing eroded (e = 0) keeps the coverage whatever the borrowed detail.
      expect(applyCloudHide(s.c, 0, s.d)).toBe(s.c);
      expect(applyCloudHide(s.c, 1e-9, s.d)).toBeCloseTo(s.c, 12);
    }
  });

  it('cuts by threshold: coverage is either kept whole or gone, with a narrow feather (W5)', () => {
    // Across the erosion range a dense point (c = 1) is at full coverage or zero most of the way, unlike the W4 rescale
    // that left it partly transparent over a broad band of e.
    let partial = 0;
    const n = 1000;

    for (let i = 0; i < n; i++) {
      const v = applyCloudHide(1, i / n, 0.5);

      partial += v > 0.05 && v < 0.95 ? 1 : 0;
    }
    expect(partial / n).toBeLessThan(0.3);
    // Opaque right up to the cut: where cloud survives with margin it keeps its exact coverage.
    expect(applyCloudHide(0.9, 0.2, 0.7)).toBe(0.9);
  });

  it('reads the borrowed detail at directions that wrap without a seam, weighted away from their poles', () => {
    const flat = (v: number) => () => v;

    // A map that is fully cloudy everywhere gives borrowed opacity 1.
    const synthOnly = cloudEvolutionDetail([0, 1, 0], flat(0));

    expect(cloudEvolutionDetail([0, 1, 0], flat(1))).toBeCloseTo(synthOnly + (1 - CLOUD_EVOLUTION.synthWeight), 12);
    // A map that depends on u only through a periodic function has no antimeridian seam in the detail.
    const periodic = (u: number, v: number) => 0.5 + 0.4 * Math.sin(2 * Math.PI * u) * Math.cos(Math.PI * (v - 0.5));
    const rr = rng(31);

    for (let i = 0; i < 200; i++) {
      const p = randomDirection(rr);
      const q: [number, number, number] = [p[0] + 1e-7, p[1], p[2]];
      const len = Math.hypot(...q);

      expect(Math.abs(cloudEvolutionDetail(p, periodic) - cloudEvolutionDetail([q[0] / len, q[1] / len, q[2] / len], periodic))).toBeLessThan(1e-4);
    }
    for (const m of CLOUD_DETAIL_ROTATIONS) {
      // Rotations are orthonormal.
      expect(m[0] * m[0] + m[3] * m[3] + m[6] * m[6]).toBeCloseTo(1, 12);
      expect(m[0] * m[1] + m[3] * m[4] + m[6] * m[7]).toBeCloseTo(0, 12);
    }
    const [u, v] = uvFromDirection(directionFromUv(0.3, 0.7));

    expect(u).toBeCloseTo(0.3, 12);
    expect(v).toBeCloseTo(0.7, 12);
  });

  it('is continuous in time across a period boundary', () => {
    const boundary = 40000 * CLOUD_EVOLUTION.periodDays;
    const minute = 1 / 1440;
    let worst = 0;

    for (const s of samples.slice(0, 500)) {
      for (const t of [boundary, boundary - minute / 2, 12345.3]) {
        worst = Math.max(worst, Math.abs(evolveCloudCoverage(s.p, 1, t, 1) - evolveCloudCoverage(s.p, 1, t + minute, 1)));
      }
    }
    // Strength 1 (twice the default) moves fastest: 1.3 to 3 percent per minute at worst (median and maximum of the worst
    // over 40 times x 500 points, for both the old float offset hash and the W9 integer hash), so a full change takes
    // about an hour.
    expect(worst).toBeLessThan(0.035);
  });

  it('gives the same result for the same time', () => {
    for (const s of samples.slice(0, 100)) {
      expect(evolveCloudCoverage(s.p, s.c, s.t, 0.5)).toBe(evolveCloudCoverage(s.p, s.c, s.t, 0.5));
    }
  });

  it('has no seam at the antimeridian or the poles', () => {
    const t = 1234.5;

    for (const v of [0.1, 0.5, 0.9]) {
      expect(evolveCloudCoverage(directionFromUv(0, v), 0.8, t, 1)).toBeCloseTo(evolveCloudCoverage(directionFromUv(1, v), 0.8, t, 1), 9);
      expect(Math.abs(evolveCloudCoverage(directionFromUv(0.0005, v), 0.8, t, 1) - evolveCloudCoverage(directionFromUv(0.9995, v), 0.8, t, 1))).toBeLessThan(0.05);
    }
    for (const u of [0.1, 0.6]) {
      expect(evolveCloudCoverage(directionFromUv(u, 0), 0.8, t, 1)).toBeCloseTo(evolveCloudCoverage(directionFromUv(u + 0.3, 0), 0.8, t, 1), 9);
    }
  });

  it('stays within 0..1 and is 0 at strength 0', () => {
    const rr = rng(777);

    for (let i = 0; i < 3000; i++) {
      const p = randomDirection(rr);
      const t = rr() * 20000;

      for (const k of [0.25, 0.5, 1]) {
        const h = cloudEvolutionHide(p, t, k);

        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(1 + 1e-12);
      }
      expect(cloudEvolutionHide(p, t, 0)).toBe(0);
    }
  });

  it('removes even full coverage where the mask is at full depth', () => {
    expect(applyCloudHide(1, 1)).toBe(0);
    expect(applyCloudHide(0.4, 1)).toBe(0);
    expect(applyCloudHide(1, 0)).toBe(1);
    // At e = 1 with d = 1 the score sits exactly on the lower feather edge, so float rounding can leave ~1e-31.
    expect(applyCloudHide(1, 1, 1)).toBeCloseTo(0, 12);
    // Thin cloud goes first: at the same erosion, a thin deck loses a larger share than a thick one.
    expect(applyCloudHide(0.3, 0.4) / 0.3).toBeLessThan(applyCloudHide(0.9, 0.4) / 0.9);
    // Where the borrowed cloud is clear the cut comes earlier than where it is cloudy.
    expect(applyCloudHide(0.8, 0.45, 0.1)).toBeLessThan(applyCloudHide(0.8, 0.45, 0.9));
  });

  it('fully hides coverage 1.0 some of the time at the default strength, and leaves it alone most of the time (year, 3-hourly)', () => {
    // W5 retune: W4 hid coverage 1.0 a quarter of the time and kept about 51 % of the globe's cloud area; the default now
    // keeps about 77 % (w5-stats.ts with the real map) and still hides every dense point some of the time.
    const rr = rng(4242);
    const t0 = Date.parse('2026-01-01T00:00:00Z') / 86400000;
    let full = 0;
    let untouched = 0;
    let n = 0;

    for (let i = 0; i < 40; i++) {
      const p = randomDirection(rr);

      for (let h = 0; h < 24 * 365; h += 3) {
        const v = evolveCloudCoverage(p, 1, t0 + h / 24, 0.5, 0.5);

        full += v < 0.01 ? 1 : 0;
        untouched += v > 0.99 ? 1 : 0;
        n++;
      }
    }
    expect(full / n).toBeGreaterThan(0.05);
    expect(full / n).toBeLessThan(0.15);
    expect(untouched / n).toBeGreaterThan(0.7);
  });

  it('changes gradually: no jump at 1x (one minute) or at a 10-minute time-lapse step', () => {
    const rr = rng(99);
    let worstMinute = 0;
    let worstTen = 0;

    for (let i = 0; i < 300; i++) {
      const p = randomDirection(rr);
      const t = 20000 + rr() * 365;

      const d = rr();

      worstMinute = Math.max(worstMinute, Math.abs(evolveCloudCoverage(p, 1, t, 0.5, d) - evolveCloudCoverage(p, 1, t + 1 / 1440, 0.5, d)));
      worstTen = Math.max(worstTen, Math.abs(evolveCloudCoverage(p, 1, t, 0.5, d) - evolveCloudCoverage(p, 1, t + 10 / 1440, 0.5, d)));
    }
    // The threshold cut moves a point from kept to gone faster than the W4 rescale did (about 1.6 % per minute at worst,
    // so a point takes about an hour), and the edge moves across the ground instead of the whole deck fading.
    // Bound widened in W9 from 0.02: the worst over 300 points depends on the field realization (see the boundary test).
    expect(worstMinute).toBeLessThan(0.03);
    expect(worstTen).toBeLessThan(0.2);
  });

  it('ships the GLSL with the same constants', () => {
    const f = (x: number) => (Number.isInteger(x) ? `${x}.0` : `${x}`);

    expect(CLOUD_EVOLUTION_GLSL).toContain('float cloudEvolutionCoverage(sampler2D map, vec3 p, float c, vec4 phase, float strength)');
    expect(CLOUD_EVOLUTION_GLSL).toContain(`smoothstep(${f(CLOUD_EVOLUTION.lo)} + shift, ${f(CLOUD_EVOLUTION.hi)} + shift, n)`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`smoothstep(${f(CLOUD_EVOLUTION.stormLo)} + shift, ${f(CLOUD_EVOLUTION.stormHi)} + shift, m)`);
    expect(CLOUD_EVOLUTION_GLSL).toContain('ceCrossFade(ceField(p, phase.x), ceField(p, phase.x + 1.0), smoothstep(0.0, 1.0, phase.y))');
    expect(CLOUD_EVOLUTION_GLSL).toContain('ceCrossFade(ceStormField(p, phase.z), ceStormField(p, phase.z + 1.0), smoothstep(0.0, 1.0, phase.w))');
    expect(CLOUD_EVOLUTION_GLSL).toContain(`p * ${f(CLOUD_EVOLUTION.stormFreq)}`);
    const { detailAmp: A, feather: w } = CLOUD_EVOLUTION;

    expect(CLOUD_EVOLUTION_GLSL).toContain(`float cut = ${f(-0.5 * A - w)} + e * ${f(1 + A + 2 * w)};`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`return c * smoothstep(cut - ${f(w)}, cut + ${f(w)}, s);`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`float s = c + ${f(A)} * (cloudEvolutionDetail(map, p) - 0.5);`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`smoothstep(${f(CLOUD_EVOLUTION.detailLo)}, ${f(CLOUD_EVOLUTION.detailHi)}, textureLod(map, uv, lod).r)`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`max(0.0, ${f(CLOUD_EVOLUTION.detailLod)} + log2(float(textureSize(map, 0).x) / ${f(CLOUD_EVOLUTION.detailLodMapWidth)}))`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`float fr = ${f(CLOUD_EVOLUTION.synthFreq)};`);
    expect(CLOUD_EVOLUTION_GLSL).toContain(`${f(1 - CLOUD_EVOLUTION.synthWeight)} * (w0 * b0 + w1 * b1) / (w0 + w1) + ${f(CLOUD_EVOLUTION.synthWeight)} * ceSynth(p)`);
    // The GLSL mat3 is column major: its first column is the TS matrix's first column (m[0], m[3], m[6]).
    const m = CLOUD_DETAIL_ROTATIONS[0];

    expect(CLOUD_EVOLUTION_GLSL).toContain(`mat3(${m[0].toFixed(9)}, ${m[3].toFixed(9)}, ${m[6].toFixed(9)},`);
  });

  describe('W6: time precision and camera independence', () => {
    const msToDays = (ms: number) => ms / 86400000;
    const t0 = Date.parse('2026-09-22T10:00:28.130Z');

    it('a float32 day count steps every 168.75 s (the cause of the pop); the phase sent instead resolves each frame', () => {
      // What uniform1f(tDays) used to deliver: constant for minutes, then a jump.
      expect(Math.fround(msToDays(t0 - 20))).not.toBe(Math.fround(msToDays(t0 + 20)));
      expect(Math.fround(msToDays(t0 + 20))).toBe(Math.fround(msToDays(t0 + 160_000)));
      // The phase as the shader receives it (float32 per component) moves with every 1x frame (16.7 ms).
      let prev = Math.fround(cloudEvolutionPhase(msToDays(t0 - 1000))[1]);

      for (let ms = t0 - 1000 + 16.7; ms < t0 + 1000; ms += 16.7) {
        const ph = cloudEvolutionPhase(msToDays(ms)).map(Math.fround);

        expect(ph[1]).toBeGreaterThan(prev);
        expect(ph[1] - prev).toBeLessThan(1e-6);
        prev = ph[1];
      }
    });

    it('phase indices wrap at 4096 and the fractions stay in 0..1', () => {
      for (const days of [0, 1.234, 20718.4, 3072, 3072 - 1e-7, 10240, -5.5]) {
        const [k, s, ks, ss] = cloudEvolutionPhase(days);

        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThan(4096);
        expect(ks).toBeGreaterThanOrEqual(0);
        expect(ks).toBeLessThan(4096);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(1);
        expect(ss).toBeGreaterThanOrEqual(0);
        expect(ss).toBeLessThan(1);
      }
    });

    it('the noise is continuous across a period boundary and across the 4096-period wrap', () => {
      const p = directionFromUv(0.37, 0.41);
      const { periodDays, stormPeriodDays } = CLOUD_EVOLUTION;

      for (const edge of [periodDays * 27624, periodDays * 4096, periodDays * 8192]) {
        expect(Math.abs(cloudEvolutionNoise(p, edge - 1e-9) - cloudEvolutionNoise(p, edge + 1e-9))).toBeLessThan(1e-6);
      }
      for (const edge of [stormPeriodDays * 8287, stormPeriodDays * 4096]) {
        expect(Math.abs(cloudEvolutionStormNoise(p, edge - 1e-9) - cloudEvolutionStormNoise(p, edge + 1e-9))).toBeLessThan(1e-6);
      }
    });

    it('reads the borrowed detail at one ground resolution, whatever the map size and with no camera input', () => {
      expect(cloudDetailLod(8192)).toBe(2);
      expect(cloudDetailLod(4096)).toBe(1);
      expect(cloudDetailLod(2048)).toBe(0);
      expect(cloudDetailLod(1024)).toBe(0);
      // The coverage function takes no level of detail, derivative or footprint from the caller.
      const sig = CLOUD_EVOLUTION_GLSL.slice(CLOUD_EVOLUTION_GLSL.indexOf('float cloudEvolutionCoverage('));

      expect(sig.slice(0, sig.indexOf('{'))).not.toMatch(/lod|dFd|fwidth/u);
      expect(CLOUD_EVOLUTION_GLSL).not.toMatch(/dFdx|dFdy|fwidth|ceLodFromUv/u);
      // The TS twin's mask is a pure function of (p, c, time, strength, map): the same at every call.
      const p = directionFromUv(0.52, 0.47);
      const d = cloudEvolutionDetail(p, () => 0.4);

      expect(evolveCloudCoverage(p, 0.8, 20718.42, 0.5, d)).toBe(evolveCloudCoverage(p, 0.8, 20718.42, 0.5, d));
    });
  });
});

describe('cloud evolution field offsets (W9)', () => {
  // Reference lowbias32 in BigInt, independent of Math.imul.
  const ref = (x: number): number => {
    const M = 0xffffffffn;
    let h = BigInt(x >>> 0);

    h ^= h >> 16n;
    h = (h * 0x7feb352dn) & M;
    h ^= h >> 15n;
    h = (h * 0x846ca68bn) & M;
    h ^= h >> 16n;

    return Number(h);
  };

  it('hashes with exact 32-bit unsigned arithmetic', () => {
    for (const x of [0, 1, 2, 7, 4095, 25096, 32767, 0x7fffffff, 0xffffffff]) {
      expect(cloudEvolutionHashU(x)).toBe(ref(x));
    }
  });

  it('gives offsets that depend only on the integer period index, wrap every 4096 periods and fill 0..37', () => {
    const all: number[] = [];

    for (let k = 0; k < 4096; k++) {
      for (const salt of [0, 3]) {
        const o = cloudEvolutionOffset(k, salt);

        expect(cloudEvolutionOffset(k + 4096, salt)).toEqual(o);
        for (const v of o) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(37);
          // 24 exact bits before the scale: the same value in float32 on the GPU as in double here.
          expect(Math.fround(v / 37)).toBe(v / 37);
        }
        all.push(...o);
      }
    }
    const mean = all.reduce((a, b) => a + b, 0) / all.length;

    expect(mean).toBeGreaterThan(18);
    expect(mean).toBeLessThan(19);
    expect(cloudEvolutionOffset(3137, 0)).not.toEqual(cloudEvolutionOffset(3138, 0));
    expect(cloudEvolutionOffset(3137, 0)).not.toEqual(cloudEvolutionOffset(3137, 3));
  });

  it('ships the integer hash in the GLSL, with no float hash of the period index', () => {
    expect(CLOUD_EVOLUTION_GLSL).toContain('x *= 0x7feb352du;');
    expect(CLOUD_EVOLUTION_GLSL).toContain('x *= 0x846ca68bu;');
    expect(CLOUD_EVOLUTION_GLSL).toContain('return float(ceHashU(m * 8u + i) >> 8u) * (1.0 / 16777216.0);');
    expect(CLOUD_EVOLUTION_GLSL).toContain('return 37.0 * vec3(ceHashK(m, s), ceHashK(m, s + 1u), ceHashK(m, s + 2u));');
    expect(CLOUD_EVOLUTION_GLSL).not.toContain('ceHash(vec3(m');
  });
});
