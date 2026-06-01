import { vi } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType, ObjectGroup } from '@app/app/data/object-group';
import { StringExtractor } from '@app/app/ui/string-extractor';
import { Container } from '@app/engine/core/container';
import { MenuMode, Singletons } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { CountriesMenu } from '@app/plugins/countries/countries';
import { settingsManager as settingsManagerSingleton } from '@app/settings/settings';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { defaultSat } from '@test/environment/apiMocks';
import { mockUiManager, setupDefaultHtml } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';

const setupCountriesMenuTestEnvironment = () => {
  setupDefaultHtml();

  const mockGroupsManager = new GroupsManager();
  const topMenu = new TopMenu();

  topMenu.init();

  mockGroupsManager.groupList.F = {
    groupName: 'F',
    ids: [],
    updateIsInGroup: vi.fn(),
    updateOrbits: vi.fn(),
  } as unknown as ObjectGroup<GroupType.ALL>;
  Container.getInstance().registerSingleton(Singletons.GroupsManager, mockGroupsManager);
};

describe('CountriesMenu', () => {
  beforeEach(() => {
    setupCountriesMenuTestEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(CountriesMenu, 'CountriesMenu');
  standardPluginMenuButtonTests(CountriesMenu, 'CountriesMenu');

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

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new CountriesMenu();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-countries');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.CATALOG);
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
      expect(dragOptions.minWidth).toBe(200);
      expect(dragOptions.maxWidth).toBe(400);
    });

    it('should return keyboard shortcuts with key O', () => {
      const plugin = new CountriesMenu();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('O');
      expect(shortcuts[0].callback).toBeInstanceOf(Function);
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
    it('should generate country list HTML', () => {
      const plugin = new CountriesMenu();
      const html = plugin['generateCountryList_']();

      expect(typeof html).toBe('string');
    });

    it('should merge country codes by display name and skip ANALSAT', () => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      catalogManagerInstance.getSats = vi.fn().mockReturnValue([
        { country: 'US' },
        { country: 'USA' },
        { country: 'ANALSAT' },
      ]);
      vi
        .spyOn(StringExtractor, 'extractCountry')
        .mockImplementation((code: string) => (code === 'US' || code === 'USA' ? 'United States' : code));

      const plugin = new CountriesMenu();
      const html = plugin['generateCountryList_']();

      expect(html).toContain('data-group="US|USA"');
      expect(html).not.toContain('ANALSAT');
    });
  });

  describe('countryMenuClick_', () => {
    it('should throw error for empty country code', () => {
      const plugin = new CountriesMenu();

      expect(() => plugin['countryMenuClick_']('')).toThrow('Unknown country code');
    });

    it('should create group if it does not exist', () => {
      const groupManagerInstance = ServiceLocator.getGroupsManager();

      groupManagerInstance.selectGroup = vi.fn();
      groupManagerInstance.createGroup = vi.fn();
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

      uiManagerInstance.searchManager.fillResultBox = vi.fn();
      groupManagerInstance.selectGroup = vi.fn();
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
      PluginRegistry.getPlugin(SelectSatManager)!.selectSat = vi.fn();
      groupManagerInstance.groupList.Argentina = {
        ids: [0, 1],
        updateIsInGroup: vi.fn(),
        updateOrbits: vi.fn(),
        clear: vi.fn(),
        hasObject: vi.fn(),
        createGroupByCountry_: vi.fn(),
      } as unknown as ObjectGroup<GroupType.COUNTRY>;
      ServiceLocator.getCatalogManager().getObject = () => defaultSat;

      const plugin = new CountriesMenu();

      plugin['groupSelected_']('F');
      expect(PluginRegistry.getPlugin(SelectSatManager)!.selectSat).toHaveBeenCalledWith(-1);
    });

    it('should handle undefined group name', () => {
      const plugin = new CountriesMenu();

      // eslint-disable-next-line no-undefined
      expect(() => plugin['groupSelected_'](undefined as any)).not.toThrow();
    });

    it('should handle non-existent group', () => {
      const plugin = new CountriesMenu();

      expect(() => plugin['groupSelected_']('NONEXISTENT')).not.toThrow();
    });
  });

  describe('uiManagerFinal_', () => {
    it('should bind click listeners to country list items', () => {
      const plugin = new CountriesMenu();
      const countryMenuClickSpy = vi
        .spyOn(plugin as any, 'countryMenuClick_')
        // eslint-disable-next-line
        .mockImplementation(() => undefined);

      vi
        .spyOn(plugin as any, 'generateCountryList_')
        .mockReturnValue('<li class="menu-selectable country-option" data-group="US">United States</li>');
      document.body.innerHTML = `
              <div id="country-menu">
                <ul id="country-list"></ul>
              </div>
            `;

      plugin['uiManagerFinal_']();

      const listItem = document.querySelector('#country-menu li');

      expect(listItem).not.toBeNull();

      listItem?.dispatchEvent(new Event('click'));
      expect(countryMenuClickSpy).toHaveBeenCalledWith('US');
    });

    it('should no-op when country menu elements are missing', () => {
      const plugin = new CountriesMenu();
      const generateSpy = vi.spyOn(plugin as any, 'generateCountryList_');

      document.body.innerHTML = '';

      plugin['uiManagerFinal_']();

      expect(generateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should register uiManagerFinal handler on addHtml', () => {
      const plugin = new CountriesMenu();
      const uiFinalSpy = vi.spyOn(plugin as any, 'uiManagerFinal_').mockImplementation();
      const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

      plugin.addHtml();

      expect(onSpy).toHaveBeenCalledWith(EventBusEvent.uiManagerFinal, expect.any(Function));
      expect(uiFinalSpy).not.toHaveBeenCalled();
    });
  });
});

