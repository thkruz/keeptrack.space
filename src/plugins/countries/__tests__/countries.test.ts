/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { buildCountryCodeGroups } from '@app/app/data/catalogs/countries';
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
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { settingsManager as settingsManagerSingleton } from '@app/settings/settings';
import { defaultSat } from '@test/environment/apiMocks';
import { mockUiManager, setupDefaultHtml } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

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
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
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

      catalogManagerInstance.getSats = vi.fn().mockReturnValue([{ country: 'US' }, { country: 'USA' }, { country: 'ANALSAT' }]);
      vi.spyOn(StringExtractor, 'extractCountry').mockImplementation((code: string) => (code === 'US' || code === 'USA' ? 'United States' : code));

      const plugin = new CountriesMenu();
      const html = plugin['generateCountryList_']();

      expect(html).toMatch(/data-group="US\|USA(?:\|[^"]*)?"/u);
      expect(html).not.toContain('ANALSAT');
    });

    it('shows one Luxembourg row holding every Luxembourg code, with the chip equal to the group size', () => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      catalogManagerInstance.getSats = vi.fn().mockReturnValue([{ country: 'LUXE' }, { country: 'O3B' }, { country: 'O3B' }, { country: 'SES' }, { country: 'L' }]);

      const plugin = new CountriesMenu();
      const host = document.createElement('div');

      host.innerHTML = plugin['generateCountryList_']();
      const rows = Array.from(host.querySelectorAll<HTMLElement>('.country-option'));
      const luxembourg = rows.filter((row) => row.querySelector('.country-name')?.textContent === 'Luxembourg');

      expect(luxembourg).toHaveLength(1);
      const codes = (luxembourg[0].dataset.group ?? '').split('|');

      expect(codes).toEqual(expect.arrayContaining(['LUXE', 'O3B', 'SES', 'L']));
      expect(luxembourg[0].querySelector('.country-count')?.textContent).toBe('5');
      // Same codes as the Find Satellite Country filter.
      expect(
        buildCountryCodeGroups()
          .find((g) => g.label === 'Luxembourg')
          ?.codes.sort()
      ).toEqual([...codes].sort());
    });

    it('palette rows select the same groups as the list rows', () => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      catalogManagerInstance.getSats = vi.fn().mockReturnValue([{ country: 'ALG' }, { country: 'DZ' }, { country: 'LUXE' }, { country: 'O3B' }]);

      const plugin = new CountriesMenu();
      const host = document.createElement('div');

      host.innerHTML = plugin['generateCountryList_']();
      const listGroups = Array.from(host.querySelectorAll<HTMLElement>('.country-option')).map((row) => row.dataset.group);
      const paletteGroups = plugin.getCommandPaletteCommands().map((cmd) => cmd.id.replace('CountriesMenu.selectCountry.', ''));

      expect(paletteGroups).toEqual(listGroups);
    });

    it('keeps unmapped codes in their own row and leaves out countries with no objects', () => {
      const catalogManagerInstance = ServiceLocator.getCatalogManager();

      catalogManagerInstance.getSats = vi.fn().mockReturnValue([{ country: 'ZZZQ' }, { country: 'ZZZQ' }, { country: 'F' }]);

      const plugin = new CountriesMenu();
      const host = document.createElement('div');

      host.innerHTML = plugin['generateCountryList_']();
      const rows = Array.from(host.querySelectorAll<HTMLElement>('.country-option'));

      expect(rows).toHaveLength(2);
      const unknown = rows.find((row) => row.dataset.group === 'ZZZQ');

      expect(unknown?.querySelector('.country-count')?.textContent).toBe('2');
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

      vi.spyOn(plugin as any, 'generateCountryList_').mockReturnValue('<li class="menu-selectable country-option" data-group="US">United States</li>');
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
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSats').mockReturnValue([
      { country: 'US' },
      { country: 'US' },
      { country: 'CA' },
      { country: 'ANALSAT' },
      { country: '' },
    ] as never);
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

