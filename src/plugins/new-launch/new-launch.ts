import { GetSatType, KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { hideLoading, showLoadingSticky } from '@app/lib/showLoading';
import { waitForCruncher } from '@app/lib/waitForCruncher';
import rocketLaunchPng from '@public/img/icons/rocket-launch.png';

import { SatMath } from '@app/static/sat-math';

import { launchSites } from '@app/catalogs/launch-sites';
import { t7e } from '@app/locales/keys';
import { CatalogManager } from '@app/singletons/catalog-manager';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { OrbitFinder } from '@app/singletons/orbit-finder';
import { TimeManager } from '@app/singletons/time-manager';
import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { CruncerMessageTypes } from '@app/webworker/positionCruncher';
import { BaseObject, Degrees, DetailedSatellite, DetailedSatelliteParams, EciVec3, FormatTle, KilometersPerSecond, SatelliteRecord, Sgp4, TleLine1 } from 'ootk';
import { ClickDragOptions, KeepTrackPlugin } from '../KeepTrackPlugin';
import { SelectSatManager } from '../select-sat-manager/select-sat-manager';
import { SoundNames } from '../sounds/SoundNames';

export class NewLaunch extends KeepTrackPlugin {
  readonly id = 'NewLaunch';
  dependencies_ = [SelectSatManager.name];
  private readonly selectSatManager_: SelectSatManager;

  constructor() {
    super();
    const selectSatManagerInstance = keepTrackApi.getPlugin(SelectSatManager);

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

    const sat = keepTrackApi.getCatalogManager().getObject(this.selectSatManager_.selectedSat, GetSatType.EXTRA_ONLY) as DetailedSatellite;

    (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
    (<HTMLInputElement>getEl('nl-inc')).value = sat.inclination.toFixed(4).padStart(8, '0');
  };

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconImg = rocketLaunchPng;
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

  dragOptions: ClickDragOptions = {
    isDraggable: true,
  };

  isDoingCalculations = false;
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
    sat.satrec = null as unknown as SatelliteRecord;

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
        keepTrackApi.getPlugin(SelectSatManager)?.selectSat(sat.id);

        uiManagerInstance.toast('Launch Nominal Created!', ToastMsgType.standby);
        uiManagerInstance.searchManager.doSearch(sat.sccNum);
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
      isSkipFirst: true,
      maxRetries: 50,
    });
  };

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl(`${this.sideMenuElementName}-form`)?.addEventListener('change', () => {
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
      cbName: this.id,
      cb: (obj: BaseObject) => {
        if (obj?.isSatellite()) {
          const sat = obj as DetailedSatellite;

          (<HTMLInputElement>getEl('nl-scc')).value = sat.sccNum;
          this.setBottomIconToEnabled();
          this.preValidate_(sat);
        } else {
          this.setBottomIconToDisabled();
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

  private createNominalSat_(inputParams: DetailedSatellite, scc: string, id: number): DetailedSatellite | null {
    const country = inputParams.country;
    const type = inputParams.type;
    const intl = `${inputParams.epochYear}69B`; // International designator

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

    const currentEpoch = TimeManager.currentEpoch(keepTrackApi.getTimeManager().simulationTimeObj);

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
    if (SatMath.altitudeCheck(satrec, keepTrackApi.getTimeManager().simulationTimeObj) <= 1) {
      keepTrackApi.getUiManager().toast(
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

    const catalogManagerInstance = keepTrackApi.getCatalogManager();

    // Add to catalog
    catalogManagerInstance.objectCache[id] = newSat;

    // Update orbit buffer
    try {
      keepTrackApi.getOrbitManager().changeOrbitBufferData(id, tle1, tle2);
    } catch (e) {
      errorManagerInstance.error(e as Error, 'create-sat.ts', 'Changing orbit buffer data failed');

      return null;
    }

    return newSat;
  }
}
