import { estimateStdMag } from '@app/app/analysis/std-mag-estimator';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorInformation, Pickable, rgbaArray } from '@app/engine/core/interfaces';
import { html } from '@app/engine/utils/development/formatter';
import { t7e } from '@app/locales/keys';
import { BaseObject, Satellite } from '@ootk/src/main';
import { ColorScheme } from './color-scheme';

/**
 * Colors satellites by *intrinsic* standard magnitude — sensor-independent,
 * unlike the older apparent-magnitude scheme. Uses the std-mag estimator
 * (catalog `vmag` → curated bus/name presets → Lambert-sphere from physical
 * properties) so we have a value for the majority of the catalog, not just
 * the small subset with a published `vmag`.
 *
 * Bucket boundaries are derived as quantiles of the loaded catalog rather
 * than fixed magnitudes — keeps the seven color bands visually populated
 * regardless of how the underlying distribution shifts (sparse catalogs sit
 * compressed in mid-buckets under fixed thresholds).
 */
export class VisualMagnitudeColorScheme extends ColorScheme {
  readonly label = t7e('colorSchemes.VisualMagnitudeColorScheme.label' as Parameters<typeof t7e>[0]);
  readonly id = 'VisualMagnitudeColorScheme';
  static readonly id = 'VisualMagnitudeColorScheme';

  static readonly uniqueObjectTypeFlags = {
    vmagBright: true,
    vmagBright2: true,
    vmagMed1: true,
    vmagMed2: true,
    vmagDim1: true,
    vmagDim2: true,
    vmagFaint: true,
    // Default OFF: objects with no signal hide completely until the user
    // opts them back in via the legend toggle.
    vmagUnknown: false,
  };

  /**
   * Viridis (perceptually uniform) palette, sampled at 7 evenly-spaced points.
   * Ordered brightest → faintest so the array index matches the bucket index.
   *
   * Yellow = brightest intrinsic magnitude (small numeric value), dark purple
   * = faintest. Yellow at the bright end follows the convention used in star
   * atlases; dark purple at the faint end reads as "fading into the noise."
   */
  static readonly uniqueColorTheme = {
    vmagBright: [0.992, 0.906, 0.145, 0.9] as rgbaArray,
    vmagBright2: [0.369, 0.788, 0.380, 0.9] as rgbaArray,
    vmagMed1: [0.125, 0.569, 0.549, 0.9] as rgbaArray,
    vmagMed2: [0.192, 0.408, 0.557, 0.9] as rgbaArray,
    vmagDim1: [0.243, 0.286, 0.537, 0.9] as rgbaArray,
    vmagDim2: [0.286, 0.137, 0.455, 0.9] as rgbaArray,
    vmagFaint: [0.267, 0.004, 0.329, 0.9] as rgbaArray,
    // Reserved for the "show unknowns" toggle — gives a faint visible swatch
    // when users explicitly opt in, distinguishable from the bright/faint
    // colored populations.
    vmagUnknown: [0.5, 0.5, 0.5, 0.4] as rgbaArray,
  };

  private static readonly BUCKET_SLUGS = [
    'vmagBright',
    'vmagBright2',
    'vmagMed1',
    'vmagMed2',
    'vmagDim1',
    'vmagDim2',
    'vmagFaint',
  ] as const;

  /**
   * Used until `calculateParams` has scanned the catalog at least once.
   * Hand-tuned around the typical LEO operational range so the very first
   * recolor (often run before the catalog is fully populated) is still
   * informative rather than dumping everything into a single bucket.
   */
  private static readonly FALLBACK_THRESHOLDS: readonly number[] = [2, 4, 5.5, 6.5, 7.5, 9];

  private thresholds_: readonly number[] = VisualMagnitudeColorScheme.FALLBACK_THRESHOLDS;

  constructor() {
    super(VisualMagnitudeColorScheme.uniqueColorTheme);
    this.objectTypeFlags = {
      ...this.objectTypeFlags, ...VisualMagnitudeColorScheme.uniqueObjectTypeFlags,
    };
  }

