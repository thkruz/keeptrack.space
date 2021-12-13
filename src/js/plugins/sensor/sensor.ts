/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * planetarium.ts is a plugin for showing the satellites above from the perspective
 * of a view on the earth.
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2021 Theodore Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * TESTING: This plugin requires php to be installed on the server. It won't work
 * with the default http npm module.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SensorObject } from '@app/js/api/keepTrackTypes';
import $ from 'jquery';

let sensorLinks = false;
let isSensorListMenuOpen = false;
let isSensorInfoMenuOpen = false;
let isLookanglesMultiSiteMenuOpen = false;
let customSensors = <SensorObject[]>[];

export const resetSensorButtonClick = () => {
  settingsManager.isForceColorScheme = false;
  $('#menu-sensor-info').addClass('bmenu-item-disabled');
  $('#menu-fov-bubble').addClass('bmenu-item-disabled');
  $('#menu-surveillance').addClass('bmenu-item-disabled');
  $('#menu-planetarium').addClass('bmenu-item-disabled');
  $('#menu-astronomy').addClass('bmenu-item-disabled');
  resetSensorSelected();
};

export const clearCustomSensors = () => {
  const { sensorManager } = keepTrackApi.programs;
  customSensors = [];
  if (sensorManager.whichRadar === 'MULTI CUSTOM' || sensorManager.whichRadar === 'CUSTOM') {
    resetSensorButtonClick();
  }
};

