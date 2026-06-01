import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { settingsManager } from '@app/settings/settings';
import { defaultSat } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('WatchlistPlugin handlers', () => {
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
    document.body.insertAdjacentHTML('beforeend', '<div id="watchlist-filter-icon"></div>');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('syncLabelRadios_ checks the radio matching the current label mode', () => {
    // Ensure the three label radios exist so the method has something to drive.
    if (!getEl('watchlist-label-always', true)) {
      document.body.insertAdjacentHTML('beforeend',
        '<input id="watchlist-label-always" type="radio" /><input id="watchlist-label-fov" type="radio" /><input id="watchlist-label-off" type="radio" />');
    }

    p().syncLabelRadios_();

    const mode = settingsManager.satLabelMode.toString();
    const always = getEl('watchlist-label-always') as HTMLInputElement;

    // The "always" radio is checked iff the current label mode is 2.
    expect(always.checked).toBe(mode === '2');
  });

  it('applyWatchlistFilter_ is a no-op for an empty watchlist', () => {
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().watchlistList = [];
    p().applyWatchlistFilter_();

    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('applyWatchlistFilter_ searches the joined sccNums when the list is non-empty', () => {
    const searchSpy = vi.spyOn(ServiceLocator.getUiManager(), 'doSearch').mockImplementation(() => undefined);

    p().watchlistList = [{ id: 0, inView: false }];
    p().applyWatchlistFilter_();

    expect(searchSpy).toHaveBeenCalled();
  });

  it('onAddEvent_ resolves sccNums and appends them to the watchlist', () => {
    (getEl('watchlist-new') as HTMLInputElement).value = '00005';
    const addSpy = vi.spyOn(plugin, 'addSat');

    p().onAddEvent_();

    expect(addSpy).toHaveBeenCalledWith(0, true);
    expect((getEl('watchlist-new') as HTMLInputElement).value).toBe('');
  });

  it('onAddEvent_ warn-toasts an unresolved sccNum', () => {
    ServiceLocator.getCatalogManager().sccNum2Id = vi.fn(() => null) as never;
    (getEl('watchlist-new') as HTMLInputElement).value = 'BOGUS';
    const addSpy = vi.spyOn(plugin, 'addSat');

    p().onAddEvent_();

    expect(addSpy).not.toHaveBeenCalled();
  });

  it('onClearClicked_ clears the watchlist', () => {
    const clearSpy = vi.spyOn(plugin, 'clear');

    p().onClearClicked_();

    expect(clearSpy).toHaveBeenCalled();
  });

  it('onSaveClicked_ serializes the list and prevents the default', () => {
    plugin.addSat(0);
    const evt = { preventDefault: vi.fn() } as unknown as Event;

    // file-saver's saveAs binds the real export; assert the path completes.
    expect(() => p().onSaveClicked_(evt)).not.toThrow();
    expect(evt.preventDefault).toHaveBeenCalled();
  });

  it('onReaderLoad_ loads a saved sccNum list into the watchlist', () => {
    const evt = {
      target: { readyState: 2, error: null, result: JSON.stringify(['00005']) },
    } as unknown as ProgressEvent<FileReader>;

    p().onReaderLoad_(evt);

    expect(p().watchlistList.length).toBeGreaterThan(0);
  });

  it('onReaderLoad_ bails when the reader is not done', () => {
    const evt = {
      target: { readyState: 1, error: null, result: '' },
    } as unknown as ProgressEvent<FileReader>;

    expect(() => p().onReaderLoad_(evt)).not.toThrow();
  });
});
