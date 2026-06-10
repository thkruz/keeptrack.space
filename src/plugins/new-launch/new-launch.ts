import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoadingSticky } from '@app/engine/utils/showLoading';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import rocketLaunchPng from '@public/img/icons/rocket-launch.png';

import { SatMath } from '@app/app/analysis/sat-math';

import { CatalogManager } from '@app/app/data/catalog-manager';
import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { launchSites } from '@app/app/data/catalogs/launch-sites';
import { SoundNames } from '@app/engine/audio/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import {
  BaseObject, Degrees,
  FormatTle, KilometersPerSecond,
  OrbitFinder,
  Satellite, SatelliteParams,
  SatelliteRecord, Sgp4, SpaceObjectType,
  TemeVec3,
  TleLine1, TleLine2,
} from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { IHelpConfig } from '../../engine/plugins/core/plugin-capabilities';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';

type T7eKey = Parameters<typeof t7e>[0];

export interface LaunchParams {
  templateSccNum: string;
  launchSiteKey: string;
  launchDirection: 'N' | 'S';
  tle1: string;
  tle2: string;
  name: string;
}

export class NewLaunch extends KeepTrackPlugin {
  readonly id = 'NewLaunch';
  dependencies_ = [SelectSatManager.name];
  protected readonly selectSatManager_: SelectSatManager;
  lastLaunchParams: LaunchParams | null = null;

  constructor() {
    super();
    const selectSatManagerInstance = PluginRegistry.getPlugin(SelectSatManager);

    if (!selectSatManagerInstance) {
      throw new Error('SelectSatManager not found');
    }
    this.selectSatManager_ = selectSatManagerInstance;
  }

  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    if (!this.verifySatelliteSelected()) {
      return;
    }

    const sat = ServiceLocator.getCatalogManager().getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as Satellite;

    // Validate satellite before changing DOM
    if (!(sat instanceof Satellite) || !sat.sccNum || !sat.inclination || isNaN(sat.inclination)) {
      return;
    }

    this.preValidate_(sat);

    (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
    (<HTMLInputElement>getEl('nl-inc')).value = sat.inclination.toFixed(4).padStart(8, '0');
  };

  menuMode: MenuMode[] = [MenuMode.CREATE, MenuMode.ALL];

  bottomIconImg = rocketLaunchPng;
  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'newLaunch-menu';

  getHelpConfig(): IHelpConfig {
    return {
      title: t7e('plugins.NewLaunch.title'),
      sections: [
        {
          heading: t7e('help.overview'),
          content: t7e('plugins.NewLaunch.help.overview'),
          image: {
            src: 'img/help/new-launch/new-launch-menu.png',
            alt: t7e('plugins.NewLaunch.help.imgAlt'),
            caption: t7e('plugins.NewLaunch.help.imgCaption'),
          },
        },
        {
          heading: t7e('help.howToUse'),
          content: t7e('plugins.NewLaunch.help.howToUse'),
        },
        {
          heading: t7e('plugins.NewLaunch.help.limitsHeading'),
          content: t7e('plugins.NewLaunch.help.limits'),
        },
      ],
      tips: [
        t7e('plugins.NewLaunch.help.tip1'),
        t7e('plugins.NewLaunch.help.tip2'),
      ],
    };
  }

  /**
   * Build the grouped launch facility `<select>` options HTML.
   * Extracted as a static method so pro subclasses can reuse it.
   */
  static buildFacilityOptionsHtml(): string {
    // Group launchSites by country
    const grouped: { [country: string]: { key: string; name: string; site: string }[] } = {};

    for (const [key, site] of Object.entries(launchSites)) {
      const country = site.country || 'Other';

      if (!grouped[country]) {
        grouped[country] = [];
      }
      grouped[country].push({ key, name: site.name, site: site.site ?? 'Unknown Site' });
    }

    // Sort countries alphabetically, and sites by name
    const countryKeys = Object.keys(grouped).sort();

    for (const country of countryKeys) {
      grouped[country].sort((a, b) => {
        const siteCompare = a.site.localeCompare(b.site);

        if (siteCompare !== 0) {
          return siteCompare;
        }

        return a.name.localeCompare(b.name);
      });
    }

    return countryKeys.map((country) =>
      `<optgroup label="${country}"> ${grouped[country]
        .map((site) => `<option value="${site.key}">${site.name}<br/> - ${site.site}</option>`).join('\n')}
      </optgroup>`,
    ).join('\n');
  }