export const csTelescopeClick = () => {
  const { sensorManager } = keepTrackApi.programs;
  if ($('#cs-telescope').is(':checked')) {
    $('#cs-minaz-div').hide();
    $('#cs-maxaz-div').hide();
    $('#cs-minel-div').hide();
    $('#cs-maxel-div').hide();
    $('#cs-minrange-div').hide();
    $('#cs-maxrange-div').hide();
    $('#cs-minaz').val(0);
    $('#cs-maxaz').val(360);
    $('#cs-minel').val(10);
    $('#cs-maxel').val(90);
    $('#cs-minrange').val(100);
    $('#cs-maxrange').val(1000000);
  } else {
    $('#cs-minaz-div').show();
    $('#cs-maxaz-div').show();
    $('#cs-minel-div').show();
    $('#cs-maxel-div').show();
    $('#cs-minrange-div').show();
    $('#cs-maxrange-div').show();
    if (sensorManager.checkSensorSelected()) {
      $('#cs-minaz').val(sensorManager.currentSensor[0].obsminaz);
      $('#cs-maxaz').val(sensorManager.currentSensor[0].obsmaxaz);
      $('#cs-minel').val(sensorManager.currentSensor[0].obsminel);
      $('#cs-maxel').val(sensorManager.currentSensor[0].obsmaxel);
      $('#cs-minrange').val(sensorManager.currentSensor[0].obsminrange);
      $('#cs-maxrange').val(sensorManager.currentSensor[0].obsmaxrange);
    }
  }
};
export const uiManagerInit = () => {
  const { satellite, uiManager } = keepTrackApi.programs;

  (<any>$('#nav-mobile')).append(keepTrackApi.html`
    <div id="sensor-selected"></div>
  `);

  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="sensor-list-menu" class="side-menu-parent start-hidden text-select">
          <div id="sensor-list-content" class="side-menu">                  
            <div class="row">
              <ul id="reset-sensor-text" class="sensor-reset-menu">
                <h5 id="reset-sensor-button" class="center-align menu-selectable">Reset Sensor</h5>
                <li class="divider"></li>
              </ul>
              <ul>
                <h5 class="center-align">CSpOC Sensors</h5>
                <li class="divider"></li>
                <li class="menu-selectable" data-sensor="cspocAll">All CSpOC Sensors<span class="badge dark-blue-badge"
                    data-badge-caption="Coalition"></span></li>
                <li class="menu-selectable" data-sensor="mwAll">All MW Sensors<span class="badge dark-blue-badge"
                    data-badge-caption="Coalition"></span></li>
                <li class="menu-selectable" data-sensor="BLE">Beale<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="COD">Cape Cod<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="CAV">Cavalier<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="CLR">Clear<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="CDN">Cobra Dane<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="EGL">Eglin<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="FYL">Fylingdales<span class="badge dark-blue-badge"
                    data-badge-caption="RAF"></span></li>
                <li class="menu-selectable" data-sensor="GLB">Globus II<span class="badge dark-blue-badge"
                    data-badge-caption="NOR"></span></li>
                <li class="menu-selectable" data-sensor="MIL">Millstone<span class="badge dark-blue-badge"
                    data-badge-caption="MIT"></span></li>
                <li class="menu-selectable" data-sensor="THL">Thule<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="ASC">Ascension<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="ALT">ALTAIR<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="MMW">Millimeter Wave<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="ALC">ALCOR<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="TDX">TRADEX<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="DGC">Diego Garcia<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="MAU">Maui<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="menu-selectable" data-sensor="SOC">Socorro<span class="badge dark-blue-badge"
                    data-badge-caption="USSF"></span></li>
                <li class="divider"></li>
                <h5 class="center-align">MDA Sensors</h5>
                <li class="divider"></li>
                <li class="menu-selectable" data-sensor="mdAll">All Sensors<span class="badge dark-blue-badge"
                    data-badge-caption="Coalition"></span></li>
                <li class="menu-selectable" data-sensor="HAR">Har Keren<span class="badge dark-blue-badge"
                    data-badge-caption="ISR"></span></li>
                <li class="menu-selectable" data-sensor="QTR">CENTCOM<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="KUR">Kürecik<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="SHA">Shariki<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="KCS">Kyogamisaki<span class="badge dark-blue-badge"
                    data-badge-caption="USA"></span></li>
                <li class="menu-selectable" data-sensor="SBX">Sea-Based X-Band<span class="badge dark-blue-badge"
                    data-badge-caption="USN"></span></li>
                <li class="menu-selectable" data-sensor="TAI">Taiwan SRP<span class="badge dark-blue-badge"
                    data-badge-caption="TAI"></span></li>
                <li class="divider"></li>
                <h5 class="center-align">LeoLabs Sensors</h5>
                <li class="divider"></li>
                <li class="menu-selectable" data-sensor="llAll">All Sensors<span class="badge dark-blue-badge"
                    data-badge-caption="Comm"></span></li>
                <li class="menu-selectable" data-sensor="MSR">Mdata-sensorland Radar<span class="badge dark-blue-badge"
                    data-badge-caption="Comm"></span></li>
                <li class="menu-selectable" data-sensor="PFISR">PFIS Radar<span class="badge dark-blue-badge"
                    data-badge-caption="Comm"></span></li>
                <li class="menu-selectable" data-sensor="KSR">Kiwi Space Radar<span class="badge dark-blue-badge"
                    data-badge-caption="Comm"></span></li>
                <li class="divider"></li>
                <h5 class="center-align">ESOC Sensors</h5>
                <li class="divider"></li>
                <li class="menu-selectable" data-sensor="GRV">GRAVES<span class="badge dark-blue-badge"
                    data-badge-caption="FRA"></span></li>
                <li class="menu-selectable" data-sensor="FYL">Fylingdales<span class="badge dark-blue-badge"
                    data-badge-caption="RAF"></span></li>
                <li class="menu-selectable" data-sensor="TIR">TIRA<span class="badge dark-blue-badge"
                    data-badge-caption="GER"></span></li>
                <li class="menu-selectable" data-sensor="NRC">Northern Cross<span
                    class="badge dark-blue-badge" data-badge-caption="ITA"></span></li>
                <li class="menu-selectable" data-sensor="TRO">Troodos<span class="badge dark-blue-badge"
                    data-badge-caption="RAF"></span></li>
                <li class="menu-selectable" data-sensor="SDT">Space Debris Telescope<span
                    class="badge dark-blue-badge" data-badge-caption="ESA"></span></li>
                    <!-- GALILEO GROUND SENSOR STATION -->
                <li class="menu-selectable" data-sensor="GGS">GSS Fucino<span
                    class="badge dark-blue-badge" data-badge-caption="ITA"></span></li>
                    <!-- GALILEO GROUND SENSOR STATION -->
                <li class="divider"></li>
                <h5 class="center-align">Russian Sensors</h5>
                <li class="divider"></li>
                <li class="menu-selectable" data-sensor="rusAll">All Russian Sensors<span
                    class="badge dark-blue-badge" data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="ARM">Armavir<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="BAL">Balkhash<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="GAN">Gantsevichi<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="LEK">Lekhtusi<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="MIS">Mishelevka<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="OLE">Olenegorsk<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="PEC">Pechora<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="menu-selectable" data-sensor="PIO">Pionersky<span class="badge dark-blue-badge"
                    data-badge-caption="RUS"></span></li>
                <li class="divider"></li>
                <h5 class="center-align">Chinese Sensors</h5>
                <li class="divider"></li>
                <li class="menu-selectable" data-sensor="XUA">Xuanhua<span class="badge dark-blue-badge"
                    data-badge-caption="PRC"></span></li>
                <li class="menu-selectable" data-sensor="PMO">Purple Mountain<span class="badge dark-blue-badge"
                    data-badge-caption="PRC"></span></li>
              </ul>
            </div>
          </div>
        </div>
        <div id="customSensor-menu" class="side-menu-parent start-hidden text-select">
          <div id="customSensor-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Custom Sensor</h5>
              <form id="customSensor">
                <div class="input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Latitude in Decimal Form (ex: 43.283)">
                  <input id="cs-lat" type="text" value="0" />
                  <label for="cs-lat" class="active">Latitude</label>
                </div>
                <div class="input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Longitude in Decimal Form (ex: -73.283)">
                  <input id="cs-lon" type="text" value="0" />
                  <label for="cs-lon" class="active">Longitude</label>
                </div>
                <div class="input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Elevation in kilometers (ex: 0.645)">
                  <input id="cs-hei" type="text" value="0" />
                  <label for="cs-hei" class="active">Elevation Above Sea Level (Km)</label>
                </div>
                <div class="input-field col s12">
                  <select id="cs-type">
                    <option value="Observer">Observer</option>
                    <option value="Optical">Optical</option>
                    <option value="Phased Array Radar">Phased Array Radar</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                  <label>Type of Sensor</label>
                </div>
                <div class="switch row tooltipped" data-position="right" data-delay="50" data-tooltip="Is this Sensor a Telescope?">
                  <label>
                    <input id="cs-telescope" type="checkbox" checked="false" />
                    <span class="lever"></span>
                    Telescope
                  </label>
                </div>
                <div id="cs-minaz-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Azimuth in degrees (ex: 50)">
                  <input id="cs-minaz" type="text" value="0" />
                  <label for="cs-minaz" class="active">Minimum Azimuth</label>
                </div>
                <div id="cs-maxaz-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Azimuth in degrees (ex: 120)">
                  <input id="cs-maxaz" type="text" value="360" />
                  <label for="cs-maxaz" class="active">Maximum Azimuth</label>
                </div>
                <div id="cs-minel-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Elevation in degrees (ex: 10)">
                  <input id="cs-minel" type="text" value="10" />
                  <label for="cs-minel" class="active">Minimum Elevation</label>
                </div>
                <div id="cs-maxel-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Elevation in degrees (ex: 90)">
                  <input id="cs-maxel" type="text" value="90" />
                  <label for="cs-maxel" class="active">Maximum Elevation</label>
                </div>
                <div id="cs-minrange-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Range in kilometers (ex: 500)">
                  <input id="cs-minrange" type="text" value="100" />
                  <label for="cs-minrange" class="active">Minimum Range</label>
                </div>
                <div id="cs-maxrange-div" class="start-hidden input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Range in kilometers (ex: 20000)">
                  <input id="cs-maxrange" type="text" value="50000" />
                  <label for="cs-maxrange" class="active">Maximum Range</label>
                </div>
                <div class="center-align">
                  <button id="cs-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Add Custom Sensor &#9658;</button>
                  <br />
                  <br />
                </div>
              </form>
              <div>
                <button id="cs-clear" class="btn btn-ui waves-effect waves-light" name="action">Clear Custom Sensors &#9658;</button>
                <br />
                <br />
                <button id="cs-geolocation" class="btn btn-ui waves-effect waves-light" name="search">Use Geolocation &#9658;</button>
              </div>
            </div>
          </div>
        </div>
        <div id="sensor-info-menu" class="side-menu-parent start-hidden text-select">
          <div id="sensor-content" class="side-menu">
            <div class="row">
              <h5 id="sensor-info-title" class="center-align">Sensor Name</h5>
              <div class="sensor-info-row" style="margin-top: 0px;">
                <div class="sensor-info-key">Country</div>
                <div class="sensor-info-value" id="sensor-country">USA</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Sensor Type</div>
                <div class="sensor-info-value" id="sensor-type">Unknown</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Latitude</div>
                <div class="sensor-info-value" id="sensor-latitude">0</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Longitude</div>
                <div class="sensor-info-value" id="sensor-longitude">0</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Min Azimuth</div>
                <div class="sensor-info-value" id="sensor-minazimuth">30 deg</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Max Azimuth</div>
                <div class="sensor-info-value" id="sensor-maxazimuth">30 deg</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Min Elevation</div>
                <div class="sensor-info-value" id="sensor-minelevation">60 deg</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Max Elevation</div>
                <div class="sensor-info-value" id="sensor-maxelevation">60 deg</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Min Range</div>
                <div class="sensor-info-value" id="sensor-minrange">1000 km</div>
              </div>
              <div class="sensor-info-row">
                <div class="sensor-info-key">Max Range</div>
                <div class="sensor-info-value" id="sensor-maxrange">1000 km</div>
              </div>
            </div>
          </div>
        </div>
        <div id="lookangles-menu" class="side-menu-parent start-hidden text-select">
          <div id="lookangles-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Sensor Look Angles</h5>
              <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
              <div id="settings-lookangles">
                <h5 class="center-align">Lookangles Settings</h5>
                <div class="switch row">
                  <label>
                    <input id="settings-riseset" type="checkbox" />
                    <span class="lever"></span>
                    Show Only Rise and Set Times
                  </label>
                </div>
                <div class="input-field col s6">
                  <input value="7" id="lookanglesLength" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="How Many Days of Lookangles Should be Calculated" />
                  <label for="lookanglesLength" class="active">Length (Days)</label>
                </div>
                <div class="input-field col s6">
                  <input value="5" id="lookanglesInterval" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="Seconds Between Each Line of Lookangles" />
                  <label for="lookanglesInterval" class="active">Interval</label>
                </div>
                <div class="row"></div>
              </div>
              <table id="looks" class="center-align striped-light centered"></table>
              <br />
              <center>
                <button id="export-lookangles" class="btn btn-ui waves-effect waves-light">Export &#9658;</button>
              </center>
            </div>
          </div>
        </div>
        <div id="lookanglesmultisite-menu" class="side-menu-parent start-hidden text-select">
          <div id="lookanglesmultisite-content" class="side-menu">
            <div class="row">
              <h5 class="center-align">Multi-Sensor Look Angles</h5>
              <table id="looksmultisite" class="center-align striped-light centered"></table>
              <br />
              <center>
                <button id="export-multiSiteArray" class="btn btn-ui waves-effect waves-light">Export &#9658;</button>
              </center>
            </div>
          </div>
        </div>
      `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-sensor-list" class="bmenu-item">
          <img
            alt="radar"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Sensors</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-customSensor" class="bmenu-item">
          <img
            alt="custom"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Custom Sensor</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-sensor-info" class="bmenu-item bmenu-item-disabled">
          <img
            alt="radiotower"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Sensor Info</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-lookangles" class="bmenu-item bmenu-item-disabled">
          <img
            alt="lookangles"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Look Angles</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-lookanglesmultisite" class="bmenu-item bmenu-item-disabled">
          <img
            alt="multisite"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Multi-Site Looks</span>
          <div class="status-icon"></div>
        </div>
      `);

  $('#lookanglesLength').on('change', function () {
    satellite.lookanglesLength = parseInt(<string>$('#lookanglesLength').val());
  });

  $('#lookanglesInterval').on('change', function () {
    satellite.lookanglesInterval = parseInt(<string>$('#lookanglesInterval').val());
  });

  $('#sensor-list-content > div > ul > .menu-selectable').on('click', (e: any) => {
    if (e.target.id === 'reset-sensor-button') return;
    const sensorClick = e.currentTarget.dataset.sensor;
    sensorListContentClick(sensorClick);
  });

  $('#cs-geolocation').on('click', uiManager.useCurrentGeolocationAsSensor);

  $('#cs-clear').on('click', clearCustomSensors);

  $('#reset-sensor-button').on('click', resetSensorButtonClick);

  $('#cs-telescope').on('click', csTelescopeClick);

  $('#customSensor').on('submit', (e: Event) => {
    customSensorSubmit();
    e.preventDefault();
  });
};

