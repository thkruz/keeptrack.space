import missilePng from '@app/img/icons/missile.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { clickAndDragWidth, getEl, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { missileManager } from './missileManager';

let isMissileMenuOpen = false;
let isSub = false;

export const updateLoop = (): void => {
  if (typeof missileManager != 'undefined' && missileManager.missileArray.length > 0) {
    const { drawManager, orbitManager } = keepTrackApi.programs;
    for (drawManager.i = 0; drawManager.i < missileManager.missileArray.length; drawManager.i++) {
      orbitManager.updateOrbitBuffer(missileManager.missileArray[drawManager.i].id);
    }
  }
};
export const hideSideMenus = (): void => {
  slideOutLeft(getEl('missile-menu'), 1000);
  getEl('menu-missile').classList.remove('bmenu-item-selected');
  isMissileMenuOpen = false;
};
export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-missile') {
    const { uiManager } = keepTrackApi.programs;
    if (isMissileMenuOpen) {
      isMissileMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('missile-menu'), 1000);
      getEl('menu-missile').classList.add('bmenu-item-selected');
      isMissileMenuOpen = true;
      return;
    }
  }
};
export const missileChange = (): void => {
  if (parseFloat((<HTMLInputElement>getEl('ms-type')).value) !== 0) {
    getEl('ms-custom-opt').style.display = 'none';
  } else {
    getEl('ms-custom-opt').style.display = 'block';
  }
};
export const msErrorClick = (): void => {
  getEl('ms-error').style.display = 'none';
};
export const msTargetChange = () => {
  if (parseInt((<HTMLInputElement>getEl('ms-target')).value) !== -1) {
    getEl('ms-tgt-holder-lat').style.display = 'none';
    getEl('ms-tgt-holder-lon').style.display = 'none';
  } else {
    getEl('ms-tgt-holder-lat').style.display = 'block';
    getEl('ms-tgt-holder-lon').style.display = 'block';
  }
};
export const missileSubmit = (): void => {
  // prettier-ignore
  showLoading(() => { // NOSONAR
    const { uiManager, satSet, timeManager } = keepTrackApi.programs;
    getEl('ms-error').style.display = 'none';
    const type = parseFloat((<HTMLInputElement>getEl('ms-type')).value);
    const attacker = parseFloat((<HTMLInputElement>getEl('ms-attacker')).value);
    let lauLat = parseFloat((<HTMLInputElement>getEl('ms-lat-lau')).value);
    let lauLon = parseFloat((<HTMLInputElement>getEl('ms-lon-lau')).value);
    const target = parseFloat((<HTMLInputElement>getEl('ms-target')).value);
    let tgtLat = parseFloat((<HTMLInputElement>getEl('ms-lat')).value);
    let tgtLon = parseFloat((<HTMLInputElement>getEl('ms-lon')).value);
    const launchTime = timeManager.selectedDate * 1;

    let sim = '';
    if (type === 1) {
      sim = 'simulation/Russia2USA.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type === 2) {
      sim = 'simulation/Russia2USAalt.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type === 3) {
      sim = 'simulation/China2USA.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type === 4) {
      sim = 'simulation/NorthKorea2USA.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type === 5) {
      sim = 'simulation/USA2Russia.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type === 6) {
      sim = 'simulation/USA2China.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type === 7) {
      sim = 'simulation/USA2NorthKorea.json';
      missileManager.MassRaidPre(launchTime, sim);
    }
    if (type !== 0) {
      uiManager.toast(`${sim} Loaded`, 'standby', true);
    }
    if (type === 0) {
      if (target === -1) {
        // Custom Target
        if (isNaN(tgtLat)) {
          uiManager.toast(`Invalid Target Latitude!`, 'critical');
          getEl('loading-screen').style.display = 'none';
          return;
        }
        if (isNaN(tgtLon)) {
          uiManager.toast(`Invalid Target Longitude!`, 'critical');
          getEl('loading-screen').style.display = 'none';
          return;
        }
      } else {
        // Premade Target
        tgtLat = <number>missileManager.globalBMTargets[target * 3];
        tgtLon = <number>missileManager.globalBMTargets[target * 3 + 1];
      }

      if (isSub) {
        if (isNaN(lauLat)) {
          uiManager.toast(`Invalid Launch Latitude!`, 'critical');
          getEl('loading-screen').style.display = 'none';
          return;
        }
        if (isNaN(lauLon)) {
          uiManager.toast(`Invalid Launch Longitude!`, 'critical');
          getEl('loading-screen').style.display = 'none';
          return;
        }
      }

      let a, b; //, attackerName;

      if (attacker < 200) {
        // USA
        a = attacker - 100;
        b = 500 - missileManager.missilesInUse;
        let missileMinAlt = 1200;
        if (attacker != 100) {
          // Use Custom Launch Site
          lauLat = <number>missileManager.UsaICBM[a * 4];
          lauLon = <number>missileManager.UsaICBM[a * 4 + 1];
          missileMinAlt = 1100; //https://www.space.com/8689-air-force-launches-ballistic-missile-suborbital-test.html
        }
        missileManager.Missile(
          lauLat,
          lauLon,
          tgtLat,
          tgtLon,
          3,
          satSet.missileSats - b,
          launchTime,
          missileManager.UsaICBM[a * 4 + 2],
          30,
          2.9,
          0.07,
          missileManager.UsaICBM[a * 4 + 3],
          'United States',
          missileMinAlt
        );
      } else if (attacker < 300) {
        // Russian
        a = attacker - 200;
        b = 500 - missileManager.missilesInUse;
        const missileMinAlt = 1120;
        if (attacker != 213 && attacker != 214 && attacker != 215) {
          // Use Custom Launch Site
          lauLat = <number>missileManager.RussianICBM[a * 4];
          lauLon = <number>missileManager.RussianICBM[a * 4 + 1];
        }
        missileManager.Missile(
          lauLat,
          lauLon,
          tgtLat,
          tgtLon,
          3,
          satSet.missileSats - b,
          launchTime,
          missileManager.RussianICBM[a * 4 + 2],
          30,
          2.9,
          0.07,
          missileManager.RussianICBM[a * 4 + 3],
          'Russia',
          missileMinAlt
        );
      } else if (attacker < 400) {
        // Chinese
        a = attacker - 300;
        b = 500 - missileManager.missilesInUse;
        const missileMinAlt = 1120;
        if (attacker != 321) {
          // Use Custom Launch Site
          lauLat = <number>missileManager.ChinaICBM[a * 4];
          lauLon = <number>missileManager.ChinaICBM[a * 4 + 1];
        }
        missileManager.Missile(
          lauLat,
          lauLon,
          tgtLat,
          tgtLon,
          3,
          satSet.missileSats - b,
          launchTime,
          missileManager.ChinaICBM[a * 4 + 2],
          30,
          2.9,
          0.07,
          missileManager.ChinaICBM[a * 4 + 3],
          'China',
          missileMinAlt
        );
      } else if (attacker < 500) {
        // North Korean
        a = attacker - 400;
        b = 500 - missileManager.missilesInUse;
        const missileMinAlt = 1120;
        if (attacker != 400) {
          // Use Custom Launch Site
          lauLat = <number>missileManager.NorthKoreanBM[a * 4];
          lauLon = <number>missileManager.NorthKoreanBM[a * 4 + 1];
        }
        missileManager.Missile(
          lauLat,
          lauLon,
          tgtLat,
          tgtLon,
          3,
          satSet.missileSats - b,
          launchTime,
          missileManager.NorthKoreanBM[a * 4 + 2],
          30,
          2.9,
          0.07,
          missileManager.NorthKoreanBM[a * 4 + 3],
          'North Korea',
          missileMinAlt
        );
      } else if (attacker < 600) {
        // French SLBM
        a = attacker - 500;
        b = 500 - missileManager.missilesInUse;
        const missileMinAlt = 1000;
        if (attacker != 500) {
          // Use Custom Launch Site
          lauLat = <number>missileManager.FraSLBM[a * 4];
          lauLon = <number>missileManager.FraSLBM[a * 4 + 1];
        }
        // https://etikkradet.no/files/2017/02/EADS-Engelsk.pdf
        missileManager.Missile(
          lauLat,
          lauLon,
          tgtLat,
          tgtLon,
          3,
          satSet.missileSats - b,
          launchTime,
          missileManager.FraSLBM[a * 4 + 2],
          30,
          2.9,
          0.07,
          missileManager.FraSLBM[a * 4 + 3],
          'France',
          missileMinAlt
        );
      } else if (attacker < 700) {
        // United Kingdom SLBM
        a = attacker - 600;
        b = 500 - missileManager.missilesInUse;
        const missileMinAlt = 1200;
        if (attacker != 600) {
          // Use Custom Launch Site
          lauLat = <number>missileManager.ukSLBM[a * 4];
          lauLon = <number>missileManager.ukSLBM[a * 4 + 1];
        }
        missileManager.Missile(
          lauLat,
          lauLon,
          tgtLat,
          tgtLon,
          3,
          satSet.missileSats - b,
          launchTime,
          missileManager.ukSLBM[a * 4 + 2],
          30,
          2.9,
          0.07,
          missileManager.ukSLBM[a * 4 + 3],
          'United Kigndom',
          missileMinAlt
        );
      }
      uiManager.toast(missileManager.lastMissileError, missileManager.lastMissileErrorType);
      uiManager.doSearch('RV_');
    }
    getEl('loading-screen').style.display = 'none';
  });
};
export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="missile-menu" class="side-menu-parent start-hidden text-select">
          <div id="missile-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Create Missile Attack</h5>
              <form id="missile" class="col s12">
                <div class="input-field col s12">
                  <select id="ms-type">
                    <option value="0">Custom Missile</option>
                    <option value="1">Russia to USA</option>
                    <option value="2">Russia to USA w/ Subs</option>
                    <option value="3">China to USA</option>
                    <option value="4">North Korea to USA</option>
                    <option value="5">USA to Russia</option>
                    <option value="6">USA to China</option>
                    <option value="7">USA to North Korea</option>
                  </select>
                  <label>Type of Attack</label>
                </div>
                <div id="ms-custom-opt">
                  <div class="input-field col s12">
                    <select id="ms-attacker">
                      <optgroup label="United States">
                        <option value="100">Ohio Sub (Trident II)</option>
                        <option value="101">Minot</option>
                        <option value="102">Malmstrom</option>
                        <option value="103">F.E. Warren</option>
                      </optgroup>
                      <optgroup label="United Kingdom">
                        <option value="600">Vanguard Sub (Trident II)</option>
                        <option value="601">HMNB Clyde (Trident II)</option>
                      </optgroup>
                      <optgroup label="Russia">
                        <option value="200">Aleysk</option>
                        <option value="201">Dombarovskiy</option>
                        <option value="202">Uzhur</option>
                        <option value="203">Kartaly</option>
                        <option value="204">Irkutsk</option>
                        <option value="205">Kansk</option>
                        <option value="206">Krasnoyarsk</option>
                        <option value="207">Nizhniy Tagil</option>
                        <option value="208">Novosibirsk</option>
                        <option value="209">Tatischevo (SS-19)</option>
                        <option value="210">Tatischevo (SS-27)</option>
                        <option value="211">Teykovo</option>
                        <option value="212">Yoshkar Ola</option>
                        <option value="213">Borei Sub (Bulava)</option>
                        <option value="214">Delta IV Sub (Sineva)</option>
                        <option value="215">Delta IV Sub (Layner)</option>
                      </optgroup>
                      <optgroup label="China">
                        <option value="321">Type 092 Sub (JL-2)</option>
                        <option value="300">Nanyang</option>
                        <option value="301">Xining</option>
                        <option value="302">Delingha</option>
                        <option value="303">Haiyan</option>
                        <option value="304">Datong</option>
                        <option value="305">Tainshui</option>
                        <option value="306">Xixia</option>
                        <option value="307">Shaoyang</option>
                        <option value="308">Yuxi</option>
                        <option value="309">Luoyang</option>
                        <option value="310">Wuzhai</option>
                        <option value="311">Xuanhua</option>
                        <option value="312">Tongdao</option>
                        <option value="313">Lushi</option>
                        <option value="314">Jingxian A</option>
                        <option value="315">Jingxian B</option>
                        <option value="316">Hunan</option>
                        <option value="317">Daqing City</option>
                        <option value="318">Xinyang City</option>
                        <option value="319">Xinjiang Province</option> <!-- // NO-PIG -->
                        <option value="320">Tibet Province</option>
                      </optgroup>
                      <optgroup label="France">
                        <option value="500">Triomphant Sub (M51)</option>
                        <option value="501">Bay of Biscay</option>
                      </optgroup>
                      <optgroup label="North Korea">
                        <option value="400">Sinpo Sub (Pukkŭksŏng-1)</option>
                        <option value="401">Sinpo</option>
                        <option value="402">P'yong'an</option>
                        <option value="403">Pyongyang</option>
                      </optgroup>
                    </select>
                    <label>Launch Location</label>
                  </div>
                  <div id="ms-lau-holder-lat" class="input-field col s12">
                    <input placeholder="00.000" id="ms-lat-lau" type="text" maxlength="8" />
                    <label for="ms-lat-lau" class="active">Custom Launch Latitude</label>
                  </div>
                  <div id="ms-lau-holder-lon" class="input-field col s12">
                    <input placeholder="00.000" id="ms-lon-lau" type="text" maxlength="8" />
                    <label for="ms-lon-lau" class="active">Custom Launch Longitude</label>
                  </div>
                  <div class="input-field col s12">
                    <select id="ms-target">
                      <option value="-1">Custom Impact</option>
                      <optgroup label="United States">
                        <option value="0">Washington DC</option>
                        <option value="1">New York City</option>
                        <option value="2">Los Angeles</option>
                        <option value="3">Chicago</option>
                        <option value="4">Boston</option>
                        <option value="5">Seattle</option>
                        <option value="6">Miami</option>
                        <option value="7">Dallas</option>
                        <option value="8">Colorado Springs</option>
                        <option value="9">Omaha</option>
                        <option value="10">Hawaii</option>
                        <option value="11">Guam</option>
                      </optgroup>
                      <optgroup label="NATO Countries">
                        <option value="12">London</option>
                        <option value="13">Paris</option>
                        <option value="14">French Caribean</option>
                        <option value="15">Madrid</option>
                        <option value="16">Rome</option>
                        <option value="17">Berlin</option>
                        <option value="18">Toronto</option>
                      </optgroup>
                      <optgroup label="Non-NATO Countries">
                        <option value="19">Moscow</option>
                        <option value="20">St. Petersburg</option>
                        <option value="21">Novosibirsk</option>
                        <option value="22">Beijing</option>
                        <option value="23">Pyongyang</option>
                      </optgroup>
                    </select>
                    <label>Target Location</label>
                  </div>
                  <div id="ms-tgt-holder-lat" class="input-field col s12">
                    <input placeholder="00.000" id="ms-lat" type="text" maxlength="8" />
                    <label for="ms-lat" class="active">Custom Target Latitude</label>
                  </div>
                  <div id="ms-tgt-holder-lon" class="input-field col s12">
                    <input placeholder="00.000" id="ms-lon" type="text" maxlength="8" />
                    <label for="ms-lon" class="active">Custom Target Longitude</label>
                  </div>
                </div>
                <div class="center-align">
                  <button class="btn btn-ui waves-effect waves-light" type="submit" name="action">Launch Missile Attack &#9658;</button>
                </div>
              </form>
              <div class="row"></div>
              <div class="center-align">
                <button id="searchRvBtn" class="btn btn-ui waves-effect waves-light" name="search">Show All Missiles &#9658;</button>
              </div>
            </div>
            <div id="ms-error" class="center-align menu-selectable start-hidden">
              <h6 class="center-align">Error</h6>
            </div>
          </div>
        </div>   
      `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-missile" class="bmenu-item">
          <img
            alt="missile"
            src="" delayedsrc=${missilePng}
          />
          <span class="bmenu-title">Missile</span>
          <div class="status-icon"></div>
        </div>
        `
  );
};

