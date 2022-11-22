import gpsPng from '@app/img/icons/gps.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { clickAndDragWidth, getEl, showLoading, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { helpBodyTextDop, helpTitleTextDop } from './help';

let isDOPMenuOpen = false;
export const dopsFormSubmit = (): void => {
  keepTrackApi.programs.uiManager.hideSideMenus();
  isDOPMenuOpen = true;
  showLoading(loadingScreenFadeIn);
};
export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
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
        `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
        <div id="menu-dops" class="bmenu-item">
          <img alt="gps" src="" delayedsrc="${gpsPng}" />
          <span class="bmenu-title">DOPs</span>
          <div class="status-icon"></div>
        </div>      
      `
  );
};

export const uiManagerFinal = () => {
  getEl('dops-form').addEventListener('submit', function (e: Event) {
    dopsFormSubmit();
    e.preventDefault();
  });

  // Allow resizing of the side menu
  clickAndDragWidth(getEl('dops-menu'));
};

export const loadingScreenFadeIn = (): void => {
  const lat = parseFloat(<string>(<HTMLInputElement>getEl('dops-lat')).value);
  const lon = parseFloat(<string>(<HTMLInputElement>getEl('dops-lon')).value);
  const alt = parseFloat(<string>(<HTMLInputElement>getEl('dops-alt')).value);
  const el = parseFloat(<string>(<HTMLInputElement>getEl('dops-el')).value);
  settingsManager.gpsElevationMask = el;
  keepTrackApi.programs.satellite.updateDopsTable(lat, lon, alt);
  getEl('menu-dops').classList.add('bmenu-item-selected');
  slideInRight(getEl('dops-menu'), 1000);
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
      showLoading(loadingScreenFadeIn);
      return;
    }
  }
};
export const hideSideMenus = (): void => {
  slideOutLeft(getEl('dops-menu'), 1000);
  getEl('menu-dops').classList.remove('bmenu-item-selected');
  isDOPMenuOpen = false;
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'dops',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'dops',
    cb: uiManagerFinal,
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

  keepTrackApi.register({
    method: 'onHelpMenuClick',
    cbName: 'dops',
    cb: onHelpMenuClick,
  });
};

export const onHelpMenuClick = (): boolean => {
  if (isDOPMenuOpen) {
    keepTrackApi.programs.adviceManager.showAdvice(helpTitleTextDop, helpBodyTextDop);
    return true;
  }
  return false;
};
