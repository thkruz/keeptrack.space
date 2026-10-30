import { LayersManager } from '@app/app/ui/layers-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { WebGLRenderer } from '@app/engine/rendering/webgl-renderer';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initManager = (): ColorSchemeManager => {
  const colorSchemeManager = ServiceLocator.getColorSchemeManager();
  const renderer = new WebGLRenderer();

  renderer.init(settingsManager);
  renderer.glInit();
  colorSchemeManager.init(renderer);

  return colorSchemeManager;
};

describe('ColorSchemeManager legend hidden flags', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PersistenceManager.getInstance().removeItem(StorageKey.LEGEND_HIDDEN_FLAGS);
  });

  afterEach(() => {
    PersistenceManager.getInstance().removeItem(StorageKey.LEGEND_HIDDEN_FLAGS);
    vi.restoreAllMocks();
  });

  it('persists a hidden class and keeps it hidden in every scheme that has it after a reset', () => {
    const csm = initManager();

    csm.setLegendFlagHidden('debris', true);

    expect(JSON.parse(PersistenceManager.getInstance().getItem(StorageKey.LEGEND_HIDDEN_FLAGS) ?? '[]')).toEqual(['debris']);

    // A scheme switch rebuilds the legend, which resets every flag.
    csm.resetObjectTypeFlags();

    expect(csm.colorSchemeInstances.ObjectTypeColorScheme.objectTypeFlags.debris).toBe(false);
    expect(csm.colorSchemeInstances.ObjectTypeColorScheme.objectTypeFlags.payload).toBe(true);
    // Schemes without the class do not gain it.
    expect(Object.hasOwn(csm.colorSchemeInstances.CountryColorScheme.objectTypeFlags, 'debris')).toBe(false);
  });

  it('restores hidden classes from storage on init (reload)', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.LEGEND_HIDDEN_FLAGS, JSON.stringify(['countryPRC']));

    const csm = initManager();

    expect(csm.isLegendFlagHidden('countryPRC')).toBe(true);
    expect(csm.colorSchemeInstances.CountryColorScheme.objectTypeFlags.countryPRC).toBe(false);
    expect(csm.colorSchemeInstances.CountryColorScheme.objectTypeFlags.countryCIS).toBe(true);
  });

  it('ignores unreadable stored data', () => {
    PersistenceManager.getInstance().saveItem(StorageKey.LEGEND_HIDDEN_FLAGS, '{not json');

    const csm = initManager();

    expect(csm.isLegendFlagHidden('debris')).toBe(false);
  });

  it('showing a class again clears it from storage and the reset restores it', () => {
    const csm = initManager();

    csm.setLegendFlagHidden('debris', true);
    csm.setLegendFlagHidden('debris', false);
    csm.resetObjectTypeFlags();

    expect(csm.isLegendFlagHidden('debris')).toBe(false);
    expect(JSON.parse(PersistenceManager.getInstance().getItem(StorageKey.LEGEND_HIDDEN_FLAGS) ?? '[]')).toEqual([]);
    expect(csm.colorSchemeInstances.ObjectTypeColorScheme.objectTypeFlags.debris).toBe(true);
  });

  it('a legend swatch click records the hide and the legend rebuild keeps it', () => {
    const csm = initManager();

    vi.spyOn(csm, 'calculateColorBuffers').mockImplementation(() => undefined);
    csm.currentColorScheme = csm.colorSchemeInstances.ObjectTypeColorScheme;
    (csm.objectTypeFlags as Record<string, boolean>).debris = true;

    const layersManager = new LayersManager();

    layersManager.layersHoverMenuClick('layers-debris-box');

    expect(csm.isLegendFlagHidden('debris')).toBe(true);
    expect(csm.colorSchemeInstances.ObjectTypeColorScheme.objectTypeFlags.debris).toBe(false);

    // Rebuilding the legend (what a scheme switch does) must not bring the class back.
    LayersManager.layersColorsChange();

    expect((csm.objectTypeFlags as Record<string, boolean>).debris).toBe(false);
    expect(csm.colorSchemeInstances.ObjectTypeColorScheme.objectTypeFlags.debris).toBe(false);

    layersManager.layersHoverMenuClick('layers-debris-box');

    expect(csm.isLegendFlagHidden('debris')).toBe(false);
    expect(csm.colorSchemeInstances.ObjectTypeColorScheme.objectTypeFlags.debris).toBe(true);
  });
});
