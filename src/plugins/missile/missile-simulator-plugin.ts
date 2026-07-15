import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import {
  IBottomIconConfig,
  ICommandPaletteCommand,
  IHelpConfig,
  ISideMenuConfig,
} from '@app/engine/plugins/core/plugin-capabilities';
import { initMaterialSelects } from '@app/engine/ui/material-select';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { getEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoading } from '@app/engine/utils/showLoading';
import { t7e } from '@app/locales/keys';
import rocketPng from '@public/img/icons/rocket.png';
import {
  ATTACKER_SITES,
  AttackerSite,
  CUSTOM_TARGET_ID,
  TARGET_OPTIONS,
  attackerDesc,
  attackerLat,
  attackerLon,
  attackerRangeKm,
  getAttackerSite,
  targetLat,
  targetLon,
} from './missile-arsenal';
import { missileManager } from './missile-manager';
import './missile-simulator.css';

/** Shorthand for this plugin's locale keys. */
const l = (key: string): string => t7e(`plugins.MissileSimulatorPlugin.${key}` as Parameters<typeof t7e>[0]);

/**
 * Maps a preset "Type of Attack" value to its scripted mass-raid simulation file.
 * Regenerate every file here with `npm run missile:scenarios -- --all` (the ids
 * live in scripts/missile-scenario/scenario-config.ts).
 */
const PRESET_RAIDS: Readonly<Record<number, string>> = {
  1: 'simulation/Exchange_Iran_Israel.json',
  2: 'simulation/Exchange_Russia_Ukraine.json',
  3: 'simulation/Exchange_India_Pakistan.json',
  4: 'simulation/Exchange_USA_Russia.json',
  5: 'simulation/Exchange_USA_China.json',
  6: 'simulation/Exchange_USA_NorthKorea.json',
  7: 'simulation/Exchange_China_India.json',
  8: 'simulation/GlobalThermonuclearWar.json',
};

/** Default warhead (MIRV) count if the user leaves the field at its placeholder. */
const DEFAULT_WARHEADS = 3;

/**
 * Notional ballistic-missile attack simulator.
 *
 * Renamed from `MissilePlugin` so the plugin is no longer confused with the
 * `MissileObject` catalog class: this plugin *drives* the simulation (custom
 * single launches and scripted mass raids); `MissileObject` is the per-missile
 * catalog entry it creates.
 */
export class MissileSimulatorPlugin extends KeepTrackPlugin {
  readonly id = 'MissileSimulatorPlugin';
  dependencies_ = [];

  /** Is the currently selected launch site a submarine / mobile launcher (user supplies lat/lon). */
  private isSub_: boolean = false;

  // =========================================================================
  // Composition-based configuration methods
  // =========================================================================

  getBottomIconConfig(): IBottomIconConfig {
    return {
      elementName: `${this.id}-bottom-icon`,
      label: l('bottomIconLabel'),
      image: rocketPng,
      menuMode: [MenuMode.CREATE, MenuMode.ALL],
    };
  }

  getSideMenuConfig(): ISideMenuConfig {
    return {
      elementName: `${this.id}-menu`,
      title: l('title'),
      html: this.buildSideMenuHtml_(),
      dragOptions: {
        isDraggable: true,
      },
    };
  }