export const searchForRvs = () => {
  const { uiManager } = keepTrackApi.programs;
  uiManager.doSearch('RV_');
};

export const uiManagerFinal = (): void => {
  clickAndDragWidth(getEl('missile-menu'));
  getEl('missile').addEventListener('submit', (e: Event): void => {
    e.preventDefault();
    missileSubmit();
  });
  getEl('ms-attacker').addEventListener('change', msAttackerChange);
  getEl('ms-target').addEventListener('change', msTargetChange);
  getEl('ms-error').addEventListener('click', msErrorClick);
  getEl('missile').addEventListener('change', missileChange);
  getEl('searchRvBtn').addEventListener('click', searchForRvs);
};

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'missile',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'missile',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'missile',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'missile',
    cb: hideSideMenus,
  });

  // Missile oribts have to be updated every draw or they quickly become innacurate
  keepTrackApi.register({
    method: 'updateLoop',
    cbName: 'updateMissileOrbits',
    cb: updateLoop,
  });
};
export const msAttackerChange = () => {
  isSub = false;
  const subList = [100, 600, 213, 214, 215, 321, 500, 400];
  for (let i = 0; i < subList.length; i++) {
    if (subList[i] == parseInt((<HTMLInputElement>getEl('ms-attacker')).value)) {
      isSub = true;
    }
  }
  if (!isSub) {
    getEl('ms-lau-holder-lat').style.display = 'none';
    getEl('ms-lau-holder-lon').style.display = 'none';
  } else {
    getEl('ms-lau-holder-lat').style.display = 'block';
    getEl('ms-lau-holder-lon').style.display = 'block';
  }
};