export const resetSensorSelected = () => {
  const { satellite, sensorManager, colorSchemeManager, uiManager, satSet } = keepTrackApi.programs;
  // Return to default settings with nothing 'inview'
  satellite.setobs(null);
  sensorManager.setSensor(null, null); // Pass staticNum to identify which sensor the user clicked
  // uiManager.getsensorinfo();
  if (settingsManager.currentColorScheme == colorSchemeManager.default) {
    uiManager.legendMenuChange('default');
  }
  satSet.satCruncher.postMessage({
    setlatlong: true,
    resetObserverGd: true,
    sensor: [sensorManager.defaultSensor],
  });
  satSet.satCruncher.postMessage({
    isShowFOVBubble: 'reset',
    isShowSurvFence: 'disable',
  });
  settingsManager.isFOVBubbleModeOn = false;
  settingsManager.isShowSurvFence = false;
  $('#menu-sensor-info').removeClass('bmenu-item-selected');
  $('#menu-fov-bubble').removeClass('bmenu-item-selected');
  $('#menu-surveillance').removeClass('bmenu-item-selected');
  $('#menu-lookangles').removeClass('bmenu-item-selected');
  $('#menu-planetarium').removeClass('bmenu-item-selected');
  $('#menu-astronomy').removeClass('bmenu-item-selected');
  $('#menu-sensor-info').addClass('bmenu-item-disabled');
  $('#menu-fov-bubble').addClass('bmenu-item-disabled');
  $('#menu-surveillance').addClass('bmenu-item-disabled');
  $('#menu-lookangles').addClass('bmenu-item-disabled');
  $('#menu-planetarium').addClass('bmenu-item-disabled');
  $('#menu-astronomy').addClass('bmenu-item-disabled');

  setTimeout(() => {
    satSet.resetSatInView();
    satSet.setColorScheme(settingsManager.currentColorScheme, true);
  }, 2000);

  keepTrackApi.methods.resetSensor();
};

