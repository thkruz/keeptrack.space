import { describe, expect, it } from 'vitest';
import { checkApiVersion, mapEmbedConfigToSettings, readEmbedBootConfig, resolveUiFlags } from '../embed-boot';
import { EMBED_CONFIG_PROPERTY } from '../embed-types';

describe('readEmbedBootConfig', () => {
  it('returns null when not embedded', () => {
    expect(readEmbedBootConfig()).toBeNull();
  });

  it('reads the config from window.frameElement and survives a throwing parent', () => {
    const config = { catalog: { mode: 'scenario' } };

    Object.defineProperty(window, 'frameElement', { configurable: true, get: () => ({ [EMBED_CONFIG_PROPERTY]: config }) });
    expect(readEmbedBootConfig()).toBe(config);

    Object.defineProperty(window, 'frameElement', {
      configurable: true,
      get: () => {
        throw new Error('cross-origin');
      },
    });
    expect(readEmbedBootConfig()).toBeNull();

    Object.defineProperty(window, 'frameElement', { configurable: true, get: () => null });
  });
});

describe('mapEmbedConfigToSettings', () => {
  it('always marks embed mode and keeps base keys', () => {
    const out = mapEmbedConfigToSettings({}, { initZoomLevel: 0.5 });

    expect(out.isEmbedMode).toBe(true);
    expect(out.isDisableServiceWorker).toBe(true);
    expect(out.initZoomLevel).toBe(0.5);
    expect(out.noCatalogOnLoad).toBeUndefined();
  });

  it('maps scenario catalog mode with enough analyst slots', () => {
    const objects = Array.from({ length: 2000 }, (_, i) => ({ hostId: `h${i}`, name: 'x', tle1: '', tle2: '' }));
    const out = mapEmbedConfigToSettings({ catalog: { mode: 'scenario', objects } });

    expect(out.noCatalogOnLoad).toBe(true);
    expect(out.maxAnalystSats).toBeGreaterThanOrEqual(2256);
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'scenario' } }).maxAnalystSats).toBeGreaterThanOrEqual(1024);
  });

  it('leaves the catalog alone in full mode', () => {
    const out = mapEmbedConfigToSettings({ catalog: { mode: 'full' } });

    expect(out.noCatalogOnLoad).toBeUndefined();
  });

  it('drops planets and deep-space probes in scenario mode only', () => {
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'scenario' } }).isDisablePlanets).toBe(true);
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'full' } }).isDisablePlanets).toBeUndefined();
  });

  it('skips the built-in sensor list when the host owns sensors', () => {
    expect(mapEmbedConfigToSettings({ ownership: { sensors: 'host' } }).isDisableSensors).toBe(true);
    expect(mapEmbedConfigToSettings({ ownership: { sensors: 'shared' } }).isDisableSensors).toBeUndefined();
    expect(mapEmbedConfigToSettings({}).isDisableSensors).toBeUndefined();
  });

  it('turns plugins.allow into a strict allowlist', () => {
    const out = mapEmbedConfigToSettings({ plugins: { allow: ['StarsPlugin'] } }, { plugins: { Other: { enabled: true } } });

    expect(out.isStrictPluginList).toBe(true);
    expect(out.plugins).toEqual({ Other: { enabled: true }, StarsPlugin: { enabled: true } });
  });

  it('scenario mode disables the Stars plugin (no star-catalog or constellations fetch), allow list included', () => {
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'scenario' } }).plugins).toEqual({ StarsPlugin: { enabled: false } });
    expect(mapEmbedConfigToSettings({ catalog: { mode: 'full' } }).plugins).toBeUndefined();
    const out = mapEmbedConfigToSettings({ catalog: { mode: 'scenario' }, plugins: { allow: ['FlatMapView'] } }, { plugins: { Other: { enabled: true } } });

    expect(out.plugins).toEqual({ Other: { enabled: true }, StarsPlugin: { enabled: false }, FlatMapView: { enabled: true } });
  });

  it('infoBox false also turns off the hover tooltip', () => {
    expect(mapEmbedConfigToSettings({ ui: { infoBox: false } })).toMatchObject({ enableHoverOverlay: false, enableHoverOrbits: false });
    expect(mapEmbedConfigToSettings({ ui: { infoBox: true } }).enableHoverOverlay).toBeUndefined();
  });

  it('ui.hover is independent of infoBox', () => {
    expect(mapEmbedConfigToSettings({ ui: { hover: true, infoBox: false } })).toMatchObject({ enableHoverOverlay: true, enableHoverOrbits: true });
    expect(mapEmbedConfigToSettings({ ui: { hover: false, infoBox: true } })).toMatchObject({ enableHoverOverlay: false, enableHoverOrbits: false });
    expect(mapEmbedConfigToSettings({ ui: { hover: true } }).enableHoverOverlay).toBe(true);
    expect(mapEmbedConfigToSettings({}).enableHoverOverlay).toBeUndefined();
  });

  it('maps ui flags to existing settings', () => {
    const out = mapEmbedConfigToSettings({ ui: { bottomMenu: false, search: false, keyboard: false, contextMenu: false, toasts: false } });

    expect(out).toMatchObject({
      isDisableBottomMenu: true,
      isDisableSearchBox: true,
      isDisableKeyboard: true,
      isAllowRightClick: false,
      isDisableToasts: true,
    });
  });

  it('forces time controls off when the host owns time', () => {
    expect(resolveUiFlags({ ui: { timeControls: true }, ownership: { time: 'host' } }).timeControls).toBe(false);
    expect(resolveUiFlags({ ui: { timeControls: true } }).timeControls).toBe(true);
  });

  it('disables select for host-owned selection', () => {
    expect(mapEmbedConfigToSettings({ ownership: { selection: 'host' } }).isDisableSelectSat).toBe(true);
    expect(mapEmbedConfigToSettings({ ownership: { selection: 'shared' } }).isDisableSelectSat).toBeUndefined();
  });

  it('merges config.settings last', () => {
    const out = mapEmbedConfigToSettings({ ui: { toasts: false }, settings: { isDisableToasts: false, custom: 1 } });

    expect(out.isDisableToasts).toBe(false);
    expect(out.custom).toBe(1);
  });
});

describe('checkApiVersion', () => {
  it('accepts matching or missing majors and flags others', () => {
    expect(checkApiVersion({})).toBeNull();
    expect(checkApiVersion({ apiVersion: '1' })).toBeNull();
    expect(checkApiVersion({ apiVersion: '1.4.0' })).toBeNull();
    expect(checkApiVersion({ apiVersion: '2' })).toBe('VERSION_MISMATCH');
  });
});
