import * as tleFormater from './tleFormater';

describe('tleFormater.formatRightAscension', () => {
  it('should handle missing trailing 0s', () => {
    const num = '180.0';
    const numStr = tleFormater.formatRightAscension(num);
    expect(numStr).toBe('180.0000');
  });

  it('should handle missing leading numbers', () => {
    const num = '80.0';
    const numStr = tleFormater.formatRightAscension(num);
    expect(numStr).toBe('080.0000');
  });
});

describe('tleFormater.formatArgumentOfPerigee', () => {
  it('should handle missing trailing 0s', () => {
    const num = '180.0';
    const numStr = tleFormater.formatArgumentOfPerigee(num);
    expect(numStr).toBe('180.0000');
  });

  it('should handle missing leading numbers', () => {
    const num = '80.0';
    const numStr = tleFormater.formatArgumentOfPerigee(num);
    expect(numStr).toBe('080.0000');
  });
});

describe('tleFormater.formatInclination', () => {
  it('should handle missing trailing 0s', () => {
    const num = '180.0';
    const numStr = tleFormater.formatInclination(num);
    expect(numStr).toBe('180.0000');
  });

  it('should handle missing leading numbers', () => {
    const num = '80.0';
    const numStr = tleFormater.formatInclination(num);
    expect(numStr).toBe('080.0000');
  });
});

describe('tleFormater.formatMeanAnomaly', () => {
  it('should handle missing trailing 0s', () => {
    const num = '180.0';
    const numStr = tleFormater.formatMeanAnomaly(num);
    expect(numStr).toBe('180.0000');
  });

  it('should handle missing leading numbers', () => {
    const num = '80.0';
    const numStr = tleFormater.formatMeanAnomaly(num);
    expect(numStr).toBe('080.0000');
  });
});

describe('tleFormater.formatMeanMotion', () => {
  it('should handle missing trailing 0s', () => {
    const num = '4.0';
    const numStr = tleFormater.formatMeanMotion(num);
    expect(numStr).toBe('04.00000000');
  });

  it('should handle missing leading numbers', () => {
    const num = '14.0';
    const numStr = tleFormater.formatMeanMotion(num);
    expect(numStr).toBe('14.00000000');
  });
});
