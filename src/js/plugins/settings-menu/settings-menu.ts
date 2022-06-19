import settingsPng from '@app/img/icons/settings.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { getEl, parseRgba, rgbCss, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import $ from 'jquery';

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

let isSettingsMenuOpen = false;
let isNotColorPickerInitialSetup = false;
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'settingsMenu',
    cb: () => uiManagerInit(),
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'settingsMenu',
    cb: () => uiManagerFinal(),
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'settingsMenu',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'sensor',
    cb: (): void => hideSideMenus(),
  });
};

export const uiManagerInit = (): void => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="settings-menu" class="side-menu-parent start-hidden text-select">
      <div id="settings-content" class="side-menu">
        <div class="row">
          <form id="settings-form">
            <div id="settings-general">
              <div class="row center"></div>
              </br>
              <div class="row center">
                <button id="settings-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Settings &#9658;</button>
              </div>
              <h5 class="center-align">General Settings</h5>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable this to hide orbit lines">
                  <input id="settings-drawOrbits" type="checkbox" checked/>
                  <span class="lever"></span>
                  Draw Orbits
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Orbits will be drawn using ECF vs ECI (Mainly for GEO Orbits)">
                  <input id="settings-drawEcf" type="checkbox" />
                  <span class="lever"></span>
                  Draw Orbits in ECF
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Draw lines from sensor to satellites when in FOV">
                  <input id="settings-isDrawInCoverageLines" type="checkbox" checked/>
                  <span class="lever"></span>
                  Draw FOV Lines
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Draw the Sun">
                  <input id="settings-drawSun" type="checkbox" checked/>
                  <span class="lever"></span>
                  Draw the Sun
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Hides Earth Textures">
                  <input id="settings-drawBlackEarth" type="checkbox"/>
                  <span class="lever"></span>
                  Draw Black Earth
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Draw Milky Way in Background">
                  <input id="settings-drawMilkyWay" type="checkbox" checked/>
                  <span class="lever"></span>
                  Draw the Milky Way
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Display ECI Coordinates on Hover">
                  <input id="settings-eciOnHover" type="checkbox"/>
                  <span class="lever"></span>
                  Display ECI on Hover
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Non-selectable satellites will be hidden instead of grayed out.">
                  <input id="settings-hos" type="checkbox" />
                  <span class="lever"></span>
                  Hide Other Satellites
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Every 3 seconds a new satellite will be selected from FOV">
                  <input id="settings-demo-mode" type="checkbox" />
                  <span class="lever"></span>
                  Enable Demo Mode
                </label>
              </div>
              <div class="switch row">
                <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Small text labels will appear next to all satellites in FOV.">
                  <input id="settings-sat-label-mode" type="checkbox" checked />
                  <span class="lever"></span>
                  Enable Satellite Label Mode
                </label>
              </div>
            </div>
            <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
            <div id="settings-colors">
              <h5 class="center-align">Color Settings</h5>
              <div class="input-field col s6">
                <center>
                  <p>Payload</p>
                  <button id="settings-color-payload" class="btn waves-effect waves-light"></button>
                </center>
              </div>
              <div class="input-field col s6">
                <center>
                  <p>Rocket Body</p>
                  <button id="settings-color-rocketBody" class="btn waves-effect waves-light"></button>
                </center>
              </div>
              <div class="input-field col s6">
                <center>
                  <p>Debris</p>
                  <button id="settings-color-debris" class="btn waves-effect waves-light"></button>
                </center>
              </div>
              <div class="input-field col s6">
                <center>
                  <p>In View</p>
                  <button id="settings-color-inview" class="btn waves-effect waves-light"></button>
                </center>
              </div>
              <div class="input-field col s6">
                <center>
                  <p>Missile</p>
                  <button id="settings-color-missile" class="btn waves-effect waves-light"></button>
                </center>
              </div>
              <div class="input-field col s6">
                <center>
                  <p>Missile (FOV)</p>
                  <button id="settings-color-missileInview" class="btn waves-effect waves-light"></button>
                </center>
              </div>
              <div class="input-field col s6">
                <center>
                  <p>Special Sats</p>
                  <button id="settings-color-trusat" class="btn waves-effect waves-light"></button>
                </center>
              </div>
            </div>
            <div class="row"></div>
            <div id="settings-opt">
              <h5 class="center-align">Settings Overrides</h5>
              <div class="input-field col s12">
                <input value="150" id="maxSearchSats" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="Maximum satellites to display in search" />
                <label for="maxSearchSats" class="active">Maximum Satellites in Search</label>
              </div>
              <div class="input-field col s12">
                <input value="30" id="satFieldOfView" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="What is the satellite's field of view in degrees" />
                <label for="satFieldOfView" class="active">Satellite Field of View</label>
              </div>
              <div class="row"></div>
            </div>
            <div id="fastCompSettings">
              <h5 class="center-align">Fast CPU Required</h5>
              <div class="switch row">
                <label>
                  <input id="settings-snp" type="checkbox" />
                  <span class="lever"></span>
                  Show Next Pass on Hover
                </label>
              </div>
            </div>
            <!-- <div id="settings-lowperf" class="row center">
              <button class="red btn waves-effect waves-light" onclick="uiManager.startLowPerf();">Low End PC Version &#9658;</button>
            </div> -->
          </form>
        </div>
      </div>
    </div>
    `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="menu-settings" class="bmenu-item">
      <img
        alt="settings"
        src=""
        delayedsrc="${settingsPng}"
      />
      <span class="bmenu-title">Settings</span>
      <div class="status-icon"></div>
    </div>
  `
  );

  (() => {
    const colorPalette = [
      rgbCss([1.0, 0.0, 0.0, 1.0]), // Red
      rgbCss([1.0, 0.75, 0.0, 1.0]), // Orange
      rgbCss([0.85, 0.5, 0.0, 1.0]), // Dark Orange
      rgbCss([1.0, 1.0, 0.0, 1.0]), // Yellow
      rgbCss([0, 1, 0, 1]), // Green
      rgbCss([0.2, 1.0, 0.0, 0.5]), // Mint
      rgbCss([0.2, 1.0, 1.0, 1.0]), // Bright Green
      rgbCss([0, 0, 1, 1]), // Royal Blue
      rgbCss([0.2, 0.4, 1.0, 1]), // Dark Blue
      rgbCss([0.64, 0.0, 0.64, 1.0]), // Purple
      rgbCss([1.0, 0.0, 0.6, 1.0]), // Pink
      rgbCss([0.5, 0.5, 0.5, 1]), // Gray
      rgbCss([1, 1, 1, 1]), // White
    ];
    (<any>$('#settings-color-payload')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.payload || [0.2, 1.0, 0.0, 0.5]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'payload');
      },
    });
    (<any>$('#settings-color-rocketBody')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.rocketBody || [0.2, 0.4, 1.0, 1]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'rocketBody');
      },
    });
    (<any>$('#settings-color-debris')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.debris || [0.5, 0.5, 0.5, 1]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'debris');
      },
    });
    (<any>$('#settings-color-inview')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.inFOV || [0.85, 0.5, 0.0, 1.0]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'inview');
      },
    });
    (<any>$('#settings-color-missile')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.missile || [1.0, 1.0, 0.0, 1.0]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'missile');
      },
    });
    (<any>$('#settings-color-missileInview')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.missileInview || [1.0, 0.0, 0.0, 1.0]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'missileInview');
      },
    });
    (<any>$('#settings-color-trusat')).colorPick({
      initialColor: rgbCss(settingsManager.colors?.pink || [1.0, 0.0, 0.6, 1.0]),
      palette: colorPalette,
      onColorSelected: function () {
        onColorSelected(this, 'trusat');
      },
    });
    isNotColorPickerInitialSetup = true;
  })();
};

