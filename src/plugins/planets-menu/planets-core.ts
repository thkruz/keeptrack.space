import { SolarBody } from '@app/engine/core/interfaces';
import { Kilometers, RADIUS_OF_EARTH, WGS84_A } from '@ootk/src/main';

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
  /**
   * Distance from the body, in kilometers, that selecting it should frame it at. Without this the
   * camera kept whatever normalized zoom level it already had and simply re-read it through the
   * new limits, so picking a planet left you at an arbitrary distance - usually far enough that
   * the body was a dot.
   */
  framingDistance: Kilometers;
}

/** Zoom limits expressed in plain numbers for readability; cast to Kilometers on return. */
const SUN_MIN_ZOOM = 62e6; // 62 million km
const SUN_MAX_ZOOM = 1.5e10; // 15 billion km
const EARTH_MIN_ZOOM = WGS84_A + 50;
const NEAR_BODY_MAX_ZOOM = 1.2e6; // 1.2 million km (Earth and Moon)
const PLANET_MAX_ZOOM = 1.3e10; // 13 billion km
/** Multiplier applied to a body's radius to keep the camera just above its surface. */
const SURFACE_ZOOM_FACTOR = 1.2;
/**
 * The camera never gets closer than this to a body's surface, whatever its radius. The
 * proportional rule alone lets a small moon pull the camera within a few hundred meters
 * (1.2 x mean radius is ~1.2 km above Deimos), where there is nothing to see but noise - and
 * for an irregular body the mean radius understates the long axis, so 1.2 x mean can even end
 * up INSIDE the mesh, which renders as a black frame with no error. Ten kilometers of clearance
 * closes both: no body's long axis exceeds its mean radius by 10 km at the size where the
 * proportional rule stops dominating.
 */
const MIN_SURFACE_CLEARANCE_KM = 10;

/** Closest zoom for a body: proportional to its radius, but never nearer than the clearance floor. */
function surfaceZoomFloor(radius: Kilometers): Kilometers {
  return Math.max(radius * SURFACE_ZOOM_FACTOR, radius + MIN_SURFACE_CLEARANCE_KM) as Kilometers;
}
/**
 * Multiplier applied to a body's radius for the distance a fresh selection frames it at. Matches
 * `initialFramingDistanceKm` for satellites (6x the object radius), which puts the body a little
 * under 20 degrees across - large enough to read the mesh, wide enough to keep its context.
 */
const BODY_FRAMING_FACTOR = 6;
/** The framing distance is never allowed closer than this multiple of the view's own zoom floor. */
const FRAMING_FLOOR_FACTOR = 1.2;
/**
 * The Sun view is the solar-system view, so it is framed by what should be in the frame rather
 * than by the Sun's own radius (6 solar radii is 25x closer than the view's zoom floor). At 2 AU
 * the Sun is still a disk and the inner planets' orbits are in view.
 */
const SUN_FRAMING_ZOOM = 3e8; // 2 AU
/** Fallback framing for a body that reports no radius, so a missing value cannot frame at zero. */
const UNKNOWN_RADIUS_FRAMING = 1000;

/**
 * Distance to frame a body at: a multiple of its radius, but never inside the view's own zoom
 * floor and never past its zoom ceiling.
 */
function framingDistanceFor(radius: Kilometers, minZoom: number, maxZoom: number): Kilometers {
  const fromRadius = radius > 0 ? radius * BODY_FRAMING_FACTOR : UNKNOWN_RADIUS_FRAMING;

  return Math.min(Math.max(fromRadius, minZoom * FRAMING_FLOOR_FACTOR), maxZoom) as Kilometers;
}

/**
 * Resolve the camera/view configuration for a body.
 *
 * @param body The body to center on.
 * @param radius The radius the zoom floor must clear, in kilometers - a body's
 *   `zoomFloorRadiusKm`, which is its mean radius for a sphere and its longest axis for an
 *   irregular shape. Required for Moon and the generic planet/dwarf path (Earth and Sun
 *   ignore it).
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
      framingDistance: SUN_FRAMING_ZOOM as Kilometers,
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
      framingDistance: framingDistanceFor(RADIUS_OF_EARTH as Kilometers, EARTH_MIN_ZOOM, NEAR_BODY_MAX_ZOOM),
    };
  }

  if (body === SolarBody.Moon) {
    return {
      minZoom: surfaceZoomFloor(radius),
      maxZoom: NEAR_BODY_MAX_ZOOM as Kilometers,
      dotSize: 0,
      drawOrbits: false,
      clearLines: true,
      useHighestQualityTexture: true,
      framingDistance: framingDistanceFor(radius, surfaceZoomFloor(radius), NEAR_BODY_MAX_ZOOM),
    };
  }

  // Anything else: a planet, dwarf planet, or other loaded body.
  return {
    minZoom: surfaceZoomFloor(radius),
    maxZoom: PLANET_MAX_ZOOM as Kilometers,
    dotSize: 1,
    drawOrbits: true,
    clearLines: false,
    useHighestQualityTexture: true,
    framingDistance: framingDistanceFor(radius, surfaceZoomFloor(radius), PLANET_MAX_ZOOM),
  };
}
