import { GetSatType, MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { getEl } from '@app/engine/utils/get-el';
import { hideLoading, showLoadingSticky } from '@app/engine/utils/showLoading';
import { waitForCruncher } from '@app/engine/utils/waitForCruncher';
import rocketLaunchPng from '@public/img/icons/rocket-launch.png';

import { SatMath } from '@app/app/analysis/sat-math';

import { OrbitFinder } from '@app/app/analysis/orbit-finder';
import { CatalogManager } from '@app/app/data/catalog-manager';
import { LaunchSite } from '@app/app/data/catalog-manager/LaunchFacility';
import { launchSites } from '@app/app/data/catalogs/launch-sites';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeManager } from '@app/engine/core/time-manager';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { t7e } from '@app/locales/keys';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import {
  BaseObject, Degrees, DetailedSatellite, DetailedSatelliteParams, EciVec3, FormatTle, KilometersPerSecond,
  LandObject, SatelliteRecord, Sgp4, SpaceObjectType, TleLine1, TleLine2,
} from '@ootk/src/main';
import { ClickDragOptions, KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/sounds';
import { PluginRegistry } from '@app/engine/core/plugin-registry';

export class NewLaunch extends KeepTrackPlugin {
  readonly id = 'NewLaunch';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

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

    const sat = ServiceLocator.getCatalogManager().getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as DetailedSatellite;

    // Validate satellite before changing DOM
    if (!(sat instanceof DetailedSatellite) || !sat.sccNum || !sat.inclination || isNaN(sat.inclination)) {
      return;
    }

    this.preValidate_(sat);

    (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
    (<HTMLInputElement>getEl('nl-inc')).value = sat.inclination.toFixed(4).padStart(8, '0');
  };

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = rocketLaunchPng;
  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'newLaunch-menu';
  sideMenuElementHtml: string = (() => {
    // Group launchSites by country
    const grouped: { [country: string]: { key: string; name: string, site: string }[] } = {};

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

    // Build the select options HTML
    const optionsHtml = countryKeys.map((country) =>
      `<optgroup label="${country}"> ${grouped[country]
        .map((site) => `<option value="${site.key}">${site.name}<br/> - ${site.site}</option>`).join('\n')}
      </optgroup>`,
    ).join('\n');

    return html`
      <div id="newLaunch-menu" class="side-menu-parent start-hidden text-select">
        <div id="newLaunch-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">New Launch</h5>
            <div class="center-align" style="margin: 0em 0.75em 1.5em 0.75em; color: #888; font-size: 0.95em;">
              Note: This tool is optimized for LEO satellites and may not work correctly for HEO or GEO orbits.
            </div>
            <form id="${this.sideMenuElementName}-form" class="col s12">
              <div class="input-field col s12">
                <input disabled value="00005" id="nl-scc" type="text">
                <label for="disabled" class="active">Satellite SCC#</label>
              </div>
              <div class="input-field col s12">
                <input disabled value="50.00" id="nl-inc" type="text">
                <label for="disabled" class="active">Inclination</label>
              </div>
              <div class="input-field col s12">
                <select value="50.00" id="nl-updown" type="text">
                  <option value="N">North</option>
                  <option value="S">South</option>
                </select>
                <label for="disabled">Launching North or South</label>
              </div>
              <div class="input-field col s12" id="nl-launch-menu">
                <select id="nl-facility">
                  ${optionsHtml}
                </select>
                <label>Launch Facility</label>
              </div>
              <div class="center-align">
                <button
                  id="${this.sideMenuElementName}-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Launch
                  Nominal &#9658;
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

  isDoingCalculations = false;
  submitCallback: () => void = () => {
    if (this.isDoingCalculations) {
      return;
    }
    this.isDoingCalculations = true;

    const timeManagerInstance = ServiceLocator.getTimeManager();
    const catalogManagerInstance = ServiceLocator.getCatalogManager();
    const uiManagerInstance = ServiceLocator.getUiManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    showLoadingSticky();

    const sccNum = (<HTMLInputElement>getEl('nl-scc')).value;
    const inputSat = catalogManagerInstance.sccNum2Sat(parseInt(sccNum))!;
    let nominalSat: DetailedSatellite | null = null;
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
      uiManagerInstance.toast('No more nominal satellites available!', ToastMsgType.critical);
      this.isDoingCalculations = false;
      hideLoading();

      return;
    }

    const sat = this.createNominalSat_(inputSat, nominalSat.sccNum, id);

    if (!sat) {
      this.isDoingCalculations = false;
      hideLoading();

      return;
    }

    const upOrDown = <'N' | 'S'>(<HTMLInputElement>getEl('nl-updown')).value;
    const launchFac = (<HTMLInputElement>getEl('nl-facility')).value;
    let launchLat: Degrees | null = null;
    let launchLon: Degrees | null = null;

    const launchSite = catalogManagerInstance.launchSites[launchFac];

    launchLat = launchSite.lat;
    launchLon = launchSite.lon;

    if (launchLat === null || launchLon === null) {
      uiManagerInstance.toast(`Launch Site ${launchFac} not found!`, ToastMsgType.critical);

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
        uiManagerInstance.toast(`Failed to Create TLE: ${tle2}`, ToastMsgType.critical);
      } else if (tle1.length !== 69) {
        uiManagerInstance.toast(`Invalid TLE1 Created: length is not 69 - ${tle1}`, ToastMsgType.critical);
      } else if (tle2.length !== 69) {
        uiManagerInstance.toast(`Invalid TLE2 Created: length is not 69 - ${tle2}`, ToastMsgType.critical);
      }

      // We have to change the time for the TLE creation, but it failed, so revert it.
      timeManagerInstance.changeStaticOffset(cacheStaticOffset);
      this.isDoingCalculations = false;
      hideLoading();

      return;
    }

    // Prevent caching of old TLEs
    sat.satrec = null as unknown as SatelliteRecord;

    try {
      sat.editTle(tle1, tle2 as TleLine2);
    } catch (e) {
      errorManagerInstance.error(e, 'new-launch.ts', 'Error creating satellite record!');

      return;
    }
    if (SatMath.altitudeCheck(sat.satrec, simulationTimeObj) > 1) {
      catalogManagerInstance.satCruncher.postMessage({
        typ: CruncerMessageTypes.SAT_EDIT,
        id,
        active: true,
        tle1,
        tle2,
      });

      const orbitManagerInstance = ServiceLocator.getOrbitManager();

      if (id) {
        orbitManagerInstance.changeOrbitBufferData(id, tle1, tle2);
      }
    } else {
      uiManagerInstance.toast('Failed Altitude Test - Try a Different Satellite!', ToastMsgType.critical);
    }

    waitForCruncher({
      cruncher: catalogManagerInstance.satCruncher,
      cb: () => {
        this.isDoingCalculations = false;
        hideLoading();

        // Deseletect the satellite
        PluginRegistry.getPlugin(SelectSatManager)?.selectSat(sat.id);

        uiManagerInstance.toast('Launch Nominal Created!', ToastMsgType.standby);
        uiManagerInstance.searchManager.doSearch(sat.sccNum);

        uiManagerInstance.toast('Time is now relative to launch time.', ToastMsgType.standby);
        ServiceLocator.getSoundManager()?.play(SoundNames.LIFT_OFF);
      },
      validationFunc: (data: PositionCruncherOutgoingMsg) => typeof data.satPos !== 'undefined',
      error: () => {
        if (!this.isDoingCalculations) {
          // If we are not doing calculations, then it must have finished already.
          return;
        }

        this.isDoingCalculations = false;
        hideLoading();
        uiManagerInstance.toast('Cruncher failed to meet requirement after multiple tries! Is this launch even possible?', ToastMsgType.critical);
      },
      skipNumber: 2,
      maxRetries: 50,
    });
  };

  addJs(): void {
    super.addJs();

    EventBus.getInstance().on(
      EventBusEvent.selectSatData,
      (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          const sat = obj as DetailedSatellite;

          (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
          this.setBottomIconToEnabled();
        } else if (obj?.type === SpaceObjectType.LAUNCH_SITE) {
          this.selectLaunchSite(obj as LandObject);
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
      console.warn(`Launch site ${launchSite.name} not found in launchSites catalog.`);
    }
  }

  private preValidate_(sat: DetailedSatellite): void {
    // Get Current LaunchSiteOptionValue
    const launchSiteOptionValue = (<HTMLInputElement>getEl('nl-facility')).value;
    const lat = launchSites[launchSiteOptionValue].lat;
    let inc = sat.inclination;

    inc = inc > 90 ? ((180 - inc) as Degrees) : inc;

    const submitButtonDom = <HTMLButtonElement>getEl(`${this.sideMenuElementName}-submit`);

    if (inc < lat) {
      submitButtonDom.disabled = true;
      submitButtonDom.textContent = 'Inclination Too Low!';
    } else {
      submitButtonDom.disabled = false;
      submitButtonDom.textContent = 'Create Launch Nominal \u25B6';
    }
  }

  private createNominalSat_(inputParams: DetailedSatellite, scc: string, id: number): DetailedSatellite | null {
    const country = inputParams.country;
    const type = inputParams.type;
    const intl = `${inputParams.epochYear}69B`; // International designator

    // Verify ecen, epochyr, epochday formats
    const eccFrac = inputParams.eccentricity.toString().split('.')[1] ?? '0';

    if (!(/^\d{7}$/u).test(eccFrac.padStart(7, '0'))) {
      ServiceLocator.getUiManager().toast('Invalid eccentricity format!', ToastMsgType.critical, true);
      errorManagerInstance.warn('There was an issue with this satellite\'s eccentricity format. Try a different satellite.');
    }

    if (!(/^\d{2}$/u).test(inputParams.epochYear.toString()?.padStart(2, '0'))) {
      ServiceLocator.getUiManager().toast('Invalid epoch year format!', ToastMsgType.critical, true);
      errorManagerInstance.warn('There was an issue with this satellite\'s epoch year format. Try a different satellite.');
    }

    if (!(/^(?:\d{3}\.\d{8})$/u).test(inputParams.epochDay.toFixed(8).padStart(12, '0'))) {
      ServiceLocator.getUiManager().toast('Invalid epoch day format! Must be 3 digits, a decimal, and 8 digits after the decimal.', ToastMsgType.critical, true);
      errorManagerInstance.warn('There was an issue with this satellite\'s epoch day format. Try a different satellite.');
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
        t7e('errorMsgs.CreateSat.errorCreatingSat'),
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
      errorManagerInstance.error(e as Error, 'create-sat.ts', 'Error creating satellite record!');

      return null;
    }

    // Validate altitude is reasonable
    if (SatMath.altitudeCheck(satrec, ServiceLocator.getTimeManager().simulationTimeObj) <= 1) {
      ServiceLocator.getUiManager().toast(
        'Failed to propagate satellite. Try different parameters or report this issue if parameters are correct.',
        ToastMsgType.caution,
        true,
      );

      return null;
    }

    // Propagate satellite to get position and velocity
    const spg4vec = Sgp4.propagate(satrec, 0);
    const pos = spg4vec.position as EciVec3;
    const vel = spg4vec.velocity as EciVec3<KilometersPerSecond>;

    // Create new satellite object
    const info: DetailedSatelliteParams = {
      id,
      type,
      country,
      tle1,
      tle2,
      name: 'New Launch Nominal',
    };

    const newSat = new DetailedSatellite({
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
      errorManagerInstance.error(e as Error, 'create-sat.ts', 'Changing orbit buffer data failed');

      return null;
    }

    return newSat;
  }
}
