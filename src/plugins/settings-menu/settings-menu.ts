import { SoundNames } from '@app/engine/audio/sounds';
import { MenuMode, ToastMsgType } from '@app/engine/core/interfaces';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { getEl, hideEl } from '@app/engine/utils/get-el';
import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';
import { SettingsManager } from '@app/settings/settings';
import { SatLabelMode } from '@app/settings/ui-settings';
import settingsPng from '@public/img/icons/settings.png';
import { KeepTrackPlugin } from '../../engine/plugins/base-plugin';
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

declare module '@app/engine/core/interfaces' {
  interface UserSettings {
    isBlackEarth: boolean;
    isDrawMilkyWay: boolean;
  }
}

export class SettingsMenuPlugin extends KeepTrackPlugin {
  readonly id = 'SettingsMenuPlugin';
  dependencies_ = [];

  menuMode: MenuMode[] = [MenuMode.SETTINGS, MenuMode.ALL];

  bottomIconElementName: string = 'settings-menu-icon';
  bottomIconImg = settingsPng;
  sideMenuElementName: string = 'settings-menu';
  sideMenuElementHtml: string = html`
  <div id="settings-menu" class="side-menu-parent start-hidden">
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
              <label data-position="top" data-delay="50" data-tooltip="Disable this to hide the camera widget">
                <input id="settings-drawCameraWidget" type="checkbox"/>
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
            <div class="input-field col s12" data-position="top" data-delay="50" data-tooltip="Controls satellite label rendering on watchlist satellites.">
              <select id="settings-sat-label-mode">
                <option value="0">Off</option>
                <option value="1" selected>FOV Only</option>
                <option value="2">All Watchlist</option>
              </select>
              <label>Satellite Label Mode</label>
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
            <div class="switch row">
              <label data-position="top" data-delay="50" data-tooltip="Compensate camera yaw for Earth rotation so the view stays fixed to geographic coordinates.">
                <input id="settings-compensateEarthRotation" type="checkbox" checked/>
                <span class="lever"></span>
                Compensate for Earth Rotation
              </label>
            </div>
          </div>
          <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
          <div id="settings-opt" class="row">
            <div class="row">
              <h5 class="center-align">Settings Overrides</h5>
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
    }

    const settingsElements = [
      { id: 'settings-drawOrbits', setting: 'isDrawOrbits' },
      { id: 'settings-drawTrailingOrbits', setting: 'isDrawTrailingOrbits' },
      { id: 'settings-drawEcf', setting: 'isOrbitCruncherInEcf' },
      { id: 'settings-numberOfEcfOrbitsToDraw', setting: 'numberOfEcfOrbitsToDraw' },
      { id: 'settings-isDrawInCoverageLines', setting: 'isDrawInCoverageLines' },
      { id: 'settings-enableHoverOverlay', setting: 'enableHoverOverlay' },
      { id: 'settings-focusOnSatelliteWhenSelected', setting: 'isFocusOnSatelliteWhenSelected' },
      { id: 'settings-eciOnHover', setting: 'isEciOnHover' },
      { id: 'settings-confidence-levels', setting: 'isShowConfidenceLevels' },
      { id: 'settings-demo-mode', setting: 'isDemoModeOn' },
      { id: 'settings-snp', setting: 'isShowNextPassOnHover' },
      { id: 'settings-freeze-drag', setting: 'isFreezePropRateOnDrag' },
      { id: 'settings-time-machine-toasts', setting: 'isDisableTimeMachineToasts' },
      { id: 'settings-compensateEarthRotation', setting: 'isCompensateForEarthRotation' },
    ];

    settingsElements.forEach(({ id, setting }) => {
      const element = <HTMLInputElement>getEl(id);

      if (element) {
        element.checked = settingsManager[setting];
      }
    });

    const satLabelModeEl = <HTMLSelectElement>getEl('settings-sat-label-mode');

    if (satLabelModeEl) {
      satLabelModeEl.value = settingsManager.satLabelMode.toString();
    }

  }

  // eslint-disable-next-line complexity
  private static onFormChange_(e: Event, isDMChecked?: boolean) {
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
      case 'settings-drawSun':
      case 'settings-drawBlackEarth':
      case 'settings-drawAtmosphere':
      case 'settings-drawAurora':
      case 'settings-drawMilkyWay':
      case 'settings-graySkybox':
      case 'settings-eciOnHover':
      case 'settings-confidence-levels':
      case 'settings-demo-mode':
      case 'settings-freeze-drag':
      case 'settings-time-machine-toasts':
      case 'settings-compensateEarthRotation':
      case 'settings-snp':
        if ((<HTMLInputElement>getEl((<HTMLInputElement>e.target)?.id ?? ''))?.checked) {
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_ON);
        } else {
          ServiceLocator.getSoundManager()?.play(SoundNames.TOGGLE_OFF);
        }
        break;
      case 'settings-sat-label-mode':
        ServiceLocator.getSoundManager()?.play(SoundNames.CLICK);
        break;
      default:
        break;
    }

    isDMChecked ??= (<HTMLInputElement>getEl('settings-demo-mode')).checked;

    // When demo mode is enabled, disable satellite labels
    if (isDMChecked && (<HTMLElement>e.target).id === 'settings-demo-mode') {
      (<HTMLSelectElement>getEl('settings-sat-label-mode')).value = '0';
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
    settingsManager.satLabelMode = SatLabelMode.FOV_ONLY;
    settingsManager.isFreezePropRateOnDrag = false;
    settingsManager.isDisableTimeMachineToasts = false;
    settingsManager.isCompensateForEarthRotation = true;
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
      ServiceLocator.getOrbitManager().orbitThreadMgr.sendSettingsUpdate(numberOfEcfOrbitsToDraw);
    }
    settingsManager.numberOfEcfOrbitsToDraw = numberOfEcfOrbitsToDraw;
    settingsManager.isDrawInCoverageLines = (<HTMLInputElement>getEl('settings-isDrawInCoverageLines')).checked;
    settingsManager.enableHoverOverlay = (<HTMLInputElement>getEl('settings-enableHoverOverlay')).checked;
    settingsManager.isFocusOnSatelliteWhenSelected = (<HTMLInputElement>getEl('settings-focusOnSatelliteWhenSelected')).checked;
    settingsManager.drawCameraWidget = (<HTMLInputElement>getEl('settings-drawCameraWidget')).checked;

    const isDrawOrbitsChanged = settingsManager.isDrawOrbits !== (<HTMLInputElement>getEl('settings-drawOrbits')).checked;

    settingsManager.isDrawOrbits = (<HTMLInputElement>getEl('settings-drawOrbits')).checked;
    if (isDrawOrbitsChanged) {
      ServiceLocator.getOrbitManager().drawOrbitsSettingChanged();
    }
    settingsManager.isDrawTrailingOrbits = (<HTMLInputElement>getEl('settings-drawTrailingOrbits')).checked;

    ServiceLocator.getOrbitManager().updateOrbitType();

    // Must come after the above checks
    settingsManager.isEciOnHover = (<HTMLInputElement>getEl('settings-eciOnHover')).checked;
    settingsManager.isShowConfidenceLevels = (<HTMLInputElement>getEl('settings-confidence-levels')).checked;
    settingsManager.isDemoModeOn = (<HTMLInputElement>getEl('settings-demo-mode')).checked;
    settingsManager.satLabelMode = parseInt((<HTMLSelectElement>getEl('settings-sat-label-mode')).value) as SatLabelMode;
    settingsManager.isShowNextPass = (<HTMLInputElement>getEl('settings-snp')).checked;
    settingsManager.isFreezePropRateOnDrag = (<HTMLInputElement>getEl('settings-freeze-drag')).checked;

    settingsManager.isDisableTimeMachineToasts = (<HTMLInputElement>getEl('settings-time-machine-toasts')).checked;
    settingsManager.isCompensateForEarthRotation = (<HTMLInputElement>getEl('settings-compensateEarthRotation')).checked;
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

    colorSchemeManagerInstance.calculateColorBuffers(true);

    SettingsManager.preserveSettings();
  }
}

