import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import $ from 'jquery';
import rocketPng from '@app/img/icons/rocket.png';

let isNewLaunchMenuOpen = false;

export const newLaunchSubmit = () => {
  const { timeManager, mainCamera, satellite, satSet, orbitManager, uiManager, objectManager } = keepTrackApi.programs;

  const scc = $('#nl-scc').val();
  const satId = satSet.getIdFromObjNum(scc);
  let sat = satSet.getSat(satId);

  const upOrDown = $('#nl-updown').val();
  const launchFac = $('#nl-facility').val();
  let launchLat, launchLon;

  if (objectManager.isLaunchSiteManagerLoaded) {
    for (const launchSite in objectManager.launchSiteManager.launchSiteList) {
      if (objectManager.launchSiteManager.launchSiteList[launchSite].name === launchFac) {
        launchLat = objectManager.launchSiteManager.launchSiteList[launchSite].lat;
        launchLon = objectManager.launchSiteManager.launchSiteList[launchSite].lon;
      }
    }
  }
  if (launchLon > 180) {
    // if West not East
    launchLon -= 360; // Convert from 0-360 to -180-180
  }

  // if (sat.inclination * RAD2DEG < launchLat) {
  //   keepTrackApi.programs.uiManager.toast(`Satellite Inclination Lower than Launch Latitude!`, 'critical');
  //   $('#loading-screen').fadeOut('slow');
  //   return;
  // }
  // Set time to 0000z for relative time.
  const today = new Date(); // Need to know today for offset calculation
  const quadZTime = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision

  // Date object defaults to local time.
  quadZTime.setUTCHours(0); // Move to UTC Hour

  timeManager.changeStaticOffset(quadZTime.getTime() - today.getTime()); // Find the offset from today
  mainCamera.isCamSnapMode = false;

  const simulationTimeObj = timeManager.calculateSimulationTime();

  const TLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, simulationTimeObj);

  const TLE1 = TLEs[0];
  const TLE2 = TLEs[1];

  if (satellite.altitudeCheck(TLE1, TLE2, simulationTimeObj) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      active: true,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
  } else {
    uiManager.toast(`Failed Altitude Test - Try a Different Satellite!`, 'critical');
  }
  $('#loading-screen').fadeOut('slow');
};
export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="newLaunch-menu" class="side-menu-parent start-hidden text-select">
          <div id="newLaunch-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">New Launch</h5>
              <form id="newLaunch" class="col s12">
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
                  <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Launch
                    Nominal &#9658;
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `);

  $('#newLaunch').on('submit', function (e: Event) {
    $('#loading-screen').fadeIn(1000, newLaunchSubmit);
    e.preventDefault();
  });

  // Allow resizing of the side menu
  $('#newLaunch-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-newLaunch" class="bmenu-item bmenu-item-disabled">
          <img alt="rocket" src="" delayedsrc=${rocketPng}/>
          <span class="bmenu-title">New Launch</span>
          <div class="status-icon"></div>
        </div>  
      `);
};

export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  const aM = keepTrackApi.programs.adviceManager;
  if (iconName === 'menu-newLaunch') {
    if (isNewLaunchMenuOpen) {
      isNewLaunchMenuOpen = false;
      keepTrackApi.programs.uiManager.hideSideMenus();
      return;
    } else {
      if (keepTrackApi.programs.objectManager.selectedSat !== -1) {
        if (settingsManager.isMobileModeEnabled) keepTrackApi.programs.uiManager.searchToggle(false);
        keepTrackApi.programs.uiManager.hideSideMenus();
        $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        $('#menu-newLaunch').addClass('bmenu-item-selected');
        isNewLaunchMenuOpen = true;

        const sat = keepTrackApi.programs.satSet.getSatExtraOnly(keepTrackApi.programs.objectManager.selectedSat);
        $('#nl-scc').val(sat.sccNum);
        $('#nl-inc').val((sat.inclination * RAD2DEG).toPrecision(2));
      } else {
        aM.adviceList?.newLaunchDisabled();
        keepTrackApi.programs.uiManager.toast(`Select a Satellite First!`, 'caution');
        if (!$('#menu-newLaunch:animated').length) {
          $('#menu-newLaunch').effect('shake', {
            distance: 10,
          });
        }
      }
      return;
    }
  }
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'newLaunch',
    cb: uiManagerInit,
  });

  // Add Advice Info
  keepTrackApi.register({
    method: 'adviceReady',
    cbName: 'newLaunch',
    cb: adviceReady,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'newLaunch',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'newLaunch',
    cb: hideSideMenus,
  });
};

export const hideSideMenus = (): void => {
  $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-newLaunch').removeClass('bmenu-item-selected');
  isNewLaunchMenuOpen = false;
};

export const adviceReady = () => {
  const aM = keepTrackApi.programs.adviceManager;
  aM.adviceCount.newLaunch = 0;
  aM.adviceCount.newLaunchDisabled = 0;

  aM.adviceList.newLaunchDisabled = function () {
    // Only Do this Twice
    if (aM.adviceCount.newLaunchDisabled >= 3) return;
    aM.adviceCount.newLaunchDisabled += 1;

    aM.showAdvice(
      'Create Launch Nominal',
      'Creating a Launch Nominal requres a satellite to be selected first. Pick a satellite whose orbit is close to your upcomming launch!',
      null,
      'bottom-right'
    );
  };

  aM.adviceArray.push(aM.adviceList.socrates);
};
