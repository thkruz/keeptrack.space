/**
 * Contract test: every legend swatch `layers-<slug>-box` in a color scheme's
 * `static layersHtml` MUST resolve to a defined entry in both `colorTheme[slug]`
 * and `objectTypeFlags[slug]` after the scheme is constructed.
 *
 * This catches the class of bug surfaced by the `sunlightFov` regression
 * (#1342 follow-up): the legend HTML used `layers-sunlightFov-box` but the
 * color theme only defined `sunlightInview`, so `LayersManager.layersHoverMenuClick`
 * logged "Color not found for sunlightFov" and the swatch stayed black.
 *
 * Uses the real `settingsManager` from `test/vitest-setup.ts` (which calls
 * `settingsManager.init()` to populate `defaultColorSettings`) — no per-scheme
 * mocks — so the assertions reflect production runtime behavior.
 */

import { ColorScheme } from '@app/engine/rendering/color-schemes/color-scheme';
import { CelestrakColorScheme } from '@app/engine/rendering/color-schemes/celestrak-color-scheme';
import { ConfidenceColorScheme } from '@app/engine/rendering/color-schemes/confidence-color-scheme';
import { CountryColorScheme } from '@app/engine/rendering/color-schemes/country-color-scheme';
import { GpAgeColorScheme } from '@app/engine/rendering/color-schemes/gp-age-color-scheme';
import { MissionColorScheme } from '@app/engine/rendering/color-schemes/mission-color-scheme';
import { ObjectTypeColorScheme } from '@app/engine/rendering/color-schemes/object-type-color-scheme';
import { OrbitalPlaneDensityColorScheme } from '@app/engine/rendering/color-schemes/orbital-plane-density-color-scheme';
import { RcsColorScheme } from '@app/engine/rendering/color-schemes/rcs-color-scheme';
import { ReentryRiskColorScheme } from '@app/engine/rendering/color-schemes/reentry-risk-color-scheme';
import { SmallSatColorScheme } from '@app/engine/rendering/color-schemes/smallsat-color-scheme';
import { SourceColorScheme } from '@app/engine/rendering/color-schemes/source-color-scheme';
import { SpatialDensityColorScheme } from '@app/engine/rendering/color-schemes/spatial-density-color-scheme';
import { StarlinkColorScheme } from '@app/engine/rendering/color-schemes/starlink-color-scheme';
import { SunlightColorScheme } from '@app/engine/rendering/color-schemes/sunlight-color-scheme';
import { VelocityColorScheme } from '@app/engine/rendering/color-schemes/velocity-color-scheme';
import { VisualMagnitudeColorScheme } from '@app/engine/rendering/color-schemes/visual-magnitude-color-scheme';
import { ColorSchemeTestUtils } from '@test/engine/rendering/color-schemes/__helpers__/color-scheme-test-utils';

type SchemeCtor = new () => ColorScheme;
type SchemeStatic = SchemeCtor & { layersHtml?: string; name: string };

const schemes: SchemeStatic[] = [
  CelestrakColorScheme,
  ConfidenceColorScheme,
  CountryColorScheme,
  GpAgeColorScheme,
  MissionColorScheme,
  ObjectTypeColorScheme,
  OrbitalPlaneDensityColorScheme,
  RcsColorScheme,
  ReentryRiskColorScheme,
  SmallSatColorScheme,
  SourceColorScheme,
  SpatialDensityColorScheme,
  StarlinkColorScheme,
  SunlightColorScheme,
  VelocityColorScheme,
  VisualMagnitudeColorScheme,
];

describe('Color scheme legend slug contract', () => {
  for (const SchemeClass of schemes) {
    describe(SchemeClass.name, () => {
      it('every legend swatch slug resolves to both a colorTheme entry and an objectTypeFlags entry', () => {
        const scheme = new SchemeClass();

        ColorSchemeTestUtils.assertLegendSlugContract(scheme, SchemeClass);
      });
    });
  }
});
