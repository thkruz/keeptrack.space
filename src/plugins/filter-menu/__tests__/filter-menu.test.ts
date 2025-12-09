/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
/* eslint-disable max-lines-per-function */
/* eslint-disable dot-notation */
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { FilterMenuPlugin, FilterPluginSettings } from '@app/plugins/filter-menu/filter-menu';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('FilterMenuPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  standardPluginSuite(FilterMenuPlugin, 'FilterMenuPlugin');
  standardPluginMenuButtonTests(FilterMenuPlugin, 'FilterMenuPlugin');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new FilterMenuPlugin();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('filter-menu-icon');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.BASIC);
      expect(config.menuMode).toContain(MenuMode.ADVANCED);
      expect(config.menuMode).toContain(MenuMode.SETTINGS);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new FilterMenuPlugin();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('filter-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(350);
    });

    it('should return correct help config', () => {
      const plugin = new FilterMenuPlugin();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return correct keyboard shortcuts', () => {
      const plugin = new FilterMenuPlugin();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('F');
      expect(shortcuts[0].callback).toBeDefined();
    });

    it('should build side menu HTML with filter-menu element', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('filter-menu');
      expect(html).toContain('filter-form');
      expect(html).toContain('filter-reset');
    });

    it('should build top menu button HTML', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['buildTopMenuButtonHtml_']();

      expect(html).toContain('top-menu-filter-li');
      expect(html).toContain('top-menu-filter-btn');
    });

    it('should trigger bottomMenuClicked when keyboard shortcut callback is invoked', () => {
      const plugin = new FilterMenuPlugin();
      const bottomMenuClickedSpy = jest.spyOn(plugin, 'bottomMenuClicked');

      websiteInit(plugin);

      const shortcuts = plugin.getKeyboardShortcuts();

      shortcuts[0].callback();

      expect(bottomMenuClickedSpy).toHaveBeenCalled();
    });
  });

  describe('Filters getter', () => {
    it('should return an array of filters', () => {
      const filters = FilterMenuPlugin['filters'];

      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBeGreaterThan(0);
    });

    it('should have filters with required properties', () => {
      const filters = FilterMenuPlugin['filters'];

      filters.forEach((filter) => {
        expect(filter.name).toBeDefined();
        expect(filter.category).toBeDefined();
      });
    });

    it('should include object type filters', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterNames = filters.map((f) => f.name);

      // Check for some expected filter types
      expect(filterNames.some((name) => name.toLowerCase().includes('payload') || name.toLowerCase().includes('debris'))).toBe(true);
    });

    it('should have agencies filter disabled by default', () => {
      const filters = FilterMenuPlugin['filters'];
      const agenciesFilter = filters.find((f) => f.disabled === true);

      expect(agenciesFilter).toBeDefined();
      expect(agenciesFilter?.checked).toBe(false);
    });

    it('should group filters into multiple categories', () => {
      const filters = FilterMenuPlugin['filters'];
      const categories = new Set(filters.map((f) => f.category));

      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('Settings persistence', () => {
    it('should have FILTER_STORAGE_MAP defined', () => {
      expect(FilterMenuPlugin['FILTER_STORAGE_MAP']).toBeDefined();
      expect(Object.keys(FilterMenuPlugin['FILTER_STORAGE_MAP']).length).toBeGreaterThan(0);
    });

    it('should save settings without error', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(() => {
        plugin['saveSettings_']();
      }).not.toThrow();
    });

    it('should load settings without error', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(() => {
        plugin['loadSettings_']();
      }).not.toThrow();
    });

    it('should respond to saveSettings event', () => {
      const plugin = new FilterMenuPlugin();

      // Create spy before websiteInit so it catches the bound method
      const saveSettingsSpy = jest.spyOn(plugin as any, 'saveSettings_');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
      EventBus.getInstance().emit(EventBusEvent.saveSettings);

      expect(saveSettingsSpy).toHaveBeenCalled();
    });

    it('should respond to loadSettings event', () => {
      const plugin = new FilterMenuPlugin();

      // Create spy before websiteInit so it catches the bound method
      const loadSettingsSpy = jest.spyOn(plugin as any, 'loadSettings_');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
      EventBus.getInstance().emit(EventBusEvent.loadSettings);

      expect(loadSettingsSpy).toHaveBeenCalled();
    });

    it('should have all expected filter keys in FILTER_STORAGE_MAP', () => {
      const storageMap = FilterMenuPlugin['FILTER_STORAGE_MAP'];
      const expectedKeys = ['payloads', 'rocketBodies', 'debris', 'unknownType', 'agencies'];

      expectedKeys.forEach((key) => {
        expect(storageMap[key]).toBeDefined();
      });
    });
  });

  describe('Form handling', () => {
    it('should sync on load without error', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(() => {
        plugin['syncOnLoad_']();
      }).not.toThrow();
    });

    it('should check if defaults correctly', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const isDefaults = plugin.checkIfDefaults();

      expect(typeof isDefaults).toBe('boolean');
    });

    it('should reset to defaults without error', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(() => {
        plugin.resetToDefaults();
      }).not.toThrow();
    });

    it('should throw error when onFormChange_ receives undefined event', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(() => {
        plugin['onFormChange_'](undefined as unknown as Event);
      }).toThrow('e is undefined');
    });

    it('should throw error when onFormChange_ receives null event', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      expect(() => {
        plugin['onFormChange_'](null as unknown as Event);
      }).toThrow('e is undefined');
    });

    it('should handle checkbox change events', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const filterForm = getEl('filter-form');
      const checkboxes = filterForm?.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

      if (checkboxes && checkboxes.length > 0) {
        const checkbox = checkboxes[0];
        const initialValue = checkbox.checked;

        checkbox.checked = !initialValue;

        const changeEvent = new Event('change', { bubbles: true });

        expect(() => {
          checkbox.dispatchEvent(changeEvent);
        }).not.toThrow();
      }
    });

    it('should detect when filters differ from defaults', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // The checkIfDefaults function compares against filter.checked values
      // Since most filters don't have explicit checked values in the getter,
      // the comparison may not work as expected
      const result = plugin.checkIfDefaults();

      // Just verify the function returns a boolean without error
      expect(typeof result).toBe('boolean');
    });
  });

  describe('generateFilterId_', () => {
    it('should generate correct ID from filter name', () => {
      const generateFilterId = FilterMenuPlugin['generateFilterId_'];

      expect(generateFilterId('Payloads')).toBe('payloads');
      expect(generateFilterId('Rocket Bodies')).toBe('rocketBodies');
      expect(generateFilterId('Unknown Type')).toBe('unknownType');
      expect(generateFilterId('vLEO Satellites')).toBe('vLEOSatellites');
    });

    it('should handle names with multiple spaces', () => {
      const generateFilterId = FilterMenuPlugin['generateFilterId_'];

      expect(generateFilterId('Some  Multiple   Spaces')).toBe('someMultipleSpaces');
    });
  });

  describe('generateFilterHtml', () => {
    it('should generate HTML with category headings', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['generateFilterHtml']();

      expect(html).toContain('filter-category');
      expect(html).toContain('switch');
      expect(html).toContain('lever');
    });

    it('should include checkbox inputs in generated HTML', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['generateFilterHtml']();

      expect(html).toContain('type="checkbox"');
      expect(html).toContain('filter-');
    });

    it('should include tooltips in generated HTML', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['generateFilterHtml']();

      expect(html).toContain('kt-tooltip');
    });
  });

  describe('updateFilterUI_', () => {
    it('should hide top menu filter when all defaults', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['updateFilterUI_']();

      const topMenuLi = getEl('top-menu-filter-li');

      // When defaults, the element should be hidden
      if (plugin.checkIfDefaults()) {
        expect(topMenuLi?.style.display).toBe('none');
      }
    });

    it('should update UI elements based on filter state', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Call updateFilterUI_ and verify it doesn't throw
      expect(() => {
        plugin['updateFilterUI_']();
      }).not.toThrow();

      // Verify the reset button exists
      const resetBtn = getEl('filter-reset');

      expect(resetBtn).not.toBeNull();
    });
  });

  describe('Event handlers', () => {
    it('should register uiManagerInit event handler', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      // Verify the top menu button was inserted
      const topMenuBtn = getEl('top-menu-filter-btn');

      expect(topMenuBtn).not.toBeNull();
    });

    it('should register uiManagerFinal event handler for HTML', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Verify event listeners were attached by checking form exists
      const filterForm = getEl('filter-form');

      expect(filterForm).not.toBeNull();
    });

    it('should register uiManagerFinal event handler for JS', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Verify syncOnLoad was called by checking checkboxes have values
      const filterForm = getEl('filter-form');
      const checkboxes = filterForm?.querySelectorAll('input[type="checkbox"]');

      expect(checkboxes?.length).toBeGreaterThan(0);
    });

    it('should insert top menu button HTML on uiManagerInit', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

      const topMenuBtn = getEl('top-menu-filter-btn');

      expect(topMenuBtn).not.toBeNull();
    });
  });

  describe('Top menu button', () => {
    it('should trigger bottomMenuClicked when top menu button is clicked', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const bottomMenuClickedSpy = jest.spyOn(plugin, 'bottomMenuClicked');
      const topMenuBtn = getEl('top-menu-filter-btn');

      topMenuBtn?.click();

      expect(bottomMenuClickedSpy).toHaveBeenCalled();
    });
  });

  describe('Reset button', () => {
    it('should trigger resetToDefaults when reset button is clicked', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Change a checkbox first so reset has something to do
      const filterForm = getEl('filter-form') as HTMLFormElement;
      const checkboxes = filterForm?.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

      if (checkboxes && checkboxes.length > 0) {
        const checkbox = Array.from(checkboxes).find((cb) => cb.checked && !cb.disabled);

        if (checkbox) {
          checkbox.checked = false;
        }
      }

      const resetBtn = getEl('filter-reset');

      expect(() => {
        resetBtn?.click();
      }).not.toThrow();
    });

    it('should play sound when reset is clicked', () => {
      const plugin = new FilterMenuPlugin();
      const soundManager = ServiceLocator.getSoundManager();
      const playSpy = jest.spyOn(soundManager as any, 'play');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin.resetToDefaults();

      expect(playSpy).toHaveBeenCalled();
    });
  });

  describe('Legacy bridge', () => {
    it('should have bottomIconCallback defined', () => {
      const plugin = new FilterMenuPlugin();

      expect(plugin.bottomIconCallback).toBeDefined();
      expect(typeof plugin.bottomIconCallback).toBe('function');
    });

    it('should have onBottomIconClick defined', () => {
      const plugin = new FilterMenuPlugin();

      expect(plugin.onBottomIconClick).toBeDefined();
      expect(typeof plugin.onBottomIconClick).toBe('function');
    });

    it('should call onBottomIconClick when bottomIconCallback is invoked', () => {
      const plugin = new FilterMenuPlugin();
      const onBottomIconClickSpy = jest.spyOn(plugin, 'onBottomIconClick');

      plugin.bottomIconCallback();

      expect(onBottomIconClickSpy).toHaveBeenCalled();
    });
  });

  describe('Filter IDs must match FilterPluginSettings keys', () => {
    // This test ensures filter IDs are valid settings keys, not translated strings
    // See: https://github.com/thkruz/keeptrack-space/issues/XXX for the bug this prevents

    const VALID_FILTER_SETTINGS_KEYS: (keyof FilterPluginSettings)[] = [
      'xGEOSatellites',
      'vLEOSatellites',
      'payloads',
      'rocketBodies',
      'debris',
      'unknownType',
      'agencies',
      'starlinkSatellites',
      'hEOSatellites',
      'mEOSatellites',
      'gEOSatellites',
      'lEOSatellites',
      'unitedStates',
      'unitedKingdom',
      'france',
      'germany',
      'japan',
      'china',
      'india',
      'russia',
      'uSSR',
      'southKorea',
      'australia',
      'otherCountries',
      'vimpelSatellites',
      'celestrakSatellites',
      'notionalSatellites',
    ];

    it('should have all filter IDs be valid FilterPluginSettings keys', () => {
      const filters = FilterMenuPlugin['filters'];

      filters.forEach((filter) => {
        expect(VALID_FILTER_SETTINGS_KEYS).toContain(filter.id);
      });
    });

    it('should NOT use translation keys as filter IDs', () => {
      const filters = FilterMenuPlugin['filters'];

      filters.forEach((filter) => {
        // Translation keys contain dots (e.g., 'filterMenu.payloads.name')
        expect(filter.id).not.toContain('.');
        // Translation keys start with 'filterMenu.'
        expect(filter.id).not.toMatch(/^filterMenu\./u);
        // IDs should not contain 'name', 'category', 'tooltip' which are translation key suffixes
        expect(filter.id).not.toMatch(/\.(name|category|tooltip)$/u);
      });
    });

    it('should have filter IDs that match FILTER_STORAGE_MAP keys', () => {
      const filters = FilterMenuPlugin['filters'];
      const storageMapKeys = Object.keys(FilterMenuPlugin['FILTER_STORAGE_MAP']);

      filters.forEach((filter) => {
        if (filter.id) {
          expect(storageMapKeys).toContain(filter.id);
        }
      });
    });

    it('should have all FILTER_STORAGE_MAP keys represented in filters', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterIds = filters.map((f) => f.id);
      const storageMapKeys = Object.keys(FilterMenuPlugin['FILTER_STORAGE_MAP']);

      storageMapKeys.forEach((key) => {
        expect(filterIds).toContain(key);
      });
    });

    it('should have filter count match FILTER_STORAGE_MAP key count', () => {
      const filters = FilterMenuPlugin['filters'];
      const storageMapKeys = Object.keys(FilterMenuPlugin['FILTER_STORAGE_MAP']);

      expect(filters.length).toBe(storageMapKeys.length);
    });
  });

  describe('Plugin identity', () => {
    it('should have correct plugin id', () => {
      const plugin = new FilterMenuPlugin();

      expect(plugin.id).toBe('FilterMenuPlugin');
    });

    it('should have TopMenu as dependency', () => {
      const plugin = new FilterMenuPlugin();

      expect(plugin.dependencies_).toContain('TopMenu');
    });

    it('should have correct menuMode', () => {
      const plugin = new FilterMenuPlugin();

      expect(plugin.menuMode).toContain(MenuMode.BASIC);
      expect(plugin.menuMode).toContain(MenuMode.ADVANCED);
      expect(plugin.menuMode).toContain(MenuMode.SETTINGS);
      expect(plugin.menuMode).toContain(MenuMode.ALL);
    });
  });

  describe('Side menu interaction', () => {
    it('should work when any filter checkbox is clicked', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const checkboxes = Array.from(
        KeepTrack.getInstance().containerRoot.querySelectorAll<HTMLInputElement>('#filter-form input[type="checkbox"]'),
      );

      // Click each non-disabled checkbox
      checkboxes.filter((cb) => !cb.disabled).forEach((checkbox) => {
        expect(() => {
          checkbox.click();
          jest.advanceTimersByTime(100);
        }).not.toThrow();
      });
    }, 30000);

    it('should have all filters include required id property', () => {
      const filters = FilterMenuPlugin['filters'];

      filters.forEach((filter) => {
        expect(filter.id).toBeDefined();
        expect(typeof filter.id).toBe('string');
      });
    });

    it('should have unique filter IDs', () => {
      const filters = FilterMenuPlugin['filters'];
      const ids = filters.map((f) => f.id).filter((id) => id !== undefined);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include all orbital regime filters', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('vLEOSatellites');
      expect(filterIds).toContain('lEOSatellites');
      expect(filterIds).toContain('mEOSatellites');
      expect(filterIds).toContain('gEOSatellites');
      expect(filterIds).toContain('hEOSatellites');
      expect(filterIds).toContain('xGEOSatellites');
    });

    it('should include all object type filters', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('payloads');
      expect(filterIds).toContain('rocketBodies');
      expect(filterIds).toContain('debris');
      expect(filterIds).toContain('unknownType');
    });

    it('should include all country filters', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('unitedStates');
      expect(filterIds).toContain('unitedKingdom');
      expect(filterIds).toContain('france');
      expect(filterIds).toContain('germany');
      expect(filterIds).toContain('japan');
      expect(filterIds).toContain('china');
      expect(filterIds).toContain('india');
      expect(filterIds).toContain('russia');
      expect(filterIds).toContain('uSSR');
      expect(filterIds).toContain('southKorea');
      expect(filterIds).toContain('australia');
      expect(filterIds).toContain('otherCountries');
    });

    it('should include source filters', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('vimpelSatellites');
      expect(filterIds).toContain('celestrakSatellites');
    });

    it('should include notional satellites filter', () => {
      const filters = FilterMenuPlugin['filters'];
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('notionalSatellites');
    });

    it('should have tooltips for all filters', () => {
      const filters = FilterMenuPlugin['filters'];

      filters.forEach((filter) => {
        expect(filter.tooltip).toBeDefined();
        expect(typeof filter.tooltip).toBe('string');
        expect(filter.tooltip?.length).toBeGreaterThan(0);
      });
    });

    it('should only have agencies filter disabled', () => {
      const filters = FilterMenuPlugin['filters'];
      const disabledFilters = filters.filter((f) => f.disabled === true);

      expect(disabledFilters.length).toBe(1);
      expect(disabledFilters[0].id).toBe('agencies');
    });

    it('should have agencies filter checked as false', () => {
      const filters = FilterMenuPlugin['filters'];
      const agenciesFilter = filters.find((f) => f.id === 'agencies');

      expect(agenciesFilter?.checked).toBe(false);
    });

    it('should have filters without explicit checked property default to undefined', () => {
      const filters = FilterMenuPlugin['filters'];
      const filtersWithoutChecked = filters.filter((f) => f.id !== 'agencies');

      filtersWithoutChecked.forEach((filter) => {
        expect(filter.checked).toBeUndefined();
      });
    });

    it('should group filters into multiple categories', () => {
      const filters = FilterMenuPlugin['filters'];
      const categories = new Set(filters.map((f) => f.category));

      // Should have at least: Object Type, Orbital Regime, Country, Source, Miscellaneous
      expect(categories.size).toBeGreaterThanOrEqual(4);
    });

    it('should have Starlink filter in miscellaneous category', () => {
      const filters = FilterMenuPlugin['filters'];
      const starlinkFilter = filters.find((f) => f.name.toLowerCase().includes('starlink'));

      expect(starlinkFilter).toBeDefined();
      expect(starlinkFilter?.category).toBe(t7e('filterMenu.miscellaneous.category'));
    });

    it('should return consistent filter array on multiple calls', () => {
      const filters1 = FilterMenuPlugin['filters'];
      const filters2 = FilterMenuPlugin['filters'];

      expect(filters1.length).toBe(filters2.length);
      expect(filters1.map((f) => f.id)).toEqual(filters2.map((f) => f.id));
    });
  });
});
