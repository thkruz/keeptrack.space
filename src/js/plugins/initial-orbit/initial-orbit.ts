import iodPng from '@app/img/icons/iod.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { UiManager } from '@app/js/api/keepTrackTypes';
import { clickAndDragWidth, getEl, slideInRight, slideOutLeft } from '@app/js/lib/helpers';
import { omManager } from '@app/js/plugins/initial-orbit/om-manager';

let isObfitMenuOpen = false;
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'initialOrbit',
    cb: uiManagerInit,
  });

  keepTrackApi.register({
    method: 'uiManagerFinal',
    cbName: 'initialOrbit',
    cb: uiManagerFinal,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'initialOrbit',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'initialOrbit',
    cb: hideSideMenus,
  });
};

export const hideSideMenus = (): void => {
  slideOutLeft(getEl('obfit-menu'), 1000);
  getEl('menu-obfit').classList.remove('bmenu-item-selected');
  isObfitMenuOpen = false;
};

export const uiManagerInit = () => {
  // Side Menu
  getEl('left-menus').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="obfit-menu" class="side-menu-parent start-hidden text-select">
      <div id="obfit-content" class="side-menu">
        <form id="obfit-form">
          <div class="switch row">
            <h5 class="center-align">Initial Orbit Determination</h5>
          </div>
          <div class="switch row">
            <h6 class="center-align">Observation 1</h5>
            <div class="input-field col s12">
              <input value="1653098333497" id="obfit-t1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Time in Unix Time">
              <label for="obfit-t" class="active">Time</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="1977.3758544921875" id="obfit-x1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="X">
              <label for="obfit-lat" class="active">X</label>
            </div>
            <div class="input-field col s4">
              <input value="5811.54248046875" id="obfit-y1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y">
              <label for="obfit-lat" class="active">Y</label>
            </div><div class="input-field col s4">
              <input value="3240.01123046875" id="obfit-z1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z">
              <label for="obfit-lat" class="active">Z</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="-7.044088363647461" id="obfit-xd1" type="text" class="tooltipped" data-position="right"
              data-delay="50" data-tooltip="X Dot">
              <label for="obfit-lat" class="active">X Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="0.5667343735694885" id="obfit-yd1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y Dot">
              <label for="obfit-lat" class="active">Y Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="2.7424800395965576" id="obfit-zd1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z Dot">
              <label for="obfit-lat" class="active">Z Dot</label>
            </div>
          </div>
          <div class="switch row">
            <h6 class="center-align">Observation 2 (Optional)</h5>
            <div class="input-field col s12">
              <input value="" id="obfit-t2" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Time in Unix Time">
              <label for="obfit-t" class="active">Time</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="" id="obfit-x2" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="X">
              <label for="obfit-lat" class="active">X</label>
            </div>
            <div class="input-field col s4">
              <input value="" id="obfit-y2" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y">
              <label for="obfit-lat" class="active">Y</label>
            </div><div class="input-field col s4">
              <input value="" id="obfit-z2" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z">
              <label for="obfit-lat" class="active">Z</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="" id="obfit-xd2" type="text" class="tooltipped" data-position="right"
              data-delay="50" data-tooltip="X Dot">
              <label for="obfit-lat" class="active">X Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="" id="obfit-yd2" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y Dot">
              <label for="obfit-lat" class="active">Y Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="" id="obfit-zd2" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z Dot">
              <label for="obfit-lat" class="active">Z Dot</label>
            </div>
          </div>
          <div class="switch row">
            <h6 class="center-align">Observation 3 (Optional)</h5>
            <div class="input-field col s12">
              <input value="" id="obfit-t3" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Time in Unix Time">
              <label for="obfit-t" class="active">Time</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="" id="obfit-x3" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="X">
              <label for="obfit-lat" class="active">X</label>
            </div>
            <div class="input-field col s4">
              <input value="" id="obfit-y3" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y">
              <label for="obfit-lat" class="active">Y</label>
            </div><div class="input-field col s4">
              <input value="" id="obfit-z3" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z">
              <label for="obfit-lat" class="active">Z</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="" id="obfit-xd3" type="text" class="tooltipped" data-position="right"
              data-delay="50" data-tooltip="X Dot">
              <label for="obfit-lat" class="active">X Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="" id="obfit-yd3" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y Dot">
              <label for="obfit-lat" class="active">Y Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="" id="obfit-zd3" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z Dot">
              <label for="obfit-lat" class="active">Z Dot</label>
            </div>
          </div>
          <div class="row center">
            <button id="obfit-submit" class="btn btn-ui waves-effect waves-light" type="submit"
              name="action">Create Analyst Satellite &#9658;
            </button>
          </div>
        </form>
        <div class="row">
          <table id="obfit" class="center-align striped-light centered"></table>
        </div>
      </div>
    </div>     
  `
  );

  // Bottom Icon
  getEl('bottom-icons').insertAdjacentHTML(
    'beforeend',
    keepTrackApi.html`
    <div id="menu-obfit" class="bmenu-item">
      <img
        alt="obfit"
        src=""
        delayedsrc="${iodPng}" />
      <span class="bmenu-title">Initial Orbit</span>
      <div class="status-icon"></div>
    </div>
  `
  );
};

export const uiManagerFinal = (): void => {
  clickAndDragWidth(getEl('external-menu'), {
    maxWidth: 650,
    minWidth: 400,
  });

  getEl('obfit-form').addEventListener('submit', function (e: Event) {
    obfitFormSubmit(e);
  });
};

export const bottomMenuClick = (iconName: string): void => {
  const { uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-obfit') {
    if (isObfitMenuOpen) {
      isObfitMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
      uiManager.hideSideMenus();
      slideInRight(getEl('obfit-menu'), 1000);
      isObfitMenuOpen = true;
      getEl('menu-obfit').classList.add('bmenu-item-selected');
      return;
    }
  }
};

// prettier-ignore
export const obfitFormSubmit = (e: any) => { // NOSONAR
  const { uiManager, satSet, timeManager, satellite } = keepTrackApi.programs;
  let isOb2 = false;
  let isOb3 = false;
  const t1v = validateObfitInput('obfit-t1');
  const x1v = validateObfitInput('obfit-x1');
  const y1v = validateObfitInput('obfit-y1');
  const z1v = validateObfitInput('obfit-z1');
  const xd1v = validateObfitInput('obfit-xd1');
  const yd1v = validateObfitInput('obfit-yd1');
  const zd1v = validateObfitInput('obfit-zd1');
  const t2v = validateObfitInput('obfit-t2');
  const x2v = validateObfitInput('obfit-x2');
  const y2v = validateObfitInput('obfit-y2');
  const z2v = validateObfitInput('obfit-z2');
  const xd2v = validateObfitInput('obfit-xd2');
  const yd2v = validateObfitInput('obfit-yd2');
  const zd2v = validateObfitInput('obfit-zd2');
  const t3v = validateObfitInput('obfit-t3');
  const x3v = validateObfitInput('obfit-x3');
  const y3v = validateObfitInput('obfit-y3');
  const z3v = validateObfitInput('obfit-z3');
  const xd3v = validateObfitInput('obfit-xd3');
  const yd3v = validateObfitInput('obfit-yd3');
  const zd3v = validateObfitInput('obfit-zd3');

  const svs = [];
  let sv1 = [];
  if (isNaN(t1v)) {
    uiManager.toast(`Time 1 is Invalid!`, 'critical');
    return false;
  }
  if (isNaN(x1v)) {
    uiManager.toast(`X 1 is Invalid!`, 'critical');
    return false;
  }
  if (isNaN(y1v)) {
    uiManager.toast(`Y 1 is Invalid!`, 'critical');
    return false;
  }
  if (isNaN(z1v)) {
    uiManager.toast(`Z 1 is Invalid!`, 'critical');
    return false;
  }
  if (isNaN(xd1v)) {
    uiManager.toast(`X Dot 1 is Invalid!`, 'critical');
    return false;
  }
  if (isNaN(yd1v)) {
    uiManager.toast(`Y Dot 1 is Invalid!`, 'critical');
    return false;
  }
  if (isNaN(zd1v)) {
    uiManager.toast(`Z Dot 1 is Invalid!`, 'critical');
    return false;
  }
  sv1 = [t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v];
  svs.push(sv1);

  const { isOb: _isOb2, sv: sv2 } = validateOb({ isOb: isOb2, obNum: 2, t: t2v, x: x2v, y: y2v, z: z2v, xd: xd2v, yd: yd2v, zd: zd2v, uiManager });
  isOb2 = _isOb2;
  svs.push(sv2);

  isOb3 = !isOb2 ? false : isOb3;
  const { isOb: _isOb3, sv: sv3 } = validateOb({ isOb: isOb3, obNum: 3, t: t3v, x: x3v, y: y3v, z: z3v, xd: xd3v, yd: yd3v, zd: zd3v, uiManager });
  isOb3 = _isOb3;
  svs.push(sv3);

  console.log(svs);
  omManager.svs2analyst(svs, satSet, timeManager, satellite);
  e.preventDefault();
  return true;
};

const validateOb = ({
  isOb,
  obNum,
  t,
  x,
  y,
  z,
  xd,
  yd,
  zd,
  uiManager,
}: {
  isOb: boolean;
  obNum: number;
  t: number;
  x: number;
  y: number;
  z: number;
  xd: number;
  yd: number;
  zd: number;
  uiManager: UiManager;
}): { isOb: boolean; sv: number[] } => {
  let sv = [];
  if (isOb && isNaN(t)) {
    isOb = false;
    uiManager.toast(`Time ${obNum} is Invalid!`, 'caution');
  }
  if (isOb && isNaN(x)) {
    isOb = false;
    uiManager.toast(`X ${obNum} is Invalid!`, 'caution');
  }
  if (isOb && isNaN(y)) {
    isOb = false;
    uiManager.toast(`Y ${obNum} is Invalid!`, 'caution');
  }
  if (isOb && isNaN(z)) {
    isOb = false;
    uiManager.toast(`Z ${obNum} is Invalid!`, 'caution');
  }
  if (isOb && isNaN(xd)) {
    isOb = false;
    uiManager.toast(`X Dot ${obNum} is Invalid!`, 'caution');
  }
  if (isOb && isNaN(yd)) {
    isOb = false;
    uiManager.toast(`Y Dot ${obNum} is Invalid!`, 'caution');
  }
  if (isOb && isNaN(zd)) {
    isOb = false;
    uiManager.toast(`Z Dot ${obNum} is Invalid!`, 'caution');
  }
  if (isOb) {
    sv = [t, x, y, z, xd, yd, zd];
  }
  return { isOb, sv };
};

const validateObfitInput = (el: string) => {
  const input = (<HTMLInputElement>getEl(el)).value;
  return input.length > 0 ? parseFloat(input) : NaN;
};
