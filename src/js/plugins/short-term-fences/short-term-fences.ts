import searchPng from '@app/img/icons/search.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { SensorObject } from '@app/js/api/keepTrackTypes';
import { addCustomSensor, clearCustomSensors, removeLastSensor } from '@app/js/plugins';
import $ from 'jquery';

let isStfMenuOpen = false;
let stfInfoLinks = false;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'shortTermFences',
    cb: () => uiManagerInit(),
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'shortTermFences',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'resetSensor',
    cbName: 'shortTermFences',
    cb: (): void => resetSensor(),
  });

  keepTrackApi.register({
    method: 'setSensor',
    cbName: 'shortTermFences',
    cb: (sensor: any, id: number): void => setSensor(sensor, id),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'shortTermFences',
    cb: (): void => hideSideMenus(),
  });
};

export const uiManagerInit = (): void => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
      <div id="stf-menu" class="side-menu-parent start-hidden text-select">
        <div id="stf-content" class="side-menu">
          <div class="row">
            <h5 class="center-align">Short Term Fence</h5>
            <form id="stfForm">
              <div id="stf-az-div" class=" input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Search Center Azimuth Point in degrees (ex: 50)">
                <input id="stf-az" type="text" value="50" />
                <label for="stf-az" class="active">Center Azimuth</label>
              </div>
              <div id="stf-azExt-div" class=" input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Total Extent Outside of Center Azimuth in degrees (ex: 4)">
                <input id="stf-azExt" type="text" value="4" />
                <label for="stf-azExt" class="active">Azimuth Extent</label>
              </div>
              <div id="stf-el-div" class=" input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Search Center Elevation Point in degrees (ex: 20)">
                <input id="stf-el" type="text" value="20" />
                <label for="stf-el" class="active">Center Elevation</label>
              </div>
              <div id="stf-elExt-div" class=" input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Total Extent Outside of Center Elevation in degrees (ex: 4)">
                <input id="stf-elExt" type="text" value="4" />
                <label for="stf-elExt" class="active">Elevation Extent</label>
              </div>
              <div id="stf-rng-div" class=" input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Search Center Range Point in kilometers (ex: 1000)">
                <input id="stf-rng" type="text" value="1000" />
                <label for="stf-rng" class="active">Center Range</label>
              </div>
              <div id="stf-rngExt-div" class=" input-field col s12 tooltipped" data-position="right" data-delay="50" data-tooltip="Total Extent Outside of Center Range in kilometers (ex: 100)">
                <input id="stf-rngExt" type="text" value="100" />
                <label for="stf-rngExt" class="active">Range Extent</label>
              </div>
              <div class="center-align">
                <button id="stf-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create New STF &#9658;</button>
              </div>
            </form>
            <br>
            <div class="center-align">
              <button id="stf-remove-last" class="btn btn-ui waves-effect waves-light" type="button" name="action">Remove Last &#9658;</button>
            </div>
            <br>
            <div class="center-align">
              <button id="stf-clear-all" class="btn btn-ui waves-effect waves-light" type="button" name="action">Clear All STFs &#9658;</button>
            </div>
          </div>
        </div>
      </div>
    `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
      <div id="menu-stf" class="bmenu-item">
        <img
          alt="stf"
          src="" delayedsrc=${searchPng}
        />
        <span class="bmenu-title">Short Term Fence</span>
        <div class="status-icon"></div>
      </div>
    `);

  // Register orbital element data
  keepTrackApi.register({
    method: 'selectSatData',
    cbName: 'stfInfoTopLinks',
    cb: () => {
      selectSatData(stfInfoLinks);
      stfInfoLinks = true;
    },
  });

  $('#stfForm').on('submit', stfFormOnSubmit);
  $('#stf-remove-last').on('click', stfRemoveLast);
  $('#stf-clear-all').on('click', stfClearAll);
};

