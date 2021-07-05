import { saveAs, stringPad } from '@app/js/lib/helpers';
import $ from 'jquery';
import { RAD2DEG } from '@app/js/lib/constants.js';

// Side Menu Manager
var sMM = {};

sMM.watchlistList = [];
sMM.watchlistInViewList = [];
sMM.nextPassArray = [];
sMM.isWatchlistChanged = null;

sMM.isSensorListMenuOpen = false;
sMM.isTwitterMenuOpen = false;
sMM.isFindByLooksMenuOpen = false;
sMM.isSensorInfoMenuOpen = false;
sMM.isWatchlistMenuOpen = false;
sMM.isAboutSelected = false;
sMM.isColorSchemeMenuOpen = false;
sMM.isConstellationsMenuOpen = false;
sMM.isCountriesMenuOpen = false;
sMM.isExternalMenuOpen = false;
sMM.isSocratesMenuOpen = false;
sMM.isNextLaunchMenuOpen = false;
sMM.issatChngMenuOpen = false;
sMM.isSettingsMenuOpen = false;
sMM.isObfitMenuOpen = false;
sMM.isLookanglesMenuOpen = false;
sMM.isDOPMenuOpen = false;
sMM.isLookanglesMultiSiteMenuOpen = false;
sMM.isLookanglesMenuOpen = false;
sMM.isSatPhotoMenuOpen = false;
sMM.isAnalysisMenuOpen = false;
sMM.isEditSatMenuOpen = false;
sMM.setCustomSensorMenuOpen = false;
sMM.isNewLaunchMenuOpen = false;
sMM.isBreakupMenuOpen = false;
sMM.isMissileMenuOpen = false;
sMM.isInfoOverlayMenuOpen = false;
sMM.isLaunchMenuOpen = false;

