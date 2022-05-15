import gpsPng from '@app/img/icons/gps.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import $ from 'jquery';

let isDOPMenuOpen = false;
export const dopsFormSubmit = (): void => {
  keepTrackApi.programs.uiManager.hideSideMenus();
  isDOPMenuOpen = true;
  $('#loading-screen').fadeIn(1000, function () {
    loadingScreenFadeIn();
  });
};
export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="dops-menu" class="side-menu-parent start-hidden text-select">
          <div id="dops-content" class="side-menu">
            <form id="dops-form">
              <div class="switch row">
                <h5 class="center-align">DOP Table</h5>
                <div class="input-field col s3">
                  <input value="41" id="dops-lat" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Latitude in Degrees">
                  <label for="dops-lat" class="active">Latitude</label>
                </div>
                <div class="input-field col s3">
                  <input value="-71" id="dops-lon" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Longitude in Degrees">
                  <label for="dops-lon" class="active">Longitude</label>
                </div>
                <div class="input-field col s3">
                  <input value="-71" id="dops-alt" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Altitude in KM">
                  <label for="dops-lon" class="active">Altitude</label>
                </div>
                <div class="input-field col s3">
                  <input value="15" id="dops-el" type="text" class="tooltipped" data-position="right"
                    data-delay="50" data-tooltip="Minimum Elevation for GPS Lock">
                  <label for="dops-el" class="active">Mask</label>
                </div>
              </div>
              <div class="row center">
                <button id="dops-submit" class="btn btn-ui waves-effect waves-light" type="submit"
                  name="action">Update DOP Data &#9658;
                </button>
              </div>
            </form>
            <div class="row">
              <table id="dops" class="center-align striped-light centered"></table>
            </div>
          </div>
        </div>
      `);

  $('#dops-form').on('submit', function (e: Event) {
    dopsFormSubmit();
    e.preventDefault();
  });

  // Allow resizing of the side menu
  $('#dops-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-dops" class="bmenu-item">
          <img alt="gps" src="" delayedsrc="${gpsPng}" />
          <span class="bmenu-title">DOPs</span>
          <div class="status-icon"></div>
        </div>      
      `);
};
export const adviceReady = () => {
  const aM = keepTrackApi.programs.adviceManager;
  aM.adviceCount.socrates = 0;

  aM.adviceList.socrates = () => {
    // Only Do this Twice
    if (aM.adviceCount.socrates >= 3) return;
    aM.adviceCount.socrates += 1;

    aM.showAdvice(
      'SOCRATES Near Conjunction List',
      'Did you know that objects frequently come close to colliding? Using data from Center for Space Standars and Innovation you can find upcomming possible collisions.',
      $('#menu-satellite-collision'),
      'bottom'
    );
  };
  aM.adviceArray.push(aM.adviceList.socrates);
};

export const loadingScreenFadeIn = (): void => {
  const lat = parseFloat(<string>(<HTMLInputElement>document.getElementById('dops-lat')).value);
  const lon = parseFloat(<string>(<HTMLInputElement>document.getElementById('dops-lon')).value);
  const alt = parseFloat(<string>(<HTMLInputElement>document.getElementById('dops-alt')).value);
  const el = parseFloat(<string>(<HTMLInputElement>document.getElementById('dops-el')).value);
  settingsManager.gpsElevationMask = el;
  keepTrackApi.programs.satellite.updateDopsTable(lat, lon, alt);
  document.getElementById('menu-dops').classList.add('bmenu-item-selected');
  $('#loading-screen').fadeOut('slow');
  slideInRight(document.getElementById('dops-menu'), 1000);
};
export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-dops') {
    if (isDOPMenuOpen) {
      isDOPMenuOpen = false;
      keepTrackApi.programs.uiManager.hideSideMenus();
      return;
    } else {
      keepTrackApi.programs.uiManager.hideSideMenus();
      isDOPMenuOpen = true;
      $('#loading-screen').fadeIn(1000, loadingScreenFadeIn);
      return;
    }
  }
};
export const hideSideMenus = (): void => {
  slideOutLeft(document.getElementById('dops-menu'), 1000);
  document.getElementById('menu-dops').classList.remove('bmenu-item-selected');
  isDOPMenuOpen = false;
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'dops',
    cb: uiManagerInit,
  });

  // Add Advice Info
  keepTrackApi.register({
    method: 'adviceReady',
    cbName: 'dops',
    cb: adviceReady,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'dops',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'dops',
    cb: hideSideMenus,
  });
};
