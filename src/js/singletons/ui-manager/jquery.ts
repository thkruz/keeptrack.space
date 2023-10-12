import '@app/js/lib/external/colorPick.js';
import 'jquery-ui-bundle';
import '@app/js/lib/external/jquery-ui-slideraccess.js';
import '@app/js/lib/external/jquery-ui-timepicker.js';

/**
 * This file exists primarily to avoid prettier changing the import order
 * and breaking the jquery-ui-slideraccess.js/ jquery-ui-timepicker.js
 * 
 * DO NOT FORMAT THIS FILE!!!
 */

export const loadJquery = () => {
  // This is just to make sure that the jquery is loaded
  // in the correct order
};
