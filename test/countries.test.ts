import { keepTrackApi } from '@app/js/keepTrackApi';
import { StandardGroupManager } from '@app/js/singletons/groups-manager';
import { keepTrackContainer } from '../src/js/container';
import { Singletons } from '../src/js/interfaces';
import { CountriesMenu } from './../src/js/plugins/countries/countries';
import { defaultSat } from './environment/apiMocks';
import { mockUiManager, setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';

describe('CountriesMenu_class', () => {
  beforeEach(() => {
    setupDefaultHtml();
    const mockGroupsManager = new StandardGroupManager();
    mockGroupsManager.groupList['Argentina'] = {
      groupName: 'Argentina',
      objects: [],
      updateIsInGroup: jest.fn(),
    };
    keepTrackContainer.registerSingleton(Singletons.GroupsManager, mockGroupsManager);
  });

  standardPluginSuite(CountriesMenu, 'CountriesMenu');
  standardPluginMenuButtonTests(CountriesMenu, 'CountriesMenu');

  // Tests that the plugin name is set correctly
  it('test_plugin_name_set_correctly', () => {
    const countriesMenu = new CountriesMenu();
    expect(countriesMenu.PLUGIN_NAME).toBe('Countries Menu');
  });

  // Tests that groupSelected selects group and populates searchDOM
  it('test_group_selected_selects_group_and_populates_search_dom', () => {
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const uiManagerInstance = mockUiManager;
    uiManagerInstance.searchManager.doSearch = jest.fn();
    groupManagerInstance.selectGroup = jest.fn();
    keepTrackContainer.registerSingleton(Singletons.GroupsManager, groupManagerInstance);

    CountriesMenu['groupSelected_']('Argentina');
    expect(groupManagerInstance.selectGroup).toHaveBeenCalled();
    expect(uiManagerInstance.searchManager.doSearch).toHaveBeenCalled();
  });

  // Tests that groupSelected fills result box and clears selected sat
  it('test_group_selected_fills_result_box_and_clears_selected_sat', () => {
    settingsManager.searchLimit = 10;
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    // const uiManagerInstance = mockUiManager;
    // uiManagerInstance.searchManager.fillResultBox = jest.fn();
    catalogManagerInstance.setSelectedSat = jest.fn();
    groupManagerInstance.groupList['Argentina'] = { objects: [0, 1], updateIsInGroup: jest.fn(), updateOrbits: jest.fn(), clear: jest.fn() };
    keepTrackApi.getCatalogManager().getSat = () => defaultSat;
    CountriesMenu['groupSelected_']('Argentina');
    // expect(uiManagerInstance.searchManager.fillResultBox).toHaveBeenCalled();
    expect(catalogManagerInstance.setSelectedSat).toHaveBeenCalledWith(-1);
  });

  // Tests that countryMenuClick_ creates group if it doesn't exist
  it('test_group_selected_creates_group_if_it_doesnt_exist', () => {
    const groupManagerInstance = keepTrackApi.getGroupsManager();
    groupManagerInstance.selectGroup = jest.fn();
    groupManagerInstance.createGroup = jest.fn();
    groupManagerInstance.groupList = [];
    keepTrackContainer.registerSingleton(Singletons.GroupsManager, groupManagerInstance);

    CountriesMenu['countryMenuClick_']('Argentina');
    expect(groupManagerInstance.createGroup).toHaveBeenCalled();
  });
});
