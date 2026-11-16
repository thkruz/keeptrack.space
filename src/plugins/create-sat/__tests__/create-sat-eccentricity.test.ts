import { eccentricityHint, evaluateField, parseEccentricityField } from '@app/plugins/create-sat/create-sat-validation';

describe('eccentricity field parsing', () => {
  it.each([
    ['0.001', '0010000'],
    ['.5', '5000000'],
    ['0010000', '0010000'],
    ['1', '0000001'],
    ['0', '0000000'],
    ['0.9999999', '9999999'],
  ])('reads %s as %s', (raw, expected) => {
    expect(parseEccentricityField(raw)).toBe(expected);
    expect(evaluateField('ecen', raw)).toBe(true);
  });

  it.each(['1.0', '1.5', '-0.1', 'abc', '0.0.1', '12345678', '1e-3'])('rejects %s', (raw) => {
    expect(parseEccentricityField(raw)).toBeNull();
    expect(evaluateField('ecen', raw)).toBe(false);
  });

  it('treats empty as neutral', () => {
    expect(parseEccentricityField('')).toBeNull();
    expect(evaluateField('ecen', '')).toBeNull();
  });
});

describe('eccentricity hint', () => {
  it('states the accepted forms and range for an invalid value', () => {
    expect(eccentricityHint('1.5')).not.toBe('');
    expect(eccentricityHint('1.5').startsWith('e =')).toBe(false);
  });

  it('shows the interpreted value for a valid one and nothing when empty', () => {
    expect(eccentricityHint('0.001')).toBe('e = 0.0010000');
    expect(eccentricityHint('')).toBe('');
  });
});
