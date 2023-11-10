import settingsPng from '@app/img/icons/settings.png';
import { keepTrackApi, KeepTrackApiEvents } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { rgbCss } from '@app/js/lib/rgbCss';

import { parseRgba } from '@app/js/lib/rgba';
import { LegendManager } from '@app/js/static/legend-manager';
import $ from 'jquery'; // TODO: Remove Color Picker
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { TimeMachine } from '../time-machine/time-machine';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
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

declare module '@app/js/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

export class SettingsMenuPlugin extends KeepTrackPlugin {
  static PLUGIN_NAME = 'Settings Menu';
  constructor() {
    super(SettingsMenuPlugin.PLUGIN_NAME);
  }

  bottomIconElementName: string = 'settings-menu-icon';
  bottomIconImg = settingsPng;
  bottomIconLabel: string = 'Settings Menu';

  sideMenuElementName: string = 'settings-menu';
  sideMenuElementHtml: string = keepTrackApi.html`
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
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide LEO satellites">
                <input id="settings-leoSats" type="checkbox" checked/>
                <span class="lever"></span>
                Show LEO Satellites
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide HEO satellites">
                <input id="settings-heoSats" type="checkbox" checked/>
                <span class="lever"></span>
                Show HEO Satellites
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide MEO satellites">
                <input id="settings-meoSats" type="checkbox" checked/>
                <span class="lever"></span>
                Show MEO Satellites
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide GEO satellites">
                <input id="settings-geoSats" type="checkbox" checked/>
                <span class="lever"></span>
                Show GEO Satellites
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide Payloads">
                <input id="settings-showPayloads" type="checkbox" checked/>
                <span class="lever"></span>
                Show Payloads
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide Rocket Bodies">
                <input id="settings-showRocketBodies" type="checkbox" checked/>
                <span class="lever"></span>
                Show Rocket Bodies
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide Debris">
                <input id="settings-showDebris" type="checkbox" checked/>
                <span class="lever"></span>
                Show Debris
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide Agencies">
                <input id="settings-showAgencies" type="checkbox"/>
                <span class="lever"></span>
                Show Agencies
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable this to hide orbit lines">
                <input id="settings-drawOrbits" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Orbits
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Enable this to show where a satellite was instead of where it is going">
                <input id="settings-drawTrailingOrbits" type="checkbox"/>
                <span class="lever"></span>
                Draw Trailing Orbits
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
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide the Atmosphere">
                <input id="settings-drawAtmosphere" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Atmosphere
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Disable to hide the Aurora">
                <input id="settings-drawAurora" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Aurora
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Change the Skybox to Gray">
                <input id="settings-graySkybox" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Gray Background
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
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Time will freeze as you rotate the camera.">
                <input id="settings-freeze-drag" type="checkbox" />
                <span class="lever"></span>
                Enable Freeze Time on Click
              </label>
            </div>
            <div class="switch row">
              <label class="tooltipped" data-position="right" data-delay="50" data-tooltip="Time Machine stop showing toast messages.">
                <input id="settings-time-machine-toasts" type="checkbox" />
                <span class="lever"></span>
                Disable Time Machine Toasts
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
                <button id="settings-color-special" class="btn waves-effect waves-light"></button>
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
            <button class="red btn waves-effect waves-light" onclick="uiManagerInstance.startLowPerf();">Low End PC Version &#9658;</button>
          </div> -->
        </form>
      </div>
    </div>
  </div>`;

  helpTitle = `Settings Menu`;
  helpBody = keepTrackApi.html`The Settings menu allows you to configure the application.`;

