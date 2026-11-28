import { CameraSettings } from '@app/settings/camera-settings';
import { WGS84_A } from '@ootk/src/main';

describe('CameraSettings zoom floor', () => {
  it('minZoomDistance is 50 km above the WGS84 equatorial radius (6428.137 km)', () => {
    const settings = new CameraSettings();

    expect(settings.minZoomDistance).toBeCloseTo(WGS84_A + 50, 6);
    expect(settings.minZoomDistance).toBeCloseTo(6428.137, 3);
  });

  it('the floor clears the largest ellipsoid radius by 50 km', () => {
    expect(new CameraSettings().minZoomDistance - WGS84_A).toBeCloseTo(50, 6);
  });
});
