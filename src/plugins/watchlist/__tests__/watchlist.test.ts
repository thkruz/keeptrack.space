import { KeepTrack } from '@app/keeptrack';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import {
  hasSettingsContribution,
  ISettingSelectControl,
} from '@app/engine/plugins/core/plugin-capabilities';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { SatLabelMode } from '@app/settings/ui-settings';
import { defaultSat } from '@test/environment/apiMocks';
import { disableConsoleErrors, enableConsoleErrors, setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { getEl } from '@app/engine/utils/get-el';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

vi.mock('file-saver', () => ({ __esModule: true, default: vi.fn(), saveAs: vi.fn() }));

describe('WatchlistPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(WatchlistPlugin, 'WatchlistPlugin');
  standardPluginMenuButtonTests(WatchlistPlugin, 'WatchlistPlugin');
});

describe('WatchlistPlugin_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
  });

  standardPluginSuite(WatchlistPlugin);
  standardPluginMenuButtonTests(WatchlistPlugin);
  standardClickTests(WatchlistPlugin);
});

describe('WatchlistPlugin_form', () => {
  let watchlistPlugin: WatchlistPlugin;

  beforeEach(() => {
    setupDefaultHtml();
    watchlistPlugin = new WatchlistPlugin();
    window.M = {
      keys: {
        TAB: 9,
        ENTER: 13,
        ESC: 27,
        ARROW_UP: 38,
        ARROW_DOWN: 40,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    websiteInit(watchlistPlugin);
  });

  it('should be initialized', () => {
    expect(watchlistPlugin).toBeDefined();
  });

  it('should add satellites to watchlist-new element', () => {
    // Step 1: Add satellites '1,5,25544' to watchlist-new element
    const satellites = '1,1,5,5,25544,25544';
    const watchlistNewElement = <HTMLInputElement>getEl('watchlist-new');

    if (watchlistNewElement) {
      watchlistNewElement.value = satellites;
    }

    // Step 2: Click add button
    const addButton = getEl('watchlist-add');

    if (addButton) {
      addButton.click();
    }

    /*
     * Step 3: Click remove button
     * get first img by class "watchlist-remove"
     */
    const removeButton = <HTMLImageElement>KeepTrack.getInstance().containerRoot.querySelector('img.watchlist-remove');

    if (removeButton) {
      removeButton.click();
    }

    // Step 4: Add satellites '1,5,25544' to watchlist-new element
    if (watchlistNewElement) {
      watchlistNewElement.value = satellites;
    }

    // Step 5: Press enter
    if (watchlistNewElement) {
      disableConsoleErrors();
      watchlistNewElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      enableConsoleErrors();
    }

    // Step 6: Add satellites '1,5,25544' to watchlist-new element
    if (watchlistNewElement) {
      watchlistNewElement.value = satellites;
    }

    // Step 7: Press enter
    if (watchlistNewElement) {
      disableConsoleErrors();
      watchlistNewElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      enableConsoleErrors();
    }
  });
});

// The pre-fix add handler did `sccNum2Id(parseInt(satNum))`, which collapses
// any typed alpha-5 ("T0001") to NaN and silently rejected alpha-5 / extended
// watchlist entries. The fix passes the raw string through so the catalog
// manager resolves it via its full equivalence logic.
describe('WatchlistPlugin_addInputForm_sccNumForms', () => {
  let watchlistPlugin: WatchlistPlugin;
  let sccNumSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupDefaultHtml();
    watchlistPlugin = new WatchlistPlugin();
    websiteInit(watchlistPlugin);
    // Return -1 so the handler short-circuits to the "not found" toast without
    // needing a real catalog entry; we only assert what the spy received.
    sccNumSpy = vi.fn().mockReturnValue(-1);
    ServiceLocator.getCatalogManager().sccNum2Id = sccNumSpy;
  });

  const addViaForm = (value: string): void => {
    (getEl('watchlist-new') as HTMLInputElement).value = value;
    getEl('watchlist-add')!.click();
  };

  it('passes alpha-5 input through unchanged (not collapsed to NaN by parseInt)', () => {
    addViaForm('T0001');
    expect(sccNumSpy).toHaveBeenCalledWith('T0001');
  });

  it('passes 9-digit extended input through unchanged', () => {
    addViaForm('799500766');
    expect(sccNumSpy).toHaveBeenCalledWith('799500766');
  });

  it('splits and trims a mixed-form comma list, passing each form verbatim', () => {
    addViaForm('25544, T0001 , 799500766');
    expect(sccNumSpy).toHaveBeenCalledWith('25544');
    expect(sccNumSpy).toHaveBeenCalledWith('T0001');
    expect(sccNumSpy).toHaveBeenCalledWith('799500766');
  });
});

