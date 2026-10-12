import { GodraySamples, nearestGodraySamples, parseGodraySamplesParam } from '@app/engine/rendering/draw-manager/godray-samples';

describe('parseGodraySamplesParam', () => {
  /*
   * Legacy links carried 16/32/64/128. Members are -1, 24, 36, 52, 80, so by absolute distance:
   * 16 -> 24 (8; next is -1 at 17), 32 -> 36 (4; 24 is 8 away), 64 -> 52 (12; 80 is 16 away),
   * 128 -> 80 (48; the largest member).
   */
  const LEGACY: [string, GodraySamples][] = [
    ['16', GodraySamples.LOW],
    ['32', GodraySamples.MEDIUM],
    ['64', GodraySamples.HIGH],
    ['128', GodraySamples.ULTRA],
  ];

  for (const [raw, expected] of LEGACY) {
    it(`maps the legacy count ${raw} to ${expected}`, () => {
      expect(parseGodraySamplesParam(raw)).toBe(expected);
    });
  }

  it('keeps an enum value as itself', () => {
    expect(parseGodraySamplesParam('36')).toBe(36);
    expect(parseGodraySamplesParam('-1')).toBe(-1);
  });

  it('maps level names, short forms included', () => {
    expect(parseGodraySamplesParam('off')).toBe(-1);
    expect(parseGodraySamplesParam('low')).toBe(24);
    expect(parseGodraySamplesParam('med')).toBe(36);
    expect(parseGodraySamplesParam('High')).toBe(52);
    expect(parseGodraySamplesParam('u')).toBe(80);
  });

  it('rejects values that are neither a name nor an integer', () => {
    expect(parseGodraySamplesParam('abc')).toBeNull();
    expect(parseGodraySamplesParam('24.5')).toBeNull();
    expect(parseGodraySamplesParam('')).toBeNull();
  });
});

describe('nearestGodraySamples', () => {
  it('breaks a tie toward the lower member', () => {
    // 30 is 6 from both 24 and 36.
    expect(nearestGodraySamples(30)).toBe(24);
  });
});
