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

  it('turns plugins.allow into a strict allowlist', () => {
    const out = mapEmbedConfigToSettings({ plugins: { allow: ['StarsPlugin'] } }, { plugins: { Other: { enabled: true } } });

    expect(out.isStrictPluginList).toBe(true);
    expect(out.plugins).toEqual({ Other: { enabled: true }, StarsPlugin: { enabled: true } });
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
