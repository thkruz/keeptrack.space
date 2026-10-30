import { MenuMode, SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { clearBodyRegistry } from '@app/engine/rendering/draw-manager/celestial-bodies/body-registry';
import { registerMarsMoons } from '@app/engine/rendering/draw-manager/celestial-bodies/mars-moon-catalog';
import { clearPlanetSystems } from '@app/engine/rendering/draw-manager/celestial-bodies/planet-moon-systems';
import { PlanetsMenuPlugin } from '@app/plugins/planets-menu/planets-menu';
import { settingsManager } from '@app/settings/settings';
import { setupDefaultHtml } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

// eslint-disable-next-line max-lines-per-function
describe('PlanetsMenuPlugin', () => {
  beforeEach(() => {
    setupDefaultHtml();
    /*
     * Solar-system bodies are contributed content, so a test that wants any has to register
     * them - the app does it in registerSolarSystemContent() before the plugins load. Only
     * the built-in Mars system is available here; the Solar System Pack's moons and asteroids
     * are asserted in the pack's own tests.
     */
    clearBodyRegistry();
    clearPlanetSystems();
    registerMarsMoons();
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
    it('should contain one card per display group, Sun-outward', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();
      // Order matters: the menu is a tour of the solar system from the Sun outward.
      const headings = ['Star', 'Terrestrial Planets', 'Asteroid Belt', 'Gas Giants', 'Ice Giants', 'Trans-Neptunian Objects'];
      let previousIndex = -1;

      for (const heading of headings) {
        const index = menuHtml.indexOf(`>${heading}<`);

        expect(index).toBeGreaterThan(previousIndex);
        previousIndex = index;
      }
    });

    it('should indent each moon under the body it orbits', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('planets-menu-satellite" kt-tooltip="Center the camera on Moon."');
      // Earth is a top-level row, so its own button must NOT carry the indent class.
      expect(menuHtml).toContain('planets-menu-item" kt-tooltip="Center the camera on Earth."');
      expect(menuHtml.indexOf('data-planet="Earth"')).toBeLessThan(menuHtml.indexOf('data-planet="Moon"'));
      expect(menuHtml.indexOf('data-planet="Moon"')).toBeLessThan(menuHtml.indexOf('data-planet="Mars"'));
    });

    it('should include planet entries with data-planet attributes', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('data-planet="Mercury"');
      expect(menuHtml).toContain('data-planet="Venus"');
      expect(menuHtml).toContain('data-planet="Earth"');
      expect(menuHtml).toContain('data-planet="Mars"');
    });

    it('should list every registered moon as a selectable row', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      // Nothing is merely "planned" any more, so no row may render disabled.
      expect(menuHtml).not.toContain('planets-menu-disabled');
      for (const moon of [SolarBody.Moon, SolarBody.Phobos, SolarBody.Deimos]) {
        expect(menuHtml).toContain(`data-planet="${moon}"`);
      }
    });

    it('omits moons no provider registered', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      for (const moon of [SolarBody.Io, SolarBody.Titan, SolarBody.Oberon, SolarBody.Triton]) {
        expect(menuHtml).not.toContain(`data-planet="${moon}"`);
      }
    });
  });

  describe('Filter', () => {
    const mountMenu = (plugin: PlanetsMenuPlugin): HTMLElement => {
      const content = document.createElement('div');

      content.id = 'planets-menu-content';
      content.innerHTML = plugin.buildSideMenuHtml_();
      // First in document order, so getEl finds it ahead of any side menu an earlier test left behind.
      document.body.prepend(content);

      return content;
    };
    const visibleBodies = (content: HTMLElement): string[] =>
      Array.from(content.querySelectorAll<HTMLElement>('.planets-menu-item'))
        .filter((row) => row.style.display !== 'none')
        .map((row) => row.dataset.planet ?? '');
    const emptyNote = (content: HTMLElement) => content.querySelector<HTMLElement>('#planets-filter-empty');

    afterEach(() => {
      document.getElementById('planets-menu-content')?.remove();
    });

    it("keeps a moon's planet visible when only the moon matches", () => {
      const plugin = new PlanetsMenuPlugin();
      const content = mountMenu(plugin);

      plugin.applyFilter_('phob');

      expect(visibleBodies(content)).toEqual([SolarBody.Mars, SolarBody.Phobos]);
      // Deimos shares the parent but does not match, so it stays hidden.
      expect(visibleBodies(content)).not.toContain(SolarBody.Deimos);
      expect(emptyNote(content)?.style.display).toBe('none');
    });

    it('shows the "No matching bodies" note only when nothing matches', () => {
      const plugin = new PlanetsMenuPlugin();
      const content = mountMenu(plugin);

      // Hidden until a filter is typed.
      expect(emptyNote(content)?.style.display).toBe('none');

      plugin.applyFilter_('zzz');
      expect(visibleBodies(content)).toEqual([]);
      expect(emptyNote(content)?.style.display).toBe('');
      for (const section of Array.from(content.querySelectorAll<HTMLElement>('.kt-section'))) {
        expect(section.style.display).toBe('none');
      }

      plugin.applyFilter_('');
      expect(emptyNote(content)?.style.display).toBe('none');
      expect(visibleBodies(content)).toContain(SolarBody.Earth);
    });

    it('marks each moon row with its parent body', () => {
      const plugin = new PlanetsMenuPlugin();
      const menuHtml = plugin.buildSideMenuHtml_();

      expect(menuHtml).toContain('data-planet="Phobos" data-planet-name="phobos" data-parent="Mars"');
      expect(menuHtml).toContain('data-planet="Mars" data-planet-name="mars">');
    });
  });

  describe('Active-body highlight', () => {
    const mountMenu = (plugin: PlanetsMenuPlugin): HTMLElement => {
      const content = document.createElement('div');

      content.id = 'planets-menu-content';
      content.innerHTML = plugin.buildSideMenuHtml_();
      // First in document order, so getEl finds it ahead of any side menu an earlier test left behind.
      document.body.prepend(content);

      return content;
    };
    const activeBodies = (content: HTMLElement): string[] => Array.from(content.querySelectorAll<HTMLElement>('.planets-menu-active')).map((row) => row.dataset.planet ?? '');

    afterEach(() => {
      document.getElementById('planets-menu-content')?.remove();
      settingsManager.centerBody = SolarBody.Earth;
    });

    it('follows a centerBody change made outside the plugin (satellite pick) on the next frame', () => {
      const plugin = new PlanetsMenuPlugin();
      const content = mountMenu(plugin);

      settingsManager.centerBody = SolarBody.Phobos;
      plugin.updateActiveBody_();
      expect(activeBodies(content)).toEqual([SolarBody.Phobos]);

      // SelectSatManager re-centres on Earth itself, without calling the plugin.
      settingsManager.centerBody = SolarBody.Earth;
      plugin.syncActiveBody_();

      expect(activeBodies(content)).toEqual([SolarBody.Earth]);
    });

    it('does not repaint when the centre body is unchanged', () => {
      const plugin = new PlanetsMenuPlugin();

      mountMenu(plugin);
      plugin.updateActiveBody_();
      const updateSpy = vi.spyOn(plugin as unknown as { updateActiveBody_: () => void }, 'updateActiveBody_');

      plugin.syncActiveBody_();

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('moves the highlight to Earth when Home is pressed', () => {
      const plugin = new PlanetsMenuPlugin();
      const content = mountMenu(plugin);
      const recolorSpy = vi.fn();

      vi.spyOn(ServiceLocator, 'getColorSchemeManager').mockReturnValue({
        calculateColorBuffers: recolorSpy,
      } as unknown as ReturnType<typeof ServiceLocator.getColorSchemeManager>);
      settingsManager.centerBody = SolarBody.Sun;
      plugin.updateActiveBody_();
      expect(activeBodies(content)).toEqual([SolarBody.Sun]);

      const home = plugin.getKeyboardShortcuts().find((shortcut) => shortcut.key === 'Home' && shortcut.shift === false);

      home?.callback();

      expect(settingsManager.centerBody).toBe(SolarBody.Earth);
      expect(recolorSpy).toHaveBeenCalledWith(true);
      expect(activeBodies(content)).toEqual([SolarBody.Earth]);
    });
  });

  describe('Help', () => {
    it('drops the right-click tip (no context menu centres a body)', () => {
      const plugin = new PlanetsMenuPlugin();
      const helpConfig = plugin.getHelpConfig();

      expect(helpConfig.tips).toHaveLength(1);
      expect(helpConfig.tips?.join(' ')).not.toMatch(/right-click/iu);
    });

    it('answers Shift+F1 while its menu is open, like every v13 side menu', () => {
      const plugin = new PlanetsMenuPlugin();

      plugin.init();
      for (const other of PluginRegistry.plugins) {
        other.isMenuButtonActive = false;
      }
      plugin.isMenuButtonActive = true;

      expect(KeepTrackPlugin.resolveHelpTarget()).toBe(plugin);
      plugin.isMenuButtonActive = false;
    });
  });

  describe('changePlanet', () => {
    it('should reject invalid planet names', () => {
      const plugin = new PlanetsMenuPlugin();

      // Should return without error for unknown planet
      expect(() => plugin.changePlanet('InvalidPlanet' as SolarBody)).not.toThrow();
    });

    it('should reject unknown bodies before touching the scene', () => {
      const plugin = new PlanetsMenuPlugin();
      const sceneSpy = vi.spyOn(ServiceLocator, 'getScene');

      // The guard must return before any ServiceLocator use. This is the path a
      // still-planned body would take too, if one is ever added back.
      expect(() => plugin.changePlanet('Nibiru' as SolarBody)).not.toThrow();
      expect(sceneSpy).not.toHaveBeenCalled();
    });
  });

  describe('parent texture upgrade on moon selection', () => {
    /**
     * Selecting a moon frames it a few radii out, which puts its planet across a large part
     * of the sky while the planet is still on the low tier it was given as a distant dot.
     */
    const runWithScene = (selected: unknown) => {
      const upgraded: SolarBody[] = [];

      vi.spyOn(ServiceLocator, 'getScene').mockReturnValue({
        getBodyById: (id: SolarBody) => ({
          useHighestQualityTexture: () => upgraded.push(id),
        }),
      } as unknown as ReturnType<typeof ServiceLocator.getScene>);

      const plugin = new PlanetsMenuPlugin();

      (plugin as unknown as { upgradeParentTexture_: (b: unknown) => void }).upgradeParentTexture_(selected);

      return upgraded;
    };

    it('upgrades the planet a moon orbits', () => {
      expect(runWithScene({ parentBody: SolarBody.Jupiter })).toEqual([SolarBody.Jupiter]);
    });

    it("routes Earth's Moon to Earth like any other moon", () => {
      expect(runWithScene({ parentBody: SolarBody.Earth })).toEqual([SolarBody.Earth]);
    });

    it('does nothing for a body that orbits no planet', () => {
      // Planets, dwarf planets and asteroids declare no parentBody.
      expect(runWithScene({})).toEqual([]);
    });

    it('does nothing when no body resolved', () => {
      expect(runWithScene(null)).toEqual([]);
    });
  });

  describe('clearHeliocentricOrbits', () => {
    it('hides every body orbit path (including probes) without clearing unrelated lines', () => {
      const plugin = new PlanetsMenuPlugin();
      const bodies = new Map<SolarBody, { hideFullOrbitPath: ReturnType<typeof vi.fn> }>();
      const probe = { hideFullOrbitPath: vi.fn() };
      const lineManagerClear = vi.fn();

      vi.spyOn(ServiceLocator, 'getScene').mockReturnValue({
        getBodyById: (id: SolarBody) => {
          if (!bodies.has(id)) {
            bodies.set(id, { hideFullOrbitPath: vi.fn() });
          }

          return bodies.get(id);
        },
        deepSpaceSatellites: { 'Voyager 1': probe },
      } as unknown as ReturnType<typeof ServiceLocator.getScene>);
      vi.spyOn(ServiceLocator, 'getLineManager').mockReturnValue({ clear: lineManagerClear } as unknown as ReturnType<typeof ServiceLocator.getLineManager>);

      plugin.clearHeliocentricOrbits();

      expect(bodies.get(SolarBody.Moon)?.hideFullOrbitPath).toHaveBeenCalled();
      expect(bodies.get(SolarBody.Earth)?.hideFullOrbitPath).toHaveBeenCalled();
      expect(bodies.get(SolarBody.Jupiter)?.hideFullOrbitPath).toHaveBeenCalled();
      expect(bodies.get(SolarBody.Pluto)?.hideFullOrbitPath).toHaveBeenCalled();
      expect(probe.hideFullOrbitPath).toHaveBeenCalled();
      // The Sun has no orbit path, so it must not be walked.
      expect(bodies.has(SolarBody.Sun)).toBe(false);
      // Other lines (sensor FOVs, user-drawn lines) must survive.
      expect(lineManagerClear).not.toHaveBeenCalled();
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
      // Every registered moon gets its own command...
      expect(ids).toContain(`PlanetsMenuPlugin.center.${SolarBody.Phobos}`);
      // ...and moons this build did not register get none.
      expect(ids).not.toContain(`PlanetsMenuPlugin.center.${SolarBody.Enceladus}`);
      // Unknown bodies never do.
      expect(ids).not.toContain('PlanetsMenuPlugin.center.Nibiru');
    });

    it('does not center when the planets toggle is off', () => {
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