sMM.init = (satSet, uiManager, sensorManager, satellite, ColorScheme, omManager, timeManager, cameraManager, orbitManager, objectManager, missileManager) => {
  $('#findByLooks').on('submit', function (e) {
    var fblAzimuth = $('#fbl-azimuth').val();
    var fblElevation = $('#fbl-elevation').val();
    var fblRange = $('#fbl-range').val();
    var fblInc = $('#fbl-inc').val();
    var fblPeriod = $('#fbl-period').val();
    var fblRcs = $('#fbl-rcs').val();
    var fblAzimuthM = $('#fbl-azimuth-margin').val();
    var fblElevationM = $('#fbl-elevation-margin').val();
    var fblRangeM = $('#fbl-range-margin').val();
    var fblIncM = $('#fbl-inc-margin').val();
    var fblPeriodM = $('#fbl-period-margin').val();
    var fblRcsM = $('#fbl-rcs-margin').val();
    var fblType = $('#fbl-type').val();
    $('#search').val(''); // Reset the search first
    var res = satSet.searchAzElRange(fblAzimuth, fblElevation, fblRange, fblInc, fblAzimuthM, fblElevationM, fblRangeM, fblIncM, fblPeriod, fblPeriodM, fblRcs, fblRcsM, fblType);
    if (typeof res === 'undefined') {
      uiManager.toast(`No Search Criteria Entered`, 'critical');
    } else if (res.length === 0) {
      uiManager.toast(`No Satellites Found`, 'critical');
    }
    e.preventDefault();
  });
  $('#analysis-form').on('submit', function (e) {
    let chartType = $('#anal-type').val();
    let sat = $('#anal-sat').val();
    let sensor = sensorManager.currentSensor.shortName;
    if (typeof sensor == 'undefined') {
      $.colorbox({
        href: `analysis/index.htm?sat=${sat}&type=${chartType}`,
        iframe: true,
        width: '60%',
        height: '60%',
        fastIframe: false,
        closeButton: false,
      });
    } else {
      $.colorbox({
        href: `analysis/index.htm?sat=${sat}&type=${chartType}&sensor=${sensor}`,
        iframe: true,
        width: '60%',
        height: '60%',
        fastIframe: false,
        closeButton: false,
      });
    }
    e.preventDefault();
  });
  $('#analysis-bpt').on('submit', function (e) {
    let sats = $('#analysis-bpt-sats').val();
    if (!sensorManager.checkSensorSelected()) {
      uiManager.toast(`You must select a sensor first!`, 'critical');
    } else {
      satellite.findBestPasses(sats, sensorManager.selectedSensor);
    }
    e.preventDefault();
  });
  $('#settings-form').on('change', function (e) {
    var isDMChecked = document.getElementById('settings-demo-mode').checked;
    var isSLMChecked = document.getElementById('settings-sat-label-mode').checked;

    if (isSLMChecked && e.target.id === 'settings-demo-mode') {
      document.getElementById('settings-sat-label-mode').checked = false;
      $('#settings-demo-mode').removeClass('lever:after');
    }

    if (isDMChecked && e.target.id === 'settings-sat-label-mode') {
      document.getElementById('settings-demo-mode').checked = false;
      $('#settings-sat-label-mode').removeClass('lever:after');
    }
  });

  $('#settings-riseset').on('change', function () {
    let isRiseSetChecked = document.getElementById('settings-riseset').checked;
    if (isRiseSetChecked) {
      satellite.isRiseSetLookangles = true;
    } else {
      satellite.isRiseSetLookangles = false;
    }
  });

  $('#lookanglesLength').on('change', function () {
    satellite.lookanglesLength = $('#lookanglesLength').val() * 1;
  });

  $('#lookanglesInterval').on('change', function () {
    satellite.lookanglesInterval = $('#lookanglesInterval').val() * 1;
  });

  $('#settings-form').on('submit', function (e) {
    var isHOSChecked = document.getElementById('settings-hos').checked;
    var isDMChecked = document.getElementById('settings-demo-mode').checked;
    var isSLMChecked = document.getElementById('settings-sat-label-mode').checked;
    var isSNPChecked = document.getElementById('settings-snp').checked;

    if (isSLMChecked) {
      settingsManager.isSatLabelModeOn = true;
    } else {
      settingsManager.isSatLabelModeOn = false;
    }

    if (isDMChecked) {
      settingsManager.isDemoModeOn = true;
    } else {
      settingsManager.isDemoModeOn = false;
    }

    if (isHOSChecked) {
      settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0];
    } else {
      settingsManager.colors.transparent = [1.0, 1.0, 1.0, 0.1];
    }
    ColorScheme.reloadColors();

    if (isSNPChecked) {
      sMM.isShowNextPass = true;
    } else {
      sMM.isShowNextPass = false;
    }

    settingsManager.isForceColorScheme = true;
    satSet.setColorScheme(settingsManager.currentColorScheme); // force color recalc
    e.preventDefault();
  });

  $('#obfit-form').on('submit', function (e) {
    let t1v, x1v, y1v, z1v, xd1v, yd1v, zd1v;
    let t2v, x2v, y2v, z2v, xd2v, yd2v, zd2v;
    let t3v, x3v, y3v, z3v, xd3v, yd3v, zd3v;
    let isOb1 = true;
    let isOb2 = true;
    let isOb3 = true;
    const t1 = document.getElementById('obfit-t1').value;
    if (t1.length > 0) {
      t1v = parseFloat(t1);
    } else {
      t1v = NaN;
    }
    const x1 = document.getElementById('obfit-x1').value;
    if (x1.length > 0) {
      x1v = parseFloat(x1);
    } else {
      x1v = NaN;
    }
    const y1 = document.getElementById('obfit-y1').value;
    if (y1.length > 0) {
      y1v = parseFloat(y1);
    } else {
      y1v = NaN;
    }
    const z1 = document.getElementById('obfit-z1').value;
    if (z1.length > 0) {
      z1v = parseFloat(z1);
    } else {
      z1v = NaN;
    }
    const xd1 = document.getElementById('obfit-xd1').value;
    if (xd1.length > 0) {
      xd1v = parseFloat(xd1);
    } else {
      xd1v = NaN;
    }
    const yd1 = document.getElementById('obfit-yd1').value;
    if (yd1.length > 0) {
      yd1v = parseFloat(yd1);
    } else {
      yd1v = NaN;
    }
    const zd1 = document.getElementById('obfit-zd1').value;
    if (zd1.length > 0) {
      zd1v = parseFloat(zd1);
    } else {
      zd1v = NaN;
    }
    const t2 = document.getElementById('obfit-t2').value;
    if (t2.length > 0) {
      t2v = parseFloat(t2);
    } else {
      isOb2 = false;
    }
    const x2 = document.getElementById('obfit-x2').value;
    if (x2.length > 0) {
      x2v = parseFloat(x2);
    } else {
      isOb2 = false;
    }
    const y2 = document.getElementById('obfit-y2').value;
    if (y2.length > 0) {
      y2v = parseFloat(y2);
    } else {
      isOb2 = false;
    }
    const z2 = document.getElementById('obfit-z2').value;
    if (z2.length > 0) {
      z2v = parseFloat(z2);
    } else {
      isOb2 = false;
    }
    const xd2 = document.getElementById('obfit-xd2').value;
    if (xd2.length > 0) {
      xd2v = parseFloat(xd2);
    } else {
      isOb2 = false;
    }
    const yd2 = document.getElementById('obfit-yd2').value;
    if (yd2.length > 0) {
      yd2v = parseFloat(yd2);
    } else {
      isOb2 = false;
    }
    const zd2 = document.getElementById('obfit-zd2').value;
    if (zd2.length > 0) {
      zd2v = parseFloat(zd2);
    } else {
      isOb2 = false;
    }
    const t3 = document.getElementById('obfit-t3').value;
    if (t3.length > 0) {
      t3v = parseFloat(t3);
    } else {
      isOb3 = false;
    }
    const x3 = document.getElementById('obfit-x3').value;
    if (x3.length > 0) {
      x3v = parseFloat(x3);
    } else {
      isOb3 = false;
    }
    const y3 = document.getElementById('obfit-y3').value;
    if (y3.length > 0) {
      y3v = parseFloat(y3);
    } else {
      isOb3 = false;
    }
    const z3 = document.getElementById('obfit-z3').value;
    if (z3.length > 0) {
      z3v = parseFloat(z3);
    } else {
      isOb3 = false;
    }
    const xd3 = document.getElementById('obfit-xd3').value;
    if (xd3.length > 0) {
      xd3v = parseFloat(xd3);
    } else {
      isOb3 = false;
    }
    const yd3 = document.getElementById('obfit-yd3').value;
    if (yd3.length > 0) {
      yd3v = parseFloat(yd3);
    } else {
      isOb3 = false;
    }
    const zd3 = document.getElementById('obfit-zd3').value;
    if (zd3.length > 0) {
      zd3v = parseFloat(zd3);
    } else {
      isOb3 = false;
    }

    let svs = [];
    let sv1 = [];
    {
      if (isOb1 && isNaN(t1)) {
        isOb1 = false;
        uiManager.toast(`Time 1 is Invalid!`, 'critical');
        return false;
      }
      if (isOb1 && isNaN(x1)) {
        isOb1 = false;
        uiManager.toast(`X 1 is Invalid!`, 'critical');
        return false;
      }
      if (isOb1 && isNaN(y1)) {
        isOb1 = false;
        uiManager.toast(`Y 1 is Invalid!`, 'critical');
        return false;
      }
      if (isOb1 && isNaN(z1)) {
        isOb1 = false;
        uiManager.toast(`Z 1 is Invalid!`, 'critical');
        return false;
      }
      if (isOb1 && isNaN(xd1)) {
        isOb1 = false;
        uiManager.toast(`X Dot 1 is Invalid!`, 'critical');
        return false;
      }
      if (isOb1 && isNaN(yd1)) {
        isOb1 = false;
        uiManager.toast(`Y Dot 1 is Invalid!`, 'critical');
        return false;
      }
      if (isOb1 && isNaN(zd1)) {
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
      if (isOb2 && isNaN(t2)) {
        isOb2 = false;
        uiManager.toast(`Time 2 is Invalid!`, 'caution');
      }
      if (isOb2 && isNaN(x2)) {
        isOb2 = false;
        uiManager.toast(`X 2 is Invalid!`, 'caution');
      }
      if (isOb2 && isNaN(y2)) {
        isOb2 = false;
        uiManager.toast(`Y 2 is Invalid!`, 'caution');
      }
      if (isOb2 && isNaN(z2)) {
        isOb2 = false;
        uiManager.toast(`Z 2 is Invalid!`, 'caution');
      }
      if (isOb2 && isNaN(xd2)) {
        isOb2 = false;
        uiManager.toast(`X Dot 2 is Invalid!`, 'caution');
      }
      if (isOb2 && isNaN(yd2)) {
        isOb2 = false;
        uiManager.toast(`Y Dot 2 is Invalid!`, 'caution');
      }
      if (isOb2 && isNaN(zd2)) {
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
      if (isOb3 && isNaN(t3)) {
        isOb3 = false;
        uiManager.toast(`Time 3 is Invalid!`, 'caution');
      }
      if (isOb3 && isNaN(x3)) {
        isOb3 = false;
        uiManager.toast(`X 3 is Invalid!`, 'caution');
      }
      if (isOb3 && isNaN(y3)) {
        isOb3 = false;
        uiManager.toast(`Y 3 is Invalid!`, 'caution');
      }
      if (isOb3 && isNaN(z3)) {
        isOb3 = false;
        uiManager.toast(`Z 3 is Invalid!`, 'caution');
      }
      if (isOb3 && isNaN(xd3)) {
        isOb3 = false;
        uiManager.toast(`X Dot 3 is Invalid!`, 'caution');
      }
      if (isOb3 && isNaN(yd3)) {
        isOb3 = false;
        uiManager.toast(`Y Dot 3 is Invalid!`, 'caution');
      }
      if (isOb3 && isNaN(zd3)) {
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

  $('#n2yo-form').on('submit', function (e) {
    $('#loading-screen').fadeIn(1000, function () {
      let satnum = $('#ext-n2yo').val() * 1;
      satSet.searchN2yo(satnum);
      $('#loading-screen').fadeOut('slow');
    });
    e.preventDefault();
  });

  $('#celestrak-form').on('submit', function (e) {
    $('#loading-screen').fadeIn(1000, function () {
      let satnum = $('#ext-celestrak').val() * 1;
      satSet.searchCelestrak(satnum);
      $('#loading-screen').fadeOut('slow');
    });
    e.preventDefault();
  });

  $('#editSat-newTLE').on('click', function () {
    $('#loading-screen').fadeIn(1000, function () {
      try {
        // Update Satellite TLE so that Epoch is Now but ECI position is very very close
        var satId = satSet.getIdFromObjNum($('#es-scc').val());
        var mainsat = satSet.getSat(satId);

        // Launch Points are the Satellites Current Location
        var TEARR = mainsat.getTEARR();
        var launchLat, launchLon, alt;
        launchLon = satellite.degreesLong(TEARR.lon);
        launchLat = satellite.degreesLat(TEARR.lat);
        alt = TEARR.alt;

        var upOrDown = mainsat.getDirection();

        var currentEpoch = satellite.currentEpoch(timeManager.propTime());
        mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

        cameraManager.camSnapMode = false;

        var TLEs;
        // Ignore argument of perigee for round orbits OPTIMIZE
        if (mainsat.apogee - mainsat.perigee < 300) {
          TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
        } else {
          TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
        }
        var TLE1 = TLEs[0];
        var TLE2 = TLEs[1];
        satSet.satCruncher.postMessage({
          typ: 'satEdit',
          id: satId,
          TLE1: TLE1,
          TLE2: TLE2,
        });
        orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
        //
        // Reload Menu with new TLE
        //
        let sat = satSet.getSatExtraOnly(objectManager.selectedSat);
        $('#es-scc').val(sat.SCC_NUM);

        var inc = (sat.inclination * RAD2DEG).toPrecision(7);
        inc = inc.split('.');
        inc[0] = inc[0].substr(-3, 3);
        inc[1] = inc[1].substr(0, 4);
        inc = (inc[0] + '.' + inc[1]).toString();

        $('#es-inc').val(stringPad.pad0(inc, 8));
        $('#es-year').val(sat.TLE1.substr(18, 2));
        $('#es-day').val(sat.TLE1.substr(20, 12));
        $('#es-meanmo').val(sat.TLE2.substr(52, 11));

        var rasc = (sat.raan * RAD2DEG).toPrecision(7);
        rasc = rasc.split('.');
        rasc[0] = rasc[0].substr(-3, 3);
        rasc[1] = rasc[1].substr(0, 4);
        rasc = (rasc[0] + '.' + rasc[1]).toString();

        $('#es-rasc').val(stringPad.pad0(rasc, 8));
        $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

        var argPe = (sat.argPe * RAD2DEG).toPrecision(7);
        argPe = argPe.split('.');
        argPe[0] = argPe[0].substr(-3, 3);
        argPe[1] = argPe[1].substr(0, 4);
        argPe = (argPe[0] + '.' + argPe[1]).toString();

        $('#es-argPe').val(stringPad.pad0(argPe, 8));
        $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
      } catch (error) {
        console.debug(error);
      }
      $('#loading-screen').fadeOut('slow');
    });
  });

  $('#editSat').on('submit', function (e) {
    $('#es-error').hide();
    var scc = $('#es-scc').val();
    var satId = satSet.getIdFromObjNum(scc);
    if (satId === null) {
      console.log('Not a Real Satellite');
      e.preventDefault();
      return false;
    }
    var sat = satSet.getSatExtraOnly(satId);

    var intl = sat.TLE1.substr(9, 8);

    var inc = $('#es-inc').val();

    inc = parseFloat(inc).toPrecision(7);
    inc = inc.split('.');
    inc[0] = inc[0].substr(-3, 3);
    if (inc[1]) {
      inc[1] = inc[1].substr(0, 4);
    } else {
      inc[1] = '0000';
    }
    inc = (inc[0] + '.' + inc[1]).toString();
    inc = stringPad.pad0(inc, 8);

    var meanmo = $('#es-meanmo').val();

    meanmo = parseFloat(meanmo).toPrecision(10);
    meanmo = meanmo.split('.');
    meanmo[0] = meanmo[0].substr(-2, 2);
    if (meanmo[1]) {
      meanmo[1] = meanmo[1].substr(0, 8);
    } else {
      meanmo[1] = '00000000';
    }
    meanmo = (meanmo[0] + '.' + meanmo[1]).toString();
    meanmo = stringPad.pad0(meanmo, 8);

    var rasc = $('#es-rasc').val();

    rasc = parseFloat(rasc).toPrecision(7);
    rasc = rasc.split('.');
    rasc[0] = rasc[0].substr(-3, 3);
    if (rasc[1]) {
      rasc[1] = rasc[1].substr(0, 4);
    } else {
      rasc[1] = '0000';
    }
    rasc = (rasc[0] + '.' + rasc[1]).toString();
    rasc = stringPad.pad0(rasc, 8);

    var ecen = $('#es-ecen').val();
    var argPe = $('#es-argPe').val();

    argPe = parseFloat(argPe).toPrecision(7);
    argPe = argPe.split('.');
    argPe[0] = argPe[0].substr(-3, 3);
    if (argPe[1]) {
      argPe[1] = argPe[1].substr(0, 4);
    } else {
      argPe[1] = '0000';
    }
    argPe = (argPe[0] + '.' + argPe[1]).toString();
    argPe = stringPad.pad0(argPe, 8);

    var meana = $('#es-meana').val();

    meana = parseFloat(meana).toPrecision(7);
    meana = meana.split('.');
    meana[0] = meana[0].substr(-3, 3);
    if (meana[1]) {
      meana[1] = meana[1].substr(0, 4);
    } else {
      meana[1] = '0000';
    }
    meana = (meana[0] + '.' + meana[1]).toString();
    meana = stringPad.pad0(meana, 8);

    var epochyr = $('#es-year').val();
    var epochday = $('#es-day').val();

    var TLE1Ending = sat.TLE1.substr(32, 39);

    var TLE1 = '1 ' + scc + 'U ' + intl + ' ' + epochyr + epochday + TLE1Ending; // M' and M'' are both set to 0 to put the object in a perfect stable orbit
    var TLE2 = '2 ' + scc + ' ' + inc + ' ' + rasc + ' ' + ecen + ' ' + argPe + ' ' + meana + ' ' + meanmo + '    10';

    if (satellite.altitudeCheck(TLE1, TLE2, timeManager.propOffset) > 1) {
      satSet.satCruncher.postMessage({
        typ: 'satEdit',
        id: satId,
        active: true,
        TLE1: TLE1,
        TLE2: TLE2,
      });
      orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
      sat.active = true;
    } else {
      $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
      $('#es-error').show();
    }
    e.preventDefault();
  });

  $('#editSat-save').on('click', function (e) {
    try {
      var scc = $('#es-scc').val();
      var satId = satSet.getIdFromObjNum(scc);
      var sat = satSet.getSatExtraOnly(satId);
      var sat2 = {
        TLE1: sat.TLE1,
        TLE2: sat.TLE2,
      };
      var variable = JSON.stringify(sat2);
      var blob = new Blob([variable], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, scc + '.tle');
    } catch (error) {
      // console.warn(error);
    }
    e.preventDefault();
  });

  $('#editSat-open').on('click', function () {
    $('#editSat-file').trigger('click');
  });

  $('#editSat-file').on('change', function (evt) {
    if (!window.FileReader) return; // Browser is not compatible

    try {
      var reader = new FileReader();

      reader.onload = function (evt) {
        if (evt.target.readyState !== 2) return;
        if (evt.target.error) {
          console.log('error');
          return;
        }

        var object = JSON.parse(evt.target.result);
        var scc = parseInt(stringPad.pad0(object.TLE1.substr(2, 5).trim(), 5));
        var satId = satSet.getIdFromObjNum(scc);
        var sat = satSet.getSatExtraOnly(satId);
        if (satellite.altitudeCheck(object.TLE1, object.TLE2, timeManager.propOffset) > 1) {
          satSet.satCruncher.postMessage({
            typ: 'satEdit',
            id: sat.id,
            active: true,
            TLE1: object.TLE1,
            TLE2: object.TLE2,
          });
          orbitManager.updateOrbitBuffer(sat.id, true, object.TLE1, object.TLE2);
          sat.active = true;
        } else {
          $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
          $('#es-error').show();
        }
      };
      reader.readAsText(evt.target.files[0]);
      evt.preventDefault();
    } catch (error) {
      // console.warn(error);
    }
  });

  $('#es-error').on('click', function () {
    $('#es-error').hide();
  });

  $('#map-menu').on('click', '.map-look', function (evt) {
    settingsManager.isMapUpdateOverride = true;
    // Might be better code for this.
    var time = evt.currentTarget.attributes.time.value;
    if (time !== null) {
      time = time.split(' ');
      time = new Date(time[0] + 'T' + time[1] + 'Z');
      var today = new Date(); // Need to know today for offset calculation
      timeManager.propOffset = time - today; // Find the offset from today
      satSet.satCruncher.postMessage({
        // Tell satSet.satCruncher we have changed times for orbit calculations
        typ: 'offset',
        dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
      });
    }
  });

  $('#socrates-menu').on('click', '.socrates-object', function (evt) {
    // Might be better code for this.
    var hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
    if (hiddenRow !== null) {
      sMM.socrates(hiddenRow);
    }
  });
  $('#satChng-menu').on('click', '.satChng-object', function (evt) {
    // Might be better code for this.
    var hiddenRow = evt.currentTarget.attributes.hiddenrow.value;
    if (hiddenRow !== null) {
      uiManager.satChng(hiddenRow);
    }
  });
  $('#watchlist-list').on('click', '.watchlist-remove', function () {
    var satId = $(this).data('sat-id');
    for (var i = 0; i < sMM.watchlistList.length; i++) {
      if (sMM.watchlistList[i] === satId) {
        orbitManager.removeInViewOrbit(sMM.watchlistList[i]);
        sMM.watchlistList.splice(i, 1);
        sMM.watchlistInViewList.splice(i, 1);
      }
    }
    sMM.updateWatchlist();
    if (sMM.watchlistList.length <= 0) {
      uiManager.doSearch('');
      satSet.setColorScheme(ColorScheme.default, true);
      uiManager.colorSchemeChangeAlert(settingsManager.currentColorScheme);
    }
    if (!sensorManager.checkSensorSelected() || sMM.watchlistList.length <= 0) {
      sMM.isWatchlistChanged = false;
      $('#menu-info-overlay').addClass('bmenu-item-disabled');
    }
  });
  // Add button selected on watchlist menu
  $('#watchlist-content').on('click', '.watchlist-add', function () {
    var satId = satSet.getIdFromObjNum(stringPad.pad0($('#watchlist-new').val(), 5));
    var duplicate = false;
    for (var i = 0; i < sMM.watchlistList.length; i++) {
      // No duplicates
      if (sMM.watchlistList[i] === satId) duplicate = true;
    }
    if (!duplicate) {
      sMM.watchlistList.push(satId);
      sMM.watchlistInViewList.push(false);
      sMM.updateWatchlist();
    }
    if (sensorManager.checkSensorSelected()) {
      $('#menu-info-overlay').removeClass('bmenu-item-disabled');
    }
    $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
  });
  // Enter pressed/selected on watchlist menu
  $('#watchlist-content').on('submit', function (e) {
    var satId = satSet.getIdFromObjNum(stringPad.pad0($('#watchlist-new').val(), 5));
    var duplicate = false;
    for (var i = 0; i < sMM.watchlistList.length; i++) {
      // No duplicates
      if (sMM.watchlistList[i] === satId) duplicate = true;
    }
    if (!duplicate) {
      sMM.watchlistList.push(satId);
      sMM.watchlistInViewList.push(false);
      sMM.updateWatchlist();
    }
    if (sensorManager.checkSensorSelected()) {
      $('#menu-info-overlay').removeClass('bmenu-item-disabled');
    }
    $('#watchlist-new').val(''); // Clear the search box after enter pressed/selected
    e.preventDefault();
  });
  $('#watchlist-save').on('click', function (e) {
    var saveWatchlist = [];
    for (var i = 0; i < sMM.watchlistList.length; i++) {
      var sat = satSet.getSatExtraOnly(sMM.watchlistList[i]);
      saveWatchlist[i] = sat.SCC_NUM;
    }
    var variable = JSON.stringify(saveWatchlist);
    var blob = new Blob([variable], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, 'watchlist.json');
    e.preventDefault();
  });
  $('#watchlist-open').on('click', function () {
    $('#watchlist-file').trigger('click');
  });
  $('#watchlist-file').on('change', function (evt) {
    if (!window.FileReader) return; // Browser is not compatible

    var reader = new FileReader();

    reader.onload = function (evt) {
      if (evt.target.readyState !== 2) return;
      if (evt.target.error) {
        console.log('error');
        return;
      }

      var newWatchlist = JSON.parse(evt.target.result);
      sMM.watchlistInViewList = [];
      for (var i = 0; i < newWatchlist.length; i++) {
        var sat = satSet.getSatExtraOnly(satSet.getIdFromObjNum(newWatchlist[i]));
        if (sat !== null) {
          newWatchlist[i] = sat.id;
          sMM.watchlistInViewList.push(false);
        } else {
          console.error('Watchlist File Format Incorret');
          return;
        }
      }
      sMM.watchlistList = newWatchlist;
      sMM.updateWatchlist();
      if (sensorManager.checkSensorSelected()) {
        $('#menu-info-overlay').removeClass('bmenu-item-disabled');
      }
    };
    reader.readAsText(evt.target.files[0]);
    evt.preventDefault();
  });

  $('#newLaunch').on('submit', function (e) {
    $('#loading-screen').fadeIn(1000, function () {
      $('#nl-error').hide();
      var scc = $('#nl-scc').val();
      var satId = satSet.getIdFromObjNum(scc);
      var sat = satSet.getSat(satId);
      // var intl = sat.INTLDES.trim();

      var upOrDown = $('#nl-updown').val();

      var launchFac = $('#nl-facility').val();
      // if (settingsManager.isOfficialWebsite) ga('send', 'event', 'New Launch', launchFac, 'Launch Site');

      var launchLat, launchLon;

      if (objectManager.isLaunchSiteManagerLoaded) {
        for (var launchSite in objectManager.launchSiteManager.launchSiteList) {
          if (objectManager.launchSiteManager.launchSiteList[launchSite].name === launchFac) {
            launchLat = objectManager.launchSiteManager.launchSiteList[launchSite].lat;
            launchLon = objectManager.launchSiteManager.launchSiteList[launchSite].lon;
          }
        }
      }
      if (launchLon > 180) {
        // if West not East
        launchLon -= 360; // Convert from 0-360 to -180-180
      }

      // if (sat.inclination * RAD2DEG < launchLat) {
      //   uiManager.toast(`Satellite Inclination Lower than Launch Latitude!`, 'critical');
      //   $('#loading-screen').fadeOut('slow');
      //   return;
      // }

      // Set time to 0000z for relative time.

      var today = new Date(); // Need to know today for offset calculation
      var quadZTime = new Date(today.getFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0); // New Date object of the future collision
      // Date object defaults to local time.
      quadZTime.setUTCHours(0); // Move to UTC Hour

      timeManager.propOffset = quadZTime - today; // Find the offset from today
      cameraManager.camSnapMode = false;
      satSet.satCruncher.postMessage({
        // Tell satSet.satCruncher we have changed times for orbit calculations
        typ: 'offset',
        dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
      });

      var TLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset);

      var TLE1 = TLEs[0];
      var TLE2 = TLEs[1];

      if (satellite.altitudeCheck(TLE1, TLE2, timeManager.propOffset) > 1) {
        satSet.satCruncher.postMessage({
          typ: 'satEdit',
          id: satId,
          active: true,
          TLE1: TLE1,
          TLE2: TLE2,
        });
        orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

        sat = satSet.getSat(satId);
      } else {
        uiManager.toast(`Failed Altitude Test - Try a Different Satellite!`, 'critical');
      }
      $('#loading-screen').fadeOut('slow');
    });
    e.preventDefault();
  });

  $('#nl-error').on('click', function () {
    $('#nl-error').hide();
  });

  $('#breakup').on('submit', function (e) {
    $('#loading-screen').fadeIn(1000, function () {
      var satId = satSet.getIdFromObjNum($('#hc-scc').val());
      var mainsat = satSet.getSat(satId);
      var origsat = mainsat;

      // Launch Points are the Satellites Current Location
      // TODO: Remove TEARR References
      //
      // var latlon = satellite.eci2ll(mainsat.position.x,mainsat.position.y,mainsat.position.z);
      // var launchLat = satellite.degreesLat(latlon.latitude * DEG2RAD);
      // var launchLon = satellite.degreesLong(latlon.longitude * DEG2RAD);
      // var alt = satellite.altitudeCheck(mainsat.TLE1, mainsat.TLE2, timeManager.getPropOffset());
      // console.log(launchLat);
      // console.log(launchLon);
      // console.log(alt);

      // Launch Points are the Satellites Current Location
      var TEARR = mainsat.getTEARR();
      var launchLat, launchLon, alt;
      launchLat = satellite.degreesLat(TEARR.lat);
      launchLon = satellite.degreesLong(TEARR.lon);
      alt = TEARR.alt;

      var upOrDown = mainsat.getDirection();
      // console.log(upOrDown);

      var currentEpoch = satellite.currentEpoch(timeManager.propTime());
      mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

      cameraManager.camSnapMode = false;

      var TLEs;
      // Ignore argument of perigee for round orbits OPTIMIZE
      if (mainsat.apogee - mainsat.perigee < 300) {
        TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset);
      } else {
        TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt);
      }
      var TLE1 = TLEs[0];
      var TLE2 = TLEs[1];
      satSet.satCruncher.postMessage({
        typ: 'satEdit',
        id: satId,
        TLE1: TLE1,
        TLE2: TLE2,
      });
      orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);

      var breakupSearchString = '';

      var meanmoVariation = $('#hc-per').val();
      var incVariation = $('#hc-inc').val();
      var rascVariation = $('#hc-raan').val();

      var breakupCount = 100; // settingsManager.maxAnalystSats;
      for (var i = 0; i < breakupCount; i++) {
        for (var incIterat = 0; incIterat <= 4; incIterat++) {
          for (var meanmoIterat = 0; meanmoIterat <= 4; meanmoIterat++) {
            for (var rascIterat = 0; rascIterat <= 4; rascIterat++) {
              if (i >= breakupCount) continue;
              satId = satSet.getIdFromObjNum(80000 + i);
              var sat = satSet.getSat(satId);
              sat = origsat;
              var iTLE1 = '1 ' + (80000 + i) + TLE1.substr(7);

              var rascOffset = -rascVariation / 2 + rascVariation * (rascIterat / 4);

              var iTLEs;
              // Ignore argument of perigee for round orbits OPTIMIZE
              if (sat.apogee - sat.perigee < 300) {
                iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, 0, rascOffset);
              } else {
                iTLEs = satellite.getOrbitByLatLon(sat, launchLat, launchLon, upOrDown, timeManager.propOffset, alt, rascOffset);
              }
              iTLE1 = iTLEs[0];
              iTLE2 = iTLEs[1];

              // For the first 30
              var inc = TLE2.substr(8, 8);
              inc = parseFloat(inc - incVariation / 2 + incVariation * (incIterat / 4)).toPrecision(7);
              inc = inc.split('.');
              inc[0] = inc[0].substr(-3, 3);
              if (inc[1]) {
                inc[1] = inc[1].substr(0, 4);
              } else {
                inc[1] = '0000';
              }
              inc = (inc[0] + '.' + inc[1]).toString();
              inc = stringPad.padEmpty(inc, 8);

              // For the second 30
              var meanmo = iTLE2.substr(52, 10);
              meanmo = parseFloat(meanmo - (meanmo * meanmoVariation) / 2 + meanmo * meanmoVariation * (meanmoIterat / 4)).toPrecision(10);
              // meanmo = parseFloat(meanmo - (0.005 / 10) + (0.01 * ((meanmoIterat + 1) / 10))).toPrecision(10);
              meanmo = meanmo.split('.');
              meanmo[0] = meanmo[0].substr(-2, 2);
              if (meanmo[1]) {
                meanmo[1] = meanmo[1].substr(0, 8);
              } else {
                meanmo[1] = '00000000';
              }
              meanmo = (meanmo[0] + '.' + meanmo[1]).toString();

              var iTLE2 = '2 ' + (80000 + i) + ' ' + inc + ' ' + iTLE2.substr(17, 35) + meanmo + iTLE2.substr(63);
              sat = satSet.getSat(satId);
              sat.TLE1 = iTLE1;
              sat.TLE2 = iTLE2;
              sat.active = true;
              if (satellite.altitudeCheck(iTLE1, iTLE2, timeManager.propOffset) > 1) {
                satSet.satCruncher.postMessage({
                  typ: 'satEdit',
                  id: satId,
                  TLE1: iTLE1,
                  TLE2: iTLE2,
                });
                orbitManager.updateOrbitBuffer(satId, true, iTLE1, iTLE2);
              } else {
                console.error('Breakup Generator Failed');
              }
              i++;
            }
          }
        }
      }
      breakupSearchString += mainsat.SCC_NUM + ',Analyst Sat';
      uiManager.doSearch(breakupSearchString);

      $('#loading-screen').fadeOut('slow');
    });
    e.preventDefault();
  });

  $('#missile').on('submit', function (e) {
    $('#loading-screen').fadeIn(1000, function () {
      $('#ms-error').hide();
      var type = $('#ms-type').val() * 1;
      var attacker = $('#ms-attacker').val() * 1;
      let lauLat = $('#ms-lat-lau').val() * 1;
      let lauLon = $('#ms-lon-lau').val() * 1;
      var target = $('#ms-target').val() * 1;
      var tgtLat = $('#ms-lat').val() * 1;
      var tgtLon = $('#ms-lon').val() * 1;
      // var result = false;

      let launchTime = timeManager.selectedDate * 1;

      let sim = '';
      if (type === 1) {
        sim = 'simulation/Russia2USA.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type === 2) {
        sim = 'simulation/Russia2USAalt.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type === 3) {
        sim = 'simulation/China2USA.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type === 4) {
        sim = 'simulation/NorthKorea2USA.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type === 5) {
        sim = 'simulation/USA2Russia.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type === 6) {
        sim = 'simulation/USA2China.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type === 7) {
        sim = 'simulation/USA2NorthKorea.json';
        missileManager.MassRaidPre(launchTime, sim);
      }
      if (type !== 0) {
        uiManager.toast(`${sim} Loaded`, 'standby', true);
      }
      if (type === 0) {
        if (target === -1) {
          // Custom Target
          if (isNaN(tgtLat)) {
            uiManager.toast(`Invalid Target Latitude!`, 'critical');
            e.preventDefault();
            $('#loading-screen').hide();
            return;
          }
          if (isNaN(tgtLon)) {
            uiManager.toast(`Invalid Target Longitude!`, 'critical');
            e.preventDefault();
            $('#loading-screen').hide();
            return;
          }
        } else {
          // Premade Target
          tgtLat = missileManager.globalBMTargets[target * 3];
          tgtLon = missileManager.globalBMTargets[target * 3 + 1];
        }

        if (isNaN(lauLat)) {
          uiManager.toast(`Invalid Launch Latitude!`, 'critical');
          e.preventDefault();
          $('#loading-screen').hide();
          return;
        }
        if (isNaN(lauLon)) {
          uiManager.toast(`Invalid Launch Longitude!`, 'critical');
          e.preventDefault();
          $('#loading-screen').hide();
          return;
        }

        var a, b; //, attackerName;

        if (attacker < 200) {
          // USA
          a = attacker - 100;
          b = 500 - missileManager.missilesInUse;
          let missileMinAlt = 1200;
          if (attacker != 100) {
            // Use Custom Launch Site
            lauLat = missileManager.UsaICBM[a * 4];
            lauLon = missileManager.UsaICBM[a * 4 + 1];
            missileMinAlt = 1100; //https://www.space.com/8689-air-force-launches-ballistic-missile-suborbital-test.html
          }
          // attackerName = missileManager.UsaICBM[a * 4 + 2];
          missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.UsaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.UsaICBM[a * 4 + 3], 'United States', missileMinAlt);
        } else if (attacker < 300) {
          // Russian
          a = attacker - 200;
          b = 500 - missileManager.missilesInUse;
          let missileMinAlt = 1120;
          if (attacker != 213 && attacker != 214 && attacker != 215) {
            // Use Custom Launch Site
            lauLat = missileManager.RussianICBM[a * 4];
            lauLon = missileManager.RussianICBM[a * 4 + 1];
          }
          // attackerName = missileManager.RussianICBM[a * 4 + 2];
          missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.RussianICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.RussianICBM[a * 4 + 3], 'Russia', missileMinAlt);
        } else if (attacker < 400) {
          // Chinese
          a = attacker - 300;
          b = 500 - missileManager.missilesInUse;
          let missileMinAlt = 1120;
          if (attacker != 321) {
            // Use Custom Launch Site
            lauLat = missileManager.ChinaICBM[a * 4];
            lauLon = missileManager.ChinaICBM[a * 4 + 1];
          }
          // attackerName = missileManager.ChinaICBM[a * 4 + 2];
          missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ChinaICBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ChinaICBM[a * 4 + 3], 'China', missileMinAlt);
        } else if (attacker < 500) {
          // North Korean
          a = attacker - 400;
          b = 500 - missileManager.missilesInUse;
          let missileMinAlt = 1120;
          if (attacker != 400) {
            // Use Custom Launch Site
            lauLat = missileManager.NorthKoreanBM[a * 4];
            lauLon = missileManager.NorthKoreanBM[a * 4 + 1];
          }
          // attackerName = missileManager.NorthKoreanBM[a * 4 + 2];
          missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.NorthKoreanBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.NorthKoreanBM[a * 4 + 3], 'North Korea', missileMinAlt);
        } else if (attacker < 600) {
          // French SLBM
          a = attacker - 500;
          b = 500 - missileManager.missilesInUse;
          // attackerName = missileManager.FraSLBM[a * 4 + 2];
          let missileMinAlt = 1000;
          if (attacker != 500) {
            // Use Custom Launch Site
            lauLat = missileManager.FraSLBM[a * 4];
            lauLon = missileManager.FraSLBM[a * 4 + 1];
          }
          // https://etikkradet.no/files/2017/02/EADS-Engelsk.pdf
          missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.FraSLBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.FraSLBM[a * 4 + 3], 'France', missileMinAlt);
        } else if (attacker < 700) {
          // United Kingdom SLBM
          a = attacker - 600;
          b = 500 - missileManager.missilesInUse;
          // attackerName = missileManager.ukSLBM[a * 4 + 2];
          let missileMinAlt = 1200;
          if (attacker != 600) {
            // Use Custom Launch Site
            lauLat = missileManager.ukSLBM[a * 4];
            lauLon = missileManager.ukSLBM[a * 4 + 1];
          }
          missileManager.Missile(lauLat, lauLon, tgtLat, tgtLon, 3, satSet.missileSats - b, launchTime, missileManager.ukSLBM[a * 4 + 2], 30, 2.9, 0.07, missileManager.ukSLBM[a * 4 + 3], 'United Kigndom', missileMinAlt);
        }
        // if (settingsManager.isOfficialWebsite)
        //     ga(
        //         'send',
        //         'event',
        //         'New Missile',
        //         attackerName,
        //         'Attacker'
        //     );
        // if (settingsManager.isOfficialWebsite)
        //     ga(
        //         'send',
        //         'event',
        //         'New Missile',
        //         tgtLat + ', ' + tgtLon,
        //         'Target'
        //     );
        uiManager.toast(missileManager.lastMissileError, missileManager.lastMissileErrorType);
        uiManager.doSearch('RV_');
      }
      $('#loading-screen').hide();
    });
    e.preventDefault();
  });

  $('#ms-attacker').on('change', () => {
    let isSub = false;
    let subList = [100, 600, 213, 214, 215, 321, 500, 400];
    for (var i = 0; i < subList.length; i++) {
      if (subList[i] == parseInt($('#ms-attacker').val())) {
        isSub = true;
      }
    }
    if (!isSub) {
      $('#ms-lau-holder-lat').hide();
      $('#ms-lau-holder-lon').hide();
    } else {
      $('#ms-lau-holder-lat').show();
      $('#ms-lau-holder-lon').show();
    }
  });

  $('#ms-target').on('change', () => {
    if (parseInt($('#ms-target').val()) !== -1) {
      $('#ms-tgt-holder-lat').hide();
      $('#ms-tgt-holder-lon').hide();
    } else {
      $('#ms-tgt-holder-lat').show();
      $('#ms-tgt-holder-lon').show();
    }
  });

  $('#ms-error').on('click', function () {
    $('#ms-error').hide();
  });

  $('#fbl-error').on('click', function () {
    $('#fbl-error').hide();
  });

  $('#missile').on('change', function () {
    if ($('#ms-type').val() * 1 !== 0) {
      $('#ms-custom-opt').hide();
    } else {
      $('#ms-custom-opt').show();
    }
  });

  $('#cs-telescope').on('click', function () {
    if ($('#cs-telescope').is(':checked')) {
      $('#cs-minaz').attr('disabled', true);
      $('#cs-maxaz').attr('disabled', true);
      $('#cs-minel').attr('disabled', true);
      $('#cs-maxel').attr('disabled', true);
      $('#cs-minrange').attr('disabled', true);
      $('#cs-maxrange').attr('disabled', true);
      $('#cs-minaz-div').hide();
      $('#cs-maxaz-div').hide();
      $('#cs-minel-div').hide();
      $('#cs-maxel-div').hide();
      $('#cs-minrange-div').hide();
      $('#cs-maxrange-div').hide();
      $('#cs-minaz').val(0);
      $('#cs-maxaz').val(360);
      $('#cs-minel').val(10);
      $('#cs-maxel').val(90);
      $('#cs-minrange').val(100);
      $('#cs-maxrange').val(1000000);
    } else {
      $('#cs-minaz').attr('disabled', false);
      $('#cs-maxaz').attr('disabled', false);
      $('#cs-minel').attr('disabled', false);
      $('#cs-maxel').attr('disabled', false);
      $('#cs-minrange').attr('disabled', false);
      $('#cs-maxrange').attr('disabled', false);
      $('#cs-minaz-div').show();
      $('#cs-maxaz-div').show();
      $('#cs-minel-div').show();
      $('#cs-maxel-div').show();
      $('#cs-minrange-div').show();
      $('#cs-maxrange-div').show();
      if (sensorManager.checkSensorSelected()) {
        $('#cs-minaz').val(sensorManager.selectedSensor.obsminaz);
        $('#cs-maxaz').val(sensorManager.selectedSensor.obsmaxaz);
        $('#cs-minel').val(sensorManager.selectedSensor.obsminel);
        $('#cs-maxel').val(sensorManager.selectedSensor.obsmaxel);
        $('#cs-minrange').val(sensorManager.selectedSensor.obsminrange);
        $('#cs-maxrange').val(sensorManager.selectedSensor.obsmaxrange);
      }
    }
  });

  $('#stfForm').on('submit', function (e) {
    if (!sensorManager.checkSensorSelected()) {
      uiManager.toast(`Select a Sensor First!`, 'caution', true);
    }

    const lat = sensorManager.currentSensor.lat;
    const lon = sensorManager.currentSensor.long;
    const obshei = sensorManager.currentSensor.obshei;
    const sensorType = 'Short Range Fence';

    // Multiply everything by 1 to convert string to number
    const az = $('#stf-az').val() * 1;
    const azExt = $('#stf-azExt').val() * 1;
    const el = $('#stf-el').val() * 1;
    const elExt = $('#stf-elExt').val() * 1;
    const rng = $('#stf-rng').val() * 1;
    const rngExt = $('#stf-rngExt').val() * 1;

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
        long: lon,
        obshei: obshei,
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
      long: lon,
      obshei: obshei,
      obsminaz: minaz,
      obsmaxaz: maxaz,
      obsminel: minel,
      obsmaxel: maxel,
      obsminrange: minrange,
      obsmaxrange: maxrange,
      type: sensorType,
    });

    uiManager.enableFovView();

    if (maxrange > 6000) {
      cameraManager.changeZoom('geo');
    } else {
      cameraManager.changeZoom('leo');
    }
    cameraManager.camSnap(cameraManager.latToPitch(lat), cameraManager.longToYaw(lon, timeManager.selectedDate));

    e.preventDefault();
  });

  $('#customSensor').on('submit', function (e) {
    $('#menu-sensor-info').removeClass('bmenu-item-disabled');
    $('#menu-fov-bubble').removeClass('bmenu-item-disabled');
    $('#menu-surveillance').removeClass('bmenu-item-disabled');
    $('#menu-planetarium').removeClass('bmenu-item-disabled');
    $('#menu-astronomy').removeClass('bmenu-item-disabled');
    sensorManager.whichRadar = 'CUSTOM';
    $('#sensor-type').html($('#cs-type').val().replace(/</gu, '&lt;').replace(/>/gu, '&gt;'));
    $('#sensor-info-title').html('Custom Sensor');
    $('#sensor-country').html('Custom Sensor');

    var lon = $('#cs-lon').val();
    var lat = $('#cs-lat').val();
    var obshei = $('#cs-hei').val();
    var sensorType = $('#cs-type').val();
    var minaz = $('#cs-minaz').val();
    var maxaz = $('#cs-maxaz').val();
    var minel = $('#cs-minel').val();
    var maxel = $('#cs-maxel').val();
    var minrange = $('#cs-minrange').val();
    var maxrange = $('#cs-maxrange').val();

    satSet.satCruncher.postMessage({
      // Send satSet.satCruncher File information on this radar
      typ: 'offset', // Tell satSet.satCruncher to update something
      dat: timeManager.propOffset.toString() + ' ' + timeManager.propRate.toString(), // Tell satSet.satCruncher what time it is and how fast time is moving
      setlatlong: true, // Tell satSet.satCruncher we are changing observer location
      sensor: {
        lat: lat * 1,
        long: lon * 1,
        obshei: obshei * 1,
        obsminaz: minaz * 1,
        obsmaxaz: maxaz * 1,
        obsminel: minel * 1,
        obsmaxel: maxel * 1,
        obsminrange: minrange * 1,
        obsmaxrange: maxrange * 1,
        type: sensorType,
      },
    });

    satellite.setobs({
      lat: lat * 1,
      long: lon * 1,
      obshei: obshei * 1,
      obsminaz: minaz * 1,
      obsmaxaz: maxaz * 1,
      obsminel: minel * 1,
      obsmaxel: maxel * 1,
      obsminrange: minrange * 1,
      obsmaxrange: maxrange * 1,
      type: sensorType,
    });

    // objectManager.setSelectedSat(-1);
    lat = lat * 1;
    lon = lon * 1;
    if (maxrange > 6000) {
      cameraManager.changeZoom('geo');
    } else {
      cameraManager.changeZoom('leo');
    }
    cameraManager.camSnap(cameraManager.latToPitch(lat), cameraManager.longToYaw(lon, timeManager.selectedDate));

    e.preventDefault();
  });

  $('#dops-form').on('submit', function (e) {
    uiManager.hideSideMenus();
    sMM.isDOPMenuOpen = true;
    $('#loading-screen').fadeIn(1000, function () {
      let lat = $('#dops-lat').val() * 1;
      let lon = $('#dops-lon').val() * 1;
      let alt = $('#dops-alt').val() * 1;
      let el = $('#dops-el').val() * 1;
      settingsManager.gpsElevationMask = el;
      satellite.getDOPsTable(lat, lon, alt);
      $('#menu-dops').addClass('bmenu-item-selected');
      $('#loading-screen').fadeOut('slow');
      $('#dops-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
    });
    e.preventDefault();
  });
  let socratesObjOne = []; // Array for tr containing CATNR1
  let socratesObjTwo = []; // Array for tr containing CATNR2
  let findFutureDate = (socratesObjTwo, row) => {
    let socratesDate = socratesObjTwo[row][4].split(' '); // Date/time is on the second line 5th column
    let socratesTime = socratesDate[3].split(':'); // Split time from date for easier management

    let MMMtoInt = (month) => {
      switch (month) {
        case 'Jan':
          return 0;
        case 'Feb':
          return 1;
        case 'Mar':
          return 2;
        case 'Apr':
          return 3;
        case 'May':
          return 4;
        case 'Jun':
          return 5;
        case 'Jul':
          return 6;
        case 'Aug':
          return 7;
        case 'Sep':
          return 8;
        case 'Oct':
          return 9;
        case 'Nov':
          return 10;
        case 'Dec':
          return 11;
      }
    }; // Convert MMM format to an int for Date() constructor

    let sYear = parseInt(socratesDate[0]); // UTC Year
    let sMon = MMMtoInt(socratesDate[1]); // UTC Month in MMM prior to converting
    let sDay = parseInt(socratesDate[2]); // UTC Day
    let sHour = parseInt(socratesTime[0]); // UTC Hour
    let sMin = parseInt(socratesTime[1]); // UTC Min
    let sSec = parseInt(socratesTime[2]); // UTC Sec - This is a decimal, but when we convert to int we drop those

    let selectedDate = new Date(sYear, sMon, sDay, sHour, sMin, sSec); // New Date object of the future collision
    // Date object defaults to local time.
    selectedDate.setUTCDate(sDay); // Move to UTC day.
    selectedDate.setUTCHours(sHour); // Move to UTC Hour

    let today = new Date(); // Need to know today for offset calculation
    timeManager.propOffset = selectedDate - today; // Find the offset from today
    cameraManager.camSnapMode = false;
    satSet.satCruncher.postMessage({
      // Tell satSet.satCruncher we have changed times for orbit calculations
      typ: 'offset',
      dat: timeManager.propOffset.toString() + ' ' + (1.0).toString(),
    });
    timeManager.propRealTime = Date.now(); // Reset realtime...this might not be necessary...
    timeManager.propTime();
  }; // Allows passing -1 argument to socrates function to skip these steps
  sMM.socrates = (row) => {
    // SOCRATES Variables

    /* SOCRATES.htm is a 20 row .pl script pulled from celestrak.com/cgi-bin/searchSOCRATES.pl
      If it ever becomes unavailable a similar, but less accurate (maybe?) cron job could be
      created using satCruncer.
  
      The variable row determines which set of objects on SOCRATES.htm we are using. First
      row is 0 and last one is 19. */
    if (row === -1 && socratesObjOne.length === 0 && socratesObjTwo.length === 0) {
      // Only generate the table if receiving the -1 argument for the first time
      $.get('/SOCRATES.htm', function (socratesHTM) {
        // Load SOCRATES.htm so we can use it instead of index.htm
        var tableRowOne = $("[name='CATNR1']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR1
        var tableRowTwo = $("[name='CATNR2']", socratesHTM).closest('tr'); // Find the row(s) containing the hidden input named CATNR2
        // eslint-disable-next-line no-unused-vars
        tableRowOne.each(function (rowIndex, r) {
          var cols = [];
          $(this)
            .find('td')
            .each(function (colIndex, c) {
              cols.push(c.textContent);
            });
          socratesObjOne.push(cols);
        });
        // eslint-disable-next-line no-unused-vars
        tableRowTwo.each(function (rowIndex, r) {
          var cols = [];
          $(this)
            .find('td')
            .each(function (colIndex, c) {
              cols.push(c.textContent);
            });
          socratesObjTwo.push(cols);
        });
        // SOCRATES Menu
        var tbl = document.getElementById('socrates-table'); // Identify the table to update
        tbl.innerHTML = ''; // Clear the table from old object data
        // var tblLength = 0;                                   // Iniially no rows to the table

        var tr = tbl.insertRow();
        var tdT = tr.insertCell();
        tdT.appendChild(document.createTextNode('Time'));
        tdT.setAttribute('style', 'text-decoration: underline');
        var tdS1 = tr.insertCell();
        tdS1.appendChild(document.createTextNode('#1'));
        tdS1.setAttribute('style', 'text-decoration: underline');
        var tdS2 = tr.insertCell();
        tdS2.appendChild(document.createTextNode('#2'));
        tdS2.setAttribute('style', 'text-decoration: underline');

        for (var i = 0; i < 20; i++) {
          if (typeof socratesObjTwo[i] == 'undefined') break;
          // 20 rows
          if (typeof socratesObjTwo[i][4] == 'undefined') continue;
          tr = tbl.insertRow();
          tr.setAttribute('class', 'socrates-object link');
          tr.setAttribute('hiddenrow', i);
          tdT = tr.insertCell();
          var socratesDate = socratesObjTwo[i][4].split(' '); // Date/time is on the second line 5th column
          var socratesTime = socratesDate[3].split(':'); // Split time from date for easier management
          var socratesTimeS = socratesTime[2].split('.'); // Split time from date for easier management
          tdT.appendChild(
            document.createTextNode(socratesDate[2] + ' ' + socratesDate[1] + ' ' + socratesDate[0] + ' - ' + stringPad.pad0(socratesTime[0], 2) + ':' + stringPad.pad0(socratesTime[1], 2) + ':' + stringPad.pad0(socratesTimeS[0], 2) + 'Z')
          );
          tdS1 = tr.insertCell();
          tdS1.appendChild(document.createTextNode(socratesObjOne[i][1]));
          tdS2 = tr.insertCell();
          tdS2.appendChild(document.createTextNode(socratesObjTwo[i][0]));
        }
      });
    }
    if (row !== -1) {
      // If an object was selected from the menu
      findFutureDate(socratesObjTwo, row); // Jump to the date/time of the collision

      uiManager.doSearch(socratesObjOne[row][1] + ',' + socratesObjTwo[row][0]); // Actually perform the search of the two objects
      settingsManager.socratesOnSatCruncher = satSet.getIdFromObjNum(socratesObjOne[row][1]);
    } // If a row was selected
  };

  sMM.updateWatchlist = (updateWatchlistList, updateWatchlistInViewList) => {
    if (typeof updateWatchlistList !== 'undefined') {
      sMM.watchlistList = updateWatchlistList;
    }
    if (typeof updateWatchlistInViewList !== 'undefined') {
      sMM.watchlistInViewList = updateWatchlistInViewList;
    }

    if (!sMM.watchlistList) return;
    settingsManager.isThemesNeeded = true;
    if (sMM.isWatchlistChanged == null) {
      sMM.isWatchlistChanged = false;
    } else {
      sMM.isWatchlistChanged = true;
    }
    var watchlistString = '';
    var watchlistListHTML = '';
    var sat;
    for (let i = 0; i < sMM.watchlistList.length; i++) {
      sat = satSet.getSatExtraOnly(sMM.watchlistList[i]);
      if (sat == null) {
        sMM.watchlistList.splice(i, 1);
        continue;
      }
      watchlistListHTML +=
        '<div class="row">' +
        '<div class="col s3 m3 l3">' +
        sat.SCC_NUM +
        '</div>' +
        '<div class="col s7 m7 l7">' +
        sat.ON +
        '</div>' +
        '<div class="col s2 m2 l2 center-align remove-icon"><img class="watchlist-remove" data-sat-id="' +
        sat.id +
        '" src="img/remove.png"></img></div>' +
        '</div>';
    }
    $('#watchlist-list').html(watchlistListHTML);
    for (let i = 0; i < sMM.watchlistList.length; i++) {
      // No duplicates
      watchlistString += satSet.getSatExtraOnly(sMM.watchlistList[i]).SCC_NUM;
      if (i !== sMM.watchlistList.length - 1) watchlistString += ',';
    }
    uiManager.doSearch(watchlistString, true);
    satSet.setColorScheme(settingsManager.currentColorScheme, true); // force color recalc

    var saveWatchlist = [];
    for (let i = 0; i < sMM.watchlistList.length; i++) {
      sat = satSet.getSatExtraOnly(sMM.watchlistList[i]);
      saveWatchlist[i] = sat.SCC_NUM;
    }
    var variable = JSON.stringify(saveWatchlist);
    localStorage.setItem('watchlistList', variable);
  };

  sMM.hideSideMenus = () => {
    // TODO: This needs optimized to skip steps that don't need done

    // Close any open colorboxes
    try {
      $.colorbox.close();
    } catch {
      // Intentionally Left Blank (Fails Jest Testing)
    }

    // Hide all side menus
    $('#membership-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#sensor-list-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#info-overlay-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#sensor-info-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#stf-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#watchlist-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#lookangles-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#dops-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#lookanglesmultisite-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#findByLooks-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#twitter-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#map-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#socrates-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#satChng-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#nextLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#obfit-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#settings-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#newLaunch-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#breakup-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#missile-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#customSensor-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#external-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#analysis-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#sat-photo-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#color-scheme-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#countries-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#constellations-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
    $('#about-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);

    // Remove red color from all menu icons
    $('#menu-sensor-list').removeClass('bmenu-item-selected');
    $('#menu-info-overlay').removeClass('bmenu-item-selected');
    $('#menu-sensor-info').removeClass('bmenu-item-selected');
    $('#menu-stf').removeClass('bmenu-item-selected');
    $('#menu-watchlist').removeClass('bmenu-item-selected');
    $('#menu-lookangles').removeClass('bmenu-item-selected');
    $('#menu-dops').removeClass('bmenu-item-selected');
    $('#menu-lookanglesmultisite').removeClass('bmenu-item-selected');
    $('#menu-launches').removeClass('bmenu-item-selected');
    $('#menu-find-sat').removeClass('bmenu-item-selected');
    $('#menu-twitter').removeClass('bmenu-item-selected');
    $('#menu-map').removeClass('bmenu-item-selected');
    $('#menu-satellite-collision').removeClass('bmenu-item-selected');
    $('#menu-satChng').removeClass('bmenu-item-selected');
    $('#menu-settings').removeClass('bmenu-item-selected');
    $('#menu-editSat').removeClass('bmenu-item-selected');
    $('#menu-newLaunch').removeClass('bmenu-item-selected');
    $('#menu-nextLaunch').removeClass('bmenu-item-selected');
    $('#menu-breakup').removeClass('bmenu-item-selected');
    $('#menu-missile').removeClass('bmenu-item-selected');
    $('#menu-external').removeClass('bmenu-item-selected');
    $('#menu-sat-photo').removeClass('bmenu-item-selected');
    $('#menu-analysis').removeClass('bmenu-item-selected');
    $('#menu-customSensor').removeClass('bmenu-item-selected');
    $('#menu-color-scheme').removeClass('bmenu-item-selected');
    $('#menu-countries').removeClass('bmenu-item-selected');
    $('#menu-constellations').removeClass('bmenu-item-selected');
    $('#menu-obfit').removeClass('bmenu-item-selected');
    $('#menu-about').removeClass('bmenu-item-selected');

    // Unflag all open menu variables
    sMM.isSensorListMenuOpen = false;
    sMM.isInfoOverlayMenuOpen = false;
    sMM.isSensorInfoMenuOpen = false;
    sMM.isStfMenuOpen = false;
    sMM.isWatchlistMenuOpen = false;
    sMM.isLaunchMenuOpen = false;
    sMM.isTwitterMenuOpen = false;
    sMM.isFindByLooksMenuOpen = false;
    sMM.isMapMenuOpen = false;
    sMM.isLookanglesMenuOpen = false;
    sMM.isDOPMenuOpen = false;
    sMM.isLookanglesMultiSiteMenuOpen = false;
    sMM.isSocratesMenuOpen = false;
    sMM.isNextLaunchMenuOpen = false;
    sMM.issatChngMenuOpen = false;
    sMM.isSettingsMenuOpen = false;
    sMM.isObfitMenuOpen = false;
    sMM.isEditSatMenuOpen = false;
    sMM.isNewLaunchMenuOpen = false;
    sMM.isBreakupMenuOpen = false;
    sMM.isMissileMenuOpen = false;
    sMM.isCustomSensorMenuOpen = false;
    sMM.isColorSchemeMenuOpen = false;
    sMM.isAnalysisMenuOpen = false;
    sMM.isSatPhotoMenuOpen = false;
    sMM.isExternalMenuOpen = false;
    sMM.isConstellationsMenuOpen = false;
    sMM.isCountriesMenuOpen = false;
    sMM.isAboutSelected = false;
  };
};

export { sMM };