export const uiManagerFinal = () => {
  getEl('settings-form').addEventListener('change', settingsFormChange);
  getEl('settings-form').addEventListener('submit', settingsFormSubmit);
};

export const bottomMenuClick = (iconName: string) => {
  const { uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-settings') {
    if (isSettingsMenuOpen) {
      isSettingsMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('settings-menu'), 1000);
      isSettingsMenuOpen = true;
      getEl('menu-settings').classList.add('bmenu-item-selected');
      return;
    }
  }
};

export const hideSideMenus = () => {
  slideOutLeft(getEl('settings-menu'), 1000);
  getEl('menu-settings').classList.remove('bmenu-item-selected');
  isSettingsMenuOpen = false;
};

export const onColorSelected = (context: any, colorStr: string) => {
  const { satSet, uiManager } = keepTrackApi.programs;

  if (typeof context === 'undefined' || context === null) throw new Error('context is undefined');
  if (typeof colorStr === 'undefined' || colorStr === null) throw new Error('colorStr is undefined');

  context.element.css('cssText', `background-color: ${context.color} !important; color: ${context.color};`);
  if (isNotColorPickerInitialSetup) {
    settingsManager.colors[colorStr] = parseRgba(context.color);
    uiManager.legendColorsChange();
    satSet.setColorScheme(settingsManager.currentColorScheme, true);
    try {
      localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
    } catch {
      console.warn('Settings Manager: Unable to save color settings - localStorage issue!');
    }
  }
};

