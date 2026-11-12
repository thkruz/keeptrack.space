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
