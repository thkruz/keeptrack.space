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
import { settingsManager } from '@app/js/settings.js';

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
