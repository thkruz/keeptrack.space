/* eslint-disable complexity */
import { buildCatalogRcsStats, CatalogRcsStats, EMPTY_CATALOG_RCS_STATS, estimateRcs } from '@app/app/analysis/rcs-estimator';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import { ColorScheme } from './color-scheme';

/**
 * Colors satellites by radar cross section (m²). Uses the rcs-estimator
 * cascade so we have a value for the majority of the catalog, not just the
 * subset with `sat.rcs` published. Bucket boundaries are quantile-equalised
 * over the actual loaded catalog so each color band stays populated even
 * though RCS values cluster heavily (debris near 0.01 m², Starlink at ~14
 * m², etc.).
 *
 * Palette is matplotlib's `plasma` — perceptually uniform like vmag's
 * viridis, but a distinct hue family so users can tell at a glance which
 * scheme is active without reading the legend label.
 */
export class RcsColorScheme extends ColorScheme {
  readonly label = t7e('colorSchemes.RcsColorScheme.label' as Parameters<typeof t7e>[0]);
  readonly id = 'RcsColorScheme';
  static readonly id = 'RcsColorScheme';

  static readonly uniqueObjectTypeFlags = {
    rcsXXXSmall: true,
    rcsXXSmall: true,
    rcsXSmall: true,
    rcsSmall: true,
    rcsMed: true,
    rcsLarge: true,
    rcsXLarge: true,
    // Default ON: objects with no estimable RCS render as a translucent grey
    // (colorTheme.rcsUnknown) so users can still see "we have no data for this
    // one." Matches the std-mag scheme's runtime behavior — users can hide
    // the no-data population via the legend toggle if they want a cleaner view.
    rcsUnknown: true,
  };

  /**
   * Plasma palette, sampled at 7 evenly-spaced points. Ordered smallest →
   * largest RCS, so bucket index lines up with the array index.
   *
   * Yellow at the large-RCS end follows the convention that "high salience
   * = warm color" — large objects are the brighter, more noticeable points
   * on screen. Dark indigo at the small-RCS end fades into the background.
   */
  static readonly uniqueColorTheme = {
    rcsXXXSmall: [0.051, 0.031, 0.530, 0.9] as rgbaArray,
    rcsXXSmall: [0.380, 0.000, 0.659, 0.9] as rgbaArray,
    rcsXSmall: [0.620, 0.060, 0.624, 0.9] as rgbaArray,
    rcsSmall: [0.798, 0.280, 0.470, 0.9] as rgbaArray,
    rcsMed: [0.929, 0.473, 0.327, 0.9] as rgbaArray,
    rcsLarge: [0.987, 0.682, 0.219, 0.9] as rgbaArray,
    rcsXLarge: [0.941, 0.976, 0.129, 0.9] as rgbaArray,
    rcsUnknown: [0.5, 0.5, 0.5, 0.4] as rgbaArray,
  };

  /**
   * Ordered smallest → largest. The bucketIndex computation maps
   * `rcs < thresholds[i]` to slug at index i.
   */
  private static readonly BUCKET_SLUGS = [
    'rcsXXXSmall',
    'rcsXXSmall',
    'rcsXSmall',
    'rcsSmall',
    'rcsMed',
    'rcsLarge',
    'rcsXLarge',
  ] as const;

  /**
   * Used until `calculateParams` has scanned the catalog at least once.
   * Hand-tuned log-spaced boundaries that roughly match the historical
   * fixed-boundary RCS scheme so the very first recolor is still useful.
   */
  private static readonly FALLBACK_THRESHOLDS: readonly number[] = [0.005, 0.01, 0.05, 0.1, 1, 10];

  private thresholds_: readonly number[] = RcsColorScheme.FALLBACK_THRESHOLDS;

  /**
   * Catalog-mined stats snapshot, refreshed during `calculateParams`.
   * Shared across every `update()` call in the same recolor pass so the
   * estimator stays O(1) per satellite.
   */
  private catalogStats_: CatalogRcsStats = EMPTY_CATALOG_RCS_STATS;

  constructor() {
    super(RcsColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...RcsColorScheme.uniqueObjectTypeFlags,
    };
  }

