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

import { parseRgba, rgbCss } from '@app/js/lib/helpers';
import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { satellite, satSet, ColorScheme, settingsManager, uiManager} = keepTrackApi.programs;
  let isSettingsMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'settingsMenu',
    cb: () => {
      // Side Menu
      $('#left-menus').append(keepTrackApi.html`
        <div id="settings-menu" class="side-menu-parent start-hidden text-select">
          <div id="settings-content" class="side-menu">
            <div class="row">
              <form id="settings-form">
                <div id="settings-general">
                  <h5 class="center-align">General Settings</h5>
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
                      <p>TruSat</p>
                      <button id="settings-color-trusat" class="btn waves-effect waves-light"></button>
                    </center>
                  </div>
                </div>
                <div class="row"></div>
                <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
                <div id="satOverfly-opt">
                  <h5 class="center-align">Satellite Overfly Settings</h5>
                  <div class="input-field col s12">
                    <input value="30" id="satFieldOfView" type="text" class="tooltipped" data-position="right" data-delay="50" data-tooltip="What is the satellite's field of view in degrees" />
                    <label for="satFieldOfView" class="active">Satellite Field of View</label>
                  </div>
                  <div class="row"></div>
                </div>
                <div class="row light-blue darken-3" style="height:4px; display:block;"></div>
                <div id="fastCompSettings">
                  <h5 class="center-align">Fast CPU Required</h5>
                  <div class="switch row">
                    <label>
                      <input id="settings-snp" type="checkbox" />
                      <span class="lever"></span>
                      Show Next Pass on Hover
                    </label>
                  </div>
                  <div class="row"></div>
                  <br />
                  <div class="row center">
                    <button id="settings-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Settings &#9658;</button>
                  </div>
                </div>
                <!-- <div id="settings-lowperf" class="row center">
                  <button class="red btn waves-effect waves-light" onclick="uiManager.startLowPerf();">Low End PC Version &#9658;</button>
                </div> -->
              </form>
            </div>
          </div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-settings" class="bmenu-item">
          <img
            alt="settings"
            src=""
            delayedsrc="data:image/png;base64,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"
          />
          <span class="bmenu-title">Settings</span>
          <div class="status-icon"></div>
        </div>
      `);

      $('#settings-form').on('change', function (e) {
        var isDMChecked = (<HTMLInputElement>document.getElementById('settings-demo-mode')).checked;
        var isSLMChecked = (<HTMLInputElement>document.getElementById('settings-sat-label-mode')).checked;

        if (isSLMChecked && e.target.id === 'settings-demo-mode') {
          (<HTMLInputElement>document.getElementById('settings-sat-label-mode')).checked = false;
          $('#settings-demo-mode').removeClass('lever:after');
        }

        if (isDMChecked && e.target.id === 'settings-sat-label-mode') {
          (<HTMLInputElement>document.getElementById('settings-demo-mode')).checked = false;
          $('#settings-sat-label-mode').removeClass('lever:after');
        }
      });

      $('#settings-riseset').on('change', function () {
        let isRiseSetChecked = (<HTMLInputElement>document.getElementById('settings-riseset')).checked;
        if (isRiseSetChecked) {
          satellite.isRiseSetLookangles = true;
        } else {
          satellite.isRiseSetLookangles = false;
        }
      });

      $('#settings-form').on('submit', function (e) {
        var isHOSChecked = (<HTMLInputElement>document.getElementById('settings-hos')).checked;
        var isDMChecked = (<HTMLInputElement>document.getElementById('settings-demo-mode')).checked;
        var isSLMChecked = (<HTMLInputElement>document.getElementById('settings-sat-label-mode')).checked;
        var isSNPChecked = (<HTMLInputElement>document.getElementById('settings-snp')).checked;

        if (isSLMChecked) {
          settingsManager.isSatLabelModeOn = true;
        } else {
          settingsManager.isSatLabelModeOn = false;
        }

        if (isDMChecked) {
          settingsManager.isDemoModeOn = true;
        } else {
          settingsManager.isDemoModeOn = false;
        }

        if (isHOSChecked) {
          settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0];
        } else {
          settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
        }
        ColorScheme.reloadColors();

        if (isSNPChecked) {
          settingsManager.isShowNextPass = true;
        } else {
          settingsManager.isShowNextPass = false;
        }

        settingsManager.isForceColorScheme = true;
        satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
        e.preventDefault();
      });
      
      var isNotColorPickerInitialSetup = false;
  (() => {
    var colorPalette = [
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
      initialColor: rgbCss(settingsManager.colors.payload),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.payload = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    (<any>$('#settings-color-rocketBody')).colorPick({
      initialColor: rgbCss(settingsManager.colors.rocketBody),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.rocketBody = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    (<any>$('#settings-color-debris')).colorPick({
      initialColor: rgbCss(settingsManager.colors.debris),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.debris = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    (<any>$('#settings-color-inview')).colorPick({
      initialColor: rgbCss(settingsManager.colors.inview),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.inview = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    (<any>$('#settings-color-missile')).colorPick({
      initialColor: rgbCss(settingsManager.colors.missile),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.missile = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    (<any>$('#settings-color-missileInview')).colorPick({
      initialColor: rgbCss(settingsManager.colors.missileInview),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.missileInview = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    (<any>$('#settings-color-trusat')).colorPick({
      initialColor: rgbCss(settingsManager.colors.trusat),
      palette: colorPalette,
      onColorSelected: function () {
        this.element.css('cssText', `background-color: ${this.color} !important; color: ${this.color};`);
        if (isNotColorPickerInitialSetup) {
          settingsManager.colors.trusat = parseRgba(this.color);
          uiManager.legendColorsChange();
          satSet.setColorScheme(settingsManager.currentColorScheme, true);
          localStorage.setItem('settingsManager-colors', JSON.stringify(settingsManager.colors));
        }
      },
    });
    isNotColorPickerInitialSetup = true;
  })();
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'settingsMenu',
    cb: (iconName: string): void => {
      if (iconName === 'menu-settings') {
        if (isSettingsMenuOpen) {
          isSettingsMenuOpen = false;
          uiManager.hideSideMenus();
          return;
        } else {
          if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
          uiManager.hideSideMenus();
          $('#settings-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isSettingsMenuOpen = true;
          $('#menu-settings').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'sensor',
    cb: (): void => {
      $('#settings-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-settings').removeClass('bmenu-item-selected');
      isSettingsMenuOpen = false;
    },
  });
};
