import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { migrateLegacyBottomIconId } from '@app/engine/plugins/bottom-icon-id';
import { loadLocale } from '@app/locales/locales';
import i18next from 'i18next';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('KeepTrackPlugin.defaultBottomIconElementName', () => {
  describe('in German', () => {
    beforeAll(async () => {
      await loadLocale('de');
      await i18next.changeLanguage('de');
    });

    afterAll(async () => {
      await i18next.changeLanguage('en');
    });

    it('slugs the English label, not the translated one', () => {
      expect(KeepTrackPlugin.defaultBottomIconElementName('SensorListPlugin', 'Sensoren')).toBe('sensors-bottom-icon');
    });

    it('falls back to the given label when the plugin has no label key', () => {
      expect(KeepTrackPlugin.defaultBottomIconElementName('NoSuchPlugin', 'Time Machine')).toBe('time-machine-bottom-icon');
    });
  });

  it('keeps the legacy first-space-only slug so existing English ids do not change', () => {
    expect(KeepTrackPlugin.defaultBottomIconElementName('ProximityOps', 'Rendezvous and Proximity Operations')).toBe('rendezvous-and proximity operations-bottom-icon');
  });
});

describe('migrateLegacyBottomIconId', () => {
  // Ids as GA4 recorded them before the fix.
  it('maps translated ids saved by earlier builds to the English id (for loaded locales)', async () => {
    // Locales are lazy-loaded; the legacy map only covers bundles that are loaded
    await Promise.all(['de', 'pl'].map(loadLocale));

    expect(migrateLegacyBottomIconId('sensoren-bottom-icon')).toBe('sensors-bottom-icon');
    expect(migrateLegacyBottomIconId('czujniki-bottom-icon')).toBe('sensors-bottom-icon');
    expect(migrateLegacyBottomIconId('własny-czujnik-bottom-icon')).toBe('custom-sensor-bottom-icon');
  });

  it('leaves current and explicit ids alone', () => {
    expect(migrateLegacyBottomIconId('sensors-bottom-icon')).toBe('sensors-bottom-icon');
    expect(migrateLegacyBottomIconId('menu-countries')).toBe('menu-countries');
    expect(migrateLegacyBottomIconId('unknown-bottom-icon')).toBe('unknown-bottom-icon');
  });
});
