import photoManagerPng from '@app/img/icons/photoManager.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import $ from 'jquery';

let isSatPhotoMenuOpen = false;

export const dscovrLoaded = (req: any): void => {
  if (req.status >= 200 && req.status < 400) {
    // Success!
    const response = JSON.parse(req.response);
    const imageUrl = response[0].image;
    const dateStr = response[0].identifier;
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(8, 10);
    const min = dateStr.slice(10, 12);
    const sec = dateStr.slice(12, 14);

    // Hours are in EST? Daylight savings time might make this break
    const dateObj = new Date(Date.UTC(year, month - 1, day, hour - 4, min, sec));

    keepTrackApi.programs.mainCamera.camSnap(
      keepTrackApi.programs.mainCamera.lat2pitch(response[0].centroid_coordinates.lat),
      keepTrackApi.programs.mainCamera.lon2yaw(response[0].centroid_coordinates.lon, dateObj)
    );
    keepTrackApi.programs.mainCamera.changeZoom(0.7);

    colorbox(`https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageUrl}.png`);
  }
};

export const meteosat11 = (): void => {
  keepTrackApi.programs.drawManager.selectSatManager.selectSat(keepTrackApi.programs.satSet.getSatFromObjNum(40732).id, keepTrackApi.programs.mainCamera);
  keepTrackApi.programs.mainCamera.changeZoom(0.7);
  colorbox(`https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg`);
};
export const meteosat8 = (): void => {
  keepTrackApi.programs.drawManager.selectSatManager.selectSat(keepTrackApi.programs.satSet.getSatFromObjNum(27509).id, keepTrackApi.programs.mainCamera);
  keepTrackApi.programs.mainCamera.changeZoom(0.7);
  colorbox(`https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg`);
};
export const goes1 = (): void => {
  keepTrackApi.programs.drawManager.selectSatManager.selectSat(keepTrackApi.programs.satSet.getSatFromObjNum(41866).id, keepTrackApi.programs.mainCamera);
  keepTrackApi.programs.mainCamera.changeZoom(0.7);
  colorbox(`https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg`);
};
export const himawari8 = (): void => {
  keepTrackApi.programs.drawManager.selectSatManager.selectSat(keepTrackApi.programs.satSet.getSatFromObjNum(40267).id, keepTrackApi.programs.mainCamera);
  keepTrackApi.programs.mainCamera.changeZoom(0.7);

  let propTime = keepTrackApi.programs.timeManager.simulationTimeObj; // Propagation time minus 30 minutes so that the pictures have time to become available
  if (propTime < Date.now()) {
    propTime = new Date(propTime - 1000 * 60 * 30);
  } else {
    keepTrackApi.programs.uiManager.toast(`Can't load pictures from the future. Loading most recent photos.`, 'caution');
    propTime = new Date(Date.now() - 1000 * 60 * 30);
  }
  const year = propTime.getUTCFullYear();
  const mon = (propTime.getUTCMonth() + 1).toString().padStart(2, '0'); // NOTE:, this function requires months in range 1-12.
  const day = propTime.getUTCDate().toString().padStart(2, '0');
  const hour = propTime.getUTCHours().toString().padStart(2, '0');
  const min = (Math.floor(propTime.getUTCMinutes() / 10) * 10).toString().padStart(2, '0');

  let imgWidth, imgHeight;
  if (window.innerWidth < window.innerHeight) {
    imgWidth = window.innerWidth * 0.8;
    imgHeight = imgWidth;
  } else {
    imgHeight = window.innerHeight * 0.8;
    imgWidth = imgHeight;
  }

  settingsManager.isPreventColorboxClose = true;
  setTimeout(function () {
    settingsManager.isPreventColorboxClose = false;
  }, 2000);

  $.colorbox({
    href: `https://himawari8.nict.go.jp/img/D531106/1d/550/${year}/${mon}/${day}/${hour}${min}00_0_0.png`,
    photo: true,
    width: imgWidth,
    height: imgHeight,
    scalePhotos: true,
    fastIframe: false,
    closeButton: false,
    onComplete: () => {
      const cbImg = $('#cboxLoadedContent img')[0];
      cbImg.style.width = '100%';
      cbImg.style.height = '100%';
      cbImg.style.marginTop = '';
    },
  });
};
export const colorbox = (url: string): void => {
  settingsManager.isPreventColorboxClose = true;
  setTimeout(function () {
    settingsManager.isPreventColorboxClose = false;
  }, 2000);

  $.colorbox({
    href: url,
    photo: true,
    scalePhotos: true,
    height: '80%',
    fastIframe: false,
    closeButton: false,
  });
};

export const hideSideMenus = (): void => {
  $('#sat-photo-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-sat-photo').removeClass('bmenu-item-selected');
  isSatPhotoMenuOpen = false;
};
export const bottomMenuClick = (iconName: string): void => {
  if (iconName === 'menu-sat-photo') {
    if (isSatPhotoMenuOpen) {
      keepTrackApi.programs.uiManager.hideSideMenus();
      isSatPhotoMenuOpen = false;
      return;
    } else {
      keepTrackApi.programs.uiManager.hideSideMenus();
      $('#sat-photo-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
      isSatPhotoMenuOpen = true;
      $('#menu-sat-photo').addClass('bmenu-item-selected');
      return;
    }
  }
};
export const uiManagerInit = () => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
        <div id="sat-photo-menu" class="side-menu-parent start-hidden text-select">
          <div id="sat-photo-menu-content" class="side-menu">
            <ul>
              <h5 class="center-align">Satellites Imagery List</h5>
              <li class="link satPhotoRow" onmouseup="keepTrackApi.programs.photoManager.meteosat8()">MeteoSat 8</li>
              <li class="link satPhotoRow" onmouseup="keepTrackApi.programs.photoManager.meteosat11()">MeteoSat 11</li>
              <li class="link satPhotoRow" onmouseup="keepTrackApi.programs.photoManager.himawari8()">Himawari 8</li>
              <li class="link satPhotoRow" onmouseup="keepTrackApi.programs.photoManager.discovr()">DSCOVR</li>
              <li class="link satPhotoRow" onmouseup="keepTrackApi.programs.photoManager.goes1()">GOES 1</li>
            </ul>
          </div>
        </div>
      `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
        <div id="menu-sat-photo" class="bmenu-item">
          <img alt="photographs" src="" delayedsrc="${photoManagerPng}" />
          <span class="bmenu-title">Satellite Photos</span>
          <div class="status-icon"></div>
        </div>
      `);
};
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'photoManager',
    cb: uiManagerInit,
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'photoManager',
    cb: bottomMenuClick,
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'photoManager',
    cb: hideSideMenus,
  });

  keepTrackApi.programs.photoManager = {
    meteosat8: meteosat8,
    meteosat11: meteosat11,
    goes1: goes1,
    himawari8: himawari8,
    discovr: discovr,
  };
};
export const discovr = (): void => {
  const request = new XMLHttpRequest();
  request.open('GET', `https://epic.gsfc.nasa.gov/api/natural`, true);

  request.onload = () => {
    dscovrLoaded(request);
  };

  request.onerror = function () {
    console.debug('https://epic.gsfc.nasa.gov/ request failed!');
  };

  keepTrackApi.programs.drawManager.selectSatManager.selectSat(-1, keepTrackApi.programs.mainCamera);
  request.send();
};
