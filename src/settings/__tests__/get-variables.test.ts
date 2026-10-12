import { GetVariables } from '@app/settings/getVariables';

// GodraySamples members: OFF -1, LOW 24, MEDIUM 36, HIGH 52, ULTRA 80.
describe('GetVariables.godrays', () => {
  const CASES: [string, number][] = [
    ['low', 24],
    ['med', 36],
    ['medium', 36],
    ['hi', 52],
    ['high', 52],
    ['u', 80],
    ['ultra', 80],
    // Legacy sample counts snap to the nearest member.
    ['16', 24],
    ['128', 80],
  ];

  for (const [raw, expected] of CASES) {
    it(`returns ${expected} for "${raw}"`, () => {
      expect(GetVariables.godrays(raw)).toBe(expected);
    });
  }

  it('returns 36 (MEDIUM) for an unknown value', () => {
    expect(GetVariables.godrays('unknown')).toBe(36);
  });
});