  override calculateParams() { // NOSONAR: S3516 - returns null by design; results are stored in this.thresholds_ and the manager treats null as "no params"
    const catalog = ServiceLocator.getCatalogManager();
    const sats = catalog?.getSats() ?? [];

    this.catalogStats_ = buildCatalogRcsStats(sats);

    const rcsValues: number[] = [];

    for (const sat of sats) {
      const rcs = estimateRcs(sat, this.catalogStats_);

      if (rcs !== null && isFinite(rcs) && rcs > 0) {
        rcsValues.push(rcs);
      }
    }

    if (rcsValues.length < RcsColorScheme.BUCKET_SLUGS.length) {
      return null;
    }

    rcsValues.sort((a, b) => a - b);

    const bucketCount = RcsColorScheme.BUCKET_SLUGS.length;
    const thresholds: number[] = [];
    let prevValue = Number.NEGATIVE_INFINITY;
    let prevIdx = -1;

    for (let i = 1; i < bucketCount; i++) {
      let idx = Math.max(Math.floor((rcsValues.length * i) / bucketCount), prevIdx + 1);

      // For the FIRST threshold, also skip past the leading cluster of equal
      // values. Without this, when many objects share the catalog's smallest
      // RCS value (typical: debris filler values, or estimator collapses),
      // bucket 0 ends up empty: strict-less-than bucketing puts every such
      // object in bucket 1+, leaving the "smallest" band unpopulated. After
      // this skip, threshold[0] sits at the first value > rcsValues[0], so
      // the smallest cluster falls into bucket 0.
      // For later thresholds, dedup as before to keep thresholds strictly
      // increasing.
      const skipTarget = i === 1 ? rcsValues[0] : prevValue;

      while (idx < rcsValues.length && rcsValues[idx] <= skipTarget) {
        idx++;
      }
      if (idx >= rcsValues.length) {
        // No more distinct values available — fill the remaining slots with
        // +Infinity and stop. Every subsequent iteration would re-hit this
        // case anyway, and continuing leaves prevValue stale which would
        // cause later iterations to mis-anchor their dedup search.
        while (thresholds.length < bucketCount - 1) {
          thresholds.push(Number.POSITIVE_INFINITY);
        }
        break;
      }
      thresholds.push(rcsValues[idx]);
      prevValue = rcsValues[idx];
      prevIdx = idx;
    }

    this.thresholds_ = thresholds;

    return null;
  }

  update(obj: BaseObject): ColorInformation {
    if (!obj.isSatellite()) {
      return { color: this.colorTheme.transparent, pickable: Pickable.No };
    }

    const sat = obj as Satellite;
    const rcs = estimateRcs(sat, this.catalogStats_);

    if (rcs === null || !isFinite(rcs) || rcs <= 0) {
      if (this.objectTypeFlags.rcsUnknown) {
        return {
          color: this.colorTheme.rcsUnknown,
          pickable: Pickable.Yes,
        };
      }

      // `deselected` is zero-alpha — unknowns disappear without blocking
      // clicks on objects behind them.
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const bucketIdx = RcsColorScheme.bucketIndex_(rcs, this.thresholds_);
    const slug = RcsColorScheme.BUCKET_SLUGS[bucketIdx];

    if (!this.objectTypeFlags[slug]) {
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    return {
      color: this.colorTheme[slug],
      pickable: Pickable.Yes,
    };
  }

  /**
   * Returns the bucket index in [0, BUCKET_SLUGS.length). The first threshold
   * the value falls below selects the bucket; if it exceeds every threshold
   * it lands in the final (largest) bucket. Exposed as a static for unit tests.
   */
  private static bucketIndex_(rcs: number, thresholds: readonly number[]): number {
    for (let i = 0; i < thresholds.length; i++) {
      if (rcs < thresholds[i]) {
        return i;
      }
    }

    return thresholds.length;
  }

  static readonly layersHtml = html`
  <ul id="layers-list-rcs">
    <li>
      <div class="Square-Box layers-rcsXXXSmall-box"></div>
      Tiniest
    </li>
    <li>
      <div class="Square-Box layers-rcsXXSmall-box"></div>
      Very Small
    </li>
    <li>
      <div class="Square-Box layers-rcsXSmall-box"></div>
      Small
    </li>
    <li>
      <div class="Square-Box layers-rcsSmall-box"></div>
      Below Average
    </li>
    <li>
      <div class="Square-Box layers-rcsMed-box"></div>
      Above Average
    </li>
    <li>
      <div class="Square-Box layers-rcsLarge-box"></div>
      Large
    </li>
    <li>
      <div class="Square-Box layers-rcsXLarge-box"></div>
      Largest
    </li>
    <li>
      <div class="Square-Box layers-rcsUnknown-box"></div>
      No Data
    </li>
  </ul>
  `.trim();
}