  getHelpConfig(): IHelpConfig {
    return {
      title: l('title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: l('help.overview'),
          image: {
            src: 'img/help/missile/missile-menu.png',
            alt: l('help.imgAlt'),
            caption: l('help.imgCaption'),
          },
        },
        {
          heading: l('help.typesHeading'),
          content: l('help.types'),
        },
        {
          heading: t7e('help.howToUse'),
          content: l('help.howToUse'),
        },
      ],
      tips: [l('help.tip1'), l('help.tip2'), l('help.tip3')],
    };
  }

  /** Build the grouped `<optgroup>`/`<option>` markup for the launch-site select from the arsenal registry. */
  private static buildAttackerOptionsHtml_(): string {
    let out = '';
    let currentGroup = '';

    for (const site of ATTACKER_SITES) {
      if (site.groupKey !== currentGroup) {
        if (currentGroup) {
          out += '</optgroup>';
        }
        out += `<optgroup label="${l(`groups.${site.groupKey}`)}">`;
        currentGroup = site.groupKey;
      }
      out += `<option value="${site.id}">${l(`attackers.${site.labelKey}`)}</option>`;
    }
    if (currentGroup) {
      out += '</optgroup>';
    }

    return out;
  }

  /** Build the grouped target `<option>` markup from the arsenal registry (custom impact is ungrouped). */
  private static buildTargetOptionsHtml_(): string {
    let out = '';
    let currentGroup = '';

    for (const target of TARGET_OPTIONS) {
      const group = target.groupKey ?? '';

      if (group !== currentGroup) {
        if (currentGroup) {
          out += '</optgroup>';
        }
        currentGroup = group;
        if (group) {
          out += `<optgroup label="${l(`groups.${group}`)}">`;
        }
      }
      const label = target.label ?? l(`targets.${target.labelKey}`);

      out += `<option value="${target.id}">${label}</option>`;
    }
    if (currentGroup) {
      out += '</optgroup>';
    }

    return out;
  }

  private buildSideMenuHtml_(): string {
    return html`
    <div id="${this.id}-menu" class="side-menu-parent start-hidden kt-ui-v13">
      <div id="${this.id}-content" class="side-menu">
        <div class="row">
          <form id="${this.id}-menu-form" class="col s12">
            <section class="kt-section">
              <div class="kt-section-label">${l('sections.attackType')}</div>
              <div class="kt-field-row">
                <div class="input-field col s12">
                  <select id="ms-type">
                    <option value="0">${l('types.customMissile')}</option>
                    <optgroup label="${l('typeGroups.regional')}">
                      <option value="1">${l('types.exchangeIranIsrael')}</option>
                      <option value="2">${l('types.exchangeRussiaUkraine')}</option>
                      <option value="3">${l('types.exchangeIndiaPakistan')}</option>
                    </optgroup>
                    <optgroup label="${l('typeGroups.exchanges')}">
                      <option value="4">${l('types.exchangeUsaRussia')}</option>
                      <option value="5">${l('types.exchangeUsaChina')}</option>
                      <option value="6">${l('types.exchangeUsaNorthKorea')}</option>
                      <option value="7">${l('types.exchangeChinaIndia')}</option>
                      <option value="8">${l('types.globalThermonuclearWar')}</option>
                    </optgroup>
                  </select>
                  <label>${l('labels.typeOfAttack')}</label>
                </div>
              </div>
            </section>
            <div id="ms-custom-opt">
              <section class="kt-section">
                <div class="kt-section-label">${l('sections.launch')}</div>
                <div class="kt-field-row">
                  <div class="input-field col s12">
                    <select id="ms-attacker">
                      ${MissileSimulatorPlugin.buildAttackerOptionsHtml_()}
                    </select>
                    <label>${l('labels.launchLocation')}</label>
                  </div>
                </div>
                <div class="kt-field-row" id="ms-lau-holder-lat">
                  <div class="input-field col s12">
                    <input placeholder="00.000" id="ms-lat-lau" type="text" maxlength="8" />
                    <label for="ms-lat-lau" class="active">${l('labels.customLaunchLatitude')}</label>
                  </div>
                </div>
                <div class="kt-field-row" id="ms-lau-holder-lon">
                  <div class="input-field col s12">
                    <input placeholder="00.000" id="ms-lon-lau" type="text" maxlength="8" />
                    <label for="ms-lon-lau" class="active">${l('labels.customLaunchLongitude')}</label>
                  </div>
                </div>
              </section>
              <section class="kt-section">
                <div class="kt-section-label">${l('sections.target')}</div>
                <div class="kt-field-row">
                  <div class="input-field col s12">
                    <select id="ms-target">
                      ${MissileSimulatorPlugin.buildTargetOptionsHtml_()}
                    </select>
                    <label>${l('labels.targetLocation')}</label>
                  </div>
                </div>
                <div class="kt-field-row" id="ms-tgt-holder-lat">
                  <div class="input-field col s12">
                    <input placeholder="00.000" id="ms-lat" type="text" maxlength="8" />
                    <label for="ms-lat" class="active">${l('labels.customTargetLatitude')}</label>
                  </div>
                </div>
                <div class="kt-field-row" id="ms-tgt-holder-lon">
                  <div class="input-field col s12">
                    <input placeholder="00.000" id="ms-lon" type="text" maxlength="8" />
                    <label for="ms-lon" class="active">${l('labels.customTargetLongitude')}</label>
                  </div>
                </div>
                <div class="kt-field-row">
                  <div class="input-field col s12">
                    <input id="ms-warheads" type="number" min="1" max="12" step="1" value="${DEFAULT_WARHEADS.toString()}" />
                    <label for="ms-warheads" class="active">${l('labels.warheads')}</label>
                  </div>
                </div>
              </section>
            </div>
            <button id="${this.id}-submit" class="kt-action waves-effect waves-light" type="submit" name="action">
              <span class="kt-action-label">${l('buttons.launchMissileAttack')}</span>
            </button>
            <button id="searchRvBtn" class="kt-action waves-effect waves-light" type="button" name="search">
              <span class="kt-action-label">${l('buttons.showAllMissiles')}</span>
            </button>
            <button id="clearMissilesBtn" class="kt-action waves-effect waves-light" type="button" name="clear">
              <span class="kt-action-label">${l('buttons.clearMissiles')}</span>
            </button>
          </form>
          <div id="ms-status" class="kt-note"></div>
        </div>
      </div>
    </div>
    `;
  }

  onFormSubmit(): void {
    this.missileSubmit_();
  }

  getCommandPaletteCommands(): ICommandPaletteCommand[] {
    return [
      {
        id: 'MissileSimulatorPlugin.open',
        label: l('commands.open'),
        category: 'Simulation',
        callback: () => this.bottomMenuClicked(),
      },
      {
        id: 'MissileSimulatorPlugin.showAllMissiles',
        label: l('commands.showAllMissiles'),
        category: 'Simulation',
        callback: () => this.searchForRvs_(),
        isAvailable: () => missileManager.missilesInUse > 0,
      },
      {
        id: 'MissileSimulatorPlugin.clearMissiles',
        label: l('commands.clearMissiles'),
        category: 'Simulation',
        callback: () => this.clearMissiles_(),
        isAvailable: () => missileManager.missilesInUse > 0,
      },
    ];
  }

  // =========================================================================
  // Lifecycle methods
  // =========================================================================

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, this.uiManagerFinal_.bind(this));

    // Missile orbits have to be updated every draw or they quickly become inaccurate
    EventBus.getInstance().on(EventBusEvent.updateLoop, this.updateLoop_.bind(this));
  }

  private searchForRvs_ = (): void => {
    ServiceLocator.getUiManager().doSearch('RV_');
  };

  private clearMissiles_ = (): void => {
    missileManager.clearMissiles();
    this.updateStatus_();
  };

  // eslint-disable-next-line max-statements
  private missileSubmit_(): void {
    showLoading(() => {
      const timeManagerInstance = ServiceLocator.getTimeManager();
      const uiManagerInstance = ServiceLocator.getUiManager();

      const type = parseFloat((<HTMLInputElement>getEl('ms-type')).value);
      const launchTime = timeManagerInstance.selectedDate.getTime();

      // Scripted mass-raid preset: load the simulation file and bail out of the custom path.
      if (type !== 0) {
        const sim = PRESET_RAIDS[type];

        if (sim) {
          uiManagerInstance.toast(l('msgs.simLoaded').replace('{sim}', sim), ToastMsgType.standby, true);
          // Handle the rejection here so a missing/misdeployed scenario file surfaces a clear toast
          // and a telemetry error with a real funcName, instead of an unhandled "Unexpected token
          // '<'" promise rejection with no context (the SPA index.html fallback parsed as JSON).
          missileManager.massRaidPre(launchTime, sim).catch((err: unknown) => {
            errorManagerInstance.error(
              err as Error,
              'MissileSimulatorPlugin.massRaidPre',
              l('msgs.simLoadFailed').replace('{sim}', sim),
              { skipAutoFile: true },
            );
          });
        }
        hideLoading();

        return;
      }

      // Custom single-missile launch.
      const site = getAttackerSite(parseFloat((<HTMLInputElement>getEl('ms-attacker')).value));

      if (!site) {
        hideLoading();

        return;
      }

      const target = this.resolveTarget_();

      if (!target) {
        hideLoading();

        return;
      }

      const launch = this.resolveLaunchSite_(site);

      if (!launch) {
        hideLoading();

        return;
      }

      const warheads = this.resolveWarheads_();

      if (warheads === null) {
        hideLoading();

        return;
      }

      if (warheads > 1) {
        // MIRV: one bus, N reentry vehicles fanning out across a footprint. The manager
        // allocates the N catalog slots itself.
        missileManager.createMirvAttack({
          launchLatitude: launch.lat,
          launchLongitude: launch.lon,
          targetLatitude: target.lat,
          targetLongitude: target.lon,
          warheadCount: warheads,
          startTime: launchTime,
          description: attackerDesc(site),
          length: 30,
          diameter: 2.9,
          burnRate: 0.07,
          maxRangeKm: attackerRangeKm(site),
          country: site.country,
          minAltitudeKm: site.minAltKm,
        });
      } else {
        // Single warhead: next free slot in the 500-missile reservation at the catalog tail.
        const slot = ServiceLocator.getCatalogManager().missileSats - (settingsManager.maxMissiles - missileManager.missilesInUse);

        missileManager.createMissile(
          launch.lat,
          launch.lon,
          target.lat,
          target.lon,
          1,
          slot,
          launchTime,
          attackerDesc(site),
          30,
          2.9,
          0.07,
          attackerRangeKm(site),
          site.country,
          site.minAltKm,
        );
      }

      uiManagerInstance.toast(missileManager.lastMissileError, missileManager.lastMissileErrorType);
      // The new missile was just activated in objectCache; nudge the (worker-mode) color worker
      // so it recolors the slot from transparent before the group overlay renders. Without this
      // the orbit overlay skips the missile on alpha and it only appears on hover.
      ServiceLocator.getColorSchemeManager().notifyObjectsChanged();
      uiManagerInstance.doSearch('RV_');
      this.updateStatus_();
      hideLoading();
    });
  }

  /** Resolve the impact point from the target select, validating custom coordinates. Returns null on invalid input. */
  private resolveTarget_(): { lat: number; lon: number } | null {
    const uiManagerInstance = ServiceLocator.getUiManager();
    const targetId = parseFloat((<HTMLInputElement>getEl('ms-target')).value);

    if (targetId === CUSTOM_TARGET_ID) {
      const lat = parseFloat((<HTMLInputElement>getEl('ms-lat')).value);
      const lon = parseFloat((<HTMLInputElement>getEl('ms-lon')).value);

      if (isNaN(lat)) {
        uiManagerInstance.toast(l('errorMsgs.invalidTargetLatitude'), ToastMsgType.critical);

        return null;
      }
      if (isNaN(lon)) {
        uiManagerInstance.toast(l('errorMsgs.invalidTargetLongitude'), ToastMsgType.critical);

        return null;
      }

      return { lat, lon };
    }

    return { lat: targetLat(targetId)!, lon: targetLon(targetId)! };
  }

  /** Resolve the launch coordinates: fixed for silos, user-entered for submarines. Returns null on invalid input. */
  private resolveLaunchSite_(site: AttackerSite): { lat: number; lon: number } | null {
    if (!site.isSub) {
      return { lat: attackerLat(site), lon: attackerLon(site) };
    }

    const uiManagerInstance = ServiceLocator.getUiManager();
    const lat = parseFloat((<HTMLInputElement>getEl('ms-lat-lau')).value);
    const lon = parseFloat((<HTMLInputElement>getEl('ms-lon-lau')).value);

    if (isNaN(lat)) {
      uiManagerInstance.toast(l('errorMsgs.invalidLaunchLatitude'), ToastMsgType.critical);

      return null;
    }
    if (isNaN(lon)) {
      uiManagerInstance.toast(l('errorMsgs.invalidLaunchLongitude'), ToastMsgType.critical);

      return null;
    }

    return { lat, lon };
  }

  /** Read and validate the MIRV warhead count (1-12 integer). Returns null on invalid input. */
  private resolveWarheads_(): number | null {
    const raw = (<HTMLInputElement>getEl('ms-warheads')).value;
    const warheads = raw.trim() === '' ? DEFAULT_WARHEADS : parseInt(raw, 10);

    if (isNaN(warheads) || warheads < 1 || warheads > 12) {
      ServiceLocator.getUiManager().toast(l('errorMsgs.invalidWarheads'), ToastMsgType.critical);

      return null;
    }

    return warheads;
  }

  private uiManagerFinal_(): void {
    const menuRoot = getEl(`${this.id}-menu`);

    getEl('ms-attacker')!.addEventListener('change', this.msAttackerChange_);
    getEl('ms-target')!.addEventListener('change', this.msTargetChange_);
    getEl(`${this.id}-menu-form`)!.addEventListener('change', this.missileChange_);
    getEl('searchRvBtn')!.addEventListener('click', this.searchForRvs_);
    getEl('clearMissilesBtn')!.addEventListener('click', this.clearMissiles_);

    if (menuRoot) {
      initMaterialSelects(menuRoot);
    }

    this.msAttackerChange_();
    this.msTargetChange_();
    this.updateStatus_();
  }

  /** Visible reentry-vehicle count last frame; -1 when no missiles are active. */
  private lastVisibleRvCount_ = -1;

  private updateLoop_(): void {
    if (typeof missileManager === 'undefined' || missileManager.missileArray.length === 0) {
      this.lastVisibleRvCount_ = -1;

      return;
    }

    const orbitManagerInstance = ServiceLocator.getOrbitManager();
    let visibleCount = 0;

    for (const missile of missileManager.missileArray) {
      orbitManagerInstance.updateOrbitBuffer(missile.id);
      if (missile.isVisibleNow()) {
        visibleCount++;
      }
    }

    // MIRV children appear at separation (apogee) and vanish again on rewind, so the
    // set of visible reentry vehicles changes at those moments. When it does, re-run
    // the RV_ search so the results menu tracks the dots (the search filter hides the
    // children until they separate). Only refresh while RV_ is the active search, so
    // a user searching for something else - or a specific RV - is left alone.
    if (visibleCount !== this.lastVisibleRvCount_) {
      this.lastVisibleRvCount_ = visibleCount;

      const searchManager = ServiceLocator.getUiManager().searchManager;

      if (searchManager?.getCurrentSearch().toUpperCase() === 'RV_') {
        searchManager.doSearch('RV_');
      }
    }
  }

  /** Refresh the "N / MAX missiles active" status note and enable/disable the clear button. */
  private updateStatus_(): void {
    const statusEl = getEl('ms-status');

    if (statusEl) {
      statusEl.textContent = l('msgs.missilesActive')
        .replace('{n}', missileManager.missilesInUse.toString())
        .replace('{max}', settingsManager.maxMissiles.toString());
    }

    const clearBtn = getEl('clearMissilesBtn') as HTMLButtonElement | null;

    if (clearBtn) {
      clearBtn.disabled = missileManager.missilesInUse === 0;
    }
  }

  private missileChange_ = (): void => {
    const isPreset = parseFloat((<HTMLInputElement>getEl('ms-type')).value) !== 0;

    getEl('ms-custom-opt')!.style.display = isPreset ? 'none' : 'block';
  };

  private msTargetChange_ = (): void => {
    const isCustom = parseInt((<HTMLInputElement>getEl('ms-target')).value, 10) === CUSTOM_TARGET_ID;

    getEl('ms-tgt-holder-lat')!.style.display = isCustom ? '' : 'none';
    getEl('ms-tgt-holder-lon')!.style.display = isCustom ? '' : 'none';
  };

  private msAttackerChange_ = (): void => {
    const site = getAttackerSite(parseInt((<HTMLInputElement>getEl('ms-attacker')).value, 10));

    this.isSub_ = site?.isSub ?? false;

    getEl('ms-lau-holder-lat')!.style.display = this.isSub_ ? '' : 'none';
    getEl('ms-lau-holder-lon')!.style.display = this.isSub_ ? '' : 'none';
  };
}
