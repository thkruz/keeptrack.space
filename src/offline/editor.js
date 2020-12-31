// ===============================================================================
//                                          OFFLINE
// ===============================================================================
// THIS FILE IS FOR OFFLINE USE ONLY AND SHOULD NOT BE USED ON A PRODUCTION SERVER
// ===============================================================================
//                                          OFFLINE
// ===============================================================================
$(document).ready(function () {
  var scc = getParameterByName('scc');
  var isPopup = getParameterByName('popup');
  if (scc != null) {
    $('#editor-scc').val(scc);
    updateSelectedObjectInfo();
  }
  if (isPopup == undefined) {
    $('#editor-open').css('display', 'block');
    updateSelectedObjectInfo();
  }

  $('#editor-scc').on('input', function () {
    updateSelectedObjectInfo();
  });

  function updateSelectedObjectInfo() {
    if (typeof satInfoList === 'undefined') {
      console.error('No satInfo.js File');
      return;
    }
    if (parent.window.satInfoList !== null) {
      satInfoList = parent.window.satInfoList;
    } else {
      parent.window.satInfoList = satInfoList;
    }
    if (typeof jsTLEfile === 'undefined') {
      console.error('No TLE.js File');
      return;
    }
    var i;
    for (i = 0; i < jsTLEfile.length; i++) {
      var SCC = _pad0(jsTLEfile[i].TLE1.substr(2, 5).trim(), 5);
      if (SCC === $('#editor-scc').val() || parseInt(SCC).toString() === $('#editor-scc').val()) {
        $('#editor-ON').val(jsTLEfile[i].ON || 'Unknown');
        $('#editor-C').val(jsTLEfile[i].C || 'Unknown');
        $('#editor-LV').val(jsTLEfile[i].LV || 'Unknown');
        $('#editor-URL').val(jsTLEfile[i].URL || '');
        $('#editor-R').val(jsTLEfile[i].R || '0.1');
        $('#editor-NOTES').val(jsTLEfile[i].NOTES || 'NSTR');
        $('#editor-TTP').val(jsTLEfile[i].TTP || 'NSTR');
        $('#editor-fmissed').val(jsTLEfile[i].fmissed || 'No');
        $('#editor-oRPO').val(jsTLEfile[i].oRPO || 'No');
        $('#editor-constellation').val(jsTLEfile[i].constellation || 'NSTR');
        $('#editor-associates').val(jsTLEfile[i].associates || 'NSTR');
        $('#editor-maneuver').val(jsTLEfile[i].maneuver || 'No');
        if (typeof jsTLEfile[i].LS !== 'undefined') {
          $('#editor-LS').val(jsTLEfile[i].LS);
        }
      }
    }
    for (i = 0; i < satInfoList.length; i++) {
      if (satInfoList[i].SCC === $('#editor-scc').val() || parseInt(satInfoList[i].SCC).toString() === $('#editor-scc').val()) {
        $('#editor-ON').val(satInfoList[i].ON || 'Unknown');
        $('#editor-C').val(satInfoList[i].C || 'Unknown');
        $('#editor-LV').val(satInfoList[i].LV || 'Unknown');
        $('#editor-URL').val(satInfoList[i].URL || '');
        $('#editor-R').val(satInfoList[i].R || '0.1');
        $('#editor-NOTES').val(satInfoList[i].NOTES || 'NSTR');
        $('#editor-TTP').val(satInfoList[i].TTP || 'NSTR');
        $('#editor-fmissed').val(satInfoList[i].fmissed || 'No');
        $('#editor-oRPO').val(satInfoList[i].oRPO || 'No');
        $('#editor-constellation').val(satInfoList[i].constellation || 'NSTR');
        $('#editor-associates').val(satInfoList[i].associates || 'NSTR');
        $('#editor-maneuver').val(satInfoList[i].maneuver || 'No');
        if (typeof satInfoList[i].LS !== 'undefined') {
          $('#editor-LS').val(satInfoList[i].LS);
        }
      }
    }
  }

  $('#editor-ON').on('input', function () {
    satInfoChange();
  });
  $('#editor-C').on('input', function () {
    satInfoChange();
  });
  $('#editor-LV').on('input', function () {
    satInfoChange();
  });
  $('#editor-LS').on('input', function () {
    satInfoChange();
  });
  $('#editor-URL').on('input', function () {
    satInfoChange();
  });
  $('#editor-TTP').on('input', function () {
    satInfoChange();
  });
  $('#editor-fmissed').on('input', function () {
    satInfoChange();
  });
  $('#editor-oRPO').on('input', function () {
    satInfoChange();
  });
  $('#editor-constellation').on('input', function () {
    satInfoChange();
  });
  $('#editor-associates').on('input', function () {
    satInfoChange();
  });
  $('#editor-maneuver').on('input', function () {
    satInfoChange();
  });

  function satInfoChange() {
    var isFoundMatch = false;
    for (i = 0; i < satInfoList.length; i++) {
      if (satInfoList[i].SCC === $('#editor-scc').val() || parseInt(satInfoList[i].SCC).toString() === $('#editor-scc').val()) {
        satInfoList[i].ON = $('#editor-ON').val();
        satInfoList[i].C = $('#editor-C').val();
        satInfoList[i].LV = $('#editor-LV').val();
        satInfoList[i].LS = $('#editor-LS').val();
        satInfoList[i].R = $('#editor-R').val();
        satInfoList[i].URL = $('#editor-URL').val();
        satInfoList[i].NOTES = $('#editor-NOTES').val();
        satInfoList[i].TTP = $('#editor-TTP').val();
        satInfoList[i].FMISSED = $('#editor-fmissed').val();
        satInfoList[i].ORPO = $('#editor-oRPO').val();
        satInfoList[i].constellation = $('#editor-constellation').val();
        satInfoList[i].associates = $('#editor-associates').val();
        satInfoList[i].maneuver = $('#editor-maneuver').val();
        if (typeof parent.window.satSet != undefined) {
          parent.window.satSet.mergeSat(satInfoList[i]);
        }
        isFoundMatch = true;
      }
    }
    if (isFoundMatch === false && $('#editor-scc').val() != null) {
      var newSatInfo = {};
      newSatInfo.SCC = $('#editor-scc').val();
      newSatInfo.ON = $('#editor-ON').val();
      newSatInfo.C = $('#editor-C').val();
      newSatInfo.LV = $('#editor-LV').val();
      newSatInfo.LS = $('#editor-LS').val();
      newSatInfo.R = $('#editor-R').val();
      newSatInfo.URL = $('#editor-URL').val();
      newSatInfo.NOTES = $('#editor-NOTES').val();
      newSatInfo.TTP = $('#editor-TTP').val();
      newSatInfo.FMISSED = $('#editor-fmissed').val();
      newSatInfo.ORPO = $('#editor-oRPO').val();
      newSatInfo.constellation = $('#editor-constellation').val();
      newSatInfo.associates = $('#editor-associates').val();
      newSatInfo.maneuver = $('#editor-maneuver').val();
      satInfoList.push(newSatInfo);
      if (typeof parent.window.satSet != undefined) {
        parent.window.satSet.mergeSat(newSatInfo);
      }
    }
  }

  $('#editor-save').on('click', function (e) {
    satInfoChange();
    var variable = 'var satInfoList = ' + JSON.stringify(satInfoList);
    var blob = new Blob([variable], { type: 'octet/stream' });
    saveAs(blob, 'satInfo.js');
    e.preventDefault();
  });

  $('#editor-open').on('click', function (e) {
    $('#editor-file').trigger('click');
  });
  $('#editor-file').change(function (evt) {
    if (!window.FileReader) return; // Browser is not compatible
    var reader = new FileReader();

    reader.onload = function (evt) {
      if (evt.target.readyState !== 2) return;
      if (evt.target.error) {
        console.log('error');
        return;
      }
      var satelliteList = [];
      var str = evt.target.result;
      var array = str.split(/\r?\n/);
      for (var i = 0; i < array.length / 2; i++) {
        var satellite = {};
        satellite.TLE1 = array[i * 2];
        satellite.TLE2 = array[i * 2 + 1];
        var SCC = _pad0(parseInt(satellite.TLE1.substr(2, 5).trim()).toString(), 5);
        satellite.SCC = SCC;
        satelliteList[i] = satellite;
      }
      var variable = 'var satelliteList = ' + JSON.stringify(satelliteList) + '; export { satelliteList };';
      var blob = new Blob([variable], { type: 'octet/stream' });
      saveAs(blob, 'extra.js');
    };
    reader.readAsText(evt.target.files[0]);
    evt.preventDefault();
  });

  $('#editor-open2').on('click', function (e) {
    $('#editor-file2').trigger('click');
  });
  $('#editor-file2').change(function (evt) {
    if (!window.FileReader) return; // Browser is not compatible
    var reader = new FileReader();

    reader.onload = function (evt) {
      if (evt.target.readyState !== 2) return;
      if (evt.target.error) {
        console.log('error');
        return;
      }
      var satelliteList = [];
      var str = evt.target.result;
      var array = str.split(/\r?\n/);
      for (var i = 0; i < array.length / 3; i++) {
        var satellite = {};
        satellite.ON = array[i * 2];
        satellite.OT = 4;
        satellite.TLE1 = array[i * 2 + 1];
        satellite.TLE2 = array[i * 2 + 2];
        var SCC = _pad0(parseInt(satellite.TLE1.substr(2, 5).trim()).toString(), 5);
        satellite.SCC = SCC;
        satelliteList[i] = satellite;
      }
      var variable = 'var satelliteList = ' + JSON.stringify(satelliteList) + '; export { satelliteList };';
      var blob = new Blob([variable], { type: 'octet/stream' });
      saveAs(blob, 'extra.js');
    };
    reader.readAsText(evt.target.files[0]);
    evt.preventDefault();
  });
});

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function _pad0(str, max) {
  return str.length < max ? _pad0('0' + str, max) : str;
}
$.ajaxSetup({
  cache: false,
});
