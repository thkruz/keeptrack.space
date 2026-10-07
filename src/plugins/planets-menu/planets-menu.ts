import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode, SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCapable,
  ICommandPaletteCommand,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { allPlanetMoons, isInPlanetSystem, parentPlanetOf } from '@app/engine/rendering/draw-manager/celestial-bodies/planet-moon-systems';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';
import planetPng from '@public/img/icons/planet.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  allBodies,
  asteroids,
  DWARF_PLANETS,
  displayGroups,
  isKnownBody,
  isPlanned,
  isSelectableBody,
  moons,
  OTHER_CELESTIAL_BODIES,
  PLANETS,
  satellitesOf,
} from './planets-bodies';
import { getBodyViewConfig } from './planets-core';
import './planets-menu.css';

export class PlanetsMenuPlugin extends KeepTrackPlugin implements ICommandPaletteCapable {
  readonly id = 'PlanetsMenuPlugin';
  dependencies_ = [];

  private t_(key: string): string {
    return t7e(`plugins.PlanetsMenuPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  private isPlanetsDisabled_ = false;

  // Body taxonomy is owned by planets-bodies.ts; these aliases keep the existing
  // references terse and let the scene-iterating helpers below read naturally.
  PLANETS = PLANETS;
  DWARF_PLANETS = DWARF_PLANETS;

  OTHER_CELESTIAL_BODIES = OTHER_CELESTIAL_BODIES;

  /**
   * Getters, unlike their neighbours, because both sets are contributed content registered
   * before the plugins load - and a plain field would snapshot whatever existed when this
   * plugin was constructed. See `body-registry.ts`.
   */
  get MOONS(): readonly SolarBody[] {
    return moons();
  }

  get ASTEROIDS(): readonly SolarBody[] {
    return asteroids();
  }

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: 'menu-planets',
      label: t7e('plugins.PlanetsMenuPlugin.bottomIconLabel'),
      image: planetPng,
      menuMode: [MenuMode.DISPLAY, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: 'planets-menu',
      title: t7e('plugins.PlanetsMenuPlugin.title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: this.getDragOptions_(),
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.PlanetsMenuPlugin.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: this.t_('help.overview'),
          image: {
            src: 'img/help/planets-menu/planets-menu.png',
            alt: this.t_('help.imgAlt'),
            caption: this.t_('help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: this.t_('help.howToUse'),
        },
      ],
      tips: [this.t_('help.tip1'), this.t_('help.tip2')],
    };
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    const category = t7e('plugins.PlanetsMenuPlugin.bottomIconLabel');
    const commands: ICommandPaletteCommand[] = [
      {
        id: 'PlanetsMenuPlugin.toggleMenu',
        label: this.t_('commands.toggleMenu'),
        category,
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
            return;
          }
          this.bottomMenuClicked();
        },
      },
    ];

    for (const body of allBodies()) {
      if (!isSelectableBody(body)) {
        continue;
      }
      commands.push({
        id: `PlanetsMenuPlugin.center.${body}`,
        label: this.t_('commands.centerOn').replace('{body}', this.bodyName_(body)),
        category,
        callback: () => {
          if (settingsManager.isDisablePlanets) {
            return;
          }
          this.changePlanet(body);
        },
      });
    }

    return commands;
  }

  /** Translated display name for a solar body. */
  private bodyName_(body: string): string {
    return this.t_(`bodies.${body}`);
  }

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'p',
        description: this.t_('help.shortcutToggle'),
        callback: () => {
          if (ServiceLocator.getMainCamera().cameraType === CameraType.FPS) {
            return;
          }
          this.bottomMenuClicked();
        },
      },
      {
        key: 'Home',
        shift: true,
        // ctrl:false so Ctrl+Home stays exclusively Sensor List's snap shortcut.
        ctrl: false,
        description: this.t_('help.shortcutCenterEarth'),
        callback: () => {
          if (settingsManager.isDisablePlanets) {
            return;
          }
          this.changePlanet(SolarBody.Earth);
        },
      },
      {
        key: 'Home',
        shift: false,
        // ctrl:false so Ctrl+Home stays exclusively Sensor List's snap shortcut.
        ctrl: false,
        description: this.t_('help.shortcutHome'),
        callback: () => {
          if (settingsManager.isDisablePlanets) {
            return;
          }
          settingsManager.centerBody = SolarBody.Earth;
          settingsManager.minZoomDistance = (RADIUS_OF_EARTH + 50) as Kilometers;
          settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
          // Same reason as in changePlanet: nothing else notices maxZoomDistance moved.
          this.refreshCatalogVisibility_();
        },
      },
    ];
  }

  private getDragOptions_(): IDragOptions {
    return {
      isDraggable: true,
      minWidth: 320,
      maxWidth: 400,
    };
  }

  private buildSideMenuHtml_(): string {
    return html`
      <div class="planets-filter">
        <input id="planets-filter-input" type="text" class="planets-filter-input"
          placeholder="${this.t_('filterPlaceholder')}" autocomplete="off" spellcheck="false" />
      </div>
      ${displayGroups()
        .map((group) => this.buildSectionHtml_(group.key, group.bodies))
        .join('')}
    `;
  }

  /**
   * One card: a group heading, its primary bodies in order outward from the Sun, and each
   * body's moons indented directly beneath it.
   */
  private buildSectionHtml_(sectionKey: string, bodies: readonly SolarBody[]): string {
    let rows = '';

    for (const body of bodies) {
      rows += this.buildBodyRowHtml_(body, false);
      for (const moon of satellitesOf(body)) {
        rows += this.buildBodyRowHtml_(moon, true);
      }
    }

    return html`
      <section class="kt-section">
        <div class="kt-section-label">${this.t_(`sections.${sectionKey}`)}</div>
        <div class="planets-section-list">${rows}</div>
      </section>
    `;
  }

  /**
   * A single body row. `isSatellite` indents it under the body above, which is what turns a
   * flat 30-row list into a readable hierarchy.
   */
  private buildBodyRowHtml_(body: SolarBody, isSatellite: boolean): string {
    const name = this.bodyName_(body);
    const filterKey = name.toLowerCase();
    const satelliteClass = isSatellite ? ' planets-menu-satellite' : '';

    if (isPlanned(body)) {
      return (
        `<button type="button" class="kt-action planets-menu-disabled${satelliteClass}" kt-tooltip="${this.t_('tooltips.plannedFuture')}" ` +
        `data-planet-name="${filterKey}" aria-disabled="true" disabled><span class="kt-action-label">${name}</span></button>`
      );
    }

    const centerTooltip = this.t_('tooltips.centerCamera').replace('{body}', name);

    return (
      `<button type="button" class="kt-action waves-effect planets-menu-item${satelliteClass}" kt-tooltip="${centerTooltip}" ` +
      `data-planet="${body}" data-planet-name="${filterKey}"><span class="kt-action-label">${name}</span></button>`
    );
  }

  /**
   * Upgrade a moon's planet to its own highest-quality texture alongside the moon.
   *
   * Selecting a moon frames it a few radii out, and from there the planet fills a large part
   * of the sky - Jupiter is about 20 degrees across from Io, and Mars is wider than that from
   * Phobos. But the planet is still on whatever tier it was last drawn at, which is usually
   * the low one it was given as a distant dot, and at that range the blur is the first thing
   * you notice.
   *
   * Driven by the body's own `parentBody` rather than the roster in `planet-moon-systems.ts`:
   * it is the moon object's own declaration of what it orbits, so it cannot disagree with
   * where the moon is actually drawn. It covers Earth's Moon, the planet moons, and Charon -
   * Earth's own upgrade is a no-op, since Earth always loads its highest tier first, but
   * routing it through the same path means a future Earth with real tiers needs no change here.
   */
  private upgradeParentTexture_(body: CelestialBody | null): void {
    const parent = body?.parentBody;

    if (!parent) {
      return;
    }

    ServiceLocator.getScene().getBodyById(parent)?.useHighestQualityTexture();
  }

  changePlanet(planetName: SolarBody) {
    // Reject unknown bodies and bodies that are listed but not yet loaded.
    if (!isKnownBody(planetName) || isPlanned(planetName)) {
      return;
    }

    const scene = ServiceLocator.getScene();

    // Resolve the body object (and radius) up front; Earth and Sun do not need it.
    let selectedBody: CelestialBody | null = null;

    if (planetName !== SolarBody.Earth && planetName !== SolarBody.Sun) {
      selectedBody = scene.getBodyById(planetName) as CelestialBody | null;
      if (!selectedBody) {
        return;
      }
    }

    /*
     * zoomFloorRadiusKm, not RADIUS: for an irregular body the mean radius is smaller than its
     * longest axis, and the surface-zoom floor is a multiple of whatever it is handed.
     */
    const view = getBodyViewConfig(planetName, (selectedBody?.zoomFloorRadiusKm ?? 0) as Kilometers);

    // Usage signal for telemetry: which bodies people actually visit. Emitted after the
    // guards so rejected/unloaded bodies never count.
    EventBus.getInstance().emit(EventBusEvent.celestialBodySelected, planetName);

    if (view.clearLines) {
      ServiceLocator.getLineManager().clear();
    }

    const catalogManager = ServiceLocator.getCatalogManager();
    const camera = ServiceLocator.getMainCamera();

    ServiceLocator.getDotsManager().updateSizeBuffer(catalogManager.objectCache.length);
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    /*
     * Freeze the view that is on screen before the scene re-centers, so the camera blends across
     * to the new body the way selecting a satellite blends across to it. Everything below is a
     * one-frame jump otherwise: centerBody moves the world origin and the zoom limits change what
     * the (unchanged) zoom level means.
     */
    camera.beginCenterBodyTransition();
    // A pan offset from the old view would shove the new body off center.
    camera.state.panCurrent = { x: 0, y: 0, z: 0 };

    settingsManager.centerBody = planetName;
    camera.cameraType = CameraType.FIXED_TO_EARTH;
    ServiceLocator.getUiManager().hideSideMenus();

    if (view.useHighestQualityTexture) {
      selectedBody?.useHighestQualityTexture();
      this.upgradeParentTexture_(selectedBody);
    }
    if (view.drawOrbits) {
      this.drawOrbits_(planetName);
    }

    settingsManager.minZoomDistance = view.minZoom;
    settingsManager.maxZoomDistance = view.maxZoom;
    // Frame the body itself. Must follow the zoom limits above - they define the curve.
    camera.snapZoomToDistance(view.framingDistance);
    this.setAllPlanetsDotSize(view.dotSize);
    this.refreshCatalogVisibility_();

    this.updateActiveBody_();
  }

  /**
   * Force a recolor after `maxZoomDistance` changes, so the Earth catalog appears or
   * disappears with the view.
   *
   * The color schemes already blank every GP/TLE object once `maxZoomDistance` passes 2e6 km
   * - the marker for "this view is not about Earth orbit" - but neither the main-thread rule
   * nor the color worker re-reads that value on its own. Without this call the rule simply
   * never fired from the Planets menu: measured at the Sun view, 900 million km out, all
   * 52,590 satellites were still being drawn, smeared across a single pixel in front of the
   * solar system.
   */
  private refreshCatalogVisibility_(): void {
    ServiceLocator.getColorSchemeManager().calculateColorBuffers(true);
  }

  showBottomIcon(): void {
    if (settingsManager.isDisablePlanets) {
      return;
    }
    super.showBottomIcon();
  }

  addHtml(): void {
    super.addHtml();
    this.isPlanetsDisabled_ = settingsManager.isDisablePlanets;
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));
    EventBus.getInstance().on(EventBusEvent.endOfDraw, this.checkPlanetsDisabledState_.bind(this));
  }

  private uiManagerFinal_(): void {
    if (this.isPlanetsDisabled_) {
      this.setBottomIconToDisabled();
      this.hideBottomIcon();
    }

    getEl('planets-menu')?.classList.add('kt-ui-v13');

    const contentEl = getEl('planets-menu-content');

    // One delegated listener for every body row (replaces per-row listeners).
    contentEl?.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('.planets-menu-item');
      const planetName = row?.dataset.planet;

      if (!planetName) {
        return;
      }
      this.planetsMenuClick(planetName);
    });

    const filterEl = getEl('planets-filter-input') as HTMLInputElement | null;

    filterEl?.addEventListener('input', () => this.applyFilter_(filterEl.value));

    this.updateActiveBody_();
  }

  /** Filter the body rows by display name; hide sections that end up empty. */
  private applyFilter_(query: string): void {
    const contentEl = getEl('planets-menu-content');

    if (!contentEl) {
      return;
    }

    const q = query.trim().toLowerCase();

    contentEl.querySelectorAll<HTMLElement>('.kt-action[data-planet-name]').forEach((row) => {
      const match = q === '' || (row.dataset.planetName ?? '').includes(q);

      row.style.display = match ? '' : 'none';
    });

    contentEl.querySelectorAll<HTMLElement>('.kt-section').forEach((section) => {
      const rows = Array.from(section.querySelectorAll<HTMLElement>('.kt-action[data-planet-name]'));
      const anyVisible = rows.some((row) => row.style.display !== 'none');

      section.style.display = anyVisible ? '' : 'none';
    });
  }

  /** Highlight the row matching the currently centered body. */
  private updateActiveBody_(): void {
    const contentEl = getEl('planets-menu-content');

    if (!contentEl) {
      return;
    }

    const active = settingsManager.centerBody;

    contentEl.querySelectorAll<HTMLElement>('.planets-menu-item').forEach((row) => {
      row.classList.toggle('planets-menu-active', row.dataset.planet === active);
    });
  }

  private checkPlanetsDisabledState_(): void {
    const current = settingsManager.isDisablePlanets;

    if (current === this.isPlanetsDisabled_) {
      return;
    }
    this.isPlanetsDisabled_ = current;
    if (current) {
      this.runtimeDisableForPlanetsOff_();
    } else {
      this.runtimeEnableForPlanetsOn_();
    }
  }

  private runtimeDisableForPlanetsOff_(): void {
    if (this.isMenuButtonActive) {
      ServiceLocator.getUiManager().hideSideMenus();
    }
    this.setBottomIconToDisabled();
  }

  private runtimeEnableForPlanetsOn_(): void {
    this.setBottomIconToEnabled();
    if (this.menuMode.includes(settingsManager.activeMenuMode)) {
      this.showBottomIcon();
    }
  }

  /**
   * Draws the full heliocentric orbit paths of the Moon, planets, and dwarf
   * planets, then restores `centerBody` to `restoreCenterBody`. Public because
   * deep-space focusing (focusDeepSpaceSatellite) draws the same context.
   */
  drawHeliocentricOrbits(restoreCenterBody: SolarBody) {
    this.drawOrbits_(restoreCenterBody);
  }

  /**
   * Removes the heliocentric orbit ellipses drawn by {@link drawHeliocentricOrbits}
   * (and by centering on a planet) without touching any other line. Selecting a
   * satellite re-centers the camera on Earth, where the interplanetary rings are
   * meaningless, but the blunt `lineManager.clear()` that changePlanet uses would
   * take unrelated lines (sensor FOVs, user-drawn lines) with it.
   */
  clearHeliocentricOrbits(): void {
    const scene = ServiceLocator.getScene();

    // Same set drawOrbits_ draws, plus the deep-space probes, whose paths the
    // pro missions menu can turn on. The Sun is excluded - it has no orbit path.
    for (const bodyId of [...this.MOONS, ...this.PLANETS, ...this.DWARF_PLANETS, ...this.ASTEROIDS]) {
      scene.getBodyById(bodyId)?.hideFullOrbitPath();
    }

    for (const deepSpaceSat of Object.values(scene.deepSpaceSatellites ?? {})) {
      deepSpaceSat.hideFullOrbitPath();
    }
  }

  private drawOrbits_(planetName: SolarBody) {
    // NOTE: Don't use changePlanet() here to avoid infinite loop
    settingsManager.centerBody = SolarBody.Sun; // Temporarily set to Sun to draw orbits relative to Sun

    const scene = ServiceLocator.getScene();
    const gl = ServiceLocator.getRenderer().gl;
    const moon = scene.getBodyById(SolarBody.Moon);

    if (moon) {
      moon.isDrawOrbitPath = true;
      moon.drawFullOrbitPath();
      moon.planetObject?.setHoverDotSize(gl, 1);
    }

    for (const bodyId of [...this.PLANETS, ...this.DWARF_PLANETS, ...this.ASTEROIDS]) {
      const body = scene.getBodyById(bodyId) as CelestialBody | null;

      if (!body) {
        continue;
      }
      body.isDrawOrbitPath = true;
      body.drawFullOrbitPath();
    }
    this.setAllPlanetsDotSize(1);
    this.updatePlanetMoonOrbits_(planetName);

    settingsManager.centerBody = planetName; // Set back to selected planet
  }

  /**
   * A moon's ring is only drawn from inside its own planet's system. Enceladus's 238,000 km
   * circle is sub-pixel from anywhere else, and unlike the heliocentric paths it has to be
   * resampled to track its planet, so leaving nineteen of them on would be pure cost.
   */
  private updatePlanetMoonOrbits_(planetName: SolarBody): void {
    const scene = ServiceLocator.getScene();

    for (const bodyId of allPlanetMoons()) {
      const body = scene.getBodyById(bodyId) as CelestialBody | null;
      const parent = parentPlanetOf(bodyId);

      if (!body || !parent) {
        continue;
      }

      if (isInPlanetSystem(planetName, parent)) {
        body.isDrawOrbitPath = true;
        body.drawFullOrbitPath();
      } else {
        body.hideFullOrbitPath();
      }
    }
  }

  setAllPlanetsDotSize(size = 1): void {
    const scene = ServiceLocator.getScene();
    const gl = ServiceLocator.getRenderer().gl;

    // Earth lives in PLANETS and every moon in MOONS, so the union already covers
    // them - no need to special-case either.
    for (const bodyId of [...this.PLANETS, ...this.DWARF_PLANETS, ...this.ASTEROIDS, ...this.MOONS, ...this.OTHER_CELESTIAL_BODIES]) {
      const body = scene.getBodyById(bodyId) as CelestialBody | null;

      body?.planetObject?.setHoverDotSize(gl, size);
    }
  }

  planetsMenuClick = (planetName: string) => {
    if (settingsManager.isDisablePlanets) {
      return;
    }
    this.changePlanet(planetName as SolarBody);
  };

  bottomIconCallback = (): void => {
    // Refresh the active-body highlight each time the menu opens (the base
    // class opens the side menu itself).
    this.updateActiveBody_();
  };
}