  isNotColorPickerInitialSetup = false;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.PLUGIN_NAME,
      cb: () => {
        getEl('settings-form').addEventListener('change', SettingsMenuPlugin.onFormChange);
        getEl('settings-form').addEventListener('submit', SettingsMenuPlugin.onSubmit);

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

        const that = this;

        (<any>$('#settings-color-payload')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.payload || [0.2, 1.0, 0.0, 0.5]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'payload');
          },
        });
        (<any>$('#settings-color-rocketBody')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.rocketBody || [0.2, 0.4, 1.0, 1]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'rocketBody');
          },
        });
        (<any>$('#settings-color-debris')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.debris || [0.5, 0.5, 0.5, 1]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'debris');
          },
        });
        (<any>$('#settings-color-inview')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.inFOV || [0.85, 0.5, 0.0, 1.0]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'inview');
          },
        });
        (<any>$('#settings-color-missile')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.missile || [1.0, 1.0, 0.0, 1.0]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'missile');
          },
        });
        (<any>$('#settings-color-missileInview')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.missileInview || [1.0, 0.0, 0.0, 1.0]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'missileInview');
          },
        });
        (<any>$('#settings-color-special')).colorPick({
          initialColor: rgbCss(settingsManager.colors?.pink || [1.0, 0.0, 0.6, 1.0]),
          palette: colorPalette,
          onColorSelected: function () {
            that.onColorSelected(this, 'pink');
          },
        });
        this.isNotColorPickerInitialSetup = true;
      },
    });
  }

  onColorSelected(context: any, colorStr: string) {
    if (typeof context === 'undefined' || context === null) throw new Error('context is undefined');
    if (typeof colorStr === 'undefined' || colorStr === null) throw new Error('colorStr is undefined');

    context.element.css('cssText', `background-color: ${context.color} !important; color: ${context.color};`);
    if (this.isNotColorPickerInitialSetup) {
      settingsManager.colors[colorStr] = parseRgba(context.color);
      LegendManager.legendColorsChange();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();
      colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true);
      try {
        localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
      } catch {
        console.warn('Settings Manager: Unable to save color settings - localStorage issue!');
      }
    }
  }

  static onFormChange(e: any, isDMChecked?: boolean, isSLMChecked?: boolean) {
    if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');

    switch (e.target?.id) {
      case 'settings-leoSats':
      case 'settings-heoSats':
      case 'settings-meoSats':
      case 'settings-geoSats':
      case 'settings-showPayloads':
      case 'settings-showRocketBodies':
      case 'settings-showDebris':
      case 'settings-showAgencies':
      case 'settings-drawOrbits':
      case 'settings-drawTrailingOrbits':
      case 'settings-drawEcf':
      case 'settings-isDrawInCoverageLines':
      case 'settings-drawSun':
      case 'settings-drawBlackEarth':
      case 'settings-drawAtmosphere':
      case 'settings-drawAurora':
      case 'settings-drawMilkyWay':
      case 'settings-graySkybox':
      case 'settings-eciOnHover':
      case 'settings-hos':
      case 'settings-demo-mode':
      case 'settings-sat-label-mode':
      case 'settings-freeze-drag':
      case 'settings-time-machine-toasts':
      case 'settings-snp':
        if ((<HTMLInputElement>getEl(e.target.id)).checked) {
          // Play sound for enabling option
          keepTrackApi.getSoundManager()?.play('toggleOn');
        } else {
          // Play sound for disabling option
          keepTrackApi.getSoundManager()?.play('toggleOff');
        }
        break;
      default:
        break;
    }

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
  }

  static onSubmit(e: any) {
    if (typeof e === 'undefined' || e === null) throw new Error('e is undefined');
    e.preventDefault();

    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    keepTrackApi.getSoundManager()?.play('button');

    settingsManager.isShowLeoSats = (<HTMLInputElement>getEl('settings-leoSats')).checked;
    settingsManager.isShowHeoSats = (<HTMLInputElement>getEl('settings-heoSats')).checked;
    settingsManager.isShowMeoSats = (<HTMLInputElement>getEl('settings-meoSats')).checked;
    settingsManager.isShowGeoSats = (<HTMLInputElement>getEl('settings-geoSats')).checked;
    settingsManager.isShowPayloads = (<HTMLInputElement>getEl('settings-showPayloads')).checked;
    settingsManager.isShowRocketBodies = (<HTMLInputElement>getEl('settings-showRocketBodies')).checked;
    settingsManager.isShowDebris = (<HTMLInputElement>getEl('settings-showDebris')).checked;
    settingsManager.isShowAgencies = (<HTMLInputElement>getEl('settings-showAgencies')).checked;
    settingsManager.isOrbitCruncherInEcf = (<HTMLInputElement>getEl('settings-drawEcf')).checked;
    settingsManager.isDrawInCoverageLines = (<HTMLInputElement>getEl('settings-isDrawInCoverageLines')).checked;
    settingsManager.isDrawSun = (<HTMLInputElement>getEl('settings-drawSun')).checked;
    let isBlackEarthChanged = settingsManager.isBlackEarth !== (<HTMLInputElement>getEl('settings-drawBlackEarth')).checked;
    let isDrawAtmosphereChanged = settingsManager.isDrawAtmosphere !== (<HTMLInputElement>getEl('settings-drawAtmosphere')).checked;
    let isDrawAuroraChanged = settingsManager.isDrawAurora !== (<HTMLInputElement>getEl('settings-drawAurora')).checked;
    settingsManager.isBlackEarth = (<HTMLInputElement>getEl('settings-drawBlackEarth')).checked;
    settingsManager.isDrawAtmosphere = (<HTMLInputElement>getEl('settings-drawAtmosphere')).checked;
    settingsManager.isDrawAurora = (<HTMLInputElement>getEl('settings-drawAurora')).checked;
    if (isBlackEarthChanged || isDrawAtmosphereChanged || isDrawAuroraChanged) {
      const drawManagerInstance = keepTrackApi.getDrawManager();
      drawManagerInstance.sceneManager.earth.init(settingsManager, drawManagerInstance.gl);
      drawManagerInstance.sceneManager.earth.loadHiRes();
      drawManagerInstance.sceneManager.earth.loadHiResNight();
    }
    settingsManager.isDrawOrbits = (<HTMLInputElement>getEl('settings-drawOrbits')).checked;
    settingsManager.isDrawTrailingOrbits = (<HTMLInputElement>getEl('settings-drawTrailingOrbits')).checked;

    if (keepTrackApi.getOrbitManager().orbitWorker) {
      if (settingsManager.isDrawTrailingOrbits) {
        keepTrackApi.getOrbitManager().orbitWorker.postMessage({
          orbitType: 2,
        });
      } else {
        keepTrackApi.getOrbitManager().orbitWorker.postMessage({ orbitType: 1 });
      }
    }
    // Must come after the above checks

    let isDrawMilkyWayChanged = settingsManager.isDrawMilkyWay !== (<HTMLInputElement>getEl('settings-drawMilkyWay')).checked;
    let isGraySkyboxChanged = settingsManager.isGraySkybox !== (<HTMLInputElement>getEl('settings-graySkybox')).checked;
    settingsManager.isDrawMilkyWay = (<HTMLInputElement>getEl('settings-drawMilkyWay')).checked;
    settingsManager.isGraySkybox = (<HTMLInputElement>getEl('settings-graySkybox')).checked;

    if (isDrawMilkyWayChanged || isGraySkyboxChanged) {
      const drawManagerInstance = keepTrackApi.getDrawManager();
      drawManagerInstance.sceneManager.skybox.init(settingsManager, drawManagerInstance.gl);
    }

    settingsManager.isEciOnHover = (<HTMLInputElement>getEl('settings-eciOnHover')).checked;
    const isHOSChecked = (<HTMLInputElement>getEl('settings-hos')).checked;
    settingsManager.colors.transparent = isHOSChecked ? [1.0, 1.0, 1.0, 0] : [1.0, 1.0, 1.0, 0.1];
    settingsManager.isDemoModeOn = (<HTMLInputElement>getEl('settings-demo-mode')).checked;
    settingsManager.isSatLabelModeOn = (<HTMLInputElement>getEl('settings-sat-label-mode')).checked;
    settingsManager.isShowNextPass = (<HTMLInputElement>getEl('settings-snp')).checked;
    settingsManager.isFreezePropRateOnDrag = (<HTMLInputElement>getEl('settings-freeze-drag')).checked;

    settingsManager.isDisableTimeMachineToasts = (<HTMLInputElement>getEl('settings-time-machine-toasts')).checked;
    // TODO: These settings buttons should be inside the plugins themselves
    // Stop Time Machine
    if (keepTrackApi.getPlugin(TimeMachine)) {
      keepTrackApi.getPlugin(TimeMachine).isMenuButtonEnabled = false;
    }

    // if (orbitManagerInstance.isTimeMachineRunning) {
    //   settingsManager.colors.transparent = orbitManagerInstance.tempTransColor;
    // }
    keepTrackApi.getGroupsManager().clearSelect();
    colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.default, true); // force color recalc

    getEl('menu-time-machine')?.classList.remove('bmenu-item-selected');

    colorSchemeManagerInstance.reloadColors();

    const newFieldOfView = parseInt((<HTMLInputElement>getEl('satFieldOfView')).value);
    if (isNaN(newFieldOfView)) {
      (<HTMLInputElement>getEl('satFieldOfView')).value = '30';
      uiManagerInstance.toast('Invalid field of view value!', 'critical');
    } else {
      keepTrackApi.getCatalogManager().satCruncher.postMessage({
        typ: 'isShowSatOverfly',
        selectedSatFOV: newFieldOfView,
      });
    }

    const maxSearchSats = parseInt((<HTMLInputElement>getEl('maxSearchSats')).value);
    if (isNaN(maxSearchSats)) {
      (<HTMLInputElement>getEl('maxSearchSats')).value = settingsManager.searchLimit.toString();
      uiManagerInstance.toast('Invalid max search sats value!', 'critical');
    } else {
      settingsManager.searchLimit = maxSearchSats;
      uiManagerInstance.searchManager.doSearch(uiManagerInstance.searchManager.getCurrentSearch());
    }

    colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true);
  }
}

export const settingsMenuPlugin = new SettingsMenuPlugin();
