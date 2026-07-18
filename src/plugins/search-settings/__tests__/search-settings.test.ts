/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { StorageKey } from '@app/engine/persistence/storage-key';
import { getEl } from '@app/engine/utils/get-el';
import { PersistenceManager } from '@app/engine/utils/persistence-manager';
import { SearchSettingsPlugin } from '@app/plugins/search-settings/search-settings';
import { MIN_SEARCH_CHARS_DEFAULT, SEARCH_LIMIT_DEFAULT } from '@app/plugins/search-settings/search-settings-core';
import { SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

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

  /** Render the real menu DOM so every wired element exists (getEl throws on missing). */
  const renderMenu = (p: SearchSettingsPlugin) => {
    document.body.insertAdjacentHTML('beforeend', p['buildSideMenuHtml_']());
  };

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new SearchSettingsPlugin();
    vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
    vi.spyOn(PersistenceManager.getInstance(), 'saveItem').mockImplementation(() => undefined);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('wires change listeners that apply max-results, min-chars, and toggle settings', () => {
    renderMenu(plugin);

    plugin['wireListeners_']();

    const maxEl = getEl('search-settings-maxResults') as HTMLInputElement;

    maxEl.value = '25';
    maxEl.dispatchEvent(new Event('change'));
    expect(settingsManager.searchLimit).toBe(25);

    const minEl = getEl('search-settings-minSearchChars') as HTMLInputElement;

    minEl.value = '4';
    minEl.dispatchEvent(new Event('change'));
    expect(settingsManager.minimumSearchCharacters).toBe(4);

    const decayedEl = getEl('search-settings-showDecayed') as HTMLInputElement;

    decayedEl.checked = true;
    decayedEl.dispatchEvent(new Event('change'));
    expect(settingsManager.isShowDecayedInSearch).toBe(true);

    const vimpelEl = getEl('search-settings-showVimpel') as HTMLInputElement;

    vimpelEl.checked = true;
    vimpelEl.dispatchEvent(new Event('change'));
    expect(settingsManager.isShowVimpelInSearch).toBe(true);

    const nameFieldEl = getEl('search-settings-field-name') as HTMLInputElement;

    nameFieldEl.checked = false;
    nameFieldEl.dispatchEvent(new Event('change'));
    expect(settingsManager.searchableFields.name).toBe(false);
  });

  it('rejects an invalid max-results value with a critical toast', () => {
    renderMenu(plugin);
    (getEl('search-settings-maxResults') as HTMLInputElement).value = 'abc';
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;

    plugin['applyMaxResults_']();

    expect(toast).toHaveBeenCalled();
  });

  it('rejects an invalid min-search-chars value with a critical toast', () => {
    renderMenu(plugin);
    (getEl('search-settings-minSearchChars') as HTMLInputElement).value = 'abc';
    const toast = vi.fn();

    ServiceLocator.getUiManager().toast = toast;

    plugin['applyMinSearchChars_']();

    expect(toast).toHaveBeenCalled();
  });

  it('reruns the active search when a setting changes', () => {
    renderMenu(plugin);

    // Reuse any existing #search element (setupStandardEnvironment may create one) so getElementById finds ours.
    let searchEl = getEl('search', true) as HTMLInputElement | null;

    if (!searchEl) {
      document.body.insertAdjacentHTML('beforeend', '<input id="search"/>');
      searchEl = getEl('search', true) as HTMLInputElement;
    }
    searchEl.value = 'ISS';

    const doSearch = vi.fn();

    ServiceLocator.getUiManager().searchManager.doSearch = doSearch;

    plugin['wireListeners_']();
    getEl('search-settings-showDecayed')?.dispatchEvent(new Event('change'));

    expect(doSearch).toHaveBeenCalledWith('ISS');
  });

  it('resets all search settings to defaults', () => {
    renderMenu(plugin);
    settingsManager.searchLimit = 12;
    settingsManager.minimumSearchCharacters = 7;
    settingsManager.isShowDecayedInSearch = false;
    settingsManager.isShowVimpelInSearch = true;
    settingsManager.searchableFields = { ...settingsManager.searchableFields, name: false };

    ServiceLocator.getUiManager().toast = vi.fn();

    plugin['resetToDefaults_']();

    expect(settingsManager.searchLimit).toBe(SEARCH_LIMIT_DEFAULT);
    expect(settingsManager.minimumSearchCharacters).toBe(MIN_SEARCH_CHARS_DEFAULT);
    expect(settingsManager.isShowDecayedInSearch).toBe(true);
    expect(settingsManager.isShowVimpelInSearch).toBe(false);
    expect(settingsManager.searchableFields.name).toBe(true);
  });

  it('loads persisted search settings', () => {
    vi.spyOn(PersistenceManager.getInstance(), 'getItem').mockImplementation((key: string) => {
      if (key === StorageKey.SETTINGS_SEARCH_LIMIT) {
        return '123';
      }
      if (key === StorageKey.SETTINGS_SHOW_DECAYED_IN_SEARCH) {
        return 'true';
      }
      if (key === StorageKey.SETTINGS_MINIMUM_SEARCH_CHARACTERS) {
        return '5';
      }
      if (key === StorageKey.SETTINGS_SHOW_VIMPEL_IN_SEARCH) {
        return 'true';
      }
      if (key === StorageKey.SETTINGS_SEARCHABLE_FIELDS) {
        return JSON.stringify({ name: false });
      }

      return null;
    });

    plugin['loadPersistedSettings_']();

    expect(settingsManager.searchLimit).toBe(123);
    expect(settingsManager.minimumSearchCharacters).toBe(5);
    expect(settingsManager.isShowDecayedInSearch).toBe(true);
    expect(settingsManager.isShowVimpelInSearch).toBe(true);
    expect(settingsManager.searchableFields.name).toBe(false);
    expect(settingsManager.searchableFields.bus).toBe(true);
  });
});