export const settingsFormChange = (e: any, isDMChecked?: boolean, isSLMChecked?: boolean) => {
  if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');

  isDMChecked ??= (<HTMLInputElement>getEl('settings-demo-mode')).checked;
  isSLMChecked ??= (<HTMLInputElement>getEl('settings-sat-label-mode')).checked;

  if (isSLMChecked && (<HTMLElement>e.target).id === 'settings-demo-mode') {
    (<HTMLInputElement>getEl('settings-sat-label-mode')).checked = false;
    getEl('settings-demo-mode').classList.remove('lever:after');
  }

  if (isDMChecked && (<HTMLElement>e.target).id === 'settings-sat-label-mode') {
    (<HTMLInputElement>getEl('settings-demo-mode')).checked = false;
    getEl('settings-sat-label-mode').classList.remove('lever:after');
  }
};

export const settingsFormSubmit = (e: any) => {
  if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');
  const { satSet, colorSchemeManager, uiManager, drawManager } = keepTrackApi.programs;

  settingsManager.isOrbitCruncherInEcf = (<HTMLInputElement>getEl('settings-drawEcf')).checked;
  settingsManager.isDrawInCoverageLines = (<HTMLInputElement>getEl('settings-isDrawInCoverageLines')).checked;
  settingsManager.isDrawSun = (<HTMLInputElement>getEl('settings-drawSun')).checked;
  let isBlackEarthChanged = settingsManager.isBlackEarth !== (<HTMLInputElement>getEl('settings-drawBlackEarth')).checked;
  settingsManager.isBlackEarth = (<HTMLInputElement>getEl('settings-drawBlackEarth')).checked;
  if (isBlackEarthChanged) {
    drawManager.sceneManager.earth.init();
  }
  settingsManager.isDrawOrbits = (<HTMLInputElement>getEl('settings-drawOrbits')).checked;
  settingsManager.isDrawMilkyWay = (<HTMLInputElement>getEl('settings-drawMilkyWay')).checked;
  settingsManager.isEciOnHover = (<HTMLInputElement>getEl('settings-eciOnHover')).checked;
  const isHOSChecked = (<HTMLInputElement>getEl('settings-hos')).checked;
  settingsManager.colors.transparent = isHOSChecked ? [1.0, 1.0, 1.0, 0] : [1.0, 1.0, 1.0, 0.1];
  settingsManager.isDemoModeOn = (<HTMLInputElement>getEl('settings-demo-mode')).checked;
  settingsManager.isSatLabelModeOn = (<HTMLInputElement>getEl('settings-sat-label-mode')).checked;
  settingsManager.isShowNextPass = (<HTMLInputElement>getEl('settings-snp')).checked;

  colorSchemeManager.reloadColors();

  const newFieldOfView = parseInt((<HTMLInputElement>getEl('satFieldOfView')).value);
  if (isNaN(newFieldOfView)) {
    (<HTMLInputElement>getEl('satFieldOfView')).value = '30';
    uiManager.toast('Invalid field of view value!', 'critical');
  } else {
    satSet.satCruncher.postMessage({
      typ: 'isShowSatOverfly',
      selectedSatFOV: newFieldOfView,
    });
  }

  const maxSearchSats = parseInt((<HTMLInputElement>getEl('maxSearchSats')).value);
  if (isNaN(maxSearchSats)) {
    (<HTMLInputElement>getEl('maxSearchSats')).value = settingsManager.searchLimit.toString();
    uiManager.toast('Invalid max search sats value!', 'critical');
  } else {
    settingsManager.searchLimit = maxSearchSats;
    uiManager.searchBox.doSearch(uiManager.searchBox.getCurrentSearch());
  }

  settingsManager.isForceColorScheme = true;
  satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
  e.preventDefault();
};
