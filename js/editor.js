// ===============================================================================
//                                          OFFLINE
// ===============================================================================
// THIS FILE IS FOR OFFLINE USE ONLY AND SHOULD NOT BE USED ON A PRODUCTION SERVER
// ===============================================================================
//                                          OFFLINE                                
// ===============================================================================
$(document).ready(function () {
  $('#editor-scc').change(function (e) {
    if (typeof satInfoList === 'undefined') { console.error('No satInfo.js File'); return; }
    if (typeof jsTLEfile === 'undefined') { console.error('No TLE.js File'); return; }
    var i;
    for (i = 0; i < jsTLEfile.length; i++) {
      var SCC = _pad0(jsTLEfile[i].TLE1.substr(2, 5).trim(), 5);
      if (SCC === $('#editor-scc').val() || parseInt(SCC).toString() === $('#editor-scc').val()) {
        $('#editor-ON').val(jsTLEfile[i].ON || 'Unknown');
        $('#editor-C').val(jsTLEfile[i].C || 'Unknown');
        $('#editor-LV').val(jsTLEfile[i].LV || 'Unknown');
        $('#editor-URL').val(jsTLEfile[i].URL || 'Unknown');
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
        $('#editor-URL').val(satInfoList[i].URL || 'Unknown');
        if (typeof satInfoList[i].LS !== 'undefined') {
          $('#editor-LS').val(satInfoList[i].LS);
        }
      }
    }
  });

  $('#editor-ON').change(function (e) { satInfoChange(); });
  $('#editor-C').change(function (e) { satInfoChange(); });
  $('#editor-LV').change(function (e) { satInfoChange(); });
  $('#editor-LS').change(function (e) { satInfoChange(); });
  $('#editor-URL').change(function (e) { satInfoChange(); });

  function satInfoChange () {
    var isFoundMatch = false;
    for (i = 0; i < satInfoList.length; i++) {
      if (satInfoList[i].SCC === $('#editor-scc').val() || parseInt(satInfoList[i].SCC).toString() === $('#editor-scc').val()) {
        satInfoList[i].ON = $('#editor-ON').val();
        satInfoList[i].C = $('#editor-C').val();
        satInfoList[i].LV = $('#editor-LV').val();
        satInfoList[i].LS = $('#editor-LS').val();
        satInfoList[i].URL = $('#editor-URL').val();
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
      newSatInfo.URL = $('#editor-URL').val();
      satInfoList.push(newSatInfo);
    }
  }

  $('#editor-save').click(function (e) {
    satInfoChange();
    var variable = 'var satInfoList = ' + JSON.stringify(satInfoList);
    var blob = new Blob([variable], {type: 'octet/stream'});
    saveAs(blob, 'satInfo.js');
    e.preventDefault();
  });

  $('#editor-open').click(function (e) {
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
        var SCC = parseInt(_pad0(satellite.TLE1.substr(2, 5).trim(), 5));
        satellite.SCC = SCC;
        satelliteList[i] = satellite;
      }
      var variable = 'var satelliteList = ' + JSON.stringify(satelliteList);
      var blob = new Blob([variable], {type: 'octet/stream'});
      saveAs(blob, 'TLE.js');
    };
    reader.readAsText(evt.target.files[0]);
    evt.preventDefault();
  });
});
function _pad0 (str, max) {
  return str.length < max ? _pad0('0' + str, max) : str;
}
$.ajaxSetup({
  cache: false
});
