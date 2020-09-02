;(function () {
  var shaderLoader = {}

  shaderLoader.shaderData = [
    {
      name: 'dot-fragment.glsl',
      code: `
      precision mediump float;

      varying vec4 vColor;
      varying float vStar;

      void main(void) {
        vec2 ptCoord = gl_PointCoord * 2.0 - vec2(1.0, 1.0);
        float r = 0.0;
        float alpha = 0.0;
        if (vStar < 0.5) {
          r = ${settingsManager.satShader.blurFactor1} - min(abs(length(ptCoord)), 1.0);
          alpha = pow(2.0 * r + ${settingsManager.satShader.blurFactor2}, 3.0);
        } else {
          r = ${settingsManager.satShader.blurFactor3} - min(abs(length(ptCoord)), 1.0);
          alpha = pow(2.0 * r + ${settingsManager.satShader.blurFactor4}, 3.0);
        }
        alpha = min(alpha, 1.0);
        gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
      }
    `,
    },
    {
      name: 'dot-vertex-var.glsl',
      code: `
        attribute vec3 aPos;
        attribute vec4 aColor;
        attribute float aStar;

        uniform float minSize;
        uniform float maxSize;

        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat4 uPMatrix;

        varying vec4 vColor;
        varying float vStar;

        void main(void) {
          vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);
          float drawSize = ${settingsManager.satShader.starSize};
          if (aStar < 0.5) {
            drawSize = min(max(pow(${settingsManager.satShader.distanceBeforeGrow} \/ position.z, 2.1), minSize), maxSize) * 1.0;
          }
          gl_PointSize = drawSize;
          gl_Position = position;
          vColor = aColor;
          vStar = aStar * 1.0;
        }
      `,
    },
    {
      name: 'pick-fragment.glsl',
      code:
        'precision mediump float;\n\nvarying vec3 vColor;\n\nvoid main(void) {\n  gl_FragColor = vec4(vColor, 1.0);\n}',
    },
    {
      name: 'pick-vertex.glsl',
      code:
        'attribute vec3 aPos;\nattribute vec3 aColor;\nattribute float aPickable;\n\nuniform mat4 uCamMatrix;\nuniform mat4 uMvMatrix;\nuniform mat4 uPMatrix;\n\nvarying vec3 vColor;\n\nvoid main(void) {\n  float dotSize = 16.0;\n  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);\n  gl_Position = position;\n  gl_PointSize = dotSize * aPickable;\n  vColor = aColor * aPickable;\n}',
    },
    {
      name: 'path-fragment.glsl',
      code:
        'precision mediump float;\n\nvarying vec4 vColor;\n\nvoid main(void) {\n  gl_FragColor = vColor;\n}',
    },
    {
      name: 'path-vertex.glsl',
      code:
        'attribute vec3 aPos;\n\nuniform mat4 uCamMatrix;\nuniform mat4 uMvMatrix;\nuniform mat4 uPMatrix;\nuniform vec4 uColor;\n\nvarying vec4 vColor;\n\nvoid main(void) {\n  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);\n  gl_Position = position;\n  vColor = uColor;\n}\n',
    },
  ]

  shaderLoader.shaderDataLen = shaderLoader.shaderData.length

  var i = 0
  shaderLoader.getShaderCode = function (name) {
    for (i = 0; i < shaderLoader.shaderDataLen; i++) {
      if (shaderLoader.shaderData[i].name === name) {
        return shaderLoader.shaderData[i].code
      }
    }
    return null
  }

  window.shaderLoader = shaderLoader
})()
