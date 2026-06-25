import { SolarBody } from '@app/engine/core/interfaces';
import { Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';

/**
 * planets-core.ts holds the DOM-free, GL-free view configuration for centering
 * the camera on a solar-system body. All of the magic zoom limits and dot-size
 * decisions that used to live in a big if/else inside changePlanet are here so
 * they can be unit tested without a renderer.
 */

export interface BodyViewConfig {
  /** Minimum camera zoom distance for this body, in kilometers. */
  minZoom: Kilometers;
  /** Maximum camera zoom distance for this body, in kilometers. */
  maxZoom: Kilometers;
  /** Hover dot size to apply to every body (0 hides the dots near Earth/Moon). */
  dotSize: number;
  /** Whether to draw the full heliocentric orbit paths for this body. */
  drawOrbits: boolean;
  /** Whether to clear the line manager (used for Earth/Moon to drop deep-space lines). */
  clearLines: boolean;
  /** Whether to swap the body to its highest quality texture on selection. */
  useHighestQualityTexture: boolean;
}

/** Zoom limits expressed in plain numbers for readability; cast to Kilometers on return. */
const SUN_MIN_ZOOM = 62e6; // 62 million km
const SUN_MAX_ZOOM = 1.5e10; // 15 billion km
const EARTH_MIN_ZOOM = RADIUS_OF_EARTH + 50;
const NEAR_BODY_MAX_ZOOM = 1.2e6; // 1.2 million km (Earth and Moon)
const PLANET_MAX_ZOOM = 1.3e10; // 13 billion km
/** Multiplier applied to a body's radius to keep the camera just above its surface. */
const SURFACE_ZOOM_FACTOR = 1.2;

/**
 * Resolve the camera/view configuration for a body.
 *
 * @param body The body to center on.
 * @param radius The body's radius in kilometers. Required for Moon and the
 *   generic planet/dwarf path (Earth and Sun ignore it).
 */
export function getBodyViewConfig(body: SolarBody, radius: Kilometers = 0 as Kilometers): BodyViewConfig {
  if (body === SolarBody.Sun) {
    return {
      minZoom: SUN_MIN_ZOOM as Kilometers,
      maxZoom: SUN_MAX_ZOOM as Kilometers,
      dotSize: 1,
      drawOrbits: true,
      clearLines: false,
      useHighestQualityTexture: false,
    };
  }

  if (body === SolarBody.Earth) {
    return {
      minZoom: EARTH_MIN_ZOOM as Kilometers,
      maxZoom: NEAR_BODY_MAX_ZOOM as Kilometers,
      dotSize: 0,
      drawOrbits: false,
      clearLines: true,
      useHighestQualityTexture: false,
    };
  }

  if (body === SolarBody.Moon) {
    return {
      minZoom: (radius * SURFACE_ZOOM_FACTOR) as Kilometers,
      maxZoom: NEAR_BODY_MAX_ZOOM as Kilometers,
      dotSize: 0,
      drawOrbits: false,
      clearLines: true,
      useHighestQualityTexture: true,
    };
  }

  // Anything else: a planet, dwarf planet, or other loaded body.
  return {
    minZoom: (radius * SURFACE_ZOOM_FACTOR) as Kilometers,
    maxZoom: PLANET_MAX_ZOOM as Kilometers,
    dotSize: 1,
    drawOrbits: true,
    clearLines: false,
    useHighestQualityTexture: true,
  };
}
