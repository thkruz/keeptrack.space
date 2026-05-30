import { KeepTrack } from '@app/keeptrack';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { disableConsoleErrors, enableConsoleErrors, setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { getEl } from '@app/engine/utils/get-el';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

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
