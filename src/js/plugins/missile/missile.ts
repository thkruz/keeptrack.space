import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';
import { missileManager } from './missileManager';

keepTrackApi.programs.missileManager = missileManager;
export const init = (): void => {
  const { drawManager, orbitManager, uiManager, satSet, timeManager, settingsManager } = keepTrackApi.programs;
  let isMissileMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'missile',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
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
                        <option value="319">Xinjiang Province</option>
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
                <button class="btn btn-ui waves-effect waves-light" onclick="searchBox.doSearch('RV_');" name="search">Show All Missiles &#9658;</button>
              </div>
            </div>
            <div id="ms-error" class="center-align menu-selectable start-hidden">
              <h6 class="center-align">Error</h6>
            </div>
          </div>
        </div>   
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-missile" class="bmenu-item">
          <img
            alt="missile"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Missile</span>
          <div class="status-icon"></div>
        </div>
      `);

      let isSub = false;
      $('#missile').on('submit', function (e) {
        $('#loading-screen').fadeIn(1000, function () {
          $('#ms-error').hide();
          var type = parseFloat(<string>$('#ms-type').val());
          var attacker = parseFloat(<string>$('#ms-attacker').val());
          let lauLat = parseFloat(<string>$('#ms-lat-lau').val());
          let lauLon = parseFloat(<string>$('#ms-lon-lau').val());
          var target = parseFloat(<string>$('#ms-target').val());
          var tgtLat = parseFloat(<string>$('#ms-lat').val());
          var tgtLon = parseFloat(<string>$('#ms-lon').val());
          // var result = false;

          let launchTime = timeManager.selectedDate * 1;

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
                e.preventDefault();
                $('#loading-screen').hide();
                return;
              }
              if (isNaN(tgtLon)) {
                uiManager.toast(`Invalid Target Longitude!`, 'critical');
                e.preventDefault();
                $('#loading-screen').hide();
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
                e.preventDefault();
                $('#loading-screen').hide();
                return;
              }
              if (isNaN(lauLon)) {
                uiManager.toast(`Invalid Launch Longitude!`, 'critical');
                e.preventDefault();
                $('#loading-screen').hide();
                return;
              }
            }

            var a, b; //, attackerName;

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
              // attackerName = missileManager.UsaICBM[a * 4 + 2];
              missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', missileMinAlt);
            } else if (attacker < 300) {
              // Russian
              a = attacker - 200;
              b = 500 - missileManager.missilesInUse;
              let missileMinAlt = 1120;
              if (attacker != 213 && attacker != 214 && attacker != 215) {
                // Use Custom Launch Site
                lauLat = <number>missileManager.RussianICBM[a * 4];
                lauLon = <number>missileManager.RussianICBM[a * 4 + 1];
              }
              // attackerName = missileManager.RussianICBM[a * 4 + 2];
              missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.RussianICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.RussianICBM[a * 4 + 3], 'Russia', missileMinAlt);
            } else if (attacker < 400) {
              // Chinese
              a = attacker - 300;
              b = 500 - missileManager.missilesInUse;
              let missileMinAlt = 1120;
              if (attacker != 321) {
                // Use Custom Launch Site
                lauLat = <number>missileManager.ChinaICBM[a * 4];
                lauLon = <number>missileManager.ChinaICBM[a * 4 + 1];
              }
              // attackerName = missileManager.ChinaICBM[a * 4 + 2];
              missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ChinaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ChinaICBM[a * 4 + 3], 'China', missileMinAlt);
            } else if (attacker < 500) {
              // North Korean
              a = attacker - 400;
              b = 500 - missileManager.missilesInUse;
              let missileMinAlt = 1120;
              if (attacker != 400) {
                // Use Custom Launch Site
                lauLat = <number>missileManager.NorthKoreanBM[a * 4];
                lauLon = <number>missileManager.NorthKoreanBM[a * 4 + 1];
              }
              // attackerName = missileManager.NorthKoreanBM[a * 4 + 2];
              missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.NorthKoreanBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.NorthKoreanBM[a * 4 + 3], 'North Korea', missileMinAlt);
            } else if (attacker < 600) {
              // French SLBM
              a = attacker - 500;
              b = 500 - missileManager.missilesInUse;
              // attackerName = missileManager.FraSLBM[a * 4 + 2];
              let missileMinAlt = 1000;
              if (attacker != 500) {
                // Use Custom Launch Site
                lauLat = <number>missileManager.FraSLBM[a * 4];
                lauLon = <number>missileManager.FraSLBM[a * 4 + 1];
              }
              // https://etikkradet.no/files/2017/02/EADS-Engelsk.pdf
              missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.FraSLBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.FraSLBM[a * 4 + 3], 'France', missileMinAlt);
            } else if (attacker < 700) {
              // United Kingdom SLBM
              a = attacker - 600;
              b = 500 - missileManager.missilesInUse;
              // attackerName = missileManager.ukSLBM[a * 4 + 2];
              let missileMinAlt = 1200;
              if (attacker != 600) {
                // Use Custom Launch Site
                lauLat = <number>missileManager.ukSLBM[a * 4];
                lauLon = <number>missileManager.ukSLBM[a * 4 + 1];
              }
              missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ukSLBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ukSLBM[a * 4 + 3], 'United Kigndom', missileMinAlt);
            }
            // if (settingsManager.isOfficialWebsite)
            //     ga(
            //         'send',
            //         'event',
            //         'New Missile',
            //         attackerName,
            //         'Attacker'
            //     );
            // if (settingsManager.isOfficialWebsite)
            //     ga(
            //         'send',
            //         'event',
            //         'New Missile',
            //         tgtLat + ', ' + tgtLon,
            //         'Target'
            //     );
            uiManager.toast(missileManager.lastMissileError, missileManager.lastMissileErrorType);
            uiManager.doSearch('RV_');
          }
          $('#loading-screen').hide();
        });
        e.preventDefault();
      });

      $('#missile-menu').resizable({
        handles: 'e',
        stop: function () {
          $(this).css('height', '');
        },
        maxWidth: 450,
        minWidth: 280,
      });

      $('#ms-attacker').on('change', () => {
        isSub = false;
        let subList = [100, 600, 213, 214, 215, 321, 500, 400];
        for (var i = 0; i < subList.length; i++) {
          if (subList[i] == parseInt(<string>$('#ms-attacker').val())) {
            isSub = true;
          }
        }
        if (!isSub) {
          $('#ms-lau-holder-lat').hide();
          $('#ms-lau-holder-lon').hide();
        } else {
          $('#ms-lau-holder-lat').show();
          $('#ms-lau-holder-lon').show();
        }
      });

      $('#ms-target').on('change', () => {
        if (parseInt(<string>$('#ms-target').val()) !== -1) {
          $('#ms-tgt-holder-lat').hide();
          $('#ms-tgt-holder-lon').hide();
        } else {
          $('#ms-tgt-holder-lat').show();
          $('#ms-tgt-holder-lon').show();
        }
      });

      $('#ms-error').on('click', function () {
        $('#ms-error').hide();
      });

      $('#missile').on('change', function () {
        if (parseFloat(<string>$('#ms-type').val()) !== 0) {
          $('#ms-custom-opt').hide();
        } else {
          $('#ms-custom-opt').show();
        }
      });      
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'missile',
    cb: (iconName: string): void => {
      if (iconName === 'menu-missile') {
        if (isMissileMenuOpen) {
          isMissileMenuOpen = false;
          uiManager.hideSideMenus();
          return;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#missile-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          $('#menu-missile').addClass('bmenu-item-selected');
          isMissileMenuOpen = true;
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'missile',
    cb: (): void => {
      $('#missile-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-missile').removeClass('bmenu-item-selected');
      isMissileMenuOpen = false;
    },
  });

  // Missile oribts have to be updated every draw or they quickly become innacurate
  keepTrackApi.register({
    method: 'updateLoop',
    cbName: 'updateMissileOrbits',
    cb: (): void => {
      if (typeof missileManager != 'undefined' && missileManager.missileArray.length > 0) {
        for (drawManager.i = 0; drawManager.i < missileManager.missileArray.length; drawManager.i++) {
          orbitManager.updateOrbitBuffer(missileManager.missileArray[drawManager.i].id);
        }
      }
    },
  });
};
