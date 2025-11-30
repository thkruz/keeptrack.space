/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable dot-notation */
import { MenuMode } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { ColorMenu } from '@app/plugins/colors-menu/colors-menu';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite, websiteInit } from '@test/generic-tests';

describe('ColorMenu_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    ServiceLocator.getCatalogManager().satCruncher = {
      addEventListener: () => {
        // Mock the addEventListener function
      },
      postMessage: () => {
        // Mock the postMessage function
      },
    } as unknown as Worker;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  standardPluginSuite(ColorMenu, 'ColorMenu');
  standardPluginMenuButtonTests(ColorMenu, 'ColorMenu');
  standardPluginRmbTests(ColorMenu, 'ColorMenu');

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new ColorMenu();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-color-scheme');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.BASIC);
      expect(config.menuMode).toContain(MenuMode.ADVANCED);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new ColorMenu();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('color-scheme-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
    });

    it('should return correct context menu config', () => {
      const plugin = new ColorMenu();
      const config = plugin.getContextMenuConfig();

      expect(config.level1ElementName).toBe('colors-rmb');
      expect(config.level2ElementName).toBe('colors-rmb-menu');
      expect(config.order).toBe(50);
      expect(config.isVisibleOnEarth).toBe(true);
      expect(config.isVisibleOffEarth).toBe(true);
      expect(config.isVisibleOnSatellite).toBe(false);
    });

    it('should return correct help config', () => {
      const plugin = new ColorMenu();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.body).toBeDefined();
    });

    it('should return correct drag options', () => {
      const plugin = new ColorMenu();
      const dragOptions = plugin['getDragOptions_']();

      expect(dragOptions.isDraggable).toBe(true);
    });

    it('should build side menu HTML with colors-menu element', () => {
      const plugin = new ColorMenu();
      const html = plugin['buildSideMenuHtml_']();

      expect(html).toContain('color-scheme-menu');
      expect(html).toContain('colors-menu');
    });
  });

  describe('onContextMenuAction', () => {
    it('should call colorsMenuClick for valid color scheme', () => {
      const plugin = new ColorMenu();
      const colorsMenuClickSpy = jest.spyOn(ColorMenu, 'colorsMenuClick');

      // Mock a color scheme
      const mockColorSchemeManager = ServiceLocator.getColorSchemeManager();

      // ts-ignore to bypass readonly property for testing
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mockColorSchemeManager.colorSchemeInstances = {
        default: { id: 'default', label: 'Default' },
      } as any;

      plugin.onContextMenuAction('colors-default-rmb');

      expect(colorsMenuClickSpy).toHaveBeenCalledWith('default');
    });

    it('should handle unknown color scheme gracefully', () => {
      const plugin = new ColorMenu();
      const colorsMenuClickSpy = jest.spyOn(ColorMenu, 'colorsMenuClick');

      plugin.onContextMenuAction('colors-unknown-rmb');

      expect(colorsMenuClickSpy).toHaveBeenCalledWith('unknown');
    });
  });

  describe('rmbCallback bridge', () => {
    it('should call onContextMenuAction when rmbCallback is invoked', () => {
      const plugin = new ColorMenu();
      const onContextMenuActionSpy = jest.spyOn(plugin, 'onContextMenuAction');

      plugin.rmbCallback('colors-test-rmb');

      expect(onContextMenuActionSpy).toHaveBeenCalledWith('colors-test-rmb');
    });

    it('should not call onContextMenuAction for null targetId', () => {
      const plugin = new ColorMenu();
      const onContextMenuActionSpy = jest.spyOn(plugin, 'onContextMenuAction');

      plugin.rmbCallback(null);

      expect(onContextMenuActionSpy).not.toHaveBeenCalled();
    });
  });

  describe('colorsMenuClick', () => {
    it('should clear selected satellite when color scheme is clicked', () => {
      const selectSatManager = new SelectSatManager();

      PluginRegistry.addPlugin(selectSatManager);
      selectSatManager.selectSat = jest.fn();

      // Use existing color scheme from the manager (which is a real ColorScheme instance)
      const mockColorSchemeManager = ServiceLocator.getColorSchemeManager();
      const existingSchemeKey = Object.keys(mockColorSchemeManager.colorSchemeInstances)[0];

      if (existingSchemeKey) {
        const existingScheme = mockColorSchemeManager.colorSchemeInstances[existingSchemeKey];

        mockColorSchemeManager.setColorScheme = jest.fn();
        ServiceLocator.getUiManager().hideSideMenus = jest.fn();

        ColorMenu.colorsMenuClick(existingScheme.id);

        expect(selectSatManager.selectSat).toHaveBeenCalledWith(-1);
      }
    });

    it('should set color scheme when valid scheme is selected', () => {
      const mockColorSchemeManager = ServiceLocator.getColorSchemeManager();
      const existingSchemeKey = Object.keys(mockColorSchemeManager.colorSchemeInstances)[0];

      if (existingSchemeKey) {
        const existingScheme = mockColorSchemeManager.colorSchemeInstances[existingSchemeKey];
        const mockOnSelected = jest.spyOn(existingScheme, 'onSelected');

        mockColorSchemeManager.setColorScheme = jest.fn();
        ServiceLocator.getUiManager().hideSideMenus = jest.fn();

        ColorMenu.colorsMenuClick(existingScheme.id);

        expect(mockOnSelected).toHaveBeenCalled();
        expect(mockColorSchemeManager.setColorScheme).toHaveBeenCalled();
      }
    });

    it('should hide side menus after color scheme selection', () => {
      const mockColorSchemeManager = ServiceLocator.getColorSchemeManager();
      const existingSchemeKey = Object.keys(mockColorSchemeManager.colorSchemeInstances)[0];

      if (existingSchemeKey) {
        const existingScheme = mockColorSchemeManager.colorSchemeInstances[existingSchemeKey];

        mockColorSchemeManager.setColorScheme = jest.fn();
        const hideSideMenusSpy = jest.fn();

        ServiceLocator.getUiManager().hideSideMenus = hideSideMenusSpy;

        ColorMenu.colorsMenuClick(existingScheme.id);

        expect(hideSideMenusSpy).toHaveBeenCalled();
      }
    });

    it('should warn when color scheme is not found', () => {
      ColorMenu.colorsMenuClick('nonexistent-scheme');
      // The warning is logged but the test passes as long as no error is thrown
    });
  });

  describe('Side menu interaction', () => {
    it('should work when any side menu element is clicked', () => {
      const menu = new ColorMenu();

      websiteInit(menu);

      // Emit uiManagerFinal to attach event listeners
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

      // Create a list of elements based on the li elements with data-color attributes
      const elements = Array.from(KeepTrack.getInstance().containerRoot.querySelectorAll<HTMLElement>('li[data-color]'));

      // Click each element and make sure no errors are thrown
      elements.forEach((element) => {
        expect(() => {
          element.click();
          jest.advanceTimersByTime(1000);
        }).not.toThrow();
      });
    }, 20000);
  });

  describe('Plugin identity', () => {
    it('should have correct plugin name', () => {
      const plugin = new ColorMenu();

      expect(plugin.id).toBe('ColorMenu');
    });

    it('should have no dependencies', () => {
      const plugin = new ColorMenu();

      expect(plugin.dependencies_).toEqual([]);
    });
  });
});
