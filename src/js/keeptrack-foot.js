/**
 * /*
 * // /////////////////////////////////////////////////////////////////////////////
 *
 * Copyright (C) 2016-2020 Theodore Kruczek
 * Copyright (C) 2020 Heather Kruczek
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * // /////////////////////////////////////////////////////////////////////////////
 */

import * as $ from 'jquery';
import { groups } from '@app/js/groups.js';
import { settingsManager } from '@app/js/keeptrack-head.js';
var M = window.M;

// Enable Satbox Overlay
if (settingsManager.enableHoverOverlay) {
  document.getElementById('keeptrack-canvas').parentElement.innerHTML += `
  <div id="sat-hoverbox">
    <span id="sat-hoverbox1"></span>
    <br/>
    <span id="sat-hoverbox2"></span>
    <br/>
    <span id="sat-hoverbox3"></span>
  </div>`;
}

// Enable the Limited UI
if (settingsManager.disableUI && settingsManager.enableLimitedUI) {
  async () => {
    const { default: satSet } = await import('@app/js/satSet.js');
    const { default: ColorScheme } = await import('@app/js/color-scheme.js');
    const { default: orbitManager } = await import('@app/js/orbitManager.js');

    if (document.getElementById('keeptrack-canvas').tagName !== 'CANVAS') {
      console.warn('There is no canvas with id "keeptrack-canvas!!!"');
      console.log('Here is a list of canvas found:');
      console.log(document.getElementsByTagName('canvas'));
      if (document.getElementById('keeptrack-canvas').tagName == 'DIV') {
        console.warn('There IS a div with id "keeptrack-canvas"!!!');
      }
    } else {
      console.log('Found the keeptrack canvas:');
      console.log(document.getElementById('keeptrack-canvas'));
    }

    // Add Required DOMs
    document.getElementById('keeptrack-canvas').parentElement.innerHTML += `
    <div id="countries-btn">
    </div>
    <div id="orbit-btn">
    </div>
    <div id="time-machine-btn">
    </div>`;
    $(document).ready(function () {
      M.AutoInit();
      var countriesBtnDOM = $('#countries-btn');
      countriesBtnDOM.on('click', function () {
        if (settingsManager.currentColorScheme == ColorScheme.countries) {
          satSet.setColorScheme(ColorScheme.default);
        } else {
          satSet.setColorScheme(ColorScheme.countries);
        }
      });
      var orbitBtnDOM = $('#orbit-btn');
      settingsManager.isOrbitOverlayVisible = false;
      orbitBtnDOM.on('click', function () {
        if (!settingsManager.isOrbitOverlayVisible) {
          orbitManager.isTimeMachineVisible = false;
          isTimeMachine = false;
          groups.debris = new groups.SatGroup('all', '');
          groups.selectGroup(groups.debris);
          // satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc
          // groups.debris.updateOrbits();
          settingsManager.isOrbitOverlayVisible = true;
        } else {
          orbitManager.isTimeMachineVisible = false;
          isTimeMachine = false;
          groups.clearSelect();
          orbitManager.clearHoverOrbit();
          satSet.setColorScheme(ColorScheme.default, true);
          settingsManager.isOrbitOverlayVisible = false;
        }
      });
      var timeMachineDOM = $('#time-machine-btn');
      var isTimeMachine = false;
      timeMachineDOM.on('click', function () {
        if (isTimeMachine) {
          isTimeMachine = false;
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = false;
          orbitManager.isTimeMachineVisible = false;

          settingsManager.colors.transparent = orbitManager.tempTransColor;
          groups.clearSelect();
          satSet.setColorScheme(ColorScheme.default, true); // force color recalc

          $('#menu-time-machine').removeClass('bmenu-item-selected');
        } else {
          // Merge to one variable?
          orbitManager.isTimeMachineRunning = true;
          orbitManager.isTimeMachineVisible = true;
          $('#menu-time-machine').addClass('bmenu-item-selected');
          orbitManager.historyOfSatellitesPlay();
          isTimeMachine = true;
        }
      });
    });
  };
}

// Load Bottom icons
if (!settingsManager.disableUI) {
  $(document).ready(function () {
    $.event.special.touchstart = {
      setup: function (_, ns, handle) {
        if (ns.includes('noPreventDefault')) {
          this.addEventListener('touchstart', handle, { passive: false });
        } else {
          this.addEventListener('touchstart', handle, { passive: true });
        }
      },
    };
  });
}
