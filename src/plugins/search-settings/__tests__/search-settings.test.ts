import { vi } from 'vitest';
/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager } from '@app/engine/utils/persistence-manager';
import { SearchSettingsPlugin } from '@app/plugins/search-settings/search-settings';
import { SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests } from '@test/generic-tests';

describe('SearchSettingsPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(SearchSettingsPlugin, 'SearchSettingsPlugin');
  standardPluginMenuButtonTests(SearchSettingsPlugin, 'SearchSettingsPlugin');
});

describe('SearchSettingsPlugin behavior', () => {
  let plugin: SearchSettingsPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new SearchSettingsPlugin();
    vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
    vi.spyOn(PersistenceManager.getInstance(), 'saveItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wires change listeners that apply max-results and show-decayed settings', () => {
    document.body.insertAdjacentHTML('beforeend',
      '<input id="search-settings-maxResults" value="50"/><input id="search-settings-showDecayed" type="checkbox"/>');

    plugin['wireListeners_']();

    const maxEl = getEl('search-settings-maxResults') as HTMLInputElement;

    maxEl.value = '25';
    maxEl.dispatchEvent(new Event('change'));
    expect(settingsManager.searchLimit).toBe(25);

    const decayedEl = getEl('search-settings-showDecayed') as HTMLInputElement;

    decayedEl.checked = true;
    decayedEl.dispatchEvent(new Event('change'));
    expect(settingsManager.isShowDecayedInSearch).toBe(true);
  });

  it('rejects an invalid max-results value with a critical toast', () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="search-settings-maxResults" value="abc"/>');
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;

    plugin['applyMaxResults_']();

    expect(toast).toHaveBeenCalled();
  });

  it('reruns the active search when a setting changes', () => {
    document.body.insertAdjacentHTML('beforeend', '<input id="search-settings-showDecayed" type="checkbox" checked/>');

    // Reuse any existing #search element (setupStandardEnvironment may create one) so getElementById finds ours.
    let searchEl = getEl('search', true) as HTMLInputElement | null;

    if (!searchEl) {
      document.body.insertAdjacentHTML('beforeend', '<input id="search"/>');
      searchEl = getEl('search', true) as HTMLInputElement;
    }
    searchEl.value = 'ISS';

    const doSearch = vi.fn();

    ServiceLocator.getUiManager().searchManager.doSearch = doSearch;

    plugin['applyShowDecayed_']();

    expect(doSearch).toHaveBeenCalledWith('ISS');
  });

  it('loads persisted search settings', () => {
    vi.spyOn(PersistenceManager.getInstance(), 'getItem').mockImplementation((key: string) => {
      if (key === StorageKey.SETTINGS_SEARCH_LIMIT) {
        return '123';
      }
      if (key === StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH) {
        return 'true';
      }

      return null;
    });

    plugin['loadPersistedSettings_']();

    expect(settingsManager.searchLimit).toBe(123);
    expect(settingsManager.isShowDecayedInSearch).toBe(true);
  });
});
