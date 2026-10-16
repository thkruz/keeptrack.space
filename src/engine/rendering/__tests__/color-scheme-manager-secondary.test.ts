import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

/*
 * The secondary object gets its own dot color (the secondary orbit color) so it
 * can be told apart from the red primary. color-scheme-manager.ts reads the
 * ambient global settingsManager, which setupStandardEnvironment swaps in.
 */
describe('ColorSchemeManager secondary marker', () => {
  let csm: ColorSchemeManager;
  const selection = { selectedSat: -1, secondarySat: -1 };
  const schemeColor = [0.25, 0.5, 0.75, 1];
  const hover = { hoveringSat: -1 };

  const dot = (id: number) => Array.from(csm.colorData.slice(id * 4, id * 4 + 4));
  const applyOverlay = () => (csm as unknown as { setSelectedAndHoverBuffer_: () => void }).setSelectedAndHoverBuffer_();

  beforeEach(() => {
    setupStandardEnvironment();
    csm = new ColorSchemeManager();
    csm.init(ServiceLocator.getRenderer());
    csm.colorData = new Float32Array(4 * 4).fill(0.1);
    selection.selectedSat = -1;
    selection.secondarySat = -1;
    vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue(selection as never);
    hover.hoveringSat = -1;
    vi.spyOn(ServiceLocator, 'getHoverManager').mockReturnValue(hover as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ id: 2 } as never);
    csm.currentColorScheme = { update: () => ({ color: schemeColor, pickable: 1 }) } as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the secondary color from the secondary orbit color at full opacity', () => {
    const orbitColor = settingsManager.orbitSelectColor2;

    expect(ColorSchemeManager.getSecondarySelectedColor()).toEqual([orbitColor[0], orbitColor[1], orbitColor[2], 1]);
    expect(ColorSchemeManager.getSecondarySelectedColor()).not.toEqual(settingsManager.selectedColor);
  });

  it('paints the secondary dot with the secondary color and the primary with the selected color', () => {
    selection.selectedSat = 1;
    selection.secondarySat = 2;

    applyOverlay();

    expect(dot(1)).toEqual(Array.from(new Float32Array(settingsManager.selectedColor)));
    expect(dot(2)).toEqual(Array.from(new Float32Array(ColorSchemeManager.getSecondarySelectedColor())));
    // Unrelated dots are untouched.
    expect(dot(3)).toEqual(Array.from(new Float32Array([0.1, 0.1, 0.1, 0.1])));
  });

  it('restores the scheme color of the previous secondary when it changes', () => {
    selection.selectedSat = 1;
    selection.secondarySat = 2;
    applyOverlay();

    selection.secondarySat = 3;
    applyOverlay();

    expect(dot(2)).toEqual(Array.from(new Float32Array(schemeColor)));
    expect(dot(3)).toEqual(Array.from(new Float32Array(ColorSchemeManager.getSecondarySelectedColor())));
  });

  it('lets a hovered secondary show the hover color', () => {
    selection.selectedSat = 1;
    selection.secondarySat = 2;
    hover.hoveringSat = 2;

    applyOverlay();

    expect(dot(2)).toEqual(Array.from(new Float32Array(settingsManager.hoverColor)));
  });
});
