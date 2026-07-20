import { MenuMode, SolarBody } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PlanetsMenuPlugin } from '@app/plugins/planets-menu/planets-menu';
import { settingsManager } from '@app/settings/settings';
import { setupDefaultHtml } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

// eslint-disable-next-line max-lines-per-function
describe('PlanetsMenuPlugin', () => {
  beforeEach(() => {
    setupDefaultHtml();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(PlanetsMenuPlugin, 'PlanetsMenuPlugin');
  standardPluginMenuButtonTests(PlanetsMenuPlugin, 'PlanetsMenuPlugin');

  describe('Plugin identity', () => {
    it('should have correct plugin name', () => {
      const plugin = new PlanetsMenuPlugin();

      expect(plugin.id).toBe(PlanetsMenuPlugin.name);
    });

    it('should have no dependencies', () => {
      const plugin = new PlanetsMenuPlugin();

      expect(plugin.dependencies_).toEqual([]);
    });
  });

  describe('Configuration methods', () => {
    it('should return correct bottom icon config', () => {
      const plugin = new PlanetsMenuPlugin();
      const config = plugin.getBottomIconConfig();

      expect(config.elementName).toBe('menu-planets');
      expect(config.image).toBeDefined();
      expect(config.menuMode).toContain(MenuMode.DISPLAY);
      expect(config.menuMode).toContain(MenuMode.ALL);
    });

    it('should return correct side menu config', () => {
      const plugin = new PlanetsMenuPlugin();
      const config = plugin.getSideMenuConfig();

      expect(config.elementName).toBe('planets-menu');
      expect(config.dragOptions?.isDraggable).toBe(true);
      expect(config.dragOptions?.minWidth).toBe(320);
      expect(config.dragOptions?.maxWidth).toBe(400);
    });

    it('should return correct help config', () => {
      const plugin = new PlanetsMenuPlugin();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.title).toBeDefined();
      expect(helpConfig.sections!.length).toBeGreaterThan(0);
    });

    it('should return keyboard shortcuts with p and Home keys', () => {
      const plugin = new PlanetsMenuPlugin();
      const shortcuts = plugin.getKeyboardShortcuts();

      expect(shortcuts).toHaveLength(3);
      expect(shortcuts[0].key).toBe('p');
      expect(shortcuts[0].callback).toBeInstanceOf(Function);
      expect(shortcuts[1].key).toBe('Home');
      expect(shortcuts[1].shift).toBe(true);
      expect(shortcuts[2].key).toBe('Home');
      expect(shortcuts[2].shift).toBe(false);
    });

    it('should return drag options with min and max width', () => {
      const plugin = new PlanetsMenuPlugin();
      const dragOptions = plugin.getDragOptions_();

      expect(dragOptions.isDraggable).toBe(true);
      expect(dragOptions.minWidth).toBe(320);
      expect(dragOptions.maxWidth).toBe(400);
    });
  });

  describe('Side menu HTML', () => {
    it('should contain section headers', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('Planets');
      expect(menuHtml).toContain('Dwarf Planets');
      expect(menuHtml).toContain('Other Celestial Bodies');
    });

    it('should include planet entries with data-planet attributes', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('data-planet="Mercury"');
      expect(menuHtml).toContain('data-planet="Venus"');
      expect(menuHtml).toContain('data-planet="Earth"');
      expect(menuHtml).toContain('data-planet="Mars"');
    });

    it('should mark unsupported moons as disabled', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('planets-menu-disabled');
      expect(menuHtml).toContain('Planned for future update.');
    });
  });

  describe('changePlanet', () => {
    it('should reject invalid planet names', () => {
      const plugin = new PlanetsMenuPlugin();

      // Should return without error for unknown planet
      expect(() => plugin.changePlanet('InvalidPlanet' as SolarBody)).not.toThrow();
    });

    it('should reject planned (not-yet-loaded) bodies before touching the scene', () => {
      const plugin = new PlanetsMenuPlugin();
      const sceneSpy = vi.spyOn(ServiceLocator, 'getScene');

      // Io is listed but planned; the guard must return before any ServiceLocator use.
      expect(() => plugin.changePlanet(SolarBody.Io)).not.toThrow();
      expect(sceneSpy).not.toHaveBeenCalled();
    });
  });

  describe('getCommandPaletteCommands', () => {
    it('exposes a toggle command plus one center command per selectable body', () => {
      const plugin = new PlanetsMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();
      const ids = commands.map((c) => c.id);

      expect(ids).toContain('PlanetsMenuPlugin.toggleMenu');
      expect(ids).toContain(`PlanetsMenuPlugin.center.${SolarBody.Earth}`);
      expect(ids).toContain(`PlanetsMenuPlugin.center.${SolarBody.Moon}`);
      // Planned bodies must not get a command.
      expect(ids).not.toContain(`PlanetsMenuPlugin.center.${SolarBody.Io}`);
    });

    it('does not invoke a planned-body center command path', () => {
      const plugin = new PlanetsMenuPlugin();
      const commands = plugin.getCommandPaletteCommands();
      const earthCmd = commands.find((c) => c.id === `PlanetsMenuPlugin.center.${SolarBody.Earth}`);

      plugin.changePlanet = vi.fn();
      settingsManager.isDisablePlanets = true;
      earthCmd?.callback();
      expect(plugin.changePlanet).not.toHaveBeenCalled();
      settingsManager.isDisablePlanets = false;
    });
  });

  describe('planetsMenuClick', () => {
    it('should delegate to changePlanet', () => {
      const plugin = new PlanetsMenuPlugin();

      plugin.changePlanet = vi.fn();

      plugin.planetsMenuClick('Jupiter');
      expect(plugin.changePlanet).toHaveBeenCalledWith(SolarBody.Jupiter);
    });

    it('should do nothing when planets are disabled', () => {
      settingsManager.isDisablePlanets = true;
      const plugin = new PlanetsMenuPlugin();

      plugin.changePlanet = vi.fn();

      plugin.planetsMenuClick('Jupiter');
      expect(plugin.changePlanet).not.toHaveBeenCalled();
      settingsManager.isDisablePlanets = false;
    });
  });

  describe('Lifecycle', () => {
    it('should register uiManagerFinal handler on addHtml', () => {
      const plugin = new PlanetsMenuPlugin();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uiFinalSpy = vi.spyOn(plugin as any, 'uiManagerFinal_').mockImplementation(() => undefined);
      const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

      plugin.addHtml();

      expect(onSpy).toHaveBeenCalledWith(EventBusEvent.uiManagerFinal, expect.any(Function));
      expect(uiFinalSpy).not.toHaveBeenCalled();
    });

    it('should have bottomIconCallback as no-op', () => {
      const plugin = new PlanetsMenuPlugin();

      expect(() => plugin.bottomIconCallback()).not.toThrow();
    });

    it('should register endOfDraw handler on addHtml', () => {
      const plugin = new PlanetsMenuPlugin();
      const onSpy = vi.spyOn(EventBus.getInstance(), 'on');

      plugin.addHtml();

      expect(onSpy).toHaveBeenCalledWith(EventBusEvent.endOfDraw, expect.any(Function));
    });
  });

  describe('Planets disabled behavior', () => {
    afterEach(() => {
      settingsManager.isDisablePlanets = false;
    });

    describe('Init-time disable', () => {
      it('should disable and hide bottom icon in uiManagerFinal when planets disabled at init', () => {
        settingsManager.isDisablePlanets = true;
        const plugin = new PlanetsMenuPlugin();

        plugin.addHtml();

        const disableSpy = vi.spyOn(plugin, 'setBottomIconToDisabled').mockImplementation(() => undefined);
        const hideSpy = vi.spyOn(plugin, 'hideBottomIcon');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (plugin as any).uiManagerFinal_();

        expect(disableSpy).toHaveBeenCalled();
        expect(hideSpy).toHaveBeenCalled();
      });
    });

    describe('Runtime disable', () => {
      it('should disable bottom icon when planets are disabled at runtime', () => {
        settingsManager.isDisablePlanets = false;
        const plugin = new PlanetsMenuPlugin();

        plugin.addHtml();

        const disableSpy = vi.spyOn(plugin, 'setBottomIconToDisabled').mockImplementation(() => undefined);

        settingsManager.isDisablePlanets = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (plugin as any).checkPlanetsDisabledState_();

        expect(disableSpy).toHaveBeenCalled();
      });

      it('should re-enable bottom icon when planets are re-enabled at runtime', () => {
        settingsManager.isDisablePlanets = true;
        const plugin = new PlanetsMenuPlugin();

        plugin.addHtml();

        const enableSpy = vi.spyOn(plugin, 'setBottomIconToEnabled').mockImplementation(() => undefined);

        settingsManager.isDisablePlanets = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (plugin as any).checkPlanetsDisabledState_();

        expect(enableSpy).toHaveBeenCalled();
      });

      it('should not toggle state when isDisablePlanets has not changed', () => {
        settingsManager.isDisablePlanets = false;
        const plugin = new PlanetsMenuPlugin();

        plugin.addHtml();

        const disableSpy = vi.spyOn(plugin, 'setBottomIconToDisabled');
        const enableSpy = vi.spyOn(plugin, 'setBottomIconToEnabled');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (plugin as any).checkPlanetsDisabledState_();

        expect(disableSpy).not.toHaveBeenCalled();
        expect(enableSpy).not.toHaveBeenCalled();
      });
    });

    describe('Interaction guards', () => {
      it('should not throw when bottomIconCallback called with planets disabled', () => {
        settingsManager.isDisablePlanets = true;
        const plugin = new PlanetsMenuPlugin();

        expect(() => plugin.bottomIconCallback()).not.toThrow();
      });

      it('should not execute keyboard shortcut when planets disabled', () => {
        settingsManager.isDisablePlanets = true;
        const plugin = new PlanetsMenuPlugin();

        plugin.changePlanet = vi.fn();

        const shortcuts = plugin.getKeyboardShortcuts();

        shortcuts[0].callback();
        expect(plugin.changePlanet).not.toHaveBeenCalled();
      });

      it('should block showBottomIcon when planets disabled', () => {
        settingsManager.isDisablePlanets = true;
        const plugin = new PlanetsMenuPlugin();
        const superSpy = vi.spyOn(Object.getPrototypeOf(PlanetsMenuPlugin.prototype), 'showBottomIcon');

        plugin.showBottomIcon();

        expect(superSpy).not.toHaveBeenCalled();
      });
    });
  });
});
