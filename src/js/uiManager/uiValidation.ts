import $ from 'jquery';

export const allowPeriod = (e: KeyboardEvent) => {
  if (e.code === 'Period' || e.code === 'NumpadDecimal') e.preventDefault();
};
export const esDay366 = () => {
  if ($('#es-day').val() < 0) $('#es-day').val('000.00000000');
  if ($('#es-day').val() >= 367) $('#es-day').val('366.00000000');
};
export const esInc180 = function (): void {
  if ($('#es-inc').val() < 0) $('#es-inc').val('000.0000');
  if ($('#es-inc').val() > 180) $('#es-inc').val('180.0000');
};
export const esRasc360 = function (): void {
  if ($('#es-rasc').val() < 0) $('#es-rasc').val('000.0000');
  if ($('#es-rasc').val() > 360) $('#es-rasc').val('360.0000');
};
export const esMeanmo18 = function (): void {
  if ($('#es-meanmo').val() < 0) $('#es-meanmo').val('00.00000000');
  if ($('#es-meanmo').val() > 18) $('#es-meanmo').val('18.00000000');
};
export const esArgPe360 = function (): void {
  if ($('#es-argPe').val() < 0) $('#es-argPe').val('000.0000');
  if ($('#es-argPe').val() > 360) $('#es-argPe').val('360.0000');
};
export const esMeana360 = function (): void {
  if ($('#es-meana').val() < 0) $('#es-meana').val('000.0000');
  if ($('#es-meana').val() > 360) $('#es-meana').val('360.0000');
};
export const msLat90 = function (): void {
  if ($('#ms-lat').val() < -90) $('#ms-lat').val('-90.000');
  if ($('#ms-lat').val() > 90) $('#ms-lat').val('90.000');
};
export const msLon180 = function (): void {
  if ($('#ms-lon').val() < -180) $('#ms-lon').val('-180.000');
  if ($('#ms-lon').val() > 180) $('#ms-lon').val('180.000');
};
export const initUiValidation = () => {
  $('#editSat>div>input').on('keydown', validateNumOnly);
  $('#es-ecen').on('keydown', allowPeriod);
  $('#es-day').on('keyup', esDay366);
  $('#es-inc').on('keyup', esInc180);
  $('#es-rasc').on('keyup', esRasc360);
  $('#es-meanmo').on('keyup', esMeanmo18);
  $('#es-argPe').on('keyup', esArgPe360);
  $('#es-meana').on('keyup', esMeana360);
  $('#ms-lat').on('keyup', msLat90);
  $('#ms-lon').on('keyup', msLon180);
};
export const validateNumOnly = (e: KeyboardEvent) => {
  if (
    // Allow: backspace, delete, tab, escape, enter and .
    $.inArray(e.code, ['Delete', 'Backspace', 'Tab', 'Escape', 'NumpadEnter', 'Enter', 'NumpadEnter', 'Period']) !== -1 ||
    // Allow: Ctrl+A, Command+A
    (e.code === 'KeyA' && (e.ctrlKey === true || e.metaKey === true)) ||
    // Allow: home, end, left, right, down, up
    $.inArray(e.code, ['Home', 'End', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) !== -1
  ) {
    // let it happen, don't do anything
    return;
  }
  // Ensure that it is a number and stop the keypress
  if (
    $.inArray(e.code, ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0']) !== -1 ||
    $.inArray(e.code, ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9', 'Numpad0']) !== -1
  ) {
    e.preventDefault();
  }
};
