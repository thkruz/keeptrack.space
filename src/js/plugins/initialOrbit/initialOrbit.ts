import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { omManager } from '@app/js/plugins/initialOrbit/omManager.js';
import $ from 'jquery';
import iodPng from '@app/img/icons/iod.png';

let isObfitMenuOpen = false;
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'initialOrbit',
    cb: uiManagerInit,
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
  $('#obfit-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-obfit').removeClass('bmenu-item-selected');
  isObfitMenuOpen = false;
};

export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
    <div id="obfit-menu" class="side-menu-parent start-hidden text-select">
      <div id="obfit-content" class="side-menu">
        <form id="obfit-form">
          <div class="switch row">
            <h5 class="center-align">Initial Orbit Determination</h5>
          </div>
          <div class="switch row">
            <h6 class="center-align">Observation 1</h5>
            <div class="input-field col s12">
              <input value="1606439414717" id="obfit-t1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Time in Unix Time">
              <label for="obfit-t" class="active">Time</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="-3323.62939453125" id="obfit-x1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="X">
              <label for="obfit-lat" class="active">X</label>
            </div>
            <div class="input-field col s4">
              <input value="-4930.19384765625" id="obfit-y1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y">
              <label for="obfit-lat" class="active">Y</label>
            </div><div class="input-field col s4">
              <input value="-3303.053955078125" id="obfit-z1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Z">
              <label for="obfit-lat" class="active">Z</label>
            </div>
          </div>
          <div class="switch row">
            <div class="input-field col s4">
              <input value="3.2059669494628906" id="obfit-xd1" type="text" class="tooltipped" data-position="right"
              data-delay="50" data-tooltip="X Dot">
              <label for="obfit-lat" class="active">X Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="-4.953164100646973" id="obfit-yd1" type="text" class="tooltipped" data-position="right"
                data-delay="50" data-tooltip="Y Dot">
              <label for="obfit-lat" class="active">Y Dot</label>
            </div>
            <div class="input-field col s4">
              <input value="4.8763322830200195" id="obfit-zd1" type="text" class="tooltipped" data-position="right"
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
  `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
    <div id="menu-obfit" class="bmenu-item">
      <img
        alt="obfit"
        src=""
        delayedsrc=${iodPng}/>
      <span class="bmenu-title">Initial Orbit</span>
      <div class="status-icon"></div>
    </div>
  `);

  $('#obfit-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 650,
    minWidth: 400,
  });

  $('#obfit-form').on('submit', function (e: Event) {
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
      $('#obfit-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isObfitMenuOpen = true;
      $('#menu-obfit').addClass('bmenu-item-selected');
      return;
    }
  }
};
export const obfitFormSubmit = (e: any) => { // NOSONAR
  const { uiManager, satSet, timeManager, satellite } = keepTrackApi.programs;
  let t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v;
  let t2v, x2v, y2v, z2v, xd2v, yd2v, zd2v;
  let t3v, x3v, y3v, z3v, xd3v, yd3v, zd3v;
  let isOb2 = true;
  let isOb3 = true;
  const t1 = (<HTMLInputElement>document.getElementById('obfit-t1')).value;
  if (t1.length > 0) {
    t1v = parseFloat(t1);
  } else {
    t1v = NaN;
  }
  const x1 = (<HTMLInputElement>document.getElementById('obfit-x1')).value;
  if (x1.length > 0) {
    x1v = parseFloat(x1);
  } else {
    x1v = NaN;
  }
  const y1 = (<HTMLInputElement>document.getElementById('obfit-y1')).value;
  if (y1.length > 0) {
    y1v = parseFloat(y1);
  } else {
    y1v = NaN;
  }
  const z1 = (<HTMLInputElement>document.getElementById('obfit-z1')).value;
  if (z1.length > 0) {
    z1v = parseFloat(z1);
  } else {
    z1v = NaN;
  }
  const xd1 = (<HTMLInputElement>document.getElementById('obfit-xd1')).value;
  if (xd1.length > 0) {
    xd1v = parseFloat(xd1);
  } else {
    xd1v = NaN;
  }
  const yd1 = (<HTMLInputElement>document.getElementById('obfit-yd1')).value;
  if (yd1.length > 0) {
    yd1v = parseFloat(yd1);
  } else {
    yd1v = NaN;
  }
  const zd1 = (<HTMLInputElement>document.getElementById('obfit-zd1')).value;
  if (zd1.length > 0) {
    zd1v = parseFloat(zd1);
  } else {
    zd1v = NaN;
  }
  const t2 = (<HTMLInputElement>document.getElementById('obfit-t2')).value;
  if (t2.length > 0) {
    t2v = parseFloat(t2);
  } else {
    isOb2 = false;
  }
  const x2 = (<HTMLInputElement>document.getElementById('obfit-x2')).value;
  if (x2.length > 0) {
    x2v = parseFloat(x2);
  } else {
    isOb2 = false;
  }
  const y2 = (<HTMLInputElement>document.getElementById('obfit-y2')).value;
  if (y2.length > 0) {
    y2v = parseFloat(y2);
  } else {
    isOb2 = false;
  }
  const z2 = (<HTMLInputElement>document.getElementById('obfit-z2')).value;
  if (z2.length > 0) {
    z2v = parseFloat(z2);
  } else {
    isOb2 = false;
  }
  const xd2 = (<HTMLInputElement>document.getElementById('obfit-xd2')).value;
  if (xd2.length > 0) {
    xd2v = parseFloat(xd2);
  } else {
    isOb2 = false;
  }
  const yd2 = (<HTMLInputElement>document.getElementById('obfit-yd2')).value;
  if (yd2.length > 0) {
    yd2v = parseFloat(yd2);
  } else {
    isOb2 = false;
  }
  const zd2 = (<HTMLInputElement>document.getElementById('obfit-zd2')).value;
  if (zd2.length > 0) {
    zd2v = parseFloat(zd2);
  } else {
    isOb2 = false;
  }
  const t3 = (<HTMLInputElement>document.getElementById('obfit-t3')).value;
  if (t3.length > 0) {
    t3v = parseFloat(t3);
  } else {
    isOb3 = false;
  }
  const x3 = (<HTMLInputElement>document.getElementById('obfit-x3')).value;
  if (x3.length > 0) {
    x3v = parseFloat(x3);
  } else {
    isOb3 = false;
  }
  const y3 = (<HTMLInputElement>document.getElementById('obfit-y3')).value;
  if (y3.length > 0) {
    y3v = parseFloat(y3);
  } else {
    isOb3 = false;
  }
  const z3 = (<HTMLInputElement>document.getElementById('obfit-z3')).value;
  if (z3.length > 0) {
    z3v = parseFloat(z3);
  } else {
    isOb3 = false;
  }
  const xd3 = (<HTMLInputElement>document.getElementById('obfit-xd3')).value;
  if (xd3.length > 0) {
    xd3v = parseFloat(xd3);
  } else {
    isOb3 = false;
  }
  const yd3 = (<HTMLInputElement>document.getElementById('obfit-yd3')).value;
  if (yd3.length > 0) {
    yd3v = parseFloat(yd3);
  } else {
    isOb3 = false;
  }
  const zd3 = (<HTMLInputElement>document.getElementById('obfit-zd3')).value;
  if (zd3.length > 0) {
    zd3v = parseFloat(zd3);
  } else {
    isOb3 = false;
  }

  const svs = [];
  let sv1 = [];
  {
    if (isNaN(parseFloat(t1))) {
      
      uiManager.toast(`Time 1 is Invalid!`, 'critical');
      return false;
    }
    if (isNaN(parseFloat(x1))) {
      
      uiManager.toast(`X 1 is Invalid!`, 'critical');
      return false;
    }
    if (isNaN(parseFloat(y1))) {
      
      uiManager.toast(`Y 1 is Invalid!`, 'critical');
      return false;
    }
    if (isNaN(parseFloat(z1))) {
      
      uiManager.toast(`Z 1 is Invalid!`, 'critical');
      return false;
    }
    if (isNaN(parseFloat(xd1))) {
      
      uiManager.toast(`X Dot 1 is Invalid!`, 'critical');
      return false;
    }
    if (isNaN(parseFloat(yd1))) {
      
      uiManager.toast(`Y Dot 1 is Invalid!`, 'critical');
      return false;
    }
    if (isNaN(parseFloat(zd1))) {
      
      uiManager.toast(`Z Dot 1 is Invalid!`, 'critical');
      return false;
    }
      sv1 = [t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v];
      svs.push(sv1);
  }

  let sv2 = [];
  {
    if (isOb2 && isNaN(parseFloat(t2))) {
      isOb2 = false;
      uiManager.toast(`Time 2 is Invalid!`, 'caution');
    }
    if (isOb2 && isNaN(parseFloat(x2))) {
      isOb2 = false;
      uiManager.toast(`X 2 is Invalid!`, 'caution');
    }
    if (isOb2 && isNaN(parseFloat(y2))) {
      isOb2 = false;
      uiManager.toast(`Y 2 is Invalid!`, 'caution');
    }
    if (isOb2 && isNaN(parseFloat(z2))) {
      isOb2 = false;
      uiManager.toast(`Z 2 is Invalid!`, 'caution');
    }
    if (isOb2 && isNaN(parseFloat(xd2))) {
      isOb2 = false;
      uiManager.toast(`X Dot 2 is Invalid!`, 'caution');
    }
    if (isOb2 && isNaN(parseFloat(yd2))) {
      isOb2 = false;
      uiManager.toast(`Y Dot 2 is Invalid!`, 'caution');
    }
    if (isOb2 && isNaN(parseFloat(zd2))) {
      isOb2 = false;
      uiManager.toast(`Z Dot 2 is Invalid!`, 'caution');
    }
    if (isOb2) {
      sv2 = [t2v, x2v, y2v, z2v, xd2v, yd2v, zd2v];
      svs.push(sv2);
    }
  }

  isOb3 = !isOb2 ? false : isOb3;
  let sv3 = [];
  {
    if (isOb3 && isNaN(parseFloat(t3))) {
      isOb3 = false;
      uiManager.toast(`Time 3 is Invalid!`, 'caution');
    }
    if (isOb3 && isNaN(parseFloat(x3))) {
      isOb3 = false;
      uiManager.toast(`X 3 is Invalid!`, 'caution');
    }
    if (isOb3 && isNaN(parseFloat(y3))) {
      isOb3 = false;
      uiManager.toast(`Y 3 is Invalid!`, 'caution');
    }
    if (isOb3 && isNaN(parseFloat(z3))) {
      isOb3 = false;
      uiManager.toast(`Z 3 is Invalid!`, 'caution');
    }
    if (isOb3 && isNaN(parseFloat(xd3))) {
      isOb3 = false;
      uiManager.toast(`X Dot 3 is Invalid!`, 'caution');
    }
    if (isOb3 && isNaN(parseFloat(yd3))) {
      isOb3 = false;
      uiManager.toast(`Y Dot 3 is Invalid!`, 'caution');
    }
    if (isOb3 && isNaN(parseFloat(zd3))) {
      isOb3 = false;
      uiManager.toast(`Z Dot 3 is Invalid!`, 'caution');
    }
    if (isOb3) {
      sv3 = [t3v, x3v, y3v, z3v, xd3v, yd3v, zd3v];
      svs.push(sv3);
    }
  }
  console.log(svs);
  omManager.svs2analyst(svs, satSet, timeManager, satellite);
  e.preventDefault();
  return true;
};
