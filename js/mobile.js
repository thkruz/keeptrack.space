var maxPinchSize = 1;

(function () {
  var mobile = {};
  mobile.init = function () {
    maxPinchSize = Math.hypot($(document).width(),$(document).height());
  };
  window.mobile = mobile;
})();
