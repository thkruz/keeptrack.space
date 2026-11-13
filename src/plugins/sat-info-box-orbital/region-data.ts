import { buildGeoRegionIndex, type GeoRegionFeature, type GeoRegionIndex } from '@app/app/analysis/geo-region-lookup';

let indexPromise_: Promise<GeoRegionIndex | null> | null = null;
let index_: GeoRegionIndex | null = null;

/** Synchronous access; null until {@link loadRegionIndex} resolves (or if loading failed). */
export const getRegionIndex = (): GeoRegionIndex | null => index_;

/**
 * Lazy-loads the Natural Earth 50m country polygons once (the browser cache is shared with the
 * political map's fetch of the same file). Resolves null on failure and does not retry.
 */
export const loadRegionIndex = (): Promise<GeoRegionIndex | null> => {
  indexPromise_ ??= (async () => {
    try {
      const resp = await fetch(`${settingsManager.installDirectory}data/ne_50m_admin_0_countries.geojson`);

      if (!resp.ok) {
        return null;
      }

      const json = (await resp.json()) as { features: GeoRegionFeature[] };

      index_ = buildGeoRegionIndex(json.features);

      return index_;
    } catch {
      return null;
    }
  })();

  return indexPromise_;
};

let marinePromise_: Promise<GeoRegionIndex | null> | null = null;
let marineIndex_: GeoRegionIndex | null = null;

/** Synchronous access to the marine index; null until {@link loadMarineIndex} resolves (or if loading failed). */
export const getMarineIndex = (): GeoRegionIndex | null => marineIndex_;

/**
 * Lazy-loads the simplified Natural Earth marine polygons (about 75 kB, smallest areas first so seas win over
 * the oceans around them). Only requested the first time a point falls outside every country.
 * Resolves null on failure and does not retry; callers fall back to the coarse water-body boxes.
 */
export const loadMarineIndex = (): Promise<GeoRegionIndex | null> => {
  marinePromise_ ??= (async () => {
    try {
      const resp = await fetch(`${settingsManager.installDirectory}data/marine-regions-simplified.geojson`);

      if (!resp.ok) {
        return null;
      }

      const json = (await resp.json()) as { features: GeoRegionFeature[] };

      marineIndex_ = buildGeoRegionIndex(json.features);

      return marineIndex_;
    } catch {
      return null;
    }
  })();

  return marinePromise_;
};