export const sensorListContentClick = (sensorClick: string) => {
  const { adviceManager, sensorManager, uiManager, colorSchemeManager, mainCamera, timeManager } = keepTrackApi.programs;
  if (settingsManager.plugins.topMenu) adviceManager.adviceList.sensor();

  if (typeof sensorClick == 'undefined') {
    console.warn('The menu item was clicked but the menu was not defined.');
    return;
  }

  switch (sensorClick) {
    case 'cspocAll':
      if (settingsManager.plugins.topMenu) adviceManager.adviceList.cspocSensors();
      sensorManager.setSensor('SSN');
      break;
    case 'mwAll':
      if (settingsManager.plugins.topMenu) adviceManager.adviceList.mwSensors();
      sensorManager.setSensor('NATO-MW');
      break;
    case 'mdAll':
      sensorManager.setSensor('MD-ALL');
      break;
    case 'llAll':
      sensorManager.setSensor('LEO-LABS');
      break;
    case 'rusAll':
      sensorManager.setSensor('RUS-ALL');
      break;
    default:
      sensorManager.setSensor(sensorManager.sensorList[`${sensorClick}`]);
      break;
  }

  uiManager.getsensorinfo();

  try {
    mainCamera.lookAtLatLon(sensorManager.selectedSensor.lat, sensorManager.selectedSensor.lon, sensorManager.selectedSensor.zoom, timeManager.selectedDate);
  } catch {
    // TODO: More intentional conditional statement
    // Multi-sensors break this
  }
  if (settingsManager.currentColorScheme == colorSchemeManager.default) {
    uiManager.legendMenuChange('default');
  }
};

