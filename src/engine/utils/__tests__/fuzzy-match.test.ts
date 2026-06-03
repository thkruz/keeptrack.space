import { fuzzyScore, fuzzySubsequenceScore } from '@app/engine/utils/fuzzy-match';

describe('fuzzySubsequenceScore', () => {
  it('returns 0 when the query is not a subsequence of the label', () => {
    expect(fuzzySubsequenceScore('calculator', 'xyz')).toBe(0);
  });

  it('scores a matching subsequence between 1 and 60', () => {
    const score = fuzzySubsequenceScore('calculator', 'clr');

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(60);
  });

  it('rewards word-boundary matches over scattered ones', () => {
    const boundary = fuzzySubsequenceScore('find by looks', 'fbl');
    const scattered = fuzzySubsequenceScore('fabulous', 'fbl');

    expect(boundary).toBeGreaterThan(scattered);
  });
});

describe('fuzzyScore', () => {
  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('Settings Menu', '')).toBe(0);
  });

  it('ranks prefix > substring > acronym > fuzzy', () => {
    expect(fuzzyScore('Settings Menu', 'sett')).toBe(150);
    expect(fuzzyScore('Open Settings', 'sett')).toBe(100);
    expect(fuzzyScore('Tell Me A Joke', 'tmaj')).toBe(100);
    expect(fuzzyScore('Tell Me A Joke', 'maj')).toBe(80);
    expect(fuzzyScore('Calculator', 'clr')).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    expect(fuzzyScore('Settings Menu', 'SETT')).toBe(150);
  });

  it('returns 0 when nothing matches', () => {
    expect(fuzzyScore('Calculator', 'xyz')).toBe(0);
  });
});
