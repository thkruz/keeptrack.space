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
import { html } from '@app/engine/utils/development/formatter';
import { getEl } from '@app/engine/utils/get-el';
import { t7e } from '@app/locales/keys';
import { settingsManager } from '@app/settings/settings';
import { Kilometers, RADIUS_OF_EARTH } from '@ootk/src/main';
import planetPng from '@public/img/icons/planet.png';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import {
  ALL_BODIES,
  BodyCategory,
  DWARF_PLANETS,
  isKnownBody,
  isPlanned,
  isSelectableBody,
  OTHER_CELESTIAL_BODIES,
  PLANETS,
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

    for (const body of ALL_BODIES) {
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
    return html`
      <div class="planets-filter">
        <input id="planets-filter-input" type="text" class="planets-filter-input"
          placeholder="${this.t_('filterPlaceholder')}" autocomplete="off" spellcheck="false" />
      </div>
      ${this.buildSectionHtml_('planets', this.PLANETS)}
      ${this.buildSectionHtml_('dwarfPlanets', this.DWARF_PLANETS)}
      ${this.buildSectionHtml_('otherCelestialBodies', this.OTHER_CELESTIAL_BODIES)}
    `;
  }

  private buildSectionHtml_(sectionKey: BodyCategory, bodies: readonly SolarBody[]): string {
    const centerTooltip = (body: string) => this.t_('tooltips.centerCamera').replace('{body}', body);
    let rows = '';

    for (const body of bodies) {
      const name = this.bodyName_(body);
      const filterKey = name.toLowerCase();

      if (isPlanned(body)) {
        rows += `<button type="button" class="kt-action planets-menu-disabled" kt-tooltip="${this.t_('tooltips.plannedFuture')}" ` +
          `data-planet-name="${filterKey}" aria-disabled="true" disabled><span class="kt-action-label">${name}</span></button>`;
      } else {
        rows += `<button type="button" class="kt-action waves-effect planets-menu-item" kt-tooltip="${centerTooltip(name)}" ` +
          `data-planet="${body}" data-planet-name="${filterKey}"><span class="kt-action-label">${name}</span></button>`;
      }
    }

    return html`
      <section class="kt-section">
        <div class="kt-section-label">${this.t_(`sections.${sectionKey}`)}</div>
        <div class="planets-section-list">${rows}</div>
      </section>
    `;
  }

  changePlanet(planetName: SolarBody) {
    // Reject unknown bodies and bodies that are listed but not yet loaded.
    if (!isKnownBody(planetName) || isPlanned(planetName)) {
      return;
    }

    const scene = ServiceLocator.getScene();

    // Resolve the body object (and radius) up front; Earth and Sun do not need it.
    let selectedBody: CelestialBody | null = null;

    if (planetName === SolarBody.Moon) {
      selectedBody = scene.moons.Moon;
    } else if (planetName !== SolarBody.Earth && planetName !== SolarBody.Sun) {
      selectedBody = scene.getBodyById(planetName) as CelestialBody | null;
      if (!selectedBody) {
        return;
      }
    }

    const view = getBodyViewConfig(planetName, (selectedBody?.RADIUS ?? 0) as Kilometers);

    if (view.clearLines) {
      ServiceLocator.getLineManager().clear();
    }

    const catalogManager = ServiceLocator.getCatalogManager();

    ServiceLocator.getDotsManager().updateSizeBuffer(catalogManager.objectCache.length);
    PluginRegistry.getPlugin(SelectSatManager)?.selectSat(-1);

    settingsManager.centerBody = planetName;
    ServiceLocator.getMainCamera().cameraType = CameraType.FIXED_TO_EARTH;
    ServiceLocator.getUiManager().hideSideMenus();

    if (view.useHighestQualityTexture) {
      selectedBody?.useHighestQualityTexture();
    }
    if (view.drawOrbits) {
      this.drawOrbits_(planetName);
    }

    settingsManager.minZoomDistance = view.minZoom;
    settingsManager.maxZoomDistance = view.maxZoom;
    this.setAllPlanetsDotSize(view.dotSize);

    this.updateActiveBody_();
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

    for (const bodyId of [...this.PLANETS, ...this.DWARF_PLANETS]) {
      const body = scene.getBodyById(bodyId) as CelestialBody | null;

      if (!body) {
        continue;
      }
      body.isDrawOrbitPath = true;
      body.drawFullOrbitPath();
    }
    this.setAllPlanetsDotSize(1);

    settingsManager.centerBody = planetName; // Set back to selected planet
  }

  setAllPlanetsDotSize(size = 1): void {
    const scene = ServiceLocator.getScene();
    const gl = ServiceLocator.getRenderer().gl;

    // Earth lives in PLANETS and Moon in OTHER_CELESTIAL_BODIES, so the union
    // already covers them - no need to special-case either.
    for (const bodyId of [...this.PLANETS, ...this.DWARF_PLANETS, ...this.OTHER_CELESTIAL_BODIES]) {
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
