import $ from 'jquery';

let photoManager = {};
let cameraManager;
let satSet;
let timeManager;
let uiManager;
let selectSatManager;

photoManager.init = (cameraManagerRef, satSetRef, timeManagerRef, uiManagerRef, selectSatManagerRef) => {
  cameraManager = cameraManagerRef;
  satSet = satSetRef;
  timeManager = timeManagerRef;
  uiManager = uiManagerRef;
  selectSatManager = selectSatManagerRef;
};

photoManager.dscovr = () => {
  let request = new XMLHttpRequest();
  request.open('GET', `https://epic.gsfc.nasa.gov/api/natural`, true);

  request.onload = () => {
    photoManager.dscovrLoaded(this);
  };

  photoManager.dscovrLoaded = (req) => {
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
      let dateObj = new Date(Date.UTC(year, month - 1, day, hour - 4, min, sec));

      cameraManager.camSnap(cameraManager.latToPitch(response[0].centroid_coordinates.lat), cameraManager.longToYaw(response[0].centroid_coordinates.lon, dateObj));
      cameraManager.changeZoom(0.7);

      photoManager.colorbox(`https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${imageUrl}.png`);
    }
  };

  request.onerror = function () {
    console.debug('http://epic.gsfc.nasa.gov/ request failed!');
  };

  selectSatManager.selectSat(-1, cameraManager);
  request.send();
};

photoManager.meteosat11 = () => {
  selectSatManager.selectSat(satSet.getSatFromObjNum(40732).id, cameraManager);
  cameraManager.changeZoom(0.7);
  photoManager.colorbox(`https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSG_RGBNatColour_LowResolution.jpg`);
};

photoManager.meteosat8 = () => {
  selectSatManager.selectSat(satSet.getSatFromObjNum(27509).id, cameraManager);
  cameraManager.changeZoom(0.7);
  photoManager.colorbox(`https://eumetview.eumetsat.int/static-images/latestImages/EUMETSAT_MSGIODC_RGBNatColour_LowResolution.jpg`);
};

photoManager.goes1 = () => {
  selectSatManager.selectSat(satSet.getSatFromObjNum(41866).id, cameraManager);
  cameraManager.changeZoom(0.7);
  photoManager.colorbox(`https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg`);
};

photoManager.himawari8 = () => {
  selectSatManager.selectSat(satSet.getSatFromObjNum(40267).id, cameraManager);
  cameraManager.changeZoom(0.7);

  let propTime = timeManager.propTimeVar; // Propagation time minus 30 minutes so that the pictures have time to become available
  if (propTime < Date.now()) {
    propTime = new Date(propTime - 1000 * 60 * 30);
  } else {
    uiManager.toast(`Can't load pictures from the future. Loading most recent photos.`, 'caution');
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

photoManager.colorbox = (url) => {
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

window.photoManager = photoManager;
export { photoManager };
