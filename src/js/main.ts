/* eslint-disable no-unreachable */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////
 *
 * main.js is the primary javascript file for keeptrack.space. It manages all user
 * interaction with the application.
 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2022 Theodore Kruczek
 * @Copyright (C) 2020-2022 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
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

import '@css/loading-screen.css';

import { isThisJest, keepTrackApi } from './api/keepTrackApi';

import { loadSplashScreen } from './loadSplashScreen';
import { startKeepTrack } from './start';

// Load the main website
const settingsOverride = window.settingsOverride || {};

if (!settingsOverride.isPreventDefaultHtml) {
  const bodyDOM = document.getElementsByTagName('body')[0];
  bodyDOM.innerHTML = keepTrackApi.html`
  <div id="loading-screen" class="valign-wrapper full-loader">
      <div id="logo-inner-container" class="valign">
        <div style="display: flex;">
          <span id="logo-text" class="logo-font">KEEP TRACK</span>
          <span id="logo-text-version" class="logo-font">7</span>
        </div>
        <span id="loader-text">Downloading Science...</span>
      </div>
    </div>
    <div id="main-container">
      <header>
        <div id="header"></div>
      </header>
      <main>
        <div id="rmb-wrapper"></div>

        <div id="canvas-holder">
          <canvas id="keeptrack-canvas"></canvas>
          <div id="ui-wrapper">
            <div id="search-results"></div>

            <div id="sat-hoverbox">
              <span id="sat-hoverbox1"></span>
              <br />
              <span id="sat-hoverbox2"></span>
              <br />
              <span id="sat-hoverbox3"></span>
            </div>
            <div id="sat-minibox"></div>

            <div id="legend-hover-menu" class="start-hidden"></div>
            <aside id="left-menus"></aside>
          </div>
        </div>
        <figcaption id="info-overlays">
          <div id="camera-status-box" class="start-hidden status-box">Earth Centered Camera Mode</div>
          <div id="propRate-status-box" class="start-hidden status-box">Propagation Rate: 1.00x</div>
          <div id="demo-logo" class="logo-font start-hidden">Keeptrack.space</div>
          <div id="license-watermark" class="logo-font start-hidden">Unlicensed Software - Contact
            theodore.kruczek@gmail.com to Renew!</div>
        </figcaption>
      </main>
      <footer id="nav-footer" class="page-footer resizable">
        <div id="footer-handle" class="ui-resizable-handle ui-resizable-n"></div>
        <div id="footer-toggle-wrapper">
          <div id="nav-footer-toggle">&#x25BC;</div>
        </div>
        <div id="bottom-icons-container">
          <div id="bottom-icons"></div>
        </div>
      </footer>
    </div>
    `;

  if (!isThisJest() && settingsOverride.isShowSplashScreen) loadSplashScreen();
}
startKeepTrack(settingsOverride);
