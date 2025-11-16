/* eslint-disable dot-notation */
import { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { Container } from '../src/engine/core/container';
import { Singletons } from '../src/engine/core/interfaces';
import { CountriesMenu } from './../src/plugins/countries/countries';
import { defaultSat } from './environment/apiMocks';
import { mockUiManager, setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from './generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';

describe('CountriesMenu_class', () => {
  beforeEach(() => {
    setupDefaultHtml();

    const mockGroupsManager = new GroupsManager();
    const topMenu = new TopMenu();

    topMenu.init();

    mockGroupsManager.groupList.F = {
      groupName: 'F',
      ids: [],
      updateIsInGroup: jest.fn(),
      updateOrbits: jest.fn(),
    } as unknown as ObjectGroup<GroupType.ALL>;
    Container.getInstance().registerSingleton(Singletons.GroupsManager, mockGroupsManager);
  });

  standardPluginSuite(CountriesMenu, 'CountriesMenu');
  standardPluginMenuButtonTests(CountriesMenu, 'CountriesMenu');

  // Tests that the plugin name is set correctly
  it('test_plugin_name_set_correctly', () => {
    const countriesMenu = new CountriesMenu();

    expect(countriesMenu.id).toBe(CountriesMenu.name);
  });

  // Tests that groupSelected selects group and populates searchDOM
  it('test_group_selected_selects_group_and_populates_search_dom', () => {
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    const uiManagerInstance = mockUiManager;

    uiManagerInstance.searchManager.fillResultBox = jest.fn();
    groupManagerInstance.selectGroup = jest.fn();
    Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);

    CountriesMenu['groupSelected_']('F');
    expect(groupManagerInstance.selectGroup).toHaveBeenCalled();
    expect(uiManagerInstance.searchManager.fillResultBox).toHaveBeenCalled();
  });

  // Tests that groupSelected fills result box and clears selected sat
  it('test_group_selected_fills_result_box_and_clears_selected_sat', () => {
    settingsManager.searchLimit = 10;
    const groupManagerInstance = ServiceLocator.getGroupsManager();
    /*
     * const uiManagerInstance = mockUiManager;
     * uiManagerInstance.searchManager.fillResultBox = jest.fn();
     */

    PluginRegistry.addPlugin(new SelectSatManager());
    PluginRegistry.getPlugin(SelectSatManager).selectSat = jest.fn();
    groupManagerInstance.groupList.Argentina = {
      ids: [0, 1],
      updateIsInGroup: jest.fn(),
      updateOrbits: jest.fn(),
      clear: jest.fn(),
      hasObject: jest.fn(),
      createGroupByCountry_: jest.fn(),
    } as unknown as ObjectGroup<GroupType.COUNTRY>;
    ServiceLocator.getCatalogManager().getObject = () => defaultSat;
    CountriesMenu['groupSelected_']('F');
    // expect(uiManagerInstance.searchManager.fillResultBox).toHaveBeenCalled();
    expect(PluginRegistry.getPlugin(SelectSatManager).selectSat).toHaveBeenCalledWith(-1);
  });

  // Tests that countryMenuClick_ creates group if it doesn't exist
  it('test_group_selected_creates_group_if_it_doesnt_exist', () => {
    const groupManagerInstance = ServiceLocator.getGroupsManager();

    groupManagerInstance.selectGroup = jest.fn();
    groupManagerInstance.createGroup = jest.fn();
    groupManagerInstance.groupList = [] as unknown as Record<string, ObjectGroup<GroupType.ALL>>;
    Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);

    CountriesMenu['countryMenuClick_']('F');
    expect(groupManagerInstance.createGroup).toHaveBeenCalled();
  });
});
