import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';
import { omManager } from '@app/js/plugins/initialOrbit/omManager.js';

export const init = (): void => {
  const { uiManager, satSet, timeManager, satellite, settingsManager } = keepTrackApi.programs;
  let isObfitMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'initialOrbit',
    cb: () => {
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
            delayedsrc="data:image/png;base64,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"
          />
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

      $('#obfit-form').on('submit', function (e) {
        let t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v;
        let t2v, x2v, y2v, z2v, xd2v, yd2v, zd2v;
        let t3v, x3v, y3v, z3v, xd3v, yd3v, zd3v;
        let isOb1 = true;
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

        let svs = [];
        let sv1 = [];
        {
          if (isOb1 && isNaN(parseFloat(t1))) {
            isOb1 = false;
            uiManager.toast(`Time 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1 && isNaN(parseFloat(x1))) {
            isOb1 = false;
            uiManager.toast(`X 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1 && isNaN(parseFloat(y1))) {
            isOb1 = false;
            uiManager.toast(`Y 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1 && isNaN(parseFloat(z1))) {
            isOb1 = false;
            uiManager.toast(`Z 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1 && isNaN(parseFloat(xd1))) {
            isOb1 = false;
            uiManager.toast(`X Dot 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1 && isNaN(parseFloat(yd1))) {
            isOb1 = false;
            uiManager.toast(`Y Dot 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1 && isNaN(parseFloat(zd1))) {
            isOb1 = false;
            uiManager.toast(`Z Dot 1 is Invalid!`, 'critical');
            return false;
          }
          if (isOb1) {
            sv1 = [t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v];
            svs.push(sv1);
          }
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
      });      
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'initialOrbit',
    cb: (iconName: string): void => {
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
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'initialOrbit',
    cb: (): void => {
      $('#obfit-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-obfit').removeClass('bmenu-item-selected');
      isObfitMenuOpen = false;
    },
  });
};
