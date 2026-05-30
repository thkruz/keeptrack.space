import { vi } from 'vitest';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { ColorSchemeManager } from '@app/engine/rendering/color-scheme-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';

// color-scheme-manager.ts reads the ambient global settingsManager (which
// setupStandardEnvironment swaps in), so the test must drive that same global
// rather than the module-imported singleton.

/*
 * Logic-layer coverage for ColorSchemeManager: scheme registry/selection, the
 * partial-recolor batching math, flag/theme resets, and catalog-swap state
 * cleanup. The filter (is*Off) methods are covered in color-scheme-manager.test.ts.
 */
describe('ColorSchemeManager logic', () => {
  let csm: ColorSchemeManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let csmAny: any;

  beforeEach(() => {
    setupStandardEnvironment();
    csm = new ColorSchemeManager();
    csm.init(ServiceLocator.getRenderer());
    csmAny = csm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheme registry', () => {
    it('registers all built-in color schemes by id', () => {
      expect(csm.colorSchemeInstances.ObjectTypeColorScheme.id).toBe('ObjectTypeColorScheme');
      expect(csm.colorSchemeInstances.CelestrakColorScheme.id).toBe('CelestrakColorScheme');
      expect(Object.keys(csm.colorSchemeInstances).length).toBeGreaterThan(10);
    });
  });

  describe('setColorScheme', () => {
    it('activates the selected scheme', () => {
      const scheme = csm.colorSchemeInstances.ObjectTypeColorScheme;

      csm.setColorScheme(scheme);

      expect(csm.currentColorScheme.id).toBe('ObjectTypeColorScheme');
      expect(csm.currentColorSchemeUpdate).toBeDefined();
    });

    it('falls back to the default update on an invalid scheme', () => {
      // Passing a non-ColorScheme triggers the catch path -> default update.
      expect(() => csm.setColorScheme({ id: 'Bogus' } as never)).not.toThrow();
      expect(csm.currentColorSchemeUpdate).toBeDefined();
    });
  });

  describe('setToGroupColorScheme', () => {
    it('enables the group color scheme flag', () => {
      csm.isUseGroupColorScheme = false;
      csm.setToGroupColorScheme();
      expect(csm.isUseGroupColorScheme).toBe(true);
    });
  });

  describe('calcFirstAndLastDot_ (partial-recolor batching)', () => {
    let originalDots: number;
    let originalPerColor: number;

    beforeEach(() => {
      originalDots = settingsManager.dotsOnScreen;
      originalPerColor = settingsManager.dotsPerColor;
      settingsManager.dotsOnScreen = 1000;
      settingsManager.dotsPerColor = 350;
    });

    afterEach(() => {
      settingsManager.dotsOnScreen = originalDots;
      settingsManager.dotsPerColor = originalPerColor;
    });

    it('recolors every dot on a forced recolor', () => {
      const { firstDotToColor, lastDotToColor } = csmAny.calcFirstAndLastDot_(true);

      expect(firstDotToColor).toBe(0);
      expect(lastDotToColor).toBe(1000);
    });

    it('batches from the last colored dot when the scheme is unchanged', () => {
      csm.lastColorScheme = csm.currentColorScheme;
      csmAny.lastDotColored = 0;

      const { firstDotToColor, lastDotToColor } = csmAny.calcFirstAndLastDot_(false);

      expect(firstDotToColor).toBe(0);
      expect(lastDotToColor).toBe(350);
    });

    it('clamps the final batch to dotsOnScreen', () => {
      csm.lastColorScheme = csm.currentColorScheme;
      csmAny.lastDotColored = 800;

      const { lastDotToColor } = csmAny.calcFirstAndLastDot_(false);

      expect(lastDotToColor).toBe(1000);
    });

    it('restarts batching from 0 when the scheme changes', () => {
      // Distinct current vs last scheme -> full recolor and lastDotColored reset.
      csm.currentColorScheme = csm.colorSchemeInstances.ObjectTypeColorScheme;
      csm.lastColorScheme = csm.colorSchemeInstances.CelestrakColorScheme;

      const { firstDotToColor, lastDotToColor } = csmAny.calcFirstAndLastDot_(false);

      expect(firstDotToColor).toBe(0);
      expect(lastDotToColor).toBe(1000);
      expect(csmAny.lastDotColored).toBe(0);
    });
  });

  describe('reloadColors', () => {
    it('refreshes colorTheme from settingsManager.colors', () => {
      csm.reloadColors();
      expect(csm.colorTheme).toBe(settingsManager.colors);
    });
  });

  describe('resetObjectTypeFlags', () => {
    it('re-enables the star flags and resets every scheme', () => {
      csm.objectTypeFlags.starLow = false;
      csm.objectTypeFlags.starMed = false;
      csm.objectTypeFlags.starHi = false;

      csm.resetObjectTypeFlags();

      expect(csm.objectTypeFlags.starLow).toBe(true);
      expect(csm.objectTypeFlags.starMed).toBe(true);
      expect(csm.objectTypeFlags.starHi).toBe(true);
    });
  });

  describe('resetForCatalogSwap', () => {
    it('clears buffers and marks the manager not ready', () => {
      csm.isReady = true;
      csmAny.lastDotColored = 500;

      csm.resetForCatalogSwap();

      expect(csm.isReady).toBe(false);
      expect(csmAny.lastDotColored).toBe(0);
      expect(csm.colorData).toHaveLength(0);
    });
  });
});
