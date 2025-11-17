import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { SatelliteListsPlugin } from '@app/plugins/satellite-lists/satellite-lists';
import { disableConsoleErrors, enableConsoleErrors, setupDefaultHtml } from './environment/standard-env';
import { standardClickTests, standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { KeepTrack } from '@app/keeptrack';

describe('SatelliteListsPlugin_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
  });

  standardPluginSuite(SatelliteListsPlugin);
  standardPluginMenuButtonTests(SatelliteListsPlugin);
  standardClickTests(SatelliteListsPlugin);
});

describe('SatelliteListsPlugin_form', () => {
  let satelliteListsPlugin: SatelliteListsPlugin;

  beforeEach(() => {
    setupDefaultHtml();
    satelliteListsPlugin = new SatelliteListsPlugin();
    window.M = {
      keys: {
        TAB: 9,
        ENTER: 13,
        ESC: 27,
        ARROW_UP: 38,
        ARROW_DOWN: 40,
      },
      FormSelect: {
        init: jest.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    websiteInit(satelliteListsPlugin);
  });

  it('should be initialized', () => {
    expect(satelliteListsPlugin).toBeDefined();
  });

  it('should create a new list', () => {
    // Mock prompt to return a list name
    global.prompt = jest.fn(() => 'Test List');

    const newListButton = getEl('satellite-lists-new-list');

    if (newListButton) {
      newListButton.click();
    }

    expect(satelliteListsPlugin.lists.length).toBe(1);
    expect(satelliteListsPlugin.lists[0].name).toBe('Test List');
  });

  it('should add satellites to current list', () => {
    // First create a list
    global.prompt = jest.fn(() => 'Test List');
    const newListButton = getEl('satellite-lists-new-list');

    if (newListButton) {
      newListButton.click();
    }

    // Step 1: Add satellites to input element
    const satellites = '1,5,25544';
    const satelliteNewElement = <HTMLInputElement>getEl('satellite-lists-new-sat');

    if (satelliteNewElement) {
      satelliteNewElement.value = satellites;
    }

    // Step 2: Click add button
    const addButton = getEl('satellite-lists-add');

    if (addButton) {
      addButton.click();
    }

    // Verify satellites were added
    expect(satelliteListsPlugin.lists[0].satellites.length).toBeGreaterThan(0);
  });

  it('should remove satellites from current list', () => {
    // First create a list and add satellites
    global.prompt = jest.fn(() => 'Test List');
    const newListButton = getEl('satellite-lists-new-list');

    if (newListButton) {
      newListButton.click();
    }

    const satellites = '25544';
    const satelliteNewElement = <HTMLInputElement>getEl('satellite-lists-new-sat');

    if (satelliteNewElement) {
      satelliteNewElement.value = satellites;
    }

    const addButton = getEl('satellite-lists-add');

    if (addButton) {
      addButton.click();
    }

    // Step 3: Click remove button
    const removeButton = <HTMLImageElement>KeepTrack.getInstance().containerRoot.querySelector('img.satellite-list-remove');

    if (removeButton) {
      disableConsoleErrors();
      removeButton.click();
      enableConsoleErrors();
    }

    // Verify satellite was removed
    expect(satelliteListsPlugin.lists[0].satellites.length).toBe(0);
  });

  it('should rename a list', () => {
    // First create a list
    global.prompt = jest.fn()
      .mockReturnValueOnce('Test List')
      .mockReturnValueOnce('Renamed List');

    const newListButton = getEl('satellite-lists-new-list');

    if (newListButton) {
      newListButton.click();
    }

    // Rename the list
    const renameButton = getEl('satellite-lists-rename-list');

    if (renameButton) {
      renameButton.click();
    }

    expect(satelliteListsPlugin.lists[0].name).toBe('Renamed List');
  });

  it('should delete a list', () => {
    // First create a list
    global.prompt = jest.fn(() => 'Test List');
    global.confirm = jest.fn(() => true);

    const newListButton = getEl('satellite-lists-new-list');

    if (newListButton) {
      newListButton.click();
    }

    expect(satelliteListsPlugin.lists.length).toBe(1);

    // Delete the list
    const deleteButton = getEl('satellite-lists-delete-list');

    if (deleteButton) {
      deleteButton.click();
    }

    expect(satelliteListsPlugin.lists.length).toBe(0);
  });
});

// TODO: Add tests for export/import functionality
