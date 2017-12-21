$(document).ready(function () {
  $('#editSat-save').click(function (e) {
    var variable = JSON.stringify(sat2);
    var blob = new Blob([variable], {type: 'text/plain;charset=utf-8'});
    saveAs(blob, scc + '.tle');
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
      var blob = new Blob([variable], {type: 'text/plain;charset=utf-8'});
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