export const bottomMenuClick = (iconName: string): void => {
  const { uiManager, sensorManager, satSet, objectManager, satellite } = keepTrackApi.programs;
  switch (iconName) {
    case 'menu-sensor-list': // No Keyboard Commands
      if (isSensorListMenuOpen) {
        uiManager.hideSideMenus();
        isSensorListMenuOpen = false;
        break;
      } else {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        isSensorListMenuOpen = true;
        $('#menu-sensor-list').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-sensor-info': // No Keyboard Commands
      if (!sensorManager.checkSensorSelected()) {
        // No Sensor Selected
        if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.sensorInfoDisabled();
        uiManager.toast(`Select a Sensor First!`, 'caution');
        if (!$('#menu-sensor-info:animated').length) {
          $('#menu-sensor-info').effect('shake', {
            distance: 10,
          });
        }
        break;
      }
      if (isSensorInfoMenuOpen) {
        uiManager.hideSideMenus();
        isSensorInfoMenuOpen = false;
        break;
      } else {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        uiManager.getsensorinfo();
        $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        isSensorInfoMenuOpen = true;
        $('#menu-sensor-info').addClass('bmenu-item-selected');
        break;
      }
    case 'menu-lookangles': // S
      if (keepTrackApi.programs.sensorManager.isLookanglesMenuOpen) {
        keepTrackApi.programs.sensorManager.isLookanglesMenuOpen = false;
        uiManager.hideSideMenus();
        break;
      } else {
        const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
        if (!sensorManager.checkSensorSelected() || sat == null || sat.static || sat.missile || objectManager.selectedSat === -1) {
          // No Sensor or Satellite Selected
          if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.lookanglesDisabled();
          uiManager.toast(`Select a Satellite First!`, 'caution');
          if (!$('#menu-lookangles:animated').length) {
            $('#menu-lookangles').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        keepTrackApi.programs.sensorManager.isLookanglesMenuOpen = true;
        $('#loading-screen').fadeIn(1000, () => {
          satellite.getlookangles(sat);
          $('#menu-lookangles').addClass('bmenu-item-selected');
          $('#loading-screen').fadeOut('slow');
          $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        });
        break;
      }
    case 'menu-lookanglesmultisite':
      if (isLookanglesMultiSiteMenuOpen) {
        isLookanglesMultiSiteMenuOpen = false;
        uiManager.hideSideMenus();
        break;
      } else {
        if (objectManager.selectedSat === -1) {
          // No Satellite Selected
          if (settingsManager.plugins.topMenu) keepTrackApi.programs.adviceManager.adviceList.ssnLookanglesDisabled();
          uiManager.toast(`Select a Satellite First!`, 'caution');
          if (!$('#menu-lookanglesmultisite:animated').length) {
            $('#menu-lookanglesmultisite').effect('shake', {
              distance: 10,
            });
          }
          break;
        }
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        isLookanglesMultiSiteMenuOpen = true;
        $('#menu-lookanglesmultisite').addClass('bmenu-item-selected');
        if (objectManager.selectedSat !== -1) {
          $('#loading-screen').fadeIn(1000, () => {
            const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            satellite.getlookanglesMultiSite(sat);
            $('#loading-screen').fadeOut('slow');
            $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          });
        }
        break;
      }
    case 'menu-customSensor': // T
      if (keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen) {
        keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = false;
        uiManager.hideSideMenus();
        break;
      } else {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();

        if (sensorManager.checkSensorSelected()) {
          $('#cs-lat').val(sensorManager.currentSensor[0].lat);
          $('#cs-lon').val(sensorManager.currentSensor[0].lon);
          $('#cs-hei').val(sensorManager.currentSensor[0].alt);
        }

        $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = true;
        $('#menu-customSensor').addClass('bmenu-item-selected');
        break;
      }
  }
};
export const init = (): void => {
  const { sensorManager } = keepTrackApi.programs;
  sensorManager.isCustomSensorMenuOpen = false;
  sensorManager.isCustomSensorMenuOpen = false;
  sensorManager.isLookanglesMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'sensor',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'sensor',
    cb: bottomMenuClick,
  });

  // Register satinfobox links
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'sensor',
    cb: selectSatData,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'sensor',
    cb: hideSideMenus,
  });
};