// TODO: Add tests for reading/saving watchlist json file

describe('WatchlistPlugin list operations', () => {
  let plugin: WatchlistPlugin;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new WatchlistPlugin();
    websiteInit(plugin);
    const catalog = ServiceLocator.getCatalogManager();

    catalog.getSat = vi.fn(() => defaultSat) as never;
    catalog.getObject = vi.fn(() => defaultSat) as never;
    catalog.sccNum2Id = vi.fn(() => 0) as never;
    // The filter-icon lives in the utility panel (a separate plugin); add a stub
    // so setFilterActive's getEl (no expected-missing flag) doesn't throw.
    document.body.insertAdjacentHTML('beforeend', '<div id="watchlist-filter-icon"></div>');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('addSat adds, isOnWatchlist reflects it, getSatellites lists ids', () => {
    plugin.addSat(0);

    expect(plugin.isOnWatchlist(0)).toBe(true);
    expect(plugin.getSatellites()).toContain(0);
  });

  it('addSat warns on a duplicate instead of adding twice', () => {
    plugin.addSat(0);
    plugin.addSat(0);

    expect(plugin.getSatellites().filter((id) => id === 0)).toHaveLength(1);
  });

  it('removeSat removes a satellite and is a no-op for an absent one', () => {
    plugin.addSat(0);
    plugin.removeSat(0);
    expect(plugin.isOnWatchlist(0)).toBe(false);

    // Removing again is harmless.
    expect(() => plugin.removeSat(0)).not.toThrow();
  });

  it('isOnWatchlist is false for null and hasAnyInView reflects inView flags', () => {
    expect(plugin.isOnWatchlist(null as unknown as number)).toBe(false);

    plugin.watchlistList = [{ id: 0, inView: false }];
    expect(plugin.hasAnyInView()).toBe(false);
    plugin.watchlistList = [{ id: 0, inView: true }];
    expect(plugin.hasAnyInView()).toBe(true);
  });

  it('serialize / unserialize round-trips the sccNum list', () => {
    plugin.watchlistList = [{ id: 0, inView: false }];

    const json = plugin.serialize();

    expect(plugin.unserialize(json)).toEqual([defaultSat.sccNum]);
  });

  it('unserialize tolerates malformed JSON', () => {
    expect(plugin.unserialize('{bad')).toEqual([]);
  });

  it('createNewWatchlist converts a saved sccNum list into id objects', () => {
    const list = plugin.createNewWatchlist(JSON.stringify([defaultSat.sccNum]));

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(defaultSat.id);
  });

  it('updateWatchlist renders the list rows into the DOM', () => {
    plugin.updateWatchlist({ updateWatchlistList: [{ id: 0, inView: false }] });

    expect(getEl('watchlist-list')!.innerHTML).toContain('watchlist-remove');
  });

  it('clear empties the watchlist', () => {
    plugin.addSat(0);
    plugin.clear();

    expect(plugin.getSatellites()).toHaveLength(0);
  });

  describe('setFilterActive', () => {
    it('activates the filter and runs a search when the list is non-empty', () => {
      const doSearch = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch');

      plugin.watchlistList = [{ id: 0, inView: false }];
      plugin.setFilterActive(true);

      expect(plugin.isFilterActive).toBe(true);
      expect(doSearch).toHaveBeenCalled();
    });

    it('deactivating clears the search', () => {
      const doSearch = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch');

      plugin.setFilterActive(false);

      expect(plugin.isFilterActive).toBe(false);
      expect(doSearch).toHaveBeenCalledWith('');
    });
  });

  it('onSaveClicked_ serializes the list and saves it', () => {
    plugin.watchlistList = [{ id: 0, inView: false }];
    const serializeSpy = vi.spyOn(plugin, 'serialize');
    const evt = new Event('click');
    const preventDefault = vi.spyOn(evt, 'preventDefault');

    expect(() => p().onSaveClicked_(evt)).not.toThrow();
    expect(serializeSpy).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it('selectSatData_ toggles the watchlist icon based on membership', () => {
    // satInfoBoxFinal_ inserts the toggle icon element.
    p().satInfoBoxFinal_();
    plugin.watchlistList = [{ id: 0, inView: false }];

    p().selectSatData_({ id: 0 });
    expect(getEl(plugin.EL.WATCHLIST_TOGGLE)!.classList.contains('on-watchlist')).toBe(true);

    p().selectSatData_({ id: 999 });
    expect(getEl(plugin.EL.WATCHLIST_TOGGLE)!.classList.contains('off-watchlist')).toBe(true);
  });

  it('onReaderLoad_ loads a satellite list from a file read', () => {
    const evt = {
      target: { readyState: 2, error: null, result: JSON.stringify([defaultSat.sccNum]) },
    } as unknown as ProgressEvent<FileReader>;

    p().onReaderLoad_(evt);

    expect(plugin.getSatellites()).toContain(defaultSat.id);
  });
});

describe('WatchlistPlugin settings contribution', () => {
  let plugin: WatchlistPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new WatchlistPlugin();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('advertises a settings contribution', () => {
    expect(hasSettingsContribution(plugin)).toBe(true);
  });

  it('contributes a single select with three options spanning every SatLabelMode value', () => {
    const contribution = plugin.getSettingsContribution();

    expect(contribution.sectionId).toBe('WatchlistPlugin');
    expect(contribution.controls).toHaveLength(1);
    const control = contribution.controls[0] as ISettingSelectControl;

    expect(control.type).toBe('select');
    expect(control.id).toBe('satLabelMode');
    expect(control.options.map((o) => o.value)).toEqual([
      String(SatLabelMode.OFF),
      String(SatLabelMode.FOV_ONLY),
      String(SatLabelMode.ALL),
    ]);
  });

  it('get() returns the current satLabelMode serialized to the matching option value', () => {
    const control = plugin.getSettingsContribution().controls[0] as ISettingSelectControl;

    settingsManager.satLabelMode = SatLabelMode.OFF;
    expect(control.get()).toBe(String(SatLabelMode.OFF));

    settingsManager.satLabelMode = SatLabelMode.ALL;
    expect(control.get()).toBe(String(SatLabelMode.ALL));
  });

  it('set() parses the string value back into the enum and persists it', () => {
    const control = plugin.getSettingsContribution().controls[0] as ISettingSelectControl;
    const saveSpy = vi.spyOn(PersistenceManager.getInstance(), 'saveItem').mockImplementation(() => undefined);

    control.set(String(SatLabelMode.ALL));

    expect(settingsManager.satLabelMode).toBe(SatLabelMode.ALL);
    expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_SAT_LABEL_MODE, String(SatLabelMode.ALL));

    control.set(String(SatLabelMode.OFF));

    expect(settingsManager.satLabelMode).toBe(SatLabelMode.OFF);
    expect(saveSpy).toHaveBeenCalledWith(StorageKey.SETTINGS_SAT_LABEL_MODE, String(SatLabelMode.OFF));
  });
});
