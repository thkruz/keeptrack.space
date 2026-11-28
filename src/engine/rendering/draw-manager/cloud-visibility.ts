import { CameraType } from '@app/engine/camera/camera-type';

/**
 * How visible the clouds are for the current camera, shared by the painted clouds (surface shader, tiled earth) and a
 * plugin cloud layer, so they all fade together.
 *
 * - Locked on a satellite (camera fixed to it, or flying it): no fade at all, so the clouds stay behind the satellite
 *   for photos however close the camera is.
 * - Locked on the Earth: the clouds fade out as the camera gets very close, so the ground can be seen. The fade
 *   follows the camera's height above the WGS84 surface.
 * - Switching between the two eases over `lockEaseS` instead of popping.
 *
 * The result is multiplied by the user's maximum cloud opacity (`settingsManager.cloudMaxOpacity`).
 */
export const CLOUD_FADE = {
  /** Clouds fully visible at and above this camera height (km) while locked on the Earth. 2,700 km is zoom 0.20. */
  fullKm: 2700,
  /** Clouds gone at and below this camera height (km) while locked on the Earth. 900 km is zoom 0.15. */
  goneKm: 900,
  /** Seconds to ease between the satellite-locked and Earth-locked states. */
  lockEaseS: 0.5,
} as const;

/** The maximum cloud opacity setting: default and slider range. */
export const CLOUD_MAX_OPACITY = {
  default: 0.95,
  min: 0.3,
  max: 1,
  step: 0.05,
} as const;

/** A saved or typed maximum opacity, clamped to the slider range; anything not a number gives the default. */
export const sanitiseCloudMaxOpacity = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(CLOUD_MAX_OPACITY.max, Math.max(CLOUD_MAX_OPACITY.min, value)) : CLOUD_MAX_OPACITY.default;

/** Camera modes that follow a selected satellite. */
export const isSatelliteLockedCamera = (cameraType: CameraType): boolean =>
  cameraType === CameraType.FIXED_TO_SAT_ECI || cameraType === CameraType.FIXED_TO_SAT_LVLH || cameraType === CameraType.SATELLITE_FIRST_PERSON;

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));

  return t * t * (3 - 2 * t);
};

/** Earth-locked fade from the camera height: 1 at and above `fullKm`, 0 at and below `goneKm`. */
export const cloudAltitudeFade = (altitudeKm: number): number => smoothstep(CLOUD_FADE.goneKm, CLOUD_FADE.fullKm, altitudeKm);

/** The per-frame cloud fade with the eased lock state. One instance per Earth. */
export class CloudFadeState {
  /** 0 = Earth-locked, 1 = satellite-locked; null until the first frame (which snaps, so a boot does not fade). */
  private lockWeight_: number | null = null;
  private lastMs_ = 0;

  /**
   * Advance the lock easing and return the fade (0..1, before the maximum opacity).
   * @param nowMs wall-clock time (ms), so the ease runs in real time at any time-lapse rate
   * @param altitudeKm camera height above the WGS84 surface
   * @param isSatLocked camera follows a satellite
   * @param isEarthCentered the Earth is the centre body (otherwise no fade, as before)
   */
  update(nowMs: number, altitudeKm: number, isSatLocked: boolean, isEarthCentered: boolean): number {
    const target = isSatLocked ? 1 : 0;

    if (this.lockWeight_ === null) {
      this.lockWeight_ = target;
    } else {
      const step = Math.max(0, nowMs - this.lastMs_) / 1000 / CLOUD_FADE.lockEaseS;

      this.lockWeight_ = target > this.lockWeight_ ? Math.min(target, this.lockWeight_ + step) : Math.max(target, this.lockWeight_ - step);
    }
    this.lastMs_ = nowMs;
    if (!isEarthCentered) {
      return 1;
    }
    const w = smoothstep(0, 1, this.lockWeight_);
    const earthFade = cloudAltitudeFade(altitudeKm);

    return earthFade + (1 - earthFade) * w;
  }
}
