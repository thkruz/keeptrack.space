import $ from 'jquery';

export const uiValidation = () => {
  $('#editSat>div>input').on({
    keydown: function (e) {
      _validateNumOnly(e);
    },
  });

  $('#es-ecen').on({
    keydown: function (e) {
      if (e.keyCode === 190) e.preventDefault();
    },
  });

  $('#es-day').on('keyup', function () {
    if ($('#es-day').val() < 0) $('#es-day').val('000.00000000');
    if ($('#es-day').val() >= 367) $('#es-day').val('366.00000000');
  });
  $('#es-inc').on('keyup', function () {
    if ($('#es-inc').val() < 0) $('#es-inc').val('000.0000');
    if ($('#es-inc').val() > 180) $('#es-inc').val('180.0000');
  });
  $('#es-rasc').on('keyup', function () {
    if ($('#es-rasc').val() < 0) $('#es-rasc').val('000.0000');
    if ($('#es-rasc').val() > 360) $('#es-rasc').val('360.0000');
  });
  $('#es-meanmo').on('keyup', function () {
    if ($('#es-meanmo').val() < 0) $('#es-meanmo').val('00.00000000');
    if ($('#es-meanmo').val() > 18) $('#es-meanmo').val('18.00000000');
  });
  $('#es-argPe').on('keyup', function () {
    if ($('#es-argPe').val() < 0) $('#es-argPe').val('000.0000');
    if ($('#es-argPe').val() > 360) $('#es-argPe').val('360.0000');
  });
  $('#es-meana').on('keyup', function () {
    if ($('#es-meana').val() < 0) $('#es-meana').val('000.0000');
    if ($('#es-meana').val() > 360) $('#es-meana').val('360.0000');
  });

  $('#ms-lat').on('keyup', function () {
    if ($('#ms-lat').val() < -90) $('#ms-lat').val('-90.000');
    if ($('#ms-lat').val() > 90) $('#ms-lat').val('90.000');
  });
  $('#ms-lon').on('keyup', function () {
    if ($('#ms-lon').val() < -180) $('#ms-lon').val('-180.000');
    if ($('#ms-lon').val() > 180) $('#ms-lon').val('180.000');
  });

  var _validateNumOnly = function (e) {
    // Allow: backspace, delete, tab, escape, enter and .
    if (
      $.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
      // Allow: Ctrl+A, Command+A
      (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40) ||
      // Allow: period
      e.keyCode === 190
    ) {
      // let it happen, don't do anything
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };
};
