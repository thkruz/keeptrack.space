import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  // Reset Flag
  let isAboutSelected = false;
  // Load HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'aboutManager',
    cb: () => {
      // Side Menu      
      $('#left-menus').append(keepTrackApi.html`
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
                  Used at the <a style="color: #48f3e3 !important;" href="https://www.youtube.com/embed/OfvkKBNup5A?autoplay=0&start=521&modestbranding=1" target="_blank">Joint Space Operations Center</a><br>
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
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-about" class="bmenu-item">
          <img alt="about" src="" delayedsrc="data:image/png;base64,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">
          <span class="bmenu-title">About</span>
          <div class="status-icon"></div>
        </div>
      `);      
    },
  });

  // Load JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'about',
    cb: (iconName: string): void => {
      if (iconName === 'menu-about') { // No Keyboard Shortcut
        if (isAboutSelected) {
          isAboutSelected = false;
          keepTrackApi.programs.uiManager.hideSideMenus();
          return;
        } else {
          keepTrackApi.programs.uiManager.hideSideMenus();
          $('#about-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isAboutSelected = true;
          $('#menu-about').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'about',
    cb: (): void => {
      $('#about-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-about').removeClass('bmenu-item-selected');
      isAboutSelected = false;
    }
  });
};