  sideMenuElementHtml: string = (() => {
    const optionsHtml = NewLaunch.buildFacilityOptionsHtml();
    const l = (key: string) => t7e(`plugins.NewLaunch.labels.${key}` as T7eKey);

    return html`
      <div id="newLaunch-menu" class="side-menu-parent start-hidden">
        <div id="newLaunch-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">${t7e('plugins.NewLaunch.sideMenuTitle' as T7eKey)}</h5>
            <div class="center-align" style="margin: 0em 0.75em 1.5em 0.75em; color: #888; font-size: 0.95em;">
              ${t7e('plugins.NewLaunch.leoOptimizedNote' as T7eKey)}
            </div>
            <form id="${this.sideMenuElementName}-form" class="col s12">
              <div class="input-field col s12">
                <input disabled value="00005" id="nl-scc" type="text">
                <label for="disabled" class="active">${l('satelliteScc')}</label>
              </div>
              <div class="input-field col s12">
                <input disabled value="50.00" id="nl-inc" type="text">
                <label for="disabled" class="active">${l('inclination')}</label>
              </div>
              <div class="input-field col s12">
                <select value="50.00" id="nl-updown" type="text">
                  <option value="N">${l('north')}</option>
                  <option value="S">${l('south')}</option>
                </select>
                <label for="disabled">${l('launchingNorthOrSouth')}</label>
              </div>
              <div class="input-field col s12" id="nl-launch-menu">
                <select id="nl-facility">
                  ${optionsHtml}
                </select>
                <label>${l('launchFacility')}</label>
              </div>
              <div class="center-align">
                <button
                  id="${this.sideMenuElementName}-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">
                  ${t7e('plugins.NewLaunch.buttons.createLaunchNominal' as T7eKey)} &#9658;
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  })();

  dragOptions: ClickDragOptions = {
    minWidth: 400,
    maxWidth: 600,
    isDraggable: true,
  };

  protected isDoingCalculations_ = false;
  submitCallback: () => void = () => {
    const sccNum = (<HTMLInputElement>getEl('nl-scc')).value.trim();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    // sccNum2Sat accepts the string form directly; parseInt would drop alpha-5/extended.
    const inputSat = catalogManagerInstance.sccNum2Sat(sccNum)!;

    this.executeLaunch_(inputSat);
  };

  /**
   * Core launch execution logic. Finds a nominal satellite slot, creates the
   * nominal satellite, rotates its orbit over the selected launch site, and
   * waits for the position cruncher to process the result.
   *
   * Extracted as a protected method so subclasses can call it with different
   * satellite sources (selected sat, SCC lookup, or custom-built sat).
   */
  protected executeLaunch_(inputSat: Satellite): void {
    if (this.isDoingCalculations_) {
      return;
    }
    this.isDoingCalculations_ = true;

    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();

    showLoadingSticky();

    let nominalSat: Satellite | null = null;
    let id = -1;

    // TODO: Next available analyst satellite should be a function in the catalog manager
    for (let nomninalNumber = 500; nomninalNumber < 2500; nomninalNumber++) {
      nominalSat = catalogManagerInstance.sccNum2Sat(CatalogManager.ANALYST_START_ID + nomninalNumber);

      if (nominalSat && !nominalSat?.active) {
        id = nominalSat.id;
        break;
      }
    }

    if (id === -1 || !nominalSat) {
      uiManagerInstance.toast(t7e('plugins.NewLaunch.errorMsgs.noMoreNominalSatellites' as T7eKey), ToastMsgType.critical);
      this.isDoingCalculations_ = false;
      hideLoading();

      return;
    }

    const sat = this.createNominalSat_(inputSat, nominalSat.sccNum, id);

    if (!sat) {
      this.isDoingCalculations_ = false;
      hideLoading();

      return;
    }

    this.launchFromSite_(sat, id);
  }

  /**
   * Rotate the satellite's orbit over the selected launch site using OrbitFinder,
   * then update the cruncher and wait for propagation results.
   *
   * This is the second half of the launch flow - call it directly when the
   * nominal satellite is already created (e.g. custom orbit mode).
   */
  protected launchFromSite_(sat: Satellite, id: number): void {
    const eMsg = (key: string) => t7e(`plugins.NewLaunch.errorMsgs.${key}` as T7eKey);
    const timeManagerInstance = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    const upOrDown = <'N' | 'S'>(<HTMLInputElement>getEl('nl-updown')).value;
    const launchFac = (<HTMLInputElement>getEl('nl-facility')).value;
    let launchLat: Degrees | null = null;
    let launchLon: Degrees | null = null;

    const launchSite = catalogManagerInstance.launchSites[launchFac];

    launchLat = launchSite.lat;
    launchLon = launchSite.lon;

    if (launchLat === null || launchLon === null) {
      uiManagerInstance.toast(eMsg('launchSiteNotFound').replace('{launchSite}', launchFac), ToastMsgType.critical);

      return;
    }

    if (launchLon > 180) {
      // if West not East
      launchLon = (launchLon - 360) as Degrees; // Convert from 0-360 to -180-180
    }

    /*
     * if (sat.inclination < launchLat) {
     *   uiManagerInstance.toast(`Satellite Inclination Lower than Launch Latitude!`, ToastMsgType.critical);
     *   return;
     * }
     * Set time to 0000z for relative time.
     */
    const today = new Date(); // Need to know today for offset calculation
    const quadZTime = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision

    // Date object defaults to local time.
    quadZTime.setUTCHours(0); // Move to UTC Hour

    const cacheStaticOffset = timeManagerInstance.staticOffset; // Cache the current static offset

    timeManagerInstance.changeStaticOffset(quadZTime.getTime() - today.getTime()); // Find the offset from today

    colorSchemeManagerInstance.calculateColorBuffers(true);

    ServiceLocator.getMainCamera().state.isAutoPitchYawToTarget = false;

    const simulationTimeObj = timeManagerInstance.simulationTimeObj;

    const TLEs = new OrbitFinder(sat, launchLat, launchLon, upOrDown, simulationTimeObj).rotateOrbitToLatLon();

    const tle1 = TLEs[0];
    const tle2 = TLEs[1];

    if (tle1 === 'Error' || tle1.length !== 69 || tle2.length !== 69) {
      if (tle1 === 'Error') {
        uiManagerInstance.toast(eMsg('failedToCreateTle').replace('{error}', tle2), ToastMsgType.critical);
      } else if (tle1.length !== 69) {
        uiManagerInstance.toast(eMsg('invalidTle1Length').replace('{tle}', tle1), ToastMsgType.critical);
      } else if (tle2.length !== 69) {
        uiManagerInstance.toast(eMsg('invalidTle2Length').replace('{tle}', tle2), ToastMsgType.critical);
      }

      // We have to change the time for the TLE creation, but it failed, so revert it.
      timeManagerInstance.changeStaticOffset(cacheStaticOffset);
      this.isDoingCalculations_ = false;
      hideLoading();

      return;
    }

    // Prevent caching of old TLEs
    sat.satrec = null as unknown as SatelliteRecord;

    try {
      sat.editTle(tle1, tle2 as TleLine2);
    } catch (e) {
      errorManagerInstance.error(e, 'new-launch.ts', t7e('plugins.NewLaunch.errorMsgs.errorCreatingSatRecord' as T7eKey));

      return;
    }
    if (SatMath.altitudeCheck(sat.satrec, simulationTimeObj) > 1) {
      this.lastLaunchParams = {
        templateSccNum: sat.sccNum,
        launchSiteKey: launchFac,
        launchDirection: upOrDown,
        tle1,
        tle2,
        name: sat.name,
      };

      catalogManagerInstance.satCruncherThread.sendSatEdit(id, tle1, tle2, true);

      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      if (id) {
        orbitManagerInstance.changeOrbitBufferData(id, tle1, tle2);
      }
    } else {
      uiManagerInstance.toast(eMsg('failedAltitudeTest'), ToastMsgType.critical);
    }

    waitForCruncher({
      cruncher: catalogManagerInstance.satCruncher,
      cb: () => {
        this.isDoingCalculations_ = false;
        hideLoading();

        // Deseletect the satellite
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(sat.id);

        uiManagerInstance.toast(t7e('plugins.NewLaunch.msgs.launchNominalCreated' as T7eKey), ToastMsgType.standby);
        uiManagerInstance.searchManager.doSearch(sat.sccNum);

        uiManagerInstance.toast(t7e('plugins.NewLaunch.msgs.timeRelativeToLaunch' as T7eKey), ToastMsgType.standby);
        ServiceLocator.getSoundManager()?.play(SoundNames.LIFT_OFF);
      },
      validationFunc: (data: PositionCruncherOutgoingMsg) => typeof data.satPos !== 'undefined',
      error: () => {
        if (!this.isDoingCalculations_) {
          // If we are not doing calculations, then it must have finished already.
          return;
        }

        this.isDoingCalculations_ = false;
        hideLoading();
        uiManagerInstance.toast(eMsg('cruncherFailed'), ToastMsgType.critical);
      },
      skipNumber: 2,
      maxRetries: 50,
    });
  }

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          const sat = obj as Satellite;
          const sccEl = getEl('nl-scc') as HTMLInputElement | null;

          if (sccEl) {
            sccEl.value = sat.sccNum;
          }
          this.setBottomIconToEnabled();
        } else if (obj?.type === SpaceObjectType.LAUNCH_SITE) {
          this.selectLaunchSite(obj as LaunchSite);
        } else {
          this.setBottomIconToDisabled();
        }
      },
    );
  }

  selectLaunchSite(launchSite: LaunchSite): void {
    // Find the key for the launch site in launchSites by matching the name
    const launchSiteKey = Object.keys(launchSites).find((key) => {
      const site = launchSites[key];

      return site.name === launchSite.name && site.site === launchSite.site;
    });

    if (launchSiteKey) {
      const launchSiteSelect = <HTMLSelectElement>getEl('nl-facility');

      // Set the value of the launch site select element
      launchSiteSelect.value = launchSiteKey;
      // Trigger change event to update the UI
      launchSiteSelect.dispatchEvent(new Event('change'));

      if (launchSites[launchSiteKey].defaultDir) {
        const launchSiteDropdown = <HTMLSelectElement>getEl('nl-updown');

        launchSiteDropdown.value = launchSites[launchSiteKey].defaultDir;
        launchSiteDropdown.name = launchSites[launchSiteKey].defaultDir === 'N' ? 'North' : 'South';
        launchSiteDropdown.dispatchEvent(new Event('change'));
      }
    } else {
      errorManagerInstance.warn(t7e('plugins.NewLaunch.errorMsgs.launchSiteNotInCatalog' as T7eKey).replace('{name}', launchSite.name));
    }
  }

  protected preValidate_(sat: Satellite): void {
    // Get Current LaunchSiteOptionValue
    const launchSiteOptionValue = (<HTMLInputElement>getEl('nl-facility')).value;
    const lat = launchSites[launchSiteOptionValue].lat;
    let inc = sat.inclination;

    inc = inc > 90 ? ((180 - inc) as Degrees) : inc;

    const submitButtonDom = <HTMLButtonElement>getEl(`${this.sideMenuElementName}-submit`);

    if (inc < lat) {
      submitButtonDom.disabled = true;
      submitButtonDom.textContent = t7e('plugins.NewLaunch.buttons.inclinationTooLow' as T7eKey);
    } else {
      submitButtonDom.disabled = false;
      submitButtonDom.textContent = `${t7e('plugins.NewLaunch.buttons.createLaunchNominal' as T7eKey)} \u25B6`;
    }
  }

  protected createNominalSat_(inputParams: Satellite, scc: string, id: number): Satellite | null {
    const eMsg = (key: string) => t7e(`plugins.NewLaunch.errorMsgs.${key}` as T7eKey);
    const country = inputParams.country;
    const type = inputParams.type;
    const intl = `${inputParams.epochYear}69B`; // International designator

    // Verify ecen, epochyr, epochday formats
    const eccFrac = inputParams.eccentricity.toString().split('.')[1] ?? '0';

    if (!(/^\d{7}$/u).test(eccFrac.padStart(7, '0'))) {
      ServiceLocator.getUiManager().toast(eMsg('invalidEccentricityFormat'), ToastMsgType.critical, true);
      errorManagerInstance.warn(eMsg('eccentricityFormatIssue'));
    }

    if (!(/^\d{2}$/u).test(inputParams.epochYear.toString()?.padStart(2, '0'))) {
      ServiceLocator.getUiManager().toast(eMsg('invalidEpochYearFormat'), ToastMsgType.critical, true);
      errorManagerInstance.warn(eMsg('epochYearFormatIssue'));
    }

    if (!(/^(?:\d{3}\.\d{8})$/u).test(inputParams.epochDay.toFixed(8).padStart(12, '0'))) {
      ServiceLocator.getUiManager().toast(eMsg('invalidEpochDayFormat'), ToastMsgType.critical, true);
      errorManagerInstance.warn(eMsg('epochDayFormatIssue'));
    }

    // Create TLE from parameters
    const { tle1: tle1_, tle2 } = FormatTle.createTle({
      sat: inputParams,
      inc: inputParams.inclination,
      meanmo: inputParams.meanMotion,
      rasc: inputParams.rightAscension,
      argPe: inputParams.argOfPerigee,
      meana: inputParams.meanAnomaly,
      ecen: inputParams.eccentricity.toString().split('.')[1].padStart(7, '0'),
      epochyr: inputParams.epochYear.toString().padStart(2, '0'),
      epochday: inputParams.epochDay.toString().padStart(3, '0'),
      intl,
      scc,
    });

    // Check if TLE generation failed
    if (tle1_ === 'Error') {
      errorManagerInstance.error(
        new Error(tle2),
        'create-sat.ts',
        t7e('plugins.CreateSat.errorMsgs.errorCreatingSat'),
      );

      return null;
    }

    const currentEpoch = TimeManager.currentEpoch(ServiceLocator.getTimeManager().simulationTimeObj);

    const tle1 = (tle1_.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + tle1_.substr(32)) as TleLine1;

    // Create satellite record from TLE
    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e as Error, 'create-sat.ts', eMsg('errorCreatingSatRecord'));

      return null;
    }

    // Validate altitude is reasonable
    if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) <= 1) {
      ServiceLocator.getUiManager().toast(
        eMsg('failedToPropagate'),
        ToastMsgType.caution,
        true,
      );

      return null;
    }

    // Propagate satellite to get position and velocity
    const spg4vec = Sgp4.propagate(satrec, 0);
    const pos = spg4vec.position as TemeVec3;
    const vel = spg4vec.velocity as TemeVec3<KilometersPerSecond>;

    // Create new satellite object
    const info: SatelliteParams = {
      id,
      type,
      country,
      tle1,
      tle2,
      name: 'New Launch Nominal',
    };

    const newSat = new Satellite({
      ...info,
      ...{
        position: pos,
        velocity: vel,
        source: 'User Created',
      },
    });

    newSat.active = true;

    const catalogManagerInstance = ServiceLocator.getCatalogManager();

    // Add to catalog
    catalogManagerInstance.objectCache[id] = newSat;

    // Update orbit buffer
    try {
      ServiceLocator.getOrbitManager().changeOrbitBufferData(id, tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e as Error, 'create-sat.ts', eMsg('changingOrbitBufferFailed'));

      return null;
    }

    return newSat;
  }
}
