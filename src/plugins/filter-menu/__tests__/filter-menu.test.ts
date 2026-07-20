/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undefined */
/* eslint-disable max-lines-per-function */
/* eslint-disable max-lines */
/* eslint-disable dot-notation */
import { MenuMode } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { KeepTrack } from '@app/keeptrack';
import { t7e } from '@app/locales/keys';
import { FilterMenuPlugin, FilterPluginSettings } from '@app/plugins/filter-menu/filter-menu';
import { COUNTRY_FILTERS, enableGroup, FILTER_STORAGE_MAP, getFilters, ORBITAL_REGIME_FILTERS, showOnlyInGroup, showOnlyPayloads } from '@app/plugins/filter-menu/filter-menu-core';
import { TopMenu } from '@app/plugins/top-menu/top-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('FilterMenuPlugin_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([TopMenu]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(FilterMenuPlugin, 'FilterMenuPlugin');
  standardPluginMenuButtonTests(FilterMenuPlugin, 'FilterMenuPlugin');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new FilterMenuPlugin();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('filter-menu-icon');
      expect(config.image).toBeDefined();
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
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should return correct keyboard shortcuts', () => {
      const plugin = new FilterMenuPlugin();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].key).toBe('f');
      expect(shortcuts[0].callback).toBeDefined();
    });

    it('should build side menu HTML with filter-form element', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['buildSideMenuHtml_']();

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
      const bottomMenuClickedSpy = vi.spyOn(plugin, 'bottomMenuClicked');

      websiteInit(plugin);

      const shortcuts = plugin.getKeyboardShortcuts();

      shortcuts[0].callback();

      expect(bottomMenuClickedSpy).toHaveBeenCalled();
    });
  });

  describe('Filters getter', () => {
    it('should return an array of filters', () => {
      const filters = getFilters();

      expect(Array.isArray(filters)).toBe(true);
      expect(filters.length).toBeGreaterThan(0);
    });

    it('should have filters with required properties', () => {
      const filters = getFilters();

      filters.forEach((filter) => {
        expect(filter.name).toBeDefined();
        expect(filter.category).toBeDefined();
      });
    });

    it('should include object type filters', () => {
      const filters = getFilters();
      const filterNames = filters.map((f) => f.name);

      // Check for some expected filter types
      expect(filterNames.some((name) => name.toLowerCase().includes('payload') || name.toLowerCase().includes('debris'))).toBe(true);
    });

    it('no longer includes the removed agencies filter', () => {
      const filters = getFilters();

      expect(filters.find((f) => f.id === 'agencies')).toBeUndefined();
    });

    it('should group filters into multiple categories', () => {
      const filters = getFilters();
      const categories = new Set(filters.map((f) => f.category));

      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('Settings persistence', () => {
    it('should have FILTER_STORAGE_MAP defined', () => {
      expect(FILTER_STORAGE_MAP).toBeDefined();
      expect(Object.keys(FILTER_STORAGE_MAP).length).toBeGreaterThan(0);
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
      const saveSettingsSpy = vi.spyOn(plugin as any, 'saveSettings_');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
      EventBus.getInstance().emit(EventBusEvent.saveSettings);

      expect(saveSettingsSpy).toHaveBeenCalled();
    });

    it('should respond to loadSettings event', () => {
      const plugin = new FilterMenuPlugin();

      // Create spy before websiteInit so it catches the bound method
      const loadSettingsSpy = vi.spyOn(plugin as any, 'loadSettings_');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
      EventBus.getInstance().emit(EventBusEvent.loadSettings);

      expect(loadSettingsSpy).toHaveBeenCalled();
    });

    it('should have all expected filter keys in FILTER_STORAGE_MAP', () => {
      const storageMap = FILTER_STORAGE_MAP;
      const expectedKeys = ['operationalPayloads', 'nonOperationalPayloads', 'rocketBodies', 'debris', 'unknownType', 'groundSensors', 'launchFacilities'];

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

    it('should return true when all filters are at defaults', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin.resetToDefaults();

      expect(plugin.checkIfDefaults()).toBe(true);
    });

    it('should return false when a filter differs from defaults', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const debrisCheckbox = getEl('filter-debris') as HTMLInputElement;

      if (debrisCheckbox) {
        // settingsManager.filter is the source of truth, so drive the real change
        // path (a bare DOM mutation no longer counts as a non-default state).
        debrisCheckbox.checked = false;
        debrisCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

        expect(plugin.checkIfDefaults()).toBe(false);
      }
    });
  });

  describe('generateFilterHtml_', () => {
    it('should generate v13 section cards with switch toggles', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['generateFilterHtml_']();

      expect(html).toContain('kt-section');
      expect(html).toContain('kt-section-label');
      expect(html).toContain('switch');
      expect(html).toContain('lever');
    });

    it('should include checkbox inputs in generated HTML', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['generateFilterHtml_']();

      expect(html).toContain('type="checkbox"');
      expect(html).toContain('filter-');
    });

    it('should include tooltips in generated HTML', () => {
      const plugin = new FilterMenuPlugin();
      const html = plugin['generateFilterHtml_']();

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

      const bottomMenuClickedSpy = vi.spyOn(plugin, 'bottomMenuClicked');
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
      const playSpy = vi.spyOn(soundManager as any, 'play');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin.resetToDefaults();

      expect(playSpy).toHaveBeenCalled();
    });
  });

  describe('Filter IDs must match FilterPluginSettings keys', () => {
    // This test ensures filter IDs are valid settings keys, not translated strings
    // See: https://github.com/thkruz/keeptrack-space/issues/XXX for the bug this prevents

    const VALID_FILTER_SETTINGS_KEYS: (keyof FilterPluginSettings)[] = [
      'xGEOSatellites',
      'vLEOSatellites',
      'operationalPayloads',
      'nonOperationalPayloads',
      'rocketBodies',
      'debris',
      'unknownType',
      'groundSensors',
      'launchFacilities',
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
      'celestrakSupSatellites',
      'satnogsSatellites',
      'notionalSatellites',
    ];

    it('should have all filter IDs be valid FilterPluginSettings keys', () => {
      const filters = getFilters();

      filters.forEach((filter) => {
        expect(VALID_FILTER_SETTINGS_KEYS).toContain(filter.id);
      });
    });

    it('should NOT use translation keys as filter IDs', () => {
      const filters = getFilters();

      filters.forEach((filter) => {
        // Translation keys contain dots (e.g., 'filterMenu.payloads.name')
        expect(filter.id).not.toContain('.');
        // Translation keys start with 'filterMenu.'
        expect(filter.id).not.toMatch(/^filterMenu\./u);
        // IDs should not contain 'name', 'category', 'tooltip' which are translation key suffixes
        expect(filter.id).not.toMatch(/\.(?<suffix>name|category|tooltip)$/u);
      });
    });

    it('should have filter IDs that match FILTER_STORAGE_MAP keys', () => {
      const filters = getFilters();
      const storageMapKeys = Object.keys(FILTER_STORAGE_MAP);

      filters.forEach((filter) => {
        if (filter.id) {
          expect(storageMapKeys).toContain(filter.id);
        }
      });
    });

    it('should have all FILTER_STORAGE_MAP keys represented in filters', () => {
      const filters = getFilters();
      const filterIds = filters.map((f) => f.id);
      const storageMapKeys = Object.keys(FILTER_STORAGE_MAP);

      storageMapKeys.forEach((key) => {
        expect(filterIds).toContain(key);
      });
    });

    it('should have filter count match FILTER_STORAGE_MAP key count', () => {
      const filters = getFilters();
      const storageMapKeys = Object.keys(FILTER_STORAGE_MAP);

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

    it('should have correct menuMode in bottom icon config', () => {
      const plugin = new FilterMenuPlugin();
      const config = plugin.getBottomIconConfig();

      expect(config.menuMode).toContain(MenuMode.SETTINGS);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });
  });

  describe('Side menu interaction', () => {
    it('should work when any filter checkbox is clicked', () => {
      vi.useFakeTimers();
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const checkboxes = Array.from(KeepTrack.getInstance().containerRoot.querySelectorAll<HTMLInputElement>('#filter-form input[type="checkbox"]'));

      // Click each non-disabled checkbox
      checkboxes
        .filter((cb) => !cb.disabled)
        .forEach((checkbox) => {
          expect(() => {
            checkbox.click();
            vi.advanceTimersByTime(100);
          }).not.toThrow();
        });
      // Restore fake timers to avoid leaking real timers to other test files
      vi.useFakeTimers();
    }, 30000);

    it('should have all filters include required id property', () => {
      const filters = getFilters();

      filters.forEach((filter) => {
        expect(filter.id).toBeDefined();
        expect(typeof filter.id).toBe('string');
      });
    });

    it('should have unique filter IDs', () => {
      const filters = getFilters();
      const ids = filters.map((f) => f.id).filter((id) => id !== undefined);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include all orbital regime filters', () => {
      const filters = getFilters();
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('vLEOSatellites');
      expect(filterIds).toContain('lEOSatellites');
      expect(filterIds).toContain('mEOSatellites');
      expect(filterIds).toContain('gEOSatellites');
      expect(filterIds).toContain('hEOSatellites');
      expect(filterIds).toContain('xGEOSatellites');
    });

    it('should include all object type filters', () => {
      const filters = getFilters();
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('operationalPayloads');
      expect(filterIds).toContain('nonOperationalPayloads');
      expect(filterIds).toContain('rocketBodies');
      expect(filterIds).toContain('debris');
      expect(filterIds).toContain('unknownType');
      expect(filterIds).toContain('groundSensors');
      expect(filterIds).toContain('launchFacilities');
    });

    it('should include all country filters', () => {
      const filters = getFilters();
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
      const filters = getFilters();
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('vimpelSatellites');
      expect(filterIds).toContain('celestrakSatellites');
    });

    it('should include notional satellites filter', () => {
      const filters = getFilters();
      const filterIds = filters.map((f) => f.id);

      expect(filterIds).toContain('notionalSatellites');
    });

    it('should have tooltips for all filters', () => {
      const filters = getFilters();

      filters.forEach((filter) => {
        expect(filter.tooltip).toBeDefined();
        expect(typeof filter.tooltip).toBe('string');
        expect(filter.tooltip?.length).toBeGreaterThan(0);
      });
    });

    it('should not have any disabled filters', () => {
      const filters = getFilters();
      const disabledFilters = filters.filter((f) => f.disabled === true);

      expect(disabledFilters.length).toBe(0);
    });

    it('should have filters without explicit checked property default to undefined', () => {
      const filters = getFilters();
      const filtersWithExplicitChecked = new Set(['groundSensors', 'launchFacilities']);
      const filtersWithoutChecked = filters.filter((f) => !filtersWithExplicitChecked.has(f.id!));

      filtersWithoutChecked.forEach((filter) => {
        expect(filter.checked).toBeUndefined();
      });
    });

    it('should group filters into multiple categories', () => {
      const filters = getFilters();
      const categories = new Set(filters.map((f) => f.category));

      // Should have at least: Object Type, Orbital Regime, Country, Source, Miscellaneous
      expect(categories.size).toBeGreaterThanOrEqual(4);
    });

    it('should have Starlink filter in miscellaneous category', () => {
      const filters = getFilters();
      const starlinkFilter = filters.find((f) => f.name.toLowerCase().includes('starlink'));

      expect(starlinkFilter).toBeDefined();
      expect(starlinkFilter?.category).toBe(t7e('filterMenu.miscellaneous.category'));
    });

    it('should return consistent filter array on multiple calls', () => {
      const filters1 = getFilters();
      const filters2 = getFilters();

      expect(filters1.length).toBe(filters2.length);
      expect(filters1.map((f) => f.id)).toEqual(filters2.map((f) => f.id));
    });
  });

  describe('Settings persistence on form change', () => {
    it('should call saveSettings_ when a checkbox is changed', () => {
      const plugin = new FilterMenuPlugin();
      const saveSettingsSpy = vi.spyOn(plugin as any, 'saveSettings_');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const checkbox = getEl('filter-debris') as HTMLInputElement;

      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        expect(saveSettingsSpy).toHaveBeenCalled();
      }
    });

    it('should play toggle sound when a checkbox is changed', () => {
      const plugin = new FilterMenuPlugin();
      const soundManager = ServiceLocator.getSoundManager();
      const playSpy = vi.spyOn(soundManager as any, 'play');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const checkbox = getEl('filter-debris') as HTMLInputElement;

      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        expect(playSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Command palette integration', () => {
    it('should return 25 command palette commands', () => {
      const plugin = new FilterMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();

      expect(commands).toBeDefined();
      expect(commands.length).toBe(25);
    });

    it('should have unique command IDs', () => {
      const plugin = new FilterMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();
      const ids = commands.map((c) => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have all original command IDs', () => {
      const plugin = new FilterMenuPlugin();
      const ids = plugin.getCommandPaletteCommands().map((c) => c.id);

      expect(ids).toContain('FilterMenuPlugin.open');
      expect(ids).toContain('FilterMenuPlugin.resetDefaults');
      expect(ids).toContain('FilterMenuPlugin.toggleDebris');
      expect(ids).toContain('FilterMenuPlugin.toggleRocketBodies');
      expect(ids).toContain('FilterMenuPlugin.showOnlyPayloads');
    });

    it('should have toggle commands for individual filters', () => {
      const plugin = new FilterMenuPlugin();
      const ids = plugin.getCommandPaletteCommands().map((c) => c.id);

      expect(ids).toContain('FilterMenuPlugin.toggleUnknownType');
      expect(ids).toContain('FilterMenuPlugin.toggleNotional');
      expect(ids).toContain('FilterMenuPlugin.toggleStarlink');
      expect(ids).toContain('FilterMenuPlugin.toggleLEO');
      expect(ids).toContain('FilterMenuPlugin.toggleMEO');
      expect(ids).toContain('FilterMenuPlugin.toggleGEO');
      expect(ids).toContain('FilterMenuPlugin.toggleHEO');
    });

    it('should have group preset commands', () => {
      const plugin = new FilterMenuPlugin();
      const ids = plugin.getCommandPaletteCommands().map((c) => c.id);

      expect(ids).toContain('FilterMenuPlugin.hideDebrisAndRocketBodies');
      expect(ids).toContain('FilterMenuPlugin.showAllObjectTypes');
      expect(ids).toContain('FilterMenuPlugin.showOnlyLEO');
      expect(ids).toContain('FilterMenuPlugin.showOnlyGEO');
      expect(ids).toContain('FilterMenuPlugin.showAllOrbitalRegimes');
      expect(ids).toContain('FilterMenuPlugin.showOnlyUS');
      expect(ids).toContain('FilterMenuPlugin.showOnlyRussia');
      expect(ids).toContain('FilterMenuPlugin.showOnlyChina');
      expect(ids).toContain('FilterMenuPlugin.showAllCountries');
      expect(ids).toContain('FilterMenuPlugin.hideAllCountries');
    });

    it('should have same category for all commands', () => {
      const plugin = new FilterMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();
      const categories = new Set(commands.map((cmd) => cmd.category));

      expect(categories.size).toBe(1);
      commands.forEach((cmd) => {
        expect(cmd.category).toBeDefined();
        expect(cmd.category.length).toBeGreaterThan(0);
      });
    });

    it('should have shortcut hint on open command', () => {
      const plugin = new FilterMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();
      const openCmd = commands.find((c) => c.id === 'FilterMenuPlugin.open');

      expect(openCmd?.shortcutHint).toBe('F');
    });

    it('should have labels for all commands', () => {
      const plugin = new FilterMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();

      commands.forEach((cmd) => {
        expect(cmd.label).toBeDefined();
        expect(cmd.label.length).toBeGreaterThan(0);
      });
    });

    it('should have callbacks for all commands', () => {
      const plugin = new FilterMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();

      commands.forEach((cmd) => {
        expect(typeof cmd.callback).toBe('function');
      });
    });
  });

  describe('Command palette helpers', () => {
    it('should toggle debris filter via toggleFilter_', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const debrisCheckbox = getEl('filter-debris') as HTMLInputElement;
      const initialState = debrisCheckbox?.checked;

      plugin['toggleFilter_']('debris');

      expect(debrisCheckbox?.checked).toBe(!initialState);
    });

    it('should show only payloads via applyPatch_(showOnlyPayloads())', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['applyPatch_'](showOnlyPayloads());

      expect((getEl('filter-operationalPayloads') as HTMLInputElement)?.checked).toBe(true);
      expect((getEl('filter-nonOperationalPayloads') as HTMLInputElement)?.checked).toBe(true);
      expect((getEl('filter-debris') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-rocketBodies') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-unknownType') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-notionalSatellites') as HTMLInputElement)?.checked).toBe(false);
    });

    it('should not change country/regime filters when showing only payloads', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      const usCheckbox = getEl('filter-unitedStates') as HTMLInputElement;
      const leoCheckbox = getEl('filter-lEOSatellites') as HTMLInputElement;
      const usBefore = usCheckbox?.checked;
      const leoBefore = leoCheckbox?.checked;

      plugin['applyPatch_'](showOnlyPayloads());

      expect(usCheckbox?.checked).toBe(usBefore);
      expect(leoCheckbox?.checked).toBe(leoBefore);
    });

    it('should set multiple filters via applyPatch_', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['applyPatch_']({ debris: false, rocketBodies: false });

      expect((getEl('filter-debris') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-rocketBodies') as HTMLInputElement)?.checked).toBe(false);
    });

    it('should show only one filter in a group via showOnlyInGroup', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['applyPatch_'](showOnlyInGroup('lEOSatellites', ORBITAL_REGIME_FILTERS));

      expect((getEl('filter-lEOSatellites') as HTMLInputElement)?.checked).toBe(true);
      expect((getEl('filter-gEOSatellites') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-mEOSatellites') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-hEOSatellites') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-xGEOSatellites') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-vLEOSatellites') as HTMLInputElement)?.checked).toBe(false);
    });

    it('should enable all filters in a group via enableGroup', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // First disable all orbital regimes
      plugin['applyPatch_'](enableGroup(ORBITAL_REGIME_FILTERS, false));

      expect((getEl('filter-lEOSatellites') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-gEOSatellites') as HTMLInputElement)?.checked).toBe(false);

      // Then re-enable all
      plugin['applyPatch_'](enableGroup(ORBITAL_REGIME_FILTERS, true));

      expect((getEl('filter-lEOSatellites') as HTMLInputElement)?.checked).toBe(true);
      expect((getEl('filter-gEOSatellites') as HTMLInputElement)?.checked).toBe(true);
    });

    it('should show only US objects via showOnlyInGroup with country filters', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['applyPatch_'](showOnlyInGroup('unitedStates', COUNTRY_FILTERS));

      expect((getEl('filter-unitedStates') as HTMLInputElement)?.checked).toBe(true);
      expect((getEl('filter-china') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-russia') as HTMLInputElement)?.checked).toBe(false);
    });

    it('should hide all countries via enableGroup', () => {
      const plugin = new FilterMenuPlugin();

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['applyPatch_'](enableGroup(COUNTRY_FILTERS, false));

      expect((getEl('filter-unitedStates') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-china') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-russia') as HTMLInputElement)?.checked).toBe(false);
      expect((getEl('filter-japan') as HTMLInputElement)?.checked).toBe(false);
    });

    it('should call saveSettings_ when using applyPatch_', () => {
      const plugin = new FilterMenuPlugin();
      const saveSettingsSpy = vi.spyOn(plugin as any, 'saveSettings_');

      websiteInit(plugin);
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      plugin['applyPatch_']({ debris: false });

      expect(saveSettingsSpy).toHaveBeenCalled();
    });
  });
});
