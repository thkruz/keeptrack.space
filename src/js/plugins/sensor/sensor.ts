/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import customPng from '@app/img/icons/custom.png';
import lookanglesPng from '@app/img/icons/lookangles.png';
import multiSitePng from '@app/img/icons/multi-site.png';
import radarPng from '@app/img/icons/radar.png';
import radioTowerPng from '@app/img/icons/radio-tower.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SatObject, SensorObject } from '@app/js/api/keepTrackTypes';
import { clickAndDragWidth, getEl, shake, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { toast } from '@app/js/uiManager/ui/toast';
import {
  helpBodyTextCustomSensor,
  helpBodyTextLookAngles,
  helpBodyTextMultiLookAngles,
  helpBodyTextSensorInfo,
  helpBodyTextSensors,
  helpTitleTextCustomSensor,
  helpTitleTextLookAngles,
  helpTitleTextMultiLookAngles,
  helpTitleTextSensorInfo,
  helpTitleTextSensors,
} from './help';

let sensorLinks = false;
let isSensorListMenuOpen = false;
let isSensorInfoMenuOpen = false;
let isLookanglesMultiSiteMenuOpen = false;
let customSensors = <SensorObject[]>[];

export const resetSensorButtonClick = () => {
  getEl('menu-sensor-info')?.classList.add('bmenu-item-disabled');
  getEl('menu-fov-bubble')?.classList.add('bmenu-item-disabled');
  getEl('menu-surveillance')?.classList.add('bmenu-item-disabled');
  getEl('menu-planetarium')?.classList.add('bmenu-item-disabled');
  getEl('menu-astronomy')?.classList.add('bmenu-item-disabled');
  if (keepTrackApi.programs.mainCamera.cameraType.current === keepTrackApi.programs.mainCamera.cameraType.Planetarium) {
    const { drawManager, mainCamera, uiManager, orbitManager } = keepTrackApi.programs;
    keepTrackApi.programs.planetarium.isPlanetariumView = false;
    mainCamera.isPanReset = true;
    mainCamera.isLocalRotateReset = true;
    settingsManager.fieldOfView = 0.6;
    drawManager.glInit();
    uiManager.hideSideMenus();
    orbitManager.clearInViewOrbit(); // Clear Orbits if Switching from Planetarium View
    mainCamera.cameraType.current = mainCamera.cameraType.Default; // Back to normal Camera Mode
    // TODO: implement fov information
    // getEl('fov-text').innerHTML = ('');
    getEl('menu-planetarium').classList.remove('bmenu-item-selected');
  }
  resetSensorSelected();
};

export const clearCustomSensors = () => {
  const { sensorManager } = keepTrackApi.programs;
  customSensors = [];
  if (sensorManager.whichRadar === 'MULTI CUSTOM' || sensorManager.whichRadar === 'CUSTOM') {
    sensorManager.setSensor(sensorManager.selectedSensor);
  }
};

export const removeLastSensor = () => {
  if (customSensors.length > 1) {
    customSensors.pop();
    updateCruncherOnCustomSensors();
  } else {
    clearCustomSensors();
  }
};

export const csTelescopeClick = () => {
  const { sensorManager } = keepTrackApi.programs;
  // If it is checked
  if ((<HTMLInputElement>getEl('cs-telescope')).checked) {
    getEl('cs-minaz-div').style.display = 'none';
    getEl('cs-maxaz-div').style.display = 'none';
    getEl('cs-minel-div').style.display = 'none';
    getEl('cs-maxel-div').style.display = 'none';
    getEl('cs-minrange-div').style.display = 'none';
    getEl('cs-maxrange-div').style.display = 'none';
    (<HTMLInputElement>getEl('cs-minaz')).value = '0';
    (<HTMLInputElement>getEl('cs-maxaz')).value = '360';
    (<HTMLInputElement>getEl('cs-minel')).value = '10';
    (<HTMLInputElement>getEl('cs-maxel')).value = '90';
    (<HTMLInputElement>getEl('cs-minrange')).value = '100';
    (<HTMLInputElement>getEl('cs-maxrange')).value = '1000000';
  } else {
    getEl('cs-minaz-div').style.display = 'block';
    getEl('cs-maxaz-div').style.display = 'block';
    getEl('cs-minel-div').style.display = 'block';
    getEl('cs-maxel-div').style.display = 'block';
    getEl('cs-minrange-div').style.display = 'block';
    getEl('cs-maxrange-div').style.display = 'block';
    if (sensorManager.checkSensorSelected()) {
      (<HTMLInputElement>getEl('cs-minaz')).value = sensorManager.currentSensor[0].obsminaz.toString();
      (<HTMLInputElement>getEl('cs-maxaz')).value = sensorManager.currentSensor[0].obsmaxaz.toString();
      (<HTMLInputElement>getEl('cs-minel')).value = sensorManager.currentSensor[0].obsminel.toString();
      (<HTMLInputElement>getEl('cs-maxel')).value = sensorManager.currentSensor[0].obsmaxel.toString();
      (<HTMLInputElement>getEl('cs-minrange')).value = sensorManager.currentSensor[0].obsminrange.toString();
      (<HTMLInputElement>getEl('cs-maxrange')).value = sensorManager.currentSensor[0].obsmaxrange.toString();
    }
  }
};
export const uiManagerInit = () => {
  getEl('nav-mobile').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="sensor-selected"></div>
  `
  );

  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
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
                <li id="cspocAllSensor" class="menu-selectable" data-sensor="cspocAll">All CSpOC Sensors<span class="badge dark-blue-badge"
                    data-badge-caption="Coalition"></span></li>
                <li id="mwAllSensor" class="menu-selectable" data-sensor="mwAll">All MW Sensors<span class="badge dark-blue-badge"
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
                <li id="mdAllSensor" class="menu-selectable" data-sensor="mdAll">All Sensors<span class="badge dark-blue-badge"
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
                <li id="llAllSensor" class="menu-selectable" data-sensor="llAll">All Sensors<span class="badge dark-blue-badge"
                    data-badge-caption="Comm"></span></li>
                <li class="menu-selectable" data-sensor="CRSR">Costa Rica Space Radar<span class="badge dark-blue-badge"
                    data-badge-caption="Comm"></span></li>
                <li class="menu-selectable" data-sensor="MSR">Midland Space Radar<span class="badge dark-blue-badge"
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
                <li id="rusAllSensor" class="menu-selectable" data-sensor="rusAll">All Russian Sensors<span
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
                <li id="prcAllSensor" class="menu-selectable" data-sensor="prcAll">All Chinese Sensors<span
                    class="badge dark-blue-badge" data-badge-caption="PRC"></span></li>
                <li class="menu-selectable" data-sensor="XIN">Xingjiang<span class="badge dark-blue-badge"
                    data-badge-caption="PRC"></span></li>
                <li class="menu-selectable" data-sensor="ZHE">Zhejiang<span class="badge dark-blue-badge"
                    data-badge-caption="PRC"></span></li>                    
                <li class="menu-selectable" data-sensor="HEI">Heilongjiang<span class="badge dark-blue-badge"
                    data-badge-caption="PRC"></span></li>       
                <li class="menu-selectable" data-sensor="SHD">Shadong<span class="badge dark-blue-badge"
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
                  <button id="cs-clear" class="btn btn-ui waves-effect waves-light" name="action">Clear Custom Sensors &#9658;</button>
                  <br />
                  <br />
                  <button id="cs-geolocation" class="btn btn-ui waves-effect waves-light" name="search">Use Geolocation &#9658;</button>
                </div>
              </form>
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
              <div class="center-align row">
                <button id="sensor-sun-btn" class="btn btn-ui waves-effect waves-light" type="button">Draw Line to Sun &#9658;</button>
              </div>
              <div class="center-align row">
                <button id="sensor-moon-btn" class="btn btn-ui waves-effect waves-light" type="button">Draw Line to Moon &#9658;</button>
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
                  <input value="2" id="lookanglesLength" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="How Many Days of Lookangles Should be Calculated" />
                  <label for="lookanglesLength" class="active">Length (Days)</label>
                </div>
                <div class="input-field col s6">
                  <input value="30" id="lookanglesInterval" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="Seconds Between Each Line of Lookangles" />
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
      `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-sensor-list" class="bmenu-item">
          <img
            alt="radar"
            src="" delayedsrc="${radarPng}" 
          />
          <span class="bmenu-title">Sensors</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-customSensor" class="bmenu-item">
          <img
            alt="custom"
            src="" delayedsrc="${customPng}"
          />
          <span class="bmenu-title">Custom Sensor</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-sensor-info" class="bmenu-item bmenu-item-disabled">
          <img
            alt="radiotower"
            src="" delayedsrc="${radioTowerPng}"
          />
          <span class="bmenu-title">Sensor Info</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-lookangles" class="bmenu-item bmenu-item-disabled">
          <img
            alt="lookangles"
            src="" delayedsrc="${lookanglesPng}"
          />
          <span class="bmenu-title">Look Angles</span>
          <div class="status-icon"></div>
        </div>
        <div id="menu-lookanglesmultisite" class="bmenu-item bmenu-item-disabled">
          <img
            alt="multisite"
            src="" delayedsrc="${multiSitePng}"
          />
          <span class="bmenu-title">Multi-Site Looks</span>
          <div class="status-icon"></div>
        </div>
      `
  );
};

export const refreshLookanglesData = () => {
  const { satellite, objectManager, satSet } = keepTrackApi.programs;
  showLoading(() => {
    const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
    if (sat) {
      satellite.getlookangles(sat);
    }
  });
};

export const settingsRisesetChange = (e: any, isRiseSetChecked?: boolean) => {
  const { satellite } = keepTrackApi.programs;
  if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');

  isRiseSetChecked ??= (<HTMLInputElement>getEl('settings-riseset')).checked;
  if (isRiseSetChecked) {
    satellite.isRiseSetLookangles = true;
  } else {
    satellite.isRiseSetLookangles = false;
  }
  refreshLookanglesData();
};

export const uiManagerFinal = () => {
  const { satellite, uiManager } = keepTrackApi.programs;

  getEl('lookanglesLength').addEventListener('change', function () {
    satellite.lookanglesLength = parseInt(<string>(<HTMLInputElement>getEl('lookanglesLength')).value);
    refreshLookanglesData();
  });

  getEl('lookanglesInterval').addEventListener('change', function () {
    satellite.lookanglesInterval = parseInt(<string>(<HTMLInputElement>getEl('lookanglesInterval')).value);
    refreshLookanglesData();
  });

  getEl('sensor-sun-btn').addEventListener('click', () => {
    const { lineManager, satSet, drawManager, sensorManager } = keepTrackApi.programs;

    // Draw Line to Sun from Sensor
    const sensors = sensorManager.currentSensor;
    if (sensors.length !== 1) {
      toast('Please Select Only One Sensor', 'caution');
    }
    const sensor = sensors[0];
    const sensorId = satSet.getSensorFromSensorName(sensor.name);
    lineManager.create('sat2', [sensorId, drawManager.sceneManager.sun.pos[0], drawManager.sceneManager.sun.pos[1], drawManager.sceneManager.sun.pos[2]], 'o');
  });

  getEl('sensor-moon-btn').addEventListener('click', () => {
    const { lineManager, satSet, drawManager, sensorManager } = keepTrackApi.programs;

    // Draw Line to Sun from Sensor
    const sensors = sensorManager.currentSensor;
    if (sensors.length !== 1) {
      toast('Please Select Only One Sensor', 'caution');
    }
    const sensor = sensors[0];
    const sensorId = satSet.getSensorFromSensorName(sensor.name);
    lineManager.create(
      'sat2',
      [sensorId, drawManager.sceneManager.moon.drawPosition[0], drawManager.sceneManager.moon.drawPosition[1], drawManager.sceneManager.moon.drawPosition[2]],
      'w'
    );
  });

  getEl('settings-riseset').addEventListener('change', settingsRisesetChange);

  getEl('sensor-list-content').addEventListener('click', (e: any) => {
    if (!e.target.classList.contains('menu-selectable')) return;
    if (e.target.id === 'reset-sensor-button') return;
    const sensorClick = e.target.dataset.sensor;
    sensorListContentClick(sensorClick);
  });

  getEl('customSensor').addEventListener('submit', (e: Event) => {
    e.preventDefault();
  });

  clickAndDragWidth(getEl('sensor-list-menu'), { minWidth: 280, maxWidth: 450 });
  clickAndDragWidth(getEl('sensor-info-menu'), { minWidth: 280, maxWidth: 450 });
  clickAndDragWidth(getEl('customSensor-menu'), { minWidth: 280, maxWidth: 450 });
  clickAndDragWidth(getEl('lookangles-menu'), { minWidth: 280, maxWidth: 450 });
  clickAndDragWidth(getEl('lookanglesmultisite-menu'), { minWidth: 280, maxWidth: 450 });

  getEl('reset-sensor-button').addEventListener('click', resetSensorButtonClick);
  getEl('cs-telescope').addEventListener('click', csTelescopeClick);
  getEl('cs-submit').addEventListener('click', customSensorSubmit);
  getEl('cs-clear').addEventListener('click', clearCustomSensors);
  getEl('cs-geolocation').addEventListener('click', uiManager.useCurrentGeolocationAsSensor);
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
    typ: 'sensor',
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
  getEl('menu-sensor-info')?.classList.remove('bmenu-item-selected');
  getEl('menu-fov-bubble')?.classList.remove('bmenu-item-selected');
  getEl('menu-surveillance')?.classList.remove('bmenu-item-selected');
  getEl('menu-lookangles')?.classList.remove('bmenu-item-selected');
  getEl('menu-planetarium')?.classList.remove('bmenu-item-selected');
  getEl('menu-astronomy')?.classList.remove('bmenu-item-selected');
  getEl('menu-sensor-info')?.classList.add('bmenu-item-disabled');
  getEl('menu-fov-bubble')?.classList.add('bmenu-item-disabled');
  getEl('menu-surveillance')?.classList.add('bmenu-item-disabled');
  getEl('menu-lookangles')?.classList.add('bmenu-item-disabled');
  getEl('menu-planetarium')?.classList.add('bmenu-item-disabled');
  getEl('menu-astronomy')?.classList.add('bmenu-item-disabled');

  setTimeout(() => {
    satSet.resetSatInView();
    satSet.setColorScheme(settingsManager.currentColorScheme, true);
  }, 2000);

  keepTrackApi.methods.resetSensor();
};

export const sensorListContentClick = (sensorClick: string) => {
  const { sensorManager, uiManager, colorSchemeManager, mainCamera, timeManager } = keepTrackApi.programs;

  if (typeof sensorClick == 'undefined') {
    console.warn('The menu item was clicked but the menu was not defined.');
    return;
  }

  switch (sensorClick) {
    case 'cspocAll':
      sensorManager.setSensor('SSN');
      break;
    case 'mwAll':
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
    case 'prcAll':
      sensorManager.setSensor('PRC-ALL');
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

// prettier-ignore
export const bottomMenuClick = (iconName: string): void => { // NOSONAR
  const { planetarium, uiManager, sensorManager, satSet, objectManager, satellite } = keepTrackApi.programs;
  switch (iconName) {
    case 'menu-sensor-list': // No Keyboard Commands
      if (isSensorListMenuOpen) {
        uiManager.hideSideMenus();
        isSensorListMenuOpen = false;
        break;
      } else {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        if (planetarium?.isPlanetariumView) {
          getEl('cspocAllSensor').style.display = 'none';
          getEl('mwAllSensor').style.display = 'none';
          getEl('mdAllSensor').style.display = 'none';
          getEl('llAllSensor').style.display = 'none';
          getEl('rusAllSensor').style.display = 'none';
          getEl('prcAllSensor').style.display = 'none';
        } else {
          getEl('cspocAllSensor').style.display = 'block';
          getEl('mwAllSensor').style.display = 'block';
          getEl('mdAllSensor').style.display = 'block';
          getEl('llAllSensor').style.display = 'block';
          getEl('rusAllSensor').style.display = 'block';
          getEl('prcAllSensor').style.display = 'block';
        }
        slideInRight(getEl('sensor-list-menu'), 1000);
        isSensorListMenuOpen = true;
        getEl('menu-sensor-list')?.classList.add('bmenu-item-selected');
        break;
      }
    case 'menu-sensor-info': // No Keyboard Commands
      if (!sensorManager.checkSensorSelected()) {
        // No Sensor Selected
        uiManager.toast(`Select a Sensor First!`, 'caution');
        shake(getEl('menu-sensor-info'));
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
        slideInRight(getEl('sensor-info-menu'), 1000);
        isSensorInfoMenuOpen = true;
        getEl('menu-sensor-info')?.classList.add('bmenu-item-selected');
        break;
      }
    case 'menu-lookangles': // S
      if (keepTrackApi.programs.sensorManager.isLookanglesMenuOpen) {
        keepTrackApi.programs.sensorManager.isLookanglesMenuOpen = false;
        uiManager.hideSideMenus();
        break;
      } else {
        const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
        if (!sensorManager.checkSensorSelected()) {
          // No Sensor Selected
          uiManager.toast(`Select a Sensor First!`, 'caution');
          shake(getEl('menu-lookangles'));
          break;
        } else if (sat == null || sat.static || sat.missile || objectManager.selectedSat === -1) {
          // No Satellite Selected
          uiManager.toast(`Select a Satellite First!`, 'caution');
          shake(getEl('menu-lookangles'));
          break;
        }
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        keepTrackApi.programs.sensorManager.isLookanglesMenuOpen = true;
        showLoading(() => {
          satellite.getlookangles(sat);
          getEl('menu-lookangles')?.classList.add('bmenu-item-selected');
          slideInRight(getEl('lookangles-menu'), 1000);
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
          uiManager.toast(`Select a Satellite First!`, 'caution');
          shake(getEl('menu-lookanglesmultisite'));
          break;
        }
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        isLookanglesMultiSiteMenuOpen = true;
        getEl('menu-lookanglesmultisite')?.classList.add('bmenu-item-selected');
        if (objectManager.selectedSat !== -1) {
          showLoading(() => {
            const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
            satellite.getlookanglesMultiSite(sat);
            slideInRight(getEl('lookanglesmultisite-menu'), 1000);
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
          (<HTMLInputElement>getEl('cs-lat')).value = sensorManager.currentSensor[0].lat.toString();
          (<HTMLInputElement>getEl('cs-lon')).value = sensorManager.currentSensor[0].lon.toString();
          (<HTMLInputElement>getEl('cs-hei')).value = sensorManager.currentSensor[0].alt.toString();
        }

        slideInRight(getEl('customSensor-menu'), 1000);
        keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = true;
        getEl('menu-customSensor')?.classList.add('bmenu-item-selected');
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

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'sensor',
    cb: uiManagerFinal,
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

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'sensor',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isSensorListMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextSensors, helpBodyTextSensors);
    return true;
  }

  if (keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextCustomSensor, helpBodyTextCustomSensor);
    return true;
  }

  if (isSensorInfoMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextSensorInfo, helpBodyTextSensorInfo);
    return true;
  }

  if (keepTrackApi.programs.sensorManager.isLookanglesMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextLookAngles, helpBodyTextLookAngles);
    return true;
  }

  if (isLookanglesMultiSiteMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextMultiLookAngles, helpBodyTextMultiLookAngles);
    return true;
  }

  return false;
};

export const selectSatData = (sat: SatObject) => {
  // Skip this if there is no satellite object because the menu isn't open
  if (sat === null || typeof sat === 'undefined') {
    return;
  }

  const { satSet } = keepTrackApi.programs;
  if (!sensorLinks) {
    getEl('sat-info-top-links').insertAdjacentHTML(
      'beforeend',
      keepTrackApi.html`
        <div id="sensors-in-fov-link" class="link sat-infobox-links">Show All Sensors with FOV...</div>
      `
    );
    getEl('sensors-in-fov-link').addEventListener('click', () => {
      Object.keys(keepTrackApi.programs.sensorManager.sensorList).forEach((key) => {
        const sensor = keepTrackApi.programs.sensorManager.sensorList[key];
        const sat = keepTrackApi.programs.satSet.getSat(keepTrackApi.programs.objectManager.selectedSat);
        const tearr = sat.getTEARR(null, [sensor]);
        if (tearr.inView) {
          keepTrackApi.programs.lineManager.create('sat6', [sat.id, satSet.getSensorFromSensorName(sensor.name)], 'g');
        }
      });
    });
    sensorLinks = true;
  }
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('customSensor-menu'), 1000);
  slideOutLeft(getEl('sensor-info-menu'), 1000);
  slideOutLeft(getEl('sensor-list-menu'), 1000);
  slideOutLeft(getEl('lookangles-menu'), 1000);
  slideOutLeft(getEl('lookanglesmultisite-menu'), 1000);
  slideOutLeft(getEl('customSensor-menu'), 1000);
  getEl('menu-customSensor')?.classList.remove('bmenu-item-selected');
  getEl('menu-sensor-list')?.classList.remove('bmenu-item-selected');
  getEl('menu-sensor-info')?.classList.remove('bmenu-item-selected');
  getEl('menu-lookangles')?.classList.remove('bmenu-item-selected');
  getEl('menu-lookanglesmultisite')?.classList.remove('bmenu-item-selected');
  keepTrackApi.programs.sensorManager.isCustomSensorMenuOpen = false;
  isSensorListMenuOpen = false;
  isSensorInfoMenuOpen = false;
  keepTrackApi.programs.sensorManager.isLookanglesMenuOpen = false;
  isLookanglesMultiSiteMenuOpen = false;
};

export const addCustomSensor = (sensor: SensorObject): SensorObject[] => {
  customSensors.push(sensor);
  return customSensors;
};

export const customSensorSubmit = (): void => {
  const { mainCamera, timeManager } = keepTrackApi.programs;
  getEl('menu-sensor-info')?.classList.remove('bmenu-item-disabled');
  getEl('menu-fov-bubble')?.classList.remove('bmenu-item-disabled');
  getEl('menu-surveillance')?.classList.remove('bmenu-item-disabled');
  getEl('menu-planetarium')?.classList.remove('bmenu-item-disabled');
  getEl('menu-astronomy')?.classList.remove('bmenu-item-disabled');
  (<HTMLInputElement>getEl('sensor-type')).value = (<HTMLInputElement>getEl('cs-type')).value.replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
  getEl('sensor-info-title').innerHTML = 'Custom Sensor';
  getEl('sensor-country').innerHTML = 'Custom Sensor';

  const lon = parseFloat(<string>(<HTMLInputElement>getEl('cs-lon')).value);
  const lat = parseFloat(<string>(<HTMLInputElement>getEl('cs-lat')).value);
  const alt = (<HTMLInputElement>getEl('cs-hei')).value;
  const sensorType = (<HTMLInputElement>getEl('cs-type')).value;
  const minaz = (<HTMLInputElement>getEl('cs-minaz')).value;
  const maxaz = (<HTMLInputElement>getEl('cs-maxaz')).value;
  const minel = (<HTMLInputElement>getEl('cs-minel')).value;
  const maxel = (<HTMLInputElement>getEl('cs-maxel')).value;
  const minrange = (<HTMLInputElement>getEl('cs-minrange')).value;
  const maxrange = (<HTMLInputElement>getEl('cs-maxrange')).value;

  addCustomSensor(<SensorObject>(<unknown>{
    lat,
    lon,
    alt: parseFloat(<string>alt),
    obsminaz: parseFloat(<string>minaz),
    obsmaxaz: parseFloat(<string>maxaz),
    obsminel: parseFloat(<string>minel),
    obsmaxel: parseFloat(<string>maxel),
    obsminrange: parseFloat(<string>minrange),
    obsmaxrange: parseFloat(<string>maxrange),
    type: sensorType,
  }));

  updateCruncherOnCustomSensors();

  if (customSensors.length === 1) {
    if (parseFloat(maxrange) > 6000) {
      mainCamera.changeZoom('geo');
    } else {
      mainCamera.changeZoom('leo');
    }
    mainCamera.camSnap(mainCamera.lat2pitch(lat), mainCamera.lon2yaw(lon, timeManager.selectedDate));
  }
};

export const updateCruncherOnCustomSensors = () => {
  const { sensorManager, satSet, satellite, objectManager } = keepTrackApi.programs;
  sensorManager.whichRadar = customSensors.length > 1 ? 'MULTI CUSTOM' : 'CUSTOM';

  satSet.satCruncher.postMessage({
    typ: 'sensor',
    setlatlong: true,
    sensor: customSensors,
    multiSensor: customSensors.length > 1,
  });
  satellite.setobs(customSensors);
  objectManager.setSelectedSat(-1);
  satSet.setColorScheme(settingsManager.currentColorScheme, true);
};
