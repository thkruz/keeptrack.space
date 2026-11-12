/**
 * Pure point-in-polygon country lookup over Natural Earth style GeoJSON.
 * No DOM, no fetch, no app imports: candidate to move into ootk later.
 *
 * Polygons are indexed with a bounding box prefilter. Polygons whose ring crosses the
 * antimeridian (consecutive vertices more than 180 degrees apart) are unwrapped into a
 * 0..360 longitude frame so geometry like Fiji still tests correctly.
 */

export interface GeoRegionFeature {
  properties: { name?: string; names?: Record<string, string> };
  geometry: { type: string; coordinates: unknown } | null;
}

export interface GeoRegionHit {
  name: string;
  names?: Record<string, string>;
}

interface IndexedPolygon {
  /** Outer ring first, then holes; flat [lon, lat, lon, lat...] */
  rings: Float64Array[];
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  /** True when rings were unwrapped to 0..360 */
  wrapped: boolean;
  region: GeoRegionHit;
}

export interface GeoRegionIndex {
  polygons: IndexedPolygon[];
}

const ringCrossesAntimeridian_ = (ring: number[][]): boolean => {
  for (let i = 1; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
      return true;
    }
  }

  return false;
};

const buildPolygon_ = (rings: number[][][], region: GeoRegionHit): IndexedPolygon | null => {
  if (rings.length === 0 || rings[0].length < 3) {
    return null;
  }

  const wrapped = ringCrossesAntimeridian_(rings[0]);
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  const flatRings = rings.map((ring, ringIdx) => {
    const flat = new Float64Array(ring.length * 2);

    for (let i = 0; i < ring.length; i++) {
      const lon = wrapped && ring[i][0] < 0 ? ring[i][0] + 360 : ring[i][0];
      const lat = ring[i][1];

      flat[i * 2] = lon;
      flat[i * 2 + 1] = lat;
      if (ringIdx === 0) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }

    return flat;
  });

  return { rings: flatRings, minLon, maxLon, minLat, maxLat, wrapped, region };
};

/** Builds the lookup index. Features with null geometry or unsupported types are skipped. */
export const buildGeoRegionIndex = (features: GeoRegionFeature[]): GeoRegionIndex => {
  const polygons: IndexedPolygon[] = [];

  for (const feature of features) {
    if (!feature.geometry) {
      continue;
    }

    const { type, coordinates } = feature.geometry;
    const region: GeoRegionHit = { name: feature.properties.name ?? '', names: feature.properties.names };
    let polys: number[][][][] = [];

    if (type === 'Polygon') {
      polys = [coordinates as number[][][]];
    } else if (type === 'MultiPolygon') {
      polys = coordinates as number[][][][];
    }

    for (const rings of polys) {
      const polygon = buildPolygon_(rings, region);

      if (polygon) {
        polygons.push(polygon);
      }
    }
  }

  return { polygons };
};

/** Even-odd ray cast against one flat ring. */
const inRing_ = (ring: Float64Array, lon: number, lat: number): boolean => {
  let inside = false;
  const n = ring.length / 2;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2];
    const yi = ring[i * 2 + 1];
    const xj = ring[j * 2];
    const yj = ring[j * 2 + 1];

    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Returns the region containing the point, or null (open ocean, or a country missing from the dataset).
 * @param lat Degrees, -90..90
 * @param lon Degrees, any range (normalized internally)
 */
export const findGeoRegion = (index: GeoRegionIndex, lat: number, lon: number): GeoRegionHit | null => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const lonNorm = ((((lon + 180) % 360) + 360) % 360) - 180;
  const lonWrapped = lonNorm < 0 ? lonNorm + 360 : lonNorm;

  for (const polygon of index.polygons) {
    const testLon = polygon.wrapped ? lonWrapped : lonNorm;

    if (lat < polygon.minLat || lat > polygon.maxLat || testLon < polygon.minLon || testLon > polygon.maxLon) {
      continue;
    }

    if (!inRing_(polygon.rings[0], testLon, lat)) {
      continue;
    }

    let inHole = false;

    for (let r = 1; r < polygon.rings.length; r++) {
      if (inRing_(polygon.rings[r], testLon, lat)) {
        inHole = true;
        break;
      }
    }

    if (!inHole) {
      return polygon.region;
    }
  }

  return null;
};

/** Localized name for a hit: dataset translation for the 2-letter language, else the English name. */
export const getGeoRegionName = (hit: GeoRegionHit, language: string): string => hit.names?.[language.slice(0, 2)] ?? hit.name;
