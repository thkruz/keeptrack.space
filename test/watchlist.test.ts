import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { disableConsoleErrors, enableConsoleErrors, setupDefaultHtml } from './environment/standard-env';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { KeepTrack } from '@app/keeptrack';

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

// TODO: Add tests for reading/saving watchlist json file
