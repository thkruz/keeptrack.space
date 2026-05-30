import { GetVariables } from '@app/settings/getVariables';

describe('GetVariables.godrays', () => {
  it('returns 16 for "low"', () => {
    expect(GetVariables.godrays('low')).toBe(16);
  });

  it('returns 32 for "med"', () => {
    expect(GetVariables.godrays('med')).toBe(32);
  });

  it('returns 32 for "medium"', () => {
    expect(GetVariables.godrays('medium')).toBe(32);
  });

  it('returns 64 for "hi"', () => {
    expect(GetVariables.godrays('hi')).toBe(64);
  });

  it('returns 64 for "high"', () => {
    expect(GetVariables.godrays('high')).toBe(64);
  });

  it('returns 128 for "u"', () => {
    expect(GetVariables.godrays('u')).toBe(128);
  });

  it('returns 128 for "ultra"', () => {
    expect(GetVariables.godrays('ultra')).toBe(128);
  });

  it('returns 32 for unknown value', () => {
    expect(GetVariables.godrays('unknown')).toBe(32);
  });
});
