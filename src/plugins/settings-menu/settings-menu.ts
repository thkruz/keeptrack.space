import { KeepTrackApiEvents, MenuMode, ToastMsgType } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { ColorPick } from '@app/lib/color-pick';
import { getEl, hideEl } from '@app/lib/get-el';
import { parseRgba } from '@app/lib/rgba';
import { rgbCss } from '@app/lib/rgbCss';
import { SettingsManager } from '@app/settings/settings';
import { PersistenceManager, StorageKey } from '@app/singletons/persistence-manager';
import { LegendManager } from '@app/static/legend-manager';
import { OrbitCruncherType, OrbitDrawTypes } from '@app/webworker/orbitCruncher';
import settingsPng from '@public/img/icons/settings.png';
import { KeepTrackPlugin } from '../KeepTrackPlugin';
import { SoundNames } from '../sounds/SoundNames';
import { TimeMachine } from '../time-machine/time-machine';

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

declare module '@app/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

export class SettingsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'SettingsMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.BASIC, MenuMode.ADVANCED, MenuMode.ALL];

  bottomIconElementName: string = 'settings-menu-icon';
  bottomIconImg = settingsPng;
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
            <div class="row center">
              <button id="settings-reset" class="btn btn-ui waves-effect waves-light" type="button" name="action">Reset to Defaults &#9658;</button>
            </div>
            <h5 class="center-align">General Settings</h5>
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Disable this to hide the camera widget">
                <input id="settings-drawCameraWidget" type="checkbox" checked/>
                <span class="lever"></span>
                Show Camera Widget
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
                <input id="settings-drawEcf" type="checkbox" />
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
        </form>
      </div>
    </div>
  </div>`;

  isNotColorPickerInitialSetup = false;

  addHtml(): void {
    super.addHtml();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        getEl('settings-form')?.addEventListener('change', SettingsMenuPlugin.onFormChange_);
        getEl('settings-form')?.addEventListener('submit', SettingsMenuPlugin.onSubmit_);
        getEl('settings-reset')?.addEventListener('click', SettingsMenuPlugin.resetToDefaults);


        if (!settingsManager.isShowConfidenceLevels) {
          hideEl(getEl('settings-confidence-levels')!.parentElement!.parentElement!);
        }

        if (!settingsManager.plugins.timeMachine) {
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
    });
  }

  addJs(): void {
    super.addJs();
    keepTrackApi.register({
      event: KeepTrackApiEvents.uiManagerFinal,
      cbName: this.id,
      cb: () => {
        SettingsMenuPlugin.syncOnLoad();
      },
    });
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
      LegendManager.legendColorsChange();
      const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

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
        if ((<HTMLInputElement>getEl((<HTMLInputElement>e.target)?.id ?? ''))?.checked) {
          // Play sound for enabling option
          keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          // Play sound for disabling option
          keepTrackApi.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
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
    keepTrackApi.getSoundManager().play(SoundNames.BUTTON_CLICK);
    settingsManager.isDrawOrbits = true;
    settingsManager.drawCameraWidget = false;
    settingsManager.isDrawTrailingOrbits = false;
    settingsManager.isOrbitCruncherInEcf = false;
    settingsManager.isDrawInCoverageLines = true;
    settingsManager.isEciOnHover = false;
    settingsManager.isDemoModeOn = false;
    settingsManager.isSatLabelModeOn = true;
    settingsManager.isFreezePropRateOnDrag = false;
    settingsManager.isDisableTimeMachineToasts = false;
    settingsManager.searchLimit = 600;
    PersistenceManager.getInstance().removeItem(StorageKey.SETTINGS_DOT_COLORS);
    SettingsManager.preserveSettings();
    SettingsMenuPlugin.syncOnLoad();
  }

  private static onSubmit_(e: SubmitEvent) {
    if (typeof e === 'undefined' || e === null) {
      throw new Error('e is undefined');
    }
    e.preventDefault();

    const uiManagerInstance = keepTrackApi.getUiManager();
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    keepTrackApi.getSoundManager()?.play(SoundNames.BUTTON_CLICK);

    settingsManager.isOrbitCruncherInEcf = (<HTMLInputElement>getEl('settings-drawEcf')).checked;
    const numberOfEcfOrbitsToDraw = parseInt((<HTMLInputElement>getEl('settings-numberOfEcfOrbitsToDraw')).value);

    if (numberOfEcfOrbitsToDraw !== settingsManager.numberOfEcfOrbitsToDraw) {
      keepTrackApi.getOrbitManager().orbitWorker.postMessage({
        typ: OrbitCruncherType.SETTINGS_UPDATE,
        numberOfOrbitsToDraw: numberOfEcfOrbitsToDraw,
      });
    }
    settingsManager.numberOfEcfOrbitsToDraw = numberOfEcfOrbitsToDraw;
    settingsManager.isDrawInCoverageLines = (<HTMLInputElement>getEl('settings-isDrawInCoverageLines')).checked;
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
      keepTrackApi.getOrbitManager().drawOrbitsSettingChanged();
    }
    settingsManager.isDrawTrailingOrbits = (<HTMLInputElement>getEl('settings-drawTrailingOrbits')).checked;

    if (keepTrackApi.getOrbitManager().orbitWorker) {
      if (settingsManager.isDrawTrailingOrbits) {
        keepTrackApi.getOrbitManager().orbitWorker.postMessage({
          typ: OrbitCruncherType.CHANGE_ORBIT_TYPE,
          orbitType: OrbitDrawTypes.TRAIL,
        });
      } else {
        keepTrackApi.getOrbitManager().orbitWorker.postMessage({
          typ: OrbitCruncherType.CHANGE_ORBIT_TYPE,
          orbitType: OrbitDrawTypes.ORBIT,
        });
      }
    }
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
    const timeMachinePlugin = keepTrackApi.getPlugin(TimeMachine);

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
    keepTrackApi.getGroupsManager().clearSelect();
    colorSchemeManagerInstance.calculateColorBuffers(true); // force color recalc

    keepTrackApi.getPlugin(TimeMachine)?.setBottomIconToUnselected();

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
      uiManagerInstance.searchManager.doSearch(keepTrackApi.getUiManager().searchManager.getCurrentSearch());
    }

    colorSchemeManagerInstance.calculateColorBuffers(true);

    SettingsManager.preserveSettings();
  }
}

