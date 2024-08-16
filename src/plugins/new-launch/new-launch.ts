import { GetSatType, KeepTrackApiEvents, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { hideLoading, showLoadingSticky } from '@app/lib/showLoading';
import { StringPad } from '@app/lib/stringPad';
import { waitForCruncher } from '@app/lib/waitForCruncher';
import rocketPng from '@public/img/icons/rocket.png';

import { SatMath } from '@app/static/sat-math';

import { launchSites } from '@app/catalogs/launch-sites';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { OrbitFinder } from '@app/singletons/orbit-finder';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, Degrees, DetailedSatellite, SatelliteRecord, Sgp4 } from 'ootk';
import { KeepTrackPlugin, clickDragOptions } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

export class NewLaunch extends KeepTrackPlugin {
  dependencies_ = [SelectSatManager.name];
  private selectSatManager_: SelectSatManager;

  constructor() {
    super();
    this.selectSatManager_ = keepTrackApi.getPlugin(SelectSatManager);
  }

  bottomIconCallback = () => {
    if (!this.isMenuButtonActive) {
      return;
    }
    if (!this.verifySatelliteSelected()) {
      return;
    }

    const sat = keepTrackApi.getCatalogManager().getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as DetailedSatellite;

    (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
    (<HTMLInputElement>getEl('nl-inc')).value = StringPad.pad0(sat.inclination.toFixed(4), 8);
  };

  bottomIconElementName = 'menu-new-launch';
  bottomIconLabel = 'New Launch';
  bottomIconImg = rocketPng;
  isRequireSatelliteSelected = true;
  isIconDisabledOnLoad = true;
  isIconDisabled = true;
  sideMenuElementName: string = 'newLaunch-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
  <div id="newLaunch-menu" class="side-menu-parent start-hidden text-select">
    <div id="newLaunch-content" class="side-menu">
      <div class="row">
        <h5 class="center-align">New Launch</h5>
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
              <optgroup label="United States">
                <option value="CAS">Canary Island Air Space (Pegasus)</option>
                <option value="AFETR">Cape Canaveral AFS | Kennedy Space Center</option>
                <option value="ERAS">Eastern Range Air Space (Pegasus)</option>
                <option value="KODAK">Kodiak Launch Complex</option>
                <option value="KWAJ">Reagan Test Site</option>
                <option value="AFWTR">Vandenberg AFB</option>
                <option value="WLPIS">Wallops Flight Facility</option>
                <option value="WRAS">Western Range Air Space (Pegasus)</option>
              </optgroup>
              <optgroup label="Russia">
                <option value="KYMTR">Kasputin Yar MSC</option>
                <option value="PKMTR">Plesetsk MSC</option>
                <option value="SEAL">Sea Launch Platform</option>
                <option value="SADOL">Submarine Launch, Barents Sea</option>
                <option value="TTMTR">Tyuratam MSC | Baikonur Cosmodrome</option>
                <option value="VOSTO">Vostochny Cosmodrome</option>
                <option value="OREN">Yasny (Dombarovskiy) Cosmodrome</option>
              </optgroup>
              <optgroup label="China">
                <option value="JSC">Jiuquan SLC</option>
                <option value="TSC">Taiyuan SLC</option>
                <option value="WSC">Wenchang SLC</option>
                <option value="XSC">Xichang SLC</option>
              </optgroup>
              <optgroup label="Japan">
                <option value="TNSTA">Tanegashima Space Center</option>
                <option value="KSCUT">Uchinoura Space Center</option>
              </optgroup>
              <optgroup label="North Korea">
                <option value="YUN">Sohae Satellite Launch Station</option>
                <option value="TNGH">Tonghae Satellite Launching Ground</option>
              </optgroup>
              <optgroup label="Other">
                <option value="FRGUI">Guiana Space Centre (Kourou FG)</option>
                <option value="HGSTR">Hammaguira Space Track Range</option>
                <option value="NSC">Naro Space Center</option>
                <option value="YAVNE">Palmachim Air Force Base</option>
                <option value="RLLC">Rocket Labs Launch Complex</option>
                <option value="SNMLP">San Marco Launch Platform</option>
                <option value="SRI">Satish Dhawan Space Centre (Sriharikota IN)</option>
                <option value="SEM">Semnan Spaceport</option>
                <option value="WOMRA">Woomera Test Range</option>
              </optgroup>
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

  helpTitle = 'New Launch Menu';
  helpBody = keepTrackApi.html`The New Launch Menu is used for generating notional orbital launches by modifying existing satellites with similar parameters.
    <br><br>
    After selecting a satellite, you can select a launch location and a north/south azimuth.
    The selected satellite will be modified to align it with the launch site.
    The clock is then changed to 00:00:00 to represent relative time after the launch.
    This can be helpful in calculating sensor coverage relative to launch time.
    The objects relationship with other orbital objects will be incorrect.`;

  dragOptions: clickDragOptions = {
    isDraggable: true,
  };

  isDoingCalculations: boolean = false;
  submitCallback: () => void = () => {
    if (this.isDoingCalculations) {
      return;
    }
    this.isDoingCalculations = true;

    const timeManagerInstance = keepTrackApi.getTimeManager();
    const catalogManagerInstance = keepTrackApi.getCatalogManager();
    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    showLoadingSticky();

    const sccNum = (<HTMLInputElement>getEl('nl-scc')).value;
    const id = catalogManagerInstance.sccNum2Id(parseInt(sccNum));
    const sat = catalogManagerInstance.getObject(id) as DetailedSatellite;

    const upOrDown = <'N' | 'S'>(<HTMLInputElement>getEl('nl-updown')).value;
    const launchFac = (<HTMLInputElement>getEl('nl-facility')).value;
    let launchLat: Degrees, launchLon: Degrees;

    if (catalogManagerInstance.isLaunchSiteManagerLoaded) {
      for (const launchSite in catalogManagerInstance.launchSites) {
        if (catalogManagerInstance.launchSites[launchSite].name === launchFac) {
          launchLat = catalogManagerInstance.launchSites[launchSite].lat;
          launchLon = catalogManagerInstance.launchSites[launchSite].lon;
        }
      }
    } else {
      throw new Error('Launch Site Manager not loaded!');
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

    colorSchemeManagerInstance.setColorScheme(settingsManager.currentColorScheme, true);

    keepTrackApi.getMainCamera().isAutoPitchYawToTarget = false;

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

    uiManagerInstance.toast('Time is now relative to launch time.', ToastMsgType.standby);
    keepTrackApi.getSoundManager()?.play(SoundNames.LIFT_OFF);

    // Prevent caching of old TLEs
    sat.satrec = null;

    let satrec: SatelliteRecord;

    try {
      satrec = Sgp4.createSatrec(tle1, tle2);
      sat.satrec = satrec;
    } catch (e) {
      errorManagerInstance.error(e, 'new-launch.ts', 'Error creating satellite record!');

      return;
    }
    if (SatMath.altitudeCheck(satrec, simulationTimeObj) > 1) {
      catalogManagerInstance.satCruncher.postMessage({
        typ: CruncerMessageTypes.SAT_EDIT,
        id,
        active: true,
        tle1,
        tle2,
      });

      const orbitManagerInstance = keepTrackApi.getOrbitManager();

      orbitManagerInstance.changeOrbitBufferData(id, tle1, tle2);
    } else {
      uiManagerInstance.toast('Failed Altitude Test - Try a Different Satellite!', ToastMsgType.critical);
    }

    waitForCruncher({
      cruncher: catalogManagerInstance.satCruncher,
      cb: () => {
        this.isDoingCalculations = false;
        hideLoading();

        uiManagerInstance.toast('Launch Nominal Created!', ToastMsgType.standby);
        uiManagerInstance.searchManager.doSearch(sat.sccNum);
      },
      validationFunc: (data: any) => typeof data.satPos !== 'undefined',
      error: () => {
        this.isDoingCalculations = false;
        hideLoading();
        uiManagerInstance.toast('Cruncher failed to meet requirement after multiple tries! Is this launch even possible?', ToastMsgType.critical);
      },
    });
  };

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.constructor.name,
      cb: () => {
        getEl(`${this.sideMenuElementName}-form`).addEventListener('change', () => {
          const sat = keepTrackApi.getCatalogManager().getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as DetailedSatellite;

          if (!sat.isSatellite()) {
            return;
          }
          this.preValidate_(sat);
        });
      },
    });

    keepTrackApi.register({
      event: KeepTrackApiEvents.selectSatData,
      cbName: this.constructor.name,
      cb: (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          const sat = obj as DetailedSatellite;

          (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
          getEl(this.bottomIconElementName).classList.remove('bmenu-item-disabled');
          this.isIconDisabled = false;
          this.preValidate_(sat);
        } else {
          getEl(this.bottomIconElementName).classList.add('bmenu-item-disabled');
          this.isIconDisabled = true;
        }
      },
    });
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
}
