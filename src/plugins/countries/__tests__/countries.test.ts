/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { Container } from '@app/engine/core/container';
import { MenuMode, Singletons } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { CountriesMenu } from '@app/plugins/countries/countries';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSat } from '@test/environment/apiMocks';
import { mockUiManager, setupDefaultHtml } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  standardPluginSuite(CountriesMenu, 'CountriesMenu');
  standardPluginMenuButtonTests(CountriesMenu, 'CountriesMenu');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new CountriesMenu();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-countries');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.BASIC);
      expect(config.menuMode).toContain(MenuMode.ADVANCED);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new CountriesMenu();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('countries-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
    });

    it('should return correct help config', () => {
      const plugin = new CountriesMenu();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return correct drag options', () => {
      const plugin = new CountriesMenu();
      const dragOptions = plugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
    });

    it('should build side menu HTML with country list element', () => {
      const plugin = new CountriesMenu();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('countries-menu');
      expect(html).toContain('country-menu');
      expect(html).toContain('country-list');
    });
  });

  describe('generateCountryList_', () => {
    it('should generate country list HTML with header', () => {
      const plugin = new CountriesMenu();
      const html = plugin['generateCountryList_']();

      expect(html).toContain('center-align');
      expect(html).toContain('divider');
    });
  });

  describe('countryMenuClick_', () => {
    it('should throw error for empty country code', () => {
      const plugin = new CountriesMenu();

      expect(() => plugin['countryMenuClick_']('')).toThrow('Unknown country code');
    });

    it('should create group if it does not exist', () => {
      const groupManagerInstance = ServiceLocator.getGroupsManager();

      groupManagerInstance.selectGroup = jest.fn();
      groupManagerInstance.createGroup = jest.fn();
      groupManagerInstance.groupList = [] as unknown as Record<string, ObjectGroup<GroupType.ALL>>;
      Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);

      const plugin = new CountriesMenu();

      plugin['countryMenuClick_']('F');
      expect(groupManagerInstance.createGroup).toHaveBeenCalled();
    });
  });

  describe('groupSelected_', () => {
    it('should select group and populate searchDOM', () => {
      const groupManagerInstance = ServiceLocator.getGroupsManager();
      const uiManagerInstance = mockUiManager;

      uiManagerInstance.searchManager.fillResultBox = jest.fn();
      groupManagerInstance.selectGroup = jest.fn();
      Container.getInstance().registerSingleton(Singletons.GroupsManager, groupManagerInstance);

      const plugin = new CountriesMenu();

      plugin['groupSelected_']('F');
      expect(groupManagerInstance.selectGroup).toHaveBeenCalled();
      expect(uiManagerInstance.searchManager.fillResultBox).toHaveBeenCalled();
    });

    it('should fill result box and clear selected sat', () => {
      settingsManager.searchLimit = 10;
      const groupManagerInstance = ServiceLocator.getGroupsManager();

      PluginRegistry.addPlugin(new SelectSatManager());
      PluginRegistry.getPlugin(SelectSatManager)!.selectSat = jest.fn();
      groupManagerInstance.groupList.Argentina = {
        ids: [0, 1],
        updateIsInGroup: jest.fn(),
        updateOrbits: jest.fn(),
        clear: jest.fn(),
        hasObject: jest.fn(),
        createGroupByCountry_: jest.fn(),
      } as unknown as ObjectGroup<GroupType.COUNTRY>;
      ServiceLocator.getCatalogManager().getObject = () => defaultSat;

      const plugin = new CountriesMenu();

      plugin['groupSelected_']('F');
      expect(PluginRegistry.getPlugin(SelectSatManager)!.selectSat).toHaveBeenCalledWith(-1);
    });

    it('should handle undefined group name', () => {
      const plugin = new CountriesMenu();

      // Should not throw for undefined group
      expect(() => plugin['groupSelected_'](undefined as any)).not.toThrow();
    });

    it('should handle non-existent group', () => {
      const plugin = new CountriesMenu();

      // Should not throw for non-existent group
      expect(() => plugin['groupSelected_']('NONEXISTENT')).not.toThrow();
    });
  });

  describe('Plugin identity', () => {
    it('should have correct plugin name', () => {
      const plugin = new CountriesMenu();

      expect(plugin.id).toBe(CountriesMenu.name);
    });

    it('should have TopMenu as dependency', () => {
      const plugin = new CountriesMenu();

      expect(plugin.dependencies_).toContain('TopMenu');
    });
  });
});
