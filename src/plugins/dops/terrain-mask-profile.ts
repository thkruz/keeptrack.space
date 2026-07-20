import { ElevationMaskFn } from '@app/engine/math/dop-math';
import { ElevationMask } from '@app/engine/ootk/src/sensor/FieldOfView';
import { Degrees } from '@ootk/src/main';

export interface TerrainMaskProfile {
  id: string;
  name: string;
  baseElevationMask: Degrees;
  masks: ElevationMask[];
}

export interface TerrainMaskStore {
  activeProfileId: string | null;
  profiles: TerrainMaskProfile[];
}

/** Creates an empty terrain mask store with no active profile. */
export function createDefaultStore(): TerrainMaskStore {
  return {
    activeProfileId: null,
    profiles: [],
  };
}

/** Creates a new terrain mask profile with a unique ID and default elevation mask. */
export function createDefaultProfile(name = 'Default'): TerrainMaskProfile {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    baseElevationMask: 15 as Degrees,
    masks: [],
  };
}

/**
 * Checks if an azimuth falls within an elevation mask's range.
 * Handles wraparound (e.g., 350 to 10 degrees).
 */
function isAzimuthInRange_(az: Degrees, mask: ElevationMask): boolean {
  if (mask.startAz <= mask.stopAz) {
    return az >= mask.startAz && az <= mask.stopAz;
  }

  // Wraparound case: az >= startAz OR az <= stopAz
  return az >= mask.startAz || az <= mask.stopAz;
}

/**
 * Gets the effective minimum elevation at a given azimuth for a terrain profile.
 * Mirrors FieldOfView.getMinElevation() logic but works on a standalone profile.
 */
export function getEffectiveElevation(az: Degrees, profile: TerrainMaskProfile): Degrees {
  let effectiveMinEl = profile.baseElevationMask;

  for (const mask of profile.masks) {
    if (isAzimuthInRange_(az, mask) && mask.minEl > effectiveMinEl) {
      effectiveMinEl = mask.minEl;
    }
  }

  return effectiveMinEl;
}

/**
 * Creates an ElevationMaskFn from a terrain profile for use with DopMath.getDops().
 */
export function createElevationMaskFn(profile: TerrainMaskProfile): ElevationMaskFn {
  return (az: Degrees) => getEffectiveElevation(az, profile);
}
