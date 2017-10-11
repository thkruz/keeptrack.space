/* global
  shaderData
*/
(function () {
  var shaderLoader = {};

  shaderLoader.getShaderCode = function (name) {
    for (var i = 0; i < window.shaderData.length; i++) {
      if (shaderData[i].name === name) {
        return shaderData[i].code;
      }
    }
    return null;
  };

  window.shaderLoader = shaderLoader;
})();