export const selectSatData = () => {
  const { satSet } = keepTrackApi.programs;
  if (!sensorLinks) {
    $('#sat-info-top-links').append(keepTrackApi.html`
        <div id="sensors-in-fov-link" class="link sat-infobox-links">Show All Sensors with FOV...</div>
      `);
    $('#sensors-in-fov-link').on('click', () => {
      Object.keys(keepTrackApi.programs.sensorManager.sensorList).forEach((key) => {
        const sensor = keepTrackApi.programs.sensorManager.sensorList[key];
        const sat = keepTrackApi.programs.satSet.getSat(keepTrackApi.programs.objectManager.selectedSat);
        const tearr = sat.getTEARR(null, sensor);
        if (tearr.inView) {
          keepTrackApi.programs.lineManager.create('sat6', [sat.id, satSet.getSensorFromSensorName(sensor.name)], 'g');
        }
      });
    });
    sensorLinks = true;
  }
};

export const hideSideMenus = (): void => {
  $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-customSensor').removeClass('bmenu-item-selected');
  $('#menu-sensor-list').removeClass('bmenu-item-selected');
  $('#menu-sensor-info').removeClass('bmenu-item-selected');
  $('#menu-lookangles').removeClass('bmenu-item-selected');
  $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
  keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = false;
  isSensorListMenuOpen = false;
  isSensorInfoMenuOpen = false;
  keepTrackApi.programs.sensorManager.isLookanglesMenuOpen = false;
  isLookanglesMultiSiteMenuOpen = false;
};
export const customSensorSubmit = (): void => {
  const { sensorManager, satSet, satellite, mainCamera, timeManager, objectManager } = keepTrackApi.programs;
  $('#menu-sensor-info').removeClass('bmenu-item-disabled');
  $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
  $('#menu-surveillance').removeClass('bmenu-item-disabled');
  $('#menu-planetarium').removeClass('bmenu-item-disabled');
  $('#menu-astronomy').removeClass('bmenu-item-disabled');
  $('#sensor-type').html((<string>$('#cs-type').val()).replace(/</gu, '&lt;').replace(/>/gu, '&gt;'));
  $('#sensor-info-title').html('Custom Sensor');
  $('#sensor-country').html('Custom Sensor');

  const lon = parseFloat(<string>$('#cs-lon').val());
  const lat = parseFloat(<string>$('#cs-lat').val());
  const alt = $('#cs-hei').val();
  const sensorType = $('#cs-type').val();
  const minaz = $('#cs-minaz').val();
  const maxaz = $('#cs-maxaz').val();
  const minel = $('#cs-minel').val();
  const maxel = $('#cs-maxel').val();
  const minrange = $('#cs-minrange').val();
  const maxrange = $('#cs-maxrange').val();

  customSensors.push(<SensorObject>{
    lat: lat,
    lon: lon,
    alt: parseFloat(<string>alt),
    obsminaz: parseFloat(<string>minaz),
    obsmaxaz: parseFloat(<string>maxaz),
    obsminel: parseFloat(<string>minel),
    obsmaxel: parseFloat(<string>maxel),
    obsminrange: parseFloat(<string>minrange),
    obsmaxrange: parseFloat(<string>maxrange),
    type: sensorType,
  });

  sensorManager.whichRadar = customSensors.length > 1 ? 'MULTI CUSTOM' : 'CUSTOM';

  satSet.satCruncher.postMessage({
    setlatlong: true,
    sensor: customSensors,
    multiSensor: customSensors.length > 1,
  });
  satellite.setobs(customSensors);
  objectManager.setSelectedSat(-1);
  satSet.setColorScheme(settingsManager.currentColorScheme, true);

  if (customSensors.length === 1) {
    if (maxrange > 6000) {
      mainCamera.changeZoom('geo');
    } else {
      mainCamera.changeZoom('leo');
    }
    mainCamera.camSnap(mainCamera.latToPitch(lat), mainCamera.longToYaw(lon, timeManager.selectedDate));
  }
};
