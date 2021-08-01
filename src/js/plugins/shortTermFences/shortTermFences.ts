import $ from 'jquery';
import { keepTrackApi } from '@app/js/api/externalApi';

export const init = (): void => {
  const { sensorManager, satellite, satSet, uiManager, timeManager } = keepTrackApi.programs;
  let isStfMenuOpen = false;

  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'shortTermFences',
    cb: () => {
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
                  <button id="stf-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Create Short Term Fence &#9658;</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      `);

      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-stf" class="bmenu-item">
          <img
            alt="stf"
            src="data:image/png;base64,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"
          />
          <span class="bmenu-title">Short Term Fence</span>
          <div class="status-icon"></div>
        </div>
      `);

      let stfInfoLinks = false;
      // Register orbital element data
      keepTrackApi.register({
        method: 'selectSatData',
        cbName: 'stfInfoTopLinks',
        cb: () => {
          if (!stfInfoLinks) {
            $('#sat-info-top-links').append(keepTrackApi.html`
              <div id="stf-on-object-link" class="link sat-infobox-links">Build Short Term Fence on this object...</div>
            `);
            $('#stf-on-object-link').on('click', function () {
              $('#stf-az').val(satellite.currentTEARR.az.toFixed(1));
              $('#stf-el').val(satellite.currentTEARR.el.toFixed(1));
              $('#stf-rng').val(satellite.currentTEARR.rng.toFixed(1));
              uiManager.hideSideMenus();
              $('#stf-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
              isStfMenuOpen = true;
              $('#menu-stf').addClass('bmenu-item-selected');
            });
            stfInfoLinks = true;
          }
        },
      });

      $('#stfForm').on('submit', function (e) {
        e.preventDefault();

        if (!sensorManager.checkSensorSelected()) {
          uiManager.toast(`Select a Sensor First!`, 'caution', true);
          return;
        }

        const lat = sensorManager.currentSensor.lat;
        const lon = sensorManager.currentSensor.lon;
        const alt = sensorManager.currentSensor.alt;
        const sensorType = 'Short Range Fence';

        // Multiply everything by 1 to convert string to number
        const az = parseFloat(<string>$('#stf-az').val());
        const azExt = parseFloat(<string>$('#stf-azExt').val());
        const el = parseFloat(<string>$('#stf-el').val());
        const elExt = parseFloat(<string>$('#stf-elExt').val());
        const rng = parseFloat(<string>$('#stf-rng').val());
        const rngExt = parseFloat(<string>$('#stf-rngExt').val());

        const minaz = az - azExt < 0 ? az - azExt + 360 : az - azExt;
        const maxaz = az + azExt > 360 ? az + azExt - 360 : az + azExt;
        const minel = el - elExt;
        const maxel = el + elExt;
        const minrange = rng - rngExt;
        const maxrange = rng + rngExt;

        satSet.satCruncher.postMessage({
          // Send satSet.satCruncher File information on this radar
          typ: 'offset', // Tell satSet.satCruncher to update something
          dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(), // Tell satSet.satCruncher what time it is and how fast time is moving
          setlatlong: true, // Tell satSet.satCruncher we are changing observer location
          sensor: {
            lat: lat,
            lon: lon,
            alt: alt,
            obsminaz: minaz,
            obsmaxaz: maxaz,
            obsminel: minel,
            obsmaxel: maxel,
            obsminrange: minrange,
            obsmaxrange: maxrange,
            type: sensorType,
          },
        });

        satellite.setobs({
          lat: lat,
          lon: lon,
          alt: alt,
          obsminaz: minaz,
          obsmaxaz: maxaz,
          obsminel: minel,
          obsmaxel: maxel,
          obsminrange: minrange,
          obsmaxrange: maxrange,
          type: sensorType,
        });

        keepTrackApi.programs.sensorFov.enableFovView();

        const cameraManager = keepTrackApi.programs.cameraManager;
        if (maxrange > 6000) {
          cameraManager.changeZoom('geo');
        } else {
          cameraManager.changeZoom('leo');
        }
        cameraManager.camSnap(cameraManager.latToPitch(lat), cameraManager.longToYaw(lon, timeManager.selectedDate));
      });
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'shortTermFences',
    cb: (iconName: string): void => {
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
          $('#stf-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
          isStfMenuOpen = true;
          $('#menu-stf').addClass('bmenu-item-selected');
          return;
        }
      }
    },
  });

  keepTrackApi.register({
    method: 'resetSensor',
    cbName: 'shortTermFences',
    cb: (): void => {
      $('#menu-stf').addClass('bmenu-item-disabled');
    },
  });

  keepTrackApi.register({
    method: 'setSensor',
    cbName: 'shortTermFences',
    cb: (sensor: any, id: number): void => {
      if (sensor == null && id == null) {
        $('#menu-stf').addClass('bmenu-item-disabled');
      } else {
        $('#menu-stf').removeClass('bmenu-item-disabled');
      }
    },
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'shortTermFences',
    cb: (): void => {
      $('#stf-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
      $('#menu-stf').removeClass('bmenu-item-selected');
      isStfMenuOpen = false;
    },
  });
};
