import { CameraType } from '@app/engine/camera/camera-type';
import { MenuMode, SolarBody } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  IContextMenuConfig,
  IDragOptions,
  IHelpConfig,
  IKeyboardShortcut,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { CelestialBody } from '@app/engine/rendering/draw-manager/celestial-bodies/celestial-body';
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';
import planetPng from '@public/img/icons/planet.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import './planets-menu.css';

export class PlanetsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'PlanetsMenuPlugin';
  dependencies_ = [];

  private t_(key: string): string {
    return t7e(`plugins.PlanetsMenuPlugin.${key}` as Parameters<typeof t7e>[0]);
  }

  private isPlanetsDisabled_ = false;

  PLANETS = [SolarBody.Mercury, SolarBody.Venus, SolarBody.Earth, SolarBody.Mars, SolarBody.Jupiter, SolarBody.Saturn, SolarBody.Uranus, SolarBody.Neptune];
  DWARF_PLANETS = [SolarBody.Pluto, SolarBody.Makemake, SolarBody.Eris, SolarBody.Haumea, SolarBody.Ceres, SolarBody.Sedna, SolarBody.Quaoar, SolarBody.Orcus, SolarBody.Gonggong, SolarBody.Charon];
  OTHER_CELESTIAL_BODIES = [
    SolarBody.Moon, SolarBody.Sun, SolarBody.Io, SolarBody.Europa, SolarBody.Ganymede,
    SolarBody.Callisto, SolarBody.Titan, SolarBody.Rhea, SolarBody.Iapetus, SolarBody.Dione, SolarBody.Tethys, SolarBody.Enceladus,
  ];

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
      shortcuts: [
        { keys: ['P'], description: this.t_('help.shortcutToggle') },
        { keys: ['Home'], description: this.t_('help.shortcutHome') },
        { keys: ['Shift', 'Home'], description: this.t_('help.shortcutCenterEarth') },
      ],
    };
  }

  /** Translated display name for a solar body. */
  private bodyName_(body: string): string {
    return this.t_(`bodies.${body}`);
  }

  getContextMenuConfig(): IContextMenuConfig {
    const visible = !settingsManager.isDisablePlanets;

    return {
      level1ElementName: 'planets-rmb',
      level1Html: html`<li class="rmb-menu-item" id="planets-rmb"><a href="#">${t7e('plugins.PlanetsMenuPlugin.bottomIconLabel')} &#x27A4;</a></li>`,
      level2ElementName: 'planets-rmb-menu',
      level2Html: html`<ul class='dropdown-contents'>${this.buildRmbL2Html_()}</ul>`,
      order: 70,
      isVisibleOnEarth: visible,
      isVisibleOffEarth: visible,
    };
  }

  onContextMenuAction(targetId: string): void {
    if (settingsManager.isDisablePlanets) {
      return;
    }

    // Convert 'planets-Moon-rmb' to 'Moon'
    if (targetId.startsWith('planets-') && targetId.endsWith('-rmb')) {
      targetId = targetId.slice(8, -4);
    }
    this.changePlanet(targetId as SolarBody ?? SolarBody.Earth);
  }

  rmbCallback: (targetId: string | null, clickedSat?: number) => void = (targetId: string | null) => {
    if (targetId) {
      this.onContextMenuAction(targetId);
    }
  };

  getKeyboardShortcuts(): IKeyboardShortcut[] {
    return [
      {
        key: 'p',
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
        callback: () => {
          if (settingsManager.isDisablePlanets) {
            return;
          }
          settingsManager.centerBody = SolarBody.Earth;
          settingsManager.minZoomDistance = RADIUS_OF_EARTH + 50 as Kilometers;
          settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
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
    let html_ = html`
        <ul>`;

    const centerTooltip = (body: string) => this.t_('tooltips.centerCamera').replace('{body}', body);

    html_ += html`
      <h5 class="center-align side-menu-row-header">${this.t_('sections.planets')}</h5>
    `;

    for (const object of this.PLANETS) {
      html_ += `<li class="menu-selectable" kt-tooltip="${centerTooltip(this.bodyName_(object))}" data-planet="${object}">${this.bodyName_(object)}</li>`;
    }

    html_ += html`
      <div class="divider flow5out"></div>
      <h5 class="center-align side-menu-row-header">${this.t_('sections.dwarfPlanets')}</h5>
    `;

    for (const object of this.DWARF_PLANETS) {
      html_ += `<li class="menu-selectable" kt-tooltip="${centerTooltip(this.bodyName_(object))}" data-planet="${object}">${this.bodyName_(object)}</li>`;
    }

    html_ += html`
      <div class="divider flow5out"></div>
      <h5 class="center-align side-menu-row-header">${this.t_('sections.otherCelestialBodies')}</h5>
    `;

    for (const object of this.OTHER_CELESTIAL_BODIES) {
      const isDisabled = ['Io', 'Europa', 'Ganymede', 'Callisto', 'Titan', 'Rhea', 'Iapetus', 'Dione', 'Tethys', 'Enceladus'].includes(object);

      if (isDisabled) {
        html_ += `<li class="planets-menu-disabled" kt-tooltip="${this.t_('tooltips.plannedFuture')}" aria-disabled="true" disabled>${this.bodyName_(object)}</li>`;
      } else {
        html_ += `<li class="menu-selectable" kt-tooltip="${centerTooltip(this.bodyName_(object))}" data-planet="${object}">${this.bodyName_(object)}</li>`;
      }
    }

    html_ += html`
        </ul>`;

    return html_;
  }

  private buildRmbL2Html_(): string {
    let html_ = '';

    for (const planet of this.PLANETS) {
      html_ += `<li id="planets-${planet}-rmb"><a href="#">${this.bodyName_(planet)}</a></li>`;
      if (planet === SolarBody.Earth) {
        html_ += `<li id="planets-${SolarBody.Moon}-rmb"><a href="#">${this.bodyName_(SolarBody.Moon)}</a></li>`;
      }
    }

    return html_;
  }

  changePlanet(planetName: SolarBody) {
    if (
      !this.PLANETS.includes(planetName) &&
      !this.DWARF_PLANETS.includes(planetName) &&
      !this.OTHER_CELESTIAL_BODIES.includes(planetName)
    ) {
      return;
    }

    if (planetName === SolarBody.Earth || planetName === SolarBody.Moon) {
      ServiceLocator.getLineManager().clear();
    }

    const catalogManager = ServiceLocator.getCatalogManager();

    ServiceLocator.getDotsManager().updateSizeBuffer(catalogManager.objectCache.length);

    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);
    settingsManager.centerBody = planetName;
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    ServiceLocator.getUiManager().hideSideMenus();

    if (planetName === SolarBody.Sun) {
      this.drawOrbits_(planetName);
      settingsManager.minZoomDistance = 62e6 as Kilometers; // 62 million km
      settingsManager.maxZoomDistance = 1.5e10 as Kilometers; // 15 billion km
      this.setAllPlanetsDotSize(1);
    } else if (planetName === SolarBody.Earth) {
      settingsManager.minZoomDistance = RADIUS_OF_EARTH + 50 as Kilometers;
      settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
      this.setAllPlanetsDotSize(0);
    } else if (planetName === SolarBody.Moon) {
      const scene = ServiceLocator.getScene();
      const selectedPlanet = scene.moons.Moon;

      selectedPlanet.useHighestQualityTexture();
      settingsManager.minZoomDistance = selectedPlanet.RADIUS * 1.2 as Kilometers;
      settingsManager.maxZoomDistance = 1.2e6 as Kilometers; // 1.2 million km
      this.setAllPlanetsDotSize(0);
    } else {
      // Anything but Earth, Moon or Sun
      this.drawOrbits_(planetName);
      const scene = ServiceLocator.getScene();
      const selectedPlanet = scene.getBodyById(planetName);

      if (!selectedPlanet) {
        console.error(`Planet ${planetName} not found in scene.`);

        return;
      }

      selectedPlanet.useHighestQualityTexture();
      settingsManager.minZoomDistance = selectedPlanet.RADIUS * 1.2 as Kilometers;
      settingsManager.maxZoomDistance = 1.3e10 as Kilometers; // 13 billion km
      this.setAllPlanetsDotSize(1);
    }
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

    getEl('planets-menu')
      ?.querySelectorAll('li')
      .forEach((element) => {
        element.addEventListener('click', () => {
          const planetName = element.dataset.planet;

          if (!planetName) {
            return;
          }

          this.planetsMenuClick(planetName);
        });
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
    this.setContextMenuVisibility_(false);
  }

  private runtimeEnableForPlanetsOn_(): void {
    this.setBottomIconToEnabled();
    if (this.menuMode.includes(settingsManager.activeMenuMode)) {
      this.showBottomIcon();
    }
    this.setContextMenuVisibility_(true);
  }

  private setContextMenuVisibility_(visible: boolean): void {
    const menuItem = ServiceLocator.getInputManager()?.rmbMenuItems.find(
      (item) => item.elementIdL1 === 'planets-rmb',
    );

    if (menuItem) {
      menuItem.isRmbOnEarth = visible;
      menuItem.isRmbOffEarth = visible;
    }
  }

  private drawOrbits_(planetName: SolarBody) {
    // NOTE: Don't use changePlanet() here to avoid infinite loop
    settingsManager.centerBody = SolarBody.Sun; // Temporarily set to Sun to draw orbits relative to Sun

    const scene = ServiceLocator.getScene();
    const gl = ServiceLocator.getRenderer().gl;
    const moon = scene.getBodyById(SolarBody.Moon)!;

    moon.isDrawOrbitPath = true;
    moon.drawFullOrbitPath();
    moon.planetObject?.setHoverDotSize(gl, 1);

    for (const planetBody of this.PLANETS.filter((p) => p !== SolarBody.Moon)) {
      const planet = scene.getBodyById(planetBody) as CelestialBody;

      if (!planet) {
        continue;
      }

      planet.isDrawOrbitPath = true;
      planet.drawFullOrbitPath();
    }
    for (const dwarfPlanetBody of this.DWARF_PLANETS) {
      const dwarfPlanet = scene.getBodyById(dwarfPlanetBody) as CelestialBody;

      if (!dwarfPlanet) {
        continue;
      }

      dwarfPlanet.isDrawOrbitPath = true;
      dwarfPlanet.drawFullOrbitPath();
    }
    this.setAllPlanetsDotSize(1);

    settingsManager.centerBody = planetName; // Set back to selected planet
  }

  setAllPlanetsDotSize(size = 1): void {
    const scene = ServiceLocator.getScene();
    const gl = ServiceLocator.getRenderer().gl;
    const moon = scene.getBodyById(SolarBody.Moon)!;
    const earth = scene.getBodyById(SolarBody.Earth)!;

    moon.planetObject?.setHoverDotSize(gl, size);
    earth.planetObject?.setHoverDotSize(gl, size);

    for (const planetBody of this.PLANETS) {
      const planet = scene.getBodyById(planetBody) as CelestialBody;

      planet?.planetObject?.setHoverDotSize(gl, size);
    }

    for (const dwarfPlanetBody of this.DWARF_PLANETS) {
      const dwarfPlanet = scene.getBodyById(dwarfPlanetBody as SolarBody) as CelestialBody;

      dwarfPlanet?.planetObject?.setHoverDotSize(gl, size);
    }

    for (const otherBody of this.OTHER_CELESTIAL_BODIES) {
      const otherCelestialBody = scene.getBodyById(otherBody as SolarBody) as CelestialBody;

      otherCelestialBody?.planetObject?.setHoverDotSize(gl, size);
    }

  }

  planetsMenuClick = (planetName: string) => {
    this.onContextMenuAction(planetName);
  };

  bottomIconCallback = (): void => {
    // No-op: side menu is opened by the base class
  };
}
