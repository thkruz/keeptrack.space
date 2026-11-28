import { CameraType } from '@app/engine/camera/camera-type';
import { describe, expect, it } from 'vitest';
import { CLOUD_FADE, CLOUD_MAX_OPACITY, CloudFadeState, cloudAltitudeFade, isSatelliteLockedCamera, sanitiseCloudMaxOpacity } from '../cloud-visibility';

describe('cloud max opacity', () => {
  it('defaults to 0.95 with a 0.3..1 range in 0.05 steps', () => {
    expect(CLOUD_MAX_OPACITY).toEqual({ default: 0.95, min: 0.3, max: 1, step: 0.05 });
  });

  it('clamps saved values and falls back to the default for anything not a number', () => {
    expect(sanitiseCloudMaxOpacity(0.6)).toBe(0.6);
    expect(sanitiseCloudMaxOpacity(0.1)).toBe(0.3);
    expect(sanitiseCloudMaxOpacity(2)).toBe(1);
    expect(sanitiseCloudMaxOpacity('0.5')).toBe(0.95);
    expect(sanitiseCloudMaxOpacity(Number.NaN)).toBe(0.95);
    expect(sanitiseCloudMaxOpacity(undefined)).toBe(0.95);
  });
});

describe('satellite lock', () => {
  it('counts the camera modes that follow a satellite', () => {
    expect(isSatelliteLockedCamera(CameraType.FIXED_TO_SAT_ECI)).toBe(true);
    expect(isSatelliteLockedCamera(CameraType.FIXED_TO_SAT_LVLH)).toBe(true);
    expect(isSatelliteLockedCamera(CameraType.SATELLITE_FIRST_PERSON)).toBe(true);
    expect(isSatelliteLockedCamera(CameraType.FIXED_TO_EARTH)).toBe(false);
  });
});

describe('Earth-locked altitude fade', () => {
  it('is full at and above 2,700 km (zoom 0.20) and gone at and below 900 km', () => {
    expect(CLOUD_FADE.fullKm).toBe(2700);
    expect(CLOUD_FADE.goneKm).toBe(900);
    expect(cloudAltitudeFade(36000)).toBe(1);
    expect(cloudAltitudeFade(2700)).toBe(1);
    expect(cloudAltitudeFade(900)).toBe(0);
    expect(cloudAltitudeFade(200)).toBe(0);
    expect(cloudAltitudeFade(1800)).toBeCloseTo(0.5, 9);
  });

  it('rises monotonically between the two heights', () => {
    let prev = -1;

    for (let km = 900; km <= 2700; km += 25) {
      const v = cloudAltitudeFade(km);

      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('CloudFadeState', () => {
  it('has no fade at all while locked on a satellite, however close', () => {
    const s = new CloudFadeState();

    expect(s.update(0, 50, true, true)).toBe(1);
    expect(s.update(16, 0.5, true, true)).toBe(1);
  });

  it('follows the altitude fade while locked on the Earth', () => {
    const s = new CloudFadeState();

    expect(s.update(0, 3000, false, true)).toBe(1);
    expect(s.update(16, 1800, false, true)).toBeCloseTo(0.5, 9);
    expect(s.update(32, 300, false, true)).toBe(0);
  });

  it('snaps on the first frame, then eases between the lock states over 0.5 s', () => {
    const s = new CloudFadeState();

    expect(s.update(1000, 300, false, true)).toBe(0);
    // Lock a satellite: half way after 0.25 s, full after 0.5 s.
    expect(s.update(1250, 300, true, true)).toBeCloseTo(0.5, 9);
    expect(s.update(1500, 300, true, true)).toBe(1);
    // Unlock: back down over the same time.
    const mid = s.update(1600, 300, false, true);

    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(s.update(2000, 300, false, true)).toBe(0);
  });

  it('keeps clouds fully visible for other centre bodies', () => {
    const s = new CloudFadeState();

    expect(s.update(0, 100, false, false)).toBe(1);
  });
});