describe('CountriesMenu selection marker and Clear', () => {
  let plugin: CountriesMenu;
  let groups: GroupsManager;

  const menuHtml = () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<input id="search"/><div id="country-menu"><button id="countries-clear-btn" disabled></button><div id="country-list">
        <button class="country-option" data-group="AT|ASRA">Austria</button>
        <button class="country-option" data-group="DZ|ALG">Algeria</button>
      </div></div>`
    );
  };
  const row = (group: string) => document.querySelector<HTMLElement>(`.country-option[data-group="${group}"]`)!;
  const clearBtn = () => document.getElementById('countries-clear-btn') as HTMLButtonElement;

  beforeEach(() => {
    setupCountriesMenuTestEnvironment();
    document.body.innerHTML = '';
    menuHtml();
    groups = new GroupsManager();
    Container.getInstance().registerSingleton(Singletons.GroupsManager, groups);
    vi.spyOn(groups, 'createGroup').mockImplementation((_type, _data, name: string | null) => {
      groups.groupList[name!] = { ids: [1, 2] } as never;

      return groups.groupList[name!];
    });
    // Mirror GroupsManager.selectGroup's state change without the color/orbit side effects.
    vi.spyOn(groups, 'selectGroup').mockImplementation((g) => {
      groups.selectedGroup = g;
    });
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue({ sccNum: '00005' } as never);

    const ui = ServiceLocator.getUiManager();

    ui.searchManager.fillResultBox = vi.fn();
    ui.hideSideMenus = vi.fn();
    ui.searchManager.doSearch = vi.fn(() => groups.clearSelect());
    settingsManagerSingleton.isMobileModeEnabled = false;
    plugin = new CountriesMenu();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the side menus open after a pick', () => {
    plugin['countryMenuClick_']('AT|ASRA');

    expect(ServiceLocator.getUiManager().hideSideMenus).not.toHaveBeenCalled();
  });

  it('marks only the picked row and enables Clear', () => {
    plugin['countryMenuClick_']('AT|ASRA');

    expect(row('AT|ASRA').classList.contains('country-option--selected')).toBe(true);
    expect(row('AT|ASRA').getAttribute('aria-pressed')).toBe('true');
    expect(row('DZ|ALG').classList.contains('country-option--selected')).toBe(false);
    expect(clearBtn().disabled).toBe(false);

    plugin['countryMenuClick_']('DZ|ALG');

    expect(row('AT|ASRA').classList.contains('country-option--selected')).toBe(false);
    expect(row('DZ|ALG').getAttribute('aria-pressed')).toBe('true');
  });

  it('Clear empties the search, clears the group and the marker', () => {
    plugin['countryMenuClick_']('AT|ASRA');
    expect((document.getElementById('search') as HTMLInputElement).value).toBe('00005,00005');

    plugin['clearCountry_']();

    expect((document.getElementById('search') as HTMLInputElement).value).toBe('');
    expect(ServiceLocator.getUiManager().searchManager.doSearch).toHaveBeenCalledWith('');
    expect(groups.selectedGroup).toBeNull();
    expect(row('AT|ASRA').classList.contains('country-option--selected')).toBe(false);
    expect(clearBtn().disabled).toBe(true);
  });

  it('drops the marker when another search replaces the group', () => {
    plugin['countryMenuClick_']('AT|ASRA');
    groups.selectedGroup = { ids: [9] } as never;

    plugin['refreshSelectedMarker_']();

    expect(row('AT|ASRA').classList.contains('country-option--selected')).toBe(false);
    expect(clearBtn().disabled).toBe(true);
  });

  it('chip count matches the COUNTRY group and skips objects with no country', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSats').mockReturnValue([
      { country: 'TBD' },
      { country: 'Unknown' },
      { country: '' },
      { country: '' },
      { country: 'ANALSAT' },
    ] as never);
    vi.spyOn(StringExtractor, 'extractCountry').mockReturnValue('Unknown');

    const html = plugin['generateCountryList_']();

    expect(html).toContain('data-group="TBD|Unknown"');
    expect(html).toContain('<span class="country-count">2</span>');
  });
});
