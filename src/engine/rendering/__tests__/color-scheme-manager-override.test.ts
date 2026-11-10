import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

describe('ColorSchemeManager per-object color override', () => {
  let csm: ColorSchemeManager;
  const selection = { selectedSat: -1, secondarySat: -1 };
  const schemeColor = [0.25, 0.5, 0.75, 1];

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
    vi.spyOn(ServiceLocator, 'getHoverManager').mockReturnValue({ hoveringSat: -1 } as never);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getObject').mockReturnValue({ id: 2 } as never);
    csm.currentColorScheme = { update: () => ({ color: schemeColor, pickable: 1 }) } as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-applies the override after the scheme rewrites the buffer', () => {
    csm.setObjectColorOverride(2, [1, 0, 0, 1]);
    applyOverlay();
    expect(dot(2)).toEqual([1, 0, 0, 1]);
    csm.colorData.fill(0.1);
    applyOverlay();
    expect(dot(2)).toEqual([1, 0, 0, 1]);
    expect(dot(3)).toEqual(Array.from(new Float32Array([0.1, 0.1, 0.1, 0.1])));
  });

  it('lets the selected color win and removes the override on null', () => {
    csm.setObjectColorOverride(1, [1, 0, 0, 1]);
    selection.selectedSat = 1;
    applyOverlay();
    expect(dot(1)).toEqual(Array.from(new Float32Array(settingsManager.selectedColor)));
    selection.selectedSat = -1;
    csm.setObjectColorOverride(1, null);
    expect(csm.hasObjectColorOverride(1)).toBe(false);
  });
});