  override calculateParams() {
    const catalog = ServiceLocator.getCatalogManager();
    const sats = catalog?.getSats() ?? [];
    const mags: number[] = [];

    for (const sat of sats) {
      const v = VisualMagnitudeColorScheme.resolveMag_(sat);

      if (v !== null && isFinite(v)) {
        mags.push(v);
      }
    }

    // Need at least one value per bucket boundary to compute quantiles. With
    // fewer points the previous thresholds remain in effect — better than
    // collapsing every object into one band.
    if (mags.length < VisualMagnitudeColorScheme.BUCKET_SLUGS.length) {
      return null;
    }

    mags.sort((a, b) => a - b);

    const bucketCount = VisualMagnitudeColorScheme.BUCKET_SLUGS.length;
    const thresholds: number[] = [];
    let prevValue = Number.NEGATIVE_INFINITY;
    let prevIdx = -1;

    for (let i = 1; i < bucketCount; i++) {
      let idx = Math.max(Math.floor((mags.length * i) / bucketCount), prevIdx + 1);

      // For the FIRST threshold, also skip past the leading cluster of equal
      // values so the smallest-value group lands in bucket 0 instead of
      // bucket 1. Strict-less-than bucketing otherwise leaves bucket 0 empty
      // whenever the catalog's smallest magnitude is tied across many
      // objects (e.g. a preset value applied to thousands of family members).
      // For later thresholds, dedup as before to keep thresholds strictly
      // increasing.
      const skipTarget = i === 1 ? mags[0] : prevValue;

      while (idx < mags.length && mags[idx] <= skipTarget) {
        idx++;
      }
      if (idx >= mags.length) {
        // No more distinct values available — fill the remaining slots with
        // +Infinity and stop. Every subsequent iteration would re-hit this
        // case anyway, and continuing leaves prevValue stale which would
        // cause later iterations to mis-anchor their dedup search.
        while (thresholds.length < bucketCount - 1) {
          thresholds.push(Number.POSITIVE_INFINITY);
        }
        break;
      }
      thresholds.push(mags[idx]);
      prevValue = mags[idx];
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
    const mag = VisualMagnitudeColorScheme.resolveMag_(sat);

    if (mag === null) {
      if (this.objectTypeFlags.vmagUnknown) {
        return {
          color: this.colorTheme.vmagUnknown,
          pickable: Pickable.Yes,
        };
      }

      // `deselected` is zero-alpha — unknowns disappear and don't block
      // clicks on objects behind them. (Distinct from `transparent`, which
      // is a 10%-alpha white ghost used for dimmed states elsewhere.)
      return {
        color: this.colorTheme.deselected,
        pickable: Pickable.No,
      };
    }

    const bucketIdx = VisualMagnitudeColorScheme.bucketIndex_(mag, this.thresholds_);
    const slug = VisualMagnitudeColorScheme.BUCKET_SLUGS[bucketIdx];

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
   * Catalog value wins when present; the estimator fills in the rest. We
   * never write the result back onto `sat.vmag` here — `sat-info-box-object`
   * uses the catalog/estimate distinction to render its `(est.)` provenance
   * suffix, and caching estimates would silently erase that signal.
   */
  private static resolveMag_(sat: Satellite): number | null {
    if (typeof sat.vmag === 'number' && !isNaN(sat.vmag)) {
      return sat.vmag;
    }

    return estimateStdMag(sat);
  }

  /**
   * Returns the bucket index in [0, BUCKET_SLUGS.length). Magnitude ascends
   * with faintness, so the first threshold the value falls below selects the
   * bucket. Exposed as a static for unit tests.
   */
  private static bucketIndex_(mag: number, thresholds: readonly number[]): number {
    for (let i = 0; i < thresholds.length; i++) {
      if (mag < thresholds[i]) {
        return i;
      }
    }

    return thresholds.length;
  }

  static readonly layersHtml = html`
  <ul id="layers-list-vmag">
    <li>
      <div class="Square-Box layers-vmagBright-box"></div>
      Brightest
    </li>
    <li>
      <div class="Square-Box layers-vmagBright2-box"></div>
      Very Bright
    </li>
    <li>
      <div class="Square-Box layers-vmagMed1-box"></div>
      Bright
    </li>
    <li>
      <div class="Square-Box layers-vmagMed2-box"></div>
      Medium
    </li>
    <li>
      <div class="Square-Box layers-vmagDim1-box"></div>
      Dim
    </li>
    <li>
      <div class="Square-Box layers-vmagDim2-box"></div>
      Very Dim
    </li>
    <li>
      <div class="Square-Box layers-vmagFaint-box"></div>
      Faintest
    </li>
    <li>
      <div class="Square-Box layers-vmagUnknown-box"></div>
      No Data
    </li>
  </ul>
  `.trim();
}