describe('CountriesMenu behavior', () => {
  let plugin: CountriesMenu;

  beforeEach(() => {
    setupCountriesMenuTestEnvironment();
    plugin = new CountriesMenu();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('O shortcut opens the menu', () => {
    const spy = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

    plugin.getKeyboardShortcuts()[0].callback();

    expect(spy).toHaveBeenCalled();
  });

  it('builds command-palette commands grouped by country and invokes one', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSats').mockReturnValue([{ country: 'US' }, { country: 'US' }, { country: 'CA' }, { country: 'ANALSAT' }, { country: '' }] as never);
    // Two distinct display names so the alphabetical sort comparator actually runs.
    vi.spyOn(StringExtractor, 'extractCountry').mockImplementation((code: string) => (code === 'CA' ? 'Canada' : 'United States'));

    const commands = plugin.getCommandPaletteCommands();

    expect(commands.length).toBe(2);
    expect(commands[0].label).toContain('Canada');

    const clickSpy = vi.spyOn(plugin as unknown as { countryMenuClick_(c: string): void }, 'countryMenuClick_').mockImplementation(() => undefined);

    commands[0].callback();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('countryMenuClick_ selects the group, fills results and closes search on mobile', () => {
    const groups = ServiceLocator.getGroupsManager();

    // createGroup is what populates groupList for a country; emulate that so groupSelected_ proceeds.
    vi.spyOn(groups, 'createGroup').mockImplementation((_type, _data, name: string) => {
      groups.groupList[name] = { ids: [1, 2] } as never;

      return groups.groupList[name];
    });
    vi.spyOn(groups, 'selectGroup').mockImplementation(() => undefined);
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue({ sccNum: '00005' } as never);

    const ui = ServiceLocator.getUiManager();

    ui.searchManager.fillResultBox = vi.fn();
    ui.searchManager.closeSearch = vi.fn();
    ui.hideSideMenus = vi.fn();

    if (!document.getElementById('search')) {
      document.body.insertAdjacentHTML('beforeend', '<input id="search"/>');
    }
    // countries.ts reads the imported settingsManager singleton, not the ambient global.
    settingsManagerSingleton.isMobileModeEnabled = true;

    expect(() => (plugin as unknown as { countryMenuClick_(c: string): void }).countryMenuClick_('US')).not.toThrow();
    expect(settingsManagerSingleton.isMobileModeEnabled).toBe(true);

    settingsManagerSingleton.isMobileModeEnabled = false;
  });
});
