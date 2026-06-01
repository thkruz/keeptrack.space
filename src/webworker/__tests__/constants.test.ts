import { defaultGd, emptySensor } from '@app/webworker/constants';

describe('webworker constants', () => {
  it('defaultGd is a zeroed geodetic coordinate', () => {
    expect(defaultGd).toEqual({ lat: 0, lon: 0, alt: 0 });
  });

  it('emptySensor has a zeroed observerGd and blank identity fields', () => {
    expect(emptySensor.observerGd).toEqual({ lat: 0, lon: 0, alt: 0 });
    expect(emptySensor.name).toBe('');
    expect(emptySensor.lat).toBe(0);
    expect(emptySensor.lon).toBe(0);
    expect(emptySensor.maxRng).toBe(0);
    expect(emptySensor.volume).toBe(false);
  });
});