export const bottomMenuClick = (iconName: string) => {
  const { sensorManager, uiManager } = keepTrackApi.programs;
  if (iconName === 'menu-stf') {
    if (!sensorManager.checkSensorSelected()) {
      // No Sensor Selected
      uiManager.toast(`Select a Sensor First!`, 'caution', true);
      if (!$('#menu-stf:animated').length) {
        $('#menu-stf').effect('shake', {
          distance: 10,
        });
      }
      return;
    }

    if (isStfMenuOpen) {
      uiManager.hideSideMenus();
      isStfMenuOpen = false;
      return;
    } else {
      uiManager.hideSideMenus();
      (<any>$('#stf-menu')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isStfMenuOpen = true;
      $('#menu-stf').addClass('bmenu-item-selected');
      return;
    }
  }
};

export const resetSensor = () => {
  $('#menu-stf').addClass('bmenu-item-disabled');
};

export const hideSideMenus = () => {
  $('#stf-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-stf').removeClass('bmenu-item-selected');
  isStfMenuOpen = false;
};

export const selectSatData = (isShowStfLink: boolean) => {
  if (!isShowStfLink) {
    $('#sat-info-top-links').append(keepTrackApi.html`
        <div id="stf-on-object-link" class="link sat-infobox-links">Build Short Term Fence on this object...</div>
      `);
    $('#stf-on-object-link').on('click', stfOnObjectLinkClick);
  }
};

export const setSensor = (sensor: any, id?: number) => {
  if (sensor == null && id == null) {
    $('#menu-stf').addClass('bmenu-item-disabled');
  } else {
    $('#menu-stf').removeClass('bmenu-item-disabled');
  }
};

export const stfFormOnSubmit = (e: Event) => {
  const { sensorManager, satellite, satSet, uiManager } = keepTrackApi.programs;
  e.preventDefault();

  if (!sensorManager.checkSensorSelected()) {
    uiManager.toast(`Select a Sensor First!`, 'caution', true);
    return;
  }

  const { lat, lon, alt } = sensorManager.currentSensor[0];
  const sensorType = 'Short Range Fence';

  // Multiply everything by 1 to convert string to number
  const az = parseFloat(<string>$('#stf-az').val());
  const azExt = parseFloat(<string>$('#stf-azExt').val());
  const el = parseFloat(<string>$('#stf-el').val());
  const elExt = parseFloat(<string>$('#stf-elExt').val());
  const rng = parseFloat(<string>$('#stf-rng').val());
  const rngExt = parseFloat(<string>$('#stf-rngExt').val());

  const minaz = az - azExt < 0 ? az - azExt + 360 : az - azExt / 2;
  const maxaz = az + azExt > 360 ? az + azExt - 360 : az + azExt / 2;
  const minel = el - elExt / 2;
  const maxel = el + elExt / 2;
  const minrange = rng - rngExt / 2;
  const maxrange = rng + rngExt / 2;

  const stfSensor = <SensorObject>(<unknown>{
    lat,
    lon,
    alt,
    obsminaz: minaz,
    obsmaxaz: maxaz,
    obsminel: minel,
    obsmaxel: maxel,
    obsminrange: minrange,
    obsmaxrange: maxrange,
    type: sensorType,
  });

  const customSensors = addCustomSensor(stfSensor);

  sensorManager.whichRadar = customSensors.length > 1 ? 'MULTI CUSTOM' : 'CUSTOM';

  satSet.satCruncher.postMessage({
    typ: 'sensor',
    setlatlong: true, // Tell satSet.satCruncher we are changing observer location
    sensor: customSensors,
    multiSensor: customSensors.length > 1,
  });
  satellite.setobs(customSensors);
  $('#sensor-selected').text('Short Term Fence');

  keepTrackApi.programs.sensorFov.enableFovView();
};

export const stfRemoveLast = () => {
  removeLastSensor();
};

export const stfClearAll = () => {
  clearCustomSensors();
};

export const stfOnObjectLinkClick = () => {
  const { satellite, uiManager, sensorManager, objectManager, satSet } = keepTrackApi.programs;

  if (!sensorManager.checkSensorSelected()) {
    // No Sensor Selected
    uiManager.toast(`Select a Sensor First!`, 'caution', true);
    return;
  }

  // Update TEARR
  satellite.getTEARR(satSet.getSat(objectManager.selectedSat));

  $('#stf-az').val(satellite.currentTEARR.az.toFixed(1));
  $('#stf-el').val(satellite.currentTEARR.el.toFixed(1));
  $('#stf-rng').val(satellite.currentTEARR.rng.toFixed(1));
  uiManager.hideSideMenus();
  (<any>$('#stf-menu')).effect('slide', { direction: 'left', mode: 'show' }, 1000);
  isStfMenuOpen = true;
  $('#menu-stf').addClass('bmenu-item-selected');
};
