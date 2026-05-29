import { Pickable } from '@app/engine/core/interfaces';
import { ReentryRiskColorScheme } from '@app/engine/rendering/color-schemes/reentry-risk-color-scheme';
import { Satellite } from '@ootk/src/main';

/*
 * ReentryRiskColorScheme bins satellites by perigee into five risk tiers. The
 * tier colors come from a static uniqueColorTheme, so assertions reference the
 * scheme's own colorTheme (robust to settings). update() only reads perigee
 * and the per-tier flags, so plain stubs suffice.
 */
describe('ReentryRiskColorScheme', () => {
  let scheme: ReentryRiskColorScheme;

  beforeEach(() => {
    scheme = new ReentryRiskColorScheme();
  });

  // The scheme guards with a truthy `obj.isSatellite` reference check, so the
  // stub must carry the method for the perigee branches to run.
  const at = (perigee: number) => scheme.update({ isSatellite: () => true, perigee } as unknown as Satellite);

  it.each([
    ['very high (<180)', 100, 'reentryRiskVeryHigh'],
    ['high (180-220)', 200, 'reentryRiskHigh'],
    ['medium (220-300)', 250, 'reentryRiskMedium'],
    ['low (300-400)', 350, 'reentryRiskLow'],
    ['very low (>=400)', 500, 'reentryRiskVeryLow'],
  ])('colors a %s perigee with the matching tier', (_label, perigee, themeKey) => {
    const result = at(perigee);

    expect(result.pickable).toBe(Pickable.Yes);
    expect(result.color).toEqual(scheme.colorTheme[themeKey]);
  });

  it('deselects a satellite when its tier flag is disabled', () => {
    scheme.objectTypeFlags.reentryRiskVeryHigh = false;
    const result = at(100);

    expect(result.pickable).toBe(Pickable.No);
    expect(result.color).toEqual(scheme.colorTheme.deselected);
  });

  it('uses distinct colors across adjacent tiers', () => {
    expect(at(100).color).not.toEqual(at(200).color);
    expect(at(250).color).not.toEqual(at(350).color);
  });
});
