import { LayersManager } from '@app/app/ui/layers-manager';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ColorPick } from '@app/engine/utils/color-pick';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { parseRgba } from '@app/engine/utils/rgba';
import { rgbCss } from '@app/engine/utils/rgbCss';
import { SettingsManager } from '@app/settings/settings';
import settingsPng from '@public/img/icons/settings.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
import { SoundNames } from '../sounds/sounds';
import { TimeMachine } from '../time-machine/time-machine';
import { OrbitCruncherMsgType } from '@app/webworker/orbit-cruncher-interfaces';

/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
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

declare module '@app/engine/core/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

export class SettingsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'SettingsMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.ADVANCED, MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'settings-menu-icon';
  bottomIconImg = settingsPng;
  sideMenuElementName: string = 'settings-menu';
  sideMenuElementHtml: string = html`
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
            <div class="row center">
              <button id="settings-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
            </div>
            <h5 class="center-align">General Settings</h5>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Show more information when hovering over a satellite.">
                <input id="settings-enableHoverOverlay" type="checkbox" checked/>
                <span class="lever"></span>
                Show Info On Hover
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Zoom in on the satellite when selected.">
                <input id="settings-focusOnSatelliteWhenSelected" type="checkbox" checked/>
                <span class="lever"></span>
                Focus on Satellite When Selected
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Disable this to hide orbit lines">
                <input id="settings-drawOrbits" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Orbits
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Enable this to show where a satellite was instead of where it is going">
                <input id="settings-drawTrailingOrbits" type="checkbox"/>
                <span class="lever"></span>
                Draw Trailing Orbits
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Orbits will be drawn using ECF vs ECI (Mainly for GEO Orbits)">
                <input id="settings-drawEcf" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Orbits in ECF
              </label>
            </div>
            <div class="input-field col s12">
              <select id="settings-numberOfEcfOrbitsToDraw">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
              <label>Number of ECF Orbits to Draw</label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Draw lines from sensor to satellites when in FOV">
                <input id="settings-isDrawCovarianceEllipsoid" type="checkbox" checked/>
                <span class="lever"></span>
                Draw Covariance Ellipsoid
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Draw lines from sensor to satellites when in FOV">
                <input id="settings-isDrawInCoverageLines" type="checkbox" checked/>
                <span class="lever"></span>
                Draw FOV Lines
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Display ECI Coordinates on Hover">
                <input id="settings-eciOnHover" type="checkbox"/>
                <span class="lever"></span>
                Display ECI on Hover
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Non-selectable satellites will be hidden instead of grayed out.">
                <input id="settings-hos" type="checkbox" />
                <span class="lever"></span>
                Hide Other Satellites
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Disable this to hide the camera widget">
                <input id="settings-drawCameraWidget" type="checkbox" checked/>
                <span class="lever"></span>
                Show Camera Widget
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Show confidence levels for satellite's element sets.">
                <input id="settings-confidence-levels" type="checkbox" />
                <span class="lever"></span>
                Show Confidence Levels
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Every 3 seconds a new satellite will be selected from FOV">
                <input id="settings-demo-mode" type="checkbox" />
                <span class="lever"></span>
                Enable Demo Mode
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Small text labels will appear next to all satellites in FOV.">
                <input id="settings-sat-label-mode" type="checkbox" checked />
                <span class="lever"></span>
                Enable Satellite Label Mode
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Time will freeze as you rotate the camera.">
                <input id="settings-freeze-drag" type="checkbox" />
                <span class="lever"></span>
                Enable Freeze Time on Click
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Time Machine stop showing toast messages.">
                <input id="settings-time-machine-toasts" type="checkbox" />
                <span class="lever"></span>
                Disable Time Machine Toasts
              </label>
            </div>
          </div>
          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <div id="settings-colors" class="row">
            <h5 class="center-align">Color Settings</h5>
            <div class="row">
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
            </div>
            <div class="row">
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
            </div>
            <div class="row">
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
            </div>
            <div class="row">
              <div class="input-field col s6">
                <center>
                  <p>Special Sats</p>
                  <button id="settings-color-special" class="btn waves-effect waves-light"></button>
                </center>
              </div>
            </div>
          </div>
          <div id="settings-opt" class="row">
            <div class="row">
              <h5 class="center-align">Settings Overrides</h5>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="150" id="maxSearchSats" type="text" data-position="top" data-delay="50" data-tooltip="Maximum satellites to display in search" />
                <label for="maxSearchSats" class="active">Maximum Satellites in Search</label>
              </div>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="30" id="satFieldOfView" type="text" data-position="top" data-delay="50" data-tooltip="What is the satellite's field of view in degrees" />
                <label for="satFieldOfView" class="active">Satellite Field of View</label>
              </div>
            </div>
          </div>
          <div id="fastCompSettings" class="row">
            <h5 class="center-align">Fast CPU Required</h5>
            <div class="switch row">
              <label>
                <input id="settings-snp" type="checkbox" />
                <span class="lever"></span>
                Show Next Pass on Hover
              </label>
            </div>
          </div>
          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <div id="settings-advanced-orbital" class="row">
            <h5 class="center-align">Advanced Orbital Settings</h5>
            <div class="row">
              <div class="input-field col s12">
                <select id="settings-covarianceConfidenceLevel">
                  <option value="1">1 (68.27%)</option>
                  <option value="2" selected>2 (95.45%)</option>
                  <option value="3">3 (99.73%)</option>
                </select>
                <label>Covariance Confidence Level</label>
              </div>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="15" id="settings-coneDistanceFromEarth" type="number" step="1" min="-100" max="1000" data-position="top" data-delay="50" data-tooltip="Distance the FOV cone is drawn from Earth (km)" />
                <label for="settings-coneDistanceFromEarth" class="active">Cone Distance from Earth (km)</label>
              </div>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="255" id="settings-orbitSegments" type="number" step="1" min="32" max="512" data-position="top" data-delay="50" data-tooltip="Number of line segments in orbit (higher = smoother)" />
                <label for="settings-orbitSegments" class="active">Orbit Segments</label>
              </div>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="0.6" id="settings-orbitFadeFactor" type="number" step="0.1" min="0.0" max="1.0" data-position="top" data-delay="50" data-tooltip="How much orbits fade over time (0.0 = invisible, 1.0 = no fade)" />
                <label for="settings-orbitFadeFactor" class="active">Orbit Fade Factor</label>
              </div>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="5" id="settings-lineScanMinEl" type="number" step="1" min="0" max="90" data-position="top" data-delay="50" data-tooltip="Minimum elevation for line scan" />
                <label for="settings-lineScanMinEl" class="active">Line Scan Min Elevation (°)</label>
              </div>
            </div>
          </div>
          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <div id="settings-advanced-ui" class="row">
            <h5 class="center-align">Advanced UI Settings</h5>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Show splash screen with images on startup">
                <input id="settings-showSplashScreen" type="checkbox" checked/>
                <span class="lever"></span>
                Show Splash Screen
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Show loading hints on splash screen">
                <input id="settings-showLoadingHints" type="checkbox" checked/>
                <span class="lever"></span>
                Show Loading Hints
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Show the primary logo">
                <input id="settings-showPrimaryLogo" type="checkbox" checked/>
                <span class="lever"></span>
                Show Primary Logo
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Load the last used sensor on startup">
                <input id="settings-loadLastSensor" type="checkbox" checked/>
                <span class="lever"></span>
                Load Last Sensor
              </label>
            </div>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Load the last used map on startup">
                <input id="settings-loadLastMap" type="checkbox" checked/>
                <span class="lever"></span>
                Load Last Map
              </label>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="800" id="settings-mapWidth" type="number" step="100" min="400" max="4000" data-position="top" data-delay="50" data-tooltip="Map width resolution (affects performance)" />
                <label for="settings-mapWidth" class="active">Map Width (px)</label>
              </div>
            </div>
            <div class="row">
              <div class="input-field col s12">
                <input value="600" id="settings-mapHeight" type="number" step="100" min="300" max="3000" data-position="top" data-delay="50" data-tooltip="Map height resolution (affects performance)" />
                <label for="settings-mapHeight" class="active">Map Height (px)</label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>`;

  isNotColorPickerInitialSetup = false;

  addHtml(): void {
    super.addHtml();
    EventBus.getInstance().on(
      EventBusEvent.uiManagerFinal,
      () => {
        getEl('settings-form')?.addEventListener('change', SettingsMenuPlugin.onFormChange_);
        getEl('settings-form')?.addEventListener('submit', SettingsMenuPlugin.onSubmit_);
        getEl('settings-reset')?.addEventListener('click', SettingsMenuPlugin.resetToDefaults);


        if (!settingsManager.isShowConfidenceLevels) {
          hideEl(getEl('settings-confidence-levels')!.parentElement!.parentElement!);
        }

        if (!settingsManager.plugins.TimeMachine) {
          hideEl(getEl('settings-time-machine-toasts')!.parentElement!.parentElement!);
        }

        const colorPalette = [
          // Reds
          rgbCss([1.0, 0.0, 0.0, 1.0]), // Red
          rgbCss([1.0, 0.4, 0.4, 1.0]), // Light Red
          rgbCss([1.0, 0.0, 0.6, 1.0]), // Pink
          rgbCss([1.0, 0.75, 0.8, 1.0]), // Light Pink
          rgbCss([1.0, 0.0, 1.0, 1.0]), // Magenta

          // Oranges
          rgbCss([1.0, 0.65, 0.0, 1.0]), // Orange
          rgbCss([0.85, 0.5, 0.0, 1.0]), // Dark Orange
          rgbCss([1.0, 0.8, 0.6, 1.0]), // Peach

          // Yellows
          rgbCss([1.0, 1.0, 0.0, 1.0]), // Yellow
          rgbCss([0.8, 0.4, 0.0, 1.0]), // Dark Yellow

          // Greens
          rgbCss([0.4, 0.8, 0.0, 1.0]), // Chartreuse
          rgbCss([0.0, 1.0, 0.0, 1.0]), // Lime Green
          rgbCss([0.2, 1.0, 0.0, 0.5]), // Dark Green (with transparency)
          rgbCss([0.5, 1.0, 0.5, 1.0]), // Mint Green
          rgbCss([0.6, 0.8, 0.2, 1.0]), // Olive Green

          // Cyans
          rgbCss([0.0, 1.0, 1.0, 1.0]), // Cyan
          rgbCss([0.0, 0.8, 0.8, 1.0]), // Light Blue
          rgbCss([0.0, 0.5, 0.5, 1.0]), // Teal
          rgbCss([0.0, 0.2, 0.4, 1.0]), // Dark Teal

          // Blues
          rgbCss([0.2, 0.4, 1.0, 1.0]), // Dark Blue
          rgbCss([0.0, 0.0, 0.5, 1.0]), // Navy Blue

          // Purples
          rgbCss([0.5, 0.0, 1.0, 1.0]), // Purple
          rgbCss([0.5, 0.0, 0.5, 1.0]), // Dark Purple
          rgbCss([0.8, 0.2, 0.8, 1.0]), // Violet

          // Browns
          rgbCss([0.5, 0.25, 0.0, 1.0]), // Brown
          rgbCss([0.6, 0.4, 0.2, 1.0]), // Tan
          rgbCss([0.9, 0.9, 0.5, 1.0]), // Beige

          // Grays
          rgbCss([0.9, 0.9, 0.9, 1.0]), // Light Gray
          rgbCss([0.5, 0.5, 0.5, 1.0]), // Gray
          rgbCss([0.1, 0.1, 0.1, 1.0]), // Dark Gray
        ];

        ColorPick.initColorPick('#settings-color-payload', {
          initialColor: rgbCss(settingsManager.colors?.payload || [0.2, 1.0, 0.0, 0.5]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'payload'),
        });
        ColorPick.initColorPick('#settings-color-rocketBody', {
          initialColor: rgbCss(settingsManager.colors?.rocketBody || [0.2, 0.4, 1.0, 1]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'rocketBody'),
        });
        ColorPick.initColorPick('#settings-color-debris', {
          initialColor: rgbCss(settingsManager.colors?.debris || [0.5, 0.5, 0.5, 1]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'debris'),
        });
        ColorPick.initColorPick('#settings-color-inview', {
          initialColor: rgbCss(settingsManager.colors?.inFOV || [0.85, 0.5, 0.0, 1.0]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'inview'),
        });
        ColorPick.initColorPick('#settings-color-missile', {
          initialColor: rgbCss(settingsManager.colors?.missile || [1.0, 1.0, 0.0, 1.0]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'missile'),
        });
        ColorPick.initColorPick('#settings-color-missileInview', {
          initialColor: rgbCss(settingsManager.colors?.missileInview || [1.0, 0.0, 0.0, 1.0]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'missileInview'),
        });
        ColorPick.initColorPick('#settings-color-special', {
          initialColor: rgbCss(settingsManager.colors?.pink || [1.0, 0.0, 0.6, 1.0]),
          palette: colorPalette,
          onColorSelected: (colorpick: ColorPick) => this.onColorSelected_(colorpick, 'pink'),
        });
        this.isNotColorPickerInitialSetup = true;
      },
    );
  }

  addJs(): void {
    super.addJs();
    EventBus.getInstance().on(EventBusEvent.uiManagerFinal, SettingsMenuPlugin.syncOnLoad);
  }

  static syncOnLoad() {
    const drawCameraWidgetEl = <HTMLInputElement>getEl('settings-drawCameraWidget');

    if (drawCameraWidgetEl) {
      drawCameraWidgetEl.checked = settingsManager.drawCameraWidget;
      const cameraControlWidgetEl = getEl('camera-control-widget');

      if (cameraControlWidgetEl) {
        cameraControlWidgetEl.style.display = settingsManager.drawCameraWidget ? 'block' : 'none';
      }
    }

    const settingsElements = [
      { id: 'settings-drawOrbits', setting: 'isDrawOrbits' },
      { id: 'settings-drawTrailingOrbits', setting: 'isDrawTrailingOrbits' },
      { id: 'settings-drawEcf', setting: 'isOrbitCruncherInEcf' },
      { id: 'settings-numberOfEcfOrbitsToDraw', setting: 'numberOfEcfOrbitsToDraw' },
      { id: 'settings-isDrawInCoverageLines', setting: 'isDrawInCoverageLines' },
      { id: 'settings-enableHoverOverlay', setting: 'enableHoverOverlay' },
      { id: 'settings-focusOnSatelliteWhenSelected', setting: 'isFocusOnSatelliteWhenSelected' },
      { id: 'settings-isDrawCovarianceEllipsoid', setting: 'isDrawCovarianceEllipsoid' },
      { id: 'settings-eciOnHover', setting: 'isEciOnHover' },
      { id: 'settings-hos', setting: 'colors.transparent[3] === 0' },
      { id: 'settings-confidence-levels', setting: 'isShowConfidenceLevels' },
      { id: 'settings-demo-mode', setting: 'isDemoModeOn' },
      { id: 'settings-sat-label-mode', setting: 'isSatLabelModeOn' },
      { id: 'settings-snp', setting: 'isShowNextPassOnHover' },
      { id: 'settings-freeze-drag', setting: 'isFreezePropRateOnDrag' },
      { id: 'settings-time-machine-toasts', setting: 'isDisableTimeMachineToasts' },
    ];

    settingsElements.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        if (setting.includes('colors.transparent')) {
          element.checked = settingsManager.colors.transparent[3] === 0;
        } else {
          element.checked = settingsManager[setting];
        }
      }
    });

    const maxSearchSatsEl = <HTMLInputElement>getEl('maxSearchSats');

    if (maxSearchSatsEl) {
      maxSearchSatsEl.value = settingsManager.searchLimit.toString();
    }

    // Advanced Orbital Settings
    const covarianceConfidenceLevelEl = <HTMLInputElement>getEl('settings-covarianceConfidenceLevel');

    if (covarianceConfidenceLevelEl) {
      covarianceConfidenceLevelEl.value = settingsManager.covarianceConfidenceLevel.toString();
    }

    const coneDistanceFromEarthEl = <HTMLInputElement>getEl('settings-coneDistanceFromEarth');

    if (coneDistanceFromEarthEl) {
      coneDistanceFromEarthEl.value = settingsManager.coneDistanceFromEarth.toString();
    }

    const orbitSegmentsEl = <HTMLInputElement>getEl('settings-orbitSegments');

    if (orbitSegmentsEl) {
      orbitSegmentsEl.value = settingsManager.orbitSegments.toString();
    }

    const orbitFadeFactorEl = <HTMLInputElement>getEl('settings-orbitFadeFactor');

    if (orbitFadeFactorEl) {
      orbitFadeFactorEl.value = settingsManager.orbitFadeFactor.toString();
    }

    const lineScanMinElEl = <HTMLInputElement>getEl('settings-lineScanMinEl');

    if (lineScanMinElEl) {
      lineScanMinElEl.value = settingsManager.lineScanMinEl.toString();
    }

    // Advanced UI Settings
    const showSplashScreenEl = <HTMLInputElement>getEl('settings-showSplashScreen');

    if (showSplashScreenEl) {
      showSplashScreenEl.checked = settingsManager.isShowSplashScreen;
    }

    const showLoadingHintsEl = <HTMLInputElement>getEl('settings-showLoadingHints');

    if (showLoadingHintsEl) {
      showLoadingHintsEl.checked = settingsManager.isShowLoadingHints;
    }

    const showPrimaryLogoEl = <HTMLInputElement>getEl('settings-showPrimaryLogo');

    if (showPrimaryLogoEl) {
      showPrimaryLogoEl.checked = settingsManager.isShowPrimaryLogo;
    }

    const loadLastSensorEl = <HTMLInputElement>getEl('settings-loadLastSensor');

    if (loadLastSensorEl) {
      loadLastSensorEl.checked = settingsManager.isLoadLastSensor;
    }

    const loadLastMapEl = <HTMLInputElement>getEl('settings-loadLastMap');

    if (loadLastMapEl) {
      loadLastMapEl.checked = settingsManager.isLoadLastMap;
    }

    const mapWidthEl = <HTMLInputElement>getEl('settings-mapWidth');

    if (mapWidthEl) {
      mapWidthEl.value = settingsManager.mapWidth.toString();
    }

    const mapHeightEl = <HTMLInputElement>getEl('settings-mapHeight');

    if (mapHeightEl) {
      mapHeightEl.value = settingsManager.mapHeight.toString();
    }
  }

  private onColorSelected_(context: ColorPick, colorStr: string) {
    if (typeof context === 'undefined' || context === null) {
      throw new Error('context is undefined');
    }
    if (typeof colorStr === 'undefined' || colorStr === null) {
      throw new Error('colorStr is undefined');
    }

    context.element.style.cssText = `background-color: ${context.color} !important; color: ${context.color};`;
    if (this.isNotColorPickerInitialSetup) {
      settingsManager.colors[colorStr] = parseRgba(context.color);
      LayersManager.layersColorsChange();
      const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

      colorSchemeManagerInstance.calculateColorBuffers(true);
      PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_MANAGER_COLORS, JSON.stringify(settingsManager.colors));
    }
  }

  // eslint-disable-next-line complexity
  private static onFormChange_(e: Event, isDMChecked?: boolean, isSLMChecked?: boolean) {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }

    switch ((<HTMLElement>e.target)?.id) {
      case 'settings-drawOrbits':
      case 'settings-drawCameraWidget':
      case 'settings-drawTrailingOrbits':
      case 'settings-drawEcf':
      case 'settings-numberOfEcfOrbitsToDraw':
      case 'settings-isDrawInCoverageLines':
      case 'settings-enableHoverOverlay':
      case 'settings-focusOnSatelliteWhenSelected':
      case 'settings-isDrawCovarianceEllipsoid':
      case 'settings-drawSun':
      case 'settings-drawBlackEarth':
      case 'settings-drawAtmosphere':
      case 'settings-drawAurora':
      case 'settings-drawMilkyWay':
      case 'settings-graySkybox':
      case 'settings-eciOnHover':
      case 'settings-hos':
      case 'settings-confidence-levels':
      case 'settings-demo-mode':
      case 'settings-sat-label-mode':
      case 'settings-freeze-drag':
      case 'settings-time-machine-toasts':
      case 'settings-snp':
      case 'settings-showSplashScreen':
      case 'settings-showLoadingHints':
      case 'settings-showPrimaryLogo':
      case 'settings-loadLastSensor':
      case 'settings-loadLastMap':
        if ((<HTMLInputElement>getEl((<HTMLInputElement>e.target)?.id ?? ''))?.checked) {
          // Play sound for enabling option
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          // Play sound for disabling option
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        }
        break;
      default:
        break;
    }

    isDMChecked ??= (<HTMLInputElement>getEl('settings-demo-mode')).checked;
    isSLMChecked ??= (<HTMLInputElement>getEl('settings-sat-label-mode')).checked;

    if (isSLMChecked && (<HTMLElement>e.target).id === 'settings-demo-mode') {
      (<HTMLInputElement>getEl('settings-sat-label-mode')).checked = false;
      getEl('settings-demo-mode')?.classList.remove('lever:after');
    }

    if (isDMChecked && (<HTMLElement>e.target).id === 'settings-sat-label-mode') {
      (<HTMLInputElement>getEl('settings-demo-mode')).checked = false;
      getEl('settings-sat-label-mode')?.classList.remove('lever:after');
    }
  }

  static resetToDefaults() {
    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);
    settingsManager.isDrawOrbits = true;
    settingsManager.drawCameraWidget = false;
    settingsManager.isDrawTrailingOrbits = false;
    settingsManager.isOrbitCruncherInEcf = true;
    settingsManager.isDrawInCoverageLines = true;
    settingsManager.enableHoverOverlay = true;
    settingsManager.isFocusOnSatelliteWhenSelected = true;
    settingsManager.isEciOnHover = false;
    settingsManager.isDemoModeOn = false;
    settingsManager.isSatLabelModeOn = true;
    settingsManager.isFreezePropRateOnDrag = false;
    settingsManager.isDisableTimeMachineToasts = false;
    settingsManager.searchLimit = 600;

    // Advanced Orbital Settings
    settingsManager.covarianceConfidenceLevel = 2;
    settingsManager.coneDistanceFromEarth = 15;
    settingsManager.orbitSegments = 255;
    settingsManager.orbitFadeFactor = 0.6;
    settingsManager.lineScanMinEl = 5;

    // Advanced UI Settings
    settingsManager.isShowSplashScreen = true;
    settingsManager.isShowLoadingHints = true;
    settingsManager.isShowPrimaryLogo = true;
    settingsManager.isLoadLastSensor = true;
    settingsManager.isLoadLastMap = true;
    settingsManager.mapWidth = 800;
    settingsManager.mapHeight = 600;

    PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_DOT_COLORS);
    SettingsManager.preserveSettings();
    SettingsMenuPlugin.syncOnLoad();
  }

  private static onSubmit_(e: SubmitEvent) {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }
    e.preventDefault();

    const uiManagerInstance = ServiceLocator.getUiManager();
    const colorSchemeManagerInstance = ServiceLocator.getColorSchemeManager();

    ServiceLocator.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.isOrbitCruncherInEcf = (<HTMLInputElement>getEl('settings-drawEcf')).checked;
    const numberOfEcfOrbitsToDraw = parseInt((<HTMLInputElement>getEl('settings-numberOfEcfOrbitsToDraw')).value);

    if (numberOfEcfOrbitsToDraw !== settingsManager.numberOfEcfOrbitsToDraw) {
      ServiceLocator.getOrbitManager().orbitThreadMgr.postMessage({
        type: OrbitCruncherMsgType.SETTINGS_UPDATE,
        numberOfOrbitsToDraw: numberOfEcfOrbitsToDraw,
      });
    }
    settingsManager.numberOfEcfOrbitsToDraw = numberOfEcfOrbitsToDraw;
    settingsManager.isDrawInCoverageLines = (<HTMLInputElement>getEl('settings-isDrawInCoverageLines')).checked;
    settingsManager.enableHoverOverlay = (<HTMLInputElement>getEl('settings-enableHoverOverlay')).checked;
    settingsManager.isFocusOnSatelliteWhenSelected = (<HTMLInputElement>getEl('settings-focusOnSatelliteWhenSelected')).checked;
    settingsManager.isDrawCovarianceEllipsoid = (<HTMLInputElement>getEl('settings-isDrawCovarianceEllipsoid')).checked;
    settingsManager.drawCameraWidget = (<HTMLInputElement>getEl('settings-drawCameraWidget')).checked;
    const ccWidgetCanvas = getEl('camera-control-widget');

    if (ccWidgetCanvas) {
      if (settingsManager.drawCameraWidget) {
        ccWidgetCanvas.style.display = 'block';
      } else {
        ccWidgetCanvas.style.display = 'none';
      }
    }

    const isDrawOrbitsChanged = settingsManager.isDrawOrbits !== (<HTMLInputElement>getEl('settings-drawOrbits')).checked;

    settingsManager.isDrawOrbits = (<HTMLInputElement>getEl('settings-drawOrbits')).checked;
    if (isDrawOrbitsChanged) {
      ServiceLocator.getOrbitManager().drawOrbitsSettingChanged();
    }
    settingsManager.isDrawTrailingOrbits = (<HTMLInputElement>getEl('settings-drawTrailingOrbits')).checked;

    ServiceLocator.getOrbitManager().updateOrbitType();

    // Must come after the above checks
    settingsManager.isEciOnHover = (<HTMLInputElement>getEl('settings-eciOnHover')).checked;
    const isHOSChecked = (<HTMLInputElement>getEl('settings-hos')).checked;

    settingsManager.colors.transparent = isHOSChecked ? [1.0, 1.0, 1.0, 0] : [1.0, 1.0, 1.0, 0.1];
    settingsManager.isShowConfidenceLevels = (<HTMLInputElement>getEl('settings-confidence-levels')).checked;
    settingsManager.isDemoModeOn = (<HTMLInputElement>getEl('settings-demo-mode')).checked;
    settingsManager.isSatLabelModeOn = (<HTMLInputElement>getEl('settings-sat-label-mode')).checked;
    settingsManager.isShowNextPass = (<HTMLInputElement>getEl('settings-snp')).checked;
    settingsManager.isFreezePropRateOnDrag = (<HTMLInputElement>getEl('settings-freeze-drag')).checked;

    settingsManager.isDisableTimeMachineToasts = (<HTMLInputElement>getEl('settings-time-machine-toasts')).checked;
    const timeMachinePlugin = PluginRegistry.getPlugin(TimeMachine);

    /*
     * TODO: These settings buttons should be inside the plugins themselves
     * Stop Time Machine
     */
    if (timeMachinePlugin) {
      timeMachinePlugin.isMenuButtonActive = false;
    }

    /*
     * if (orbitManagerInstance.isTimeMachineRunning) {
     *   settingsManager.colors.transparent = orbitManagerInstance.tempTransColor;
     * }
     */
    ServiceLocator.getGroupsManager().clearSelect();
    colorSchemeManagerInstance.calculateColorBuffers(true); // force color recalc

    PluginRegistry.getPlugin(TimeMachine)?.setBottomIconToUnselected();

    colorSchemeManagerInstance.reloadColors();

    const newFieldOfView = parseInt((<HTMLInputElement>getEl('satFieldOfView')).value);

    if (isNaN(newFieldOfView)) {
      (<HTMLInputElement>getEl('satFieldOfView')).value = '30';
      uiManagerInstance.toast('Invalid field of view value!', ToastMsgType.critical);
    }

    const maxSearchSats = parseInt((<HTMLInputElement>getEl('maxSearchSats')).value);

    if (isNaN(maxSearchSats)) {
      (<HTMLInputElement>getEl('maxSearchSats')).value = settingsManager.searchLimit.toString();
      uiManagerInstance.toast('Invalid max search sats value!', ToastMsgType.critical);
    } else {
      settingsManager.searchLimit = maxSearchSats;
      uiManagerInstance.searchManager.doSearch(ServiceLocator.getUiManager().searchManager.getCurrentSearch());
    }

    colorSchemeManagerInstance.calculateColorBuffers(true);

    // Advanced Orbital Settings
    const covarianceConfidenceLevel = parseInt((<HTMLInputElement>getEl('settings-covarianceConfidenceLevel')).value);

    if (!isNaN(covarianceConfidenceLevel) && covarianceConfidenceLevel >= 1 && covarianceConfidenceLevel <= 3) {
      settingsManager.covarianceConfidenceLevel = covarianceConfidenceLevel;
    }

    const coneDistanceFromEarth = parseFloat((<HTMLInputElement>getEl('settings-coneDistanceFromEarth')).value);

    if (!isNaN(coneDistanceFromEarth)) {
      settingsManager.coneDistanceFromEarth = coneDistanceFromEarth;
    }

    const orbitSegments = parseInt((<HTMLInputElement>getEl('settings-orbitSegments')).value);

    if (!isNaN(orbitSegments) && orbitSegments >= 32 && orbitSegments <= 512) {
      settingsManager.orbitSegments = orbitSegments;
    }

    const orbitFadeFactor = parseFloat((<HTMLInputElement>getEl('settings-orbitFadeFactor')).value);

    if (!isNaN(orbitFadeFactor) && orbitFadeFactor >= 0.0 && orbitFadeFactor <= 1.0) {
      settingsManager.orbitFadeFactor = orbitFadeFactor;
    }

    const lineScanMinEl = parseInt((<HTMLInputElement>getEl('settings-lineScanMinEl')).value);

    if (!isNaN(lineScanMinEl) && lineScanMinEl >= 0 && lineScanMinEl <= 90) {
      settingsManager.lineScanMinEl = lineScanMinEl;
    }

    // Advanced UI Settings
    settingsManager.isShowSplashScreen = (<HTMLInputElement>getEl('settings-showSplashScreen')).checked;
    settingsManager.isShowLoadingHints = (<HTMLInputElement>getEl('settings-showLoadingHints')).checked;
    settingsManager.isShowPrimaryLogo = (<HTMLInputElement>getEl('settings-showPrimaryLogo')).checked;
    settingsManager.isLoadLastSensor = (<HTMLInputElement>getEl('settings-loadLastSensor')).checked;
    settingsManager.isLoadLastMap = (<HTMLInputElement>getEl('settings-loadLastMap')).checked;

    const mapWidth = parseInt((<HTMLInputElement>getEl('settings-mapWidth')).value);

    if (!isNaN(mapWidth) && mapWidth >= 400 && mapWidth <= 4000) {
      settingsManager.mapWidth = mapWidth;
    }

    const mapHeight = parseInt((<HTMLInputElement>getEl('settings-mapHeight')).value);

    if (!isNaN(mapHeight) && mapHeight >= 300 && mapHeight <= 3000) {
      settingsManager.mapHeight = mapHeight;
    }

    SettingsManager.preserveSettings();
  }
}

