import { getEl, slideInRight, slideOutLeft } from '@app/js/lib/helpers';

import aboutPng from '@app/img/icons/about.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

export const init = (): void => {
  // Reset Flag
  let isAboutSelected = false;
  // Load HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'aboutManager',
    cb: () => {
      // Side Menu
      getEl('left-menus').insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
        <div id="about-menu" class="side-menu-parent start-hidden text-select">
          <div id="about-content" class="side-menu">
            <div class="row">
              <div id="mobile-warning" class="center-align">
                You are using the mobile version. Please try the desktop version for full functionality.
              </div>
              <br>
              <div class="row">
                <h5 class="center-align">About</h5>
                <div class="col s12">
                  <p>KeepTrack is the only Astrodynamics software designed specifically for non-engineers.
                  It only takes 20 megabytes of space (half of which is the satellite information), can run on a cellphone, and is available without installation - even offline.</p>
                  <p>KeepTrack follows the design guidelines laid out by the <a style="color: #48f3e3 !important;" href="https://www.astrouxds.com/" target="_blank">
                    United States Space Force Space and Missiles Center</a>. With most of the features you would expect out of software costing thousands of dollars, KeepTrack is completely free under the GNU General Public License!</p>
                </div>
              </div>
              <div class="row">
                <h5 class="center-align">Author</h5>
                <div class="col s12">
                  Created by <a style="color: #48f3e3 !important;" href="https://github.com/thkruz/" target="_blank">Theodore Kruczek</a>
                  to help visualize orbital calculations for application to Ground Based Radars and Optical
                  Telescopes. Substantial help with the user interface was provided by <a style="color: #48f3e3 !important;" href="https://www.linkedin.com/in/leroiclaassen-webdev/" target="_blank">Le-Roi Claassen</a>.
                  Based on the original work of <a style="color: #48f3e3 !important;" href="https://github.com/jeyoder/" target="_blank">James Yoder</a>
                </div>
              </div>
              <div class="row">
                <h5 class="center-align">Issues</h5>
                <div class="col s12">
                  Please contribute to development by posting your ideas/issues/bugs to the
                  <a style="color: #48f3e3 !important;" href="https://github.com/thkruz/keeptrack.space" target="_blank">public github repository</a>.
                </div>
              </div>
              <div class="row">
                <h5 class="center-align">Sources</h5>
                <div class="col s12">
                  All information is open source and publically available information. Orbits are derived from
                  TLEs found on public websites. Payload information is compiled from various
                  public sources. US Sensor data was derived from MDA reports on enviromental impacts and
                  congressional budget reports.
                </div>
              </div>
              <div class="row">
                <h5 class="center-align">Featured Users</h5>
                <div class="col s12">
                  Used at the <a style="color: #48f3e3 !important;" href="https://www.youtube.com/embed/OfvkKBNup5A?autoplay=0&start=521&modestbranding=1" target="_blank">Combined Space Operations Center</a><br>
                  Displayed in <a style="color: #48f3e3 !important;" href="https://espace.epfl.ch/event/cosmos-archaeology/" target="_blank">Cosmos Archaeology</a> at the University of Lausanne<br>
                  Powering the ESA sponsored <a style="color: #48f3e3 !important;" href="https://clearspace.today" target="_blank">ClearSpace-1 Website</a><br>
                  Used in Studio Roosegaarde's <a style="color: #48f3e3 !important;" href="https://www.studioroosegaarde.net/project/space-waste-lab" target="_blank">Space Waste Lab</a><br>
                  Shown on <a style="color: #48f3e3 !important;" href="https://www.youtube.com/watch?v=gRhOkDapSGM" target="_blank">HBO's Vice Season 6 Episode 13</a><br>
                  <br>
                  Is my code aiding your project? <a style="color: #48f3e3 !important;" href="mailto: theodore.kruczek@gmail.com" target="_blank">Let me know!</a>
                </div>
              </div>
              <div class="row">
                <h5 class="center-align">Version</h5>
                <div id="versionNumber-text" class="col s12">
                </div>
              </div>
            </div>
          </div>
        </div>
      `
      );

      // Bottom Icon
      getEl('bottom-icons').insertAdjacentHTML(
        'beforeend',
        keepTrackApi.html`
        <div id="menu-about" class="bmenu-item">
          <img alt="about" src="" delayedsrc=${aboutPng}>
          <span class="bmenu-title">About</span>
          <div class="status-icon"></div>
        </div>
        `
      );
    },
  });

  // Load JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'about',
    cb: (iconName: string): void => {
      if (iconName === 'menu-about') {
        // No Keyboard Shortcut
        if (isAboutSelected) {
          isAboutSelected = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          keepTrackApi.programs.uiManager.hideSideMenus();
          slideInRight(getEl('about-menu'), 1000);
          isAboutSelected = true;
          getEl('menu-about').classList.add('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'about',
    cb: (): void => {
      slideOutLeft(getEl('about-menu'), 1000);
      getEl('menu-about').classList.remove('bmenu-item-selected');
      isAboutSelected = false;
    },
  });
};
