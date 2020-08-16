(function () {
  var shaderLoader = {};

  shaderLoader.shaderData = [
    {
      'name': 'earth-fragment.glsl',
      'code': `
        precision mediump float;

        uniform vec3 uAmbientLightColor;
        uniform vec3 uDirectionalLightColor;
        uniform vec3 uLightDirection;

        varying vec2 vUv;
        varying vec3 vNormal;

        uniform sampler2D uSampler;
        uniform sampler2D uNightSampler;
        uniform sampler2D uBumpMap;
        uniform sampler2D uSpecMap;

        void main(void) {
          // float shininess = 1.0;
          // float diffuse = pow(max(dot(vNormal, uLightDirection), 0.0),shininess);
          // float diffuseLight = 0.7;
          float diffuse = max(dot(vNormal, uLightDirection), 0.0);
          vec3 bumpTexColor = texture2D(uBumpMap, vUv).rgb * diffuse * 0.4;
          vec3 specLightColor = texture2D(uSpecMap, vUv).rgb * diffuse * 0.1;

          vec3 dayColor = uAmbientLightColor + (uDirectionalLightColor * diffuse);
          vec3 dayTexColor = texture2D(uSampler, vUv).rgb * dayColor;
          vec3 nightColor = texture2D(uNightSampler, vUv).rgb * pow(1.0 - diffuse, 2.0);

          gl_FragColor = vec4(dayTexColor + nightColor + bumpTexColor + specLightColor, 1.0);
        }`
    }, {
      'name': 'earth-vertex.glsl',
      'code': `
        attribute vec3 aVertexPosition;

        attribute vec2 aTexCoord;
        attribute vec3 aVertexNormal;
        uniform mat4 uPMatrix;
        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat3 uNormalMatrix;

        varying vec2 vUv;
        varying vec3 vNormal;

        void main(void) {
          gl_Position = uPMatrix * uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
          vUv = aTexCoord;

          vNormal = uNormalMatrix * aVertexNormal;
        }
      `
    }, {
      'name': 'sun-fragment.glsl',
      'code': `
        precision mediump float;

        varying vec3 vNormal;
        varying float vDist;

        void main(void) {
          float a = pow(vDist \/ 2.0 * -1.0 + 1.1, 10.0);
          float r = 1.0 * a;
          float g = 1.0 * a;
          float b = 0.4 * a;
          gl_FragColor = vec4(vec3(r,g,b), a);
        }`
    }, {
      'name': 'sun-vertex.glsl',
      'code': `
        attribute vec3 aVertexPosition;
        attribute vec3 aVertexNormal;

        uniform mat4 uPMatrix;
        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat3 uNormalMatrix;

        varying vec3 vNormal;
        varying float vDist;

        void main(void) {
          vec4 position1 = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
          vec4 position0 = uCamMatrix * uMvMatrix * vec4(vec3(0.0,0.0,0.0), 1.0);
          gl_Position = uPMatrix * position1;
          vDist = distance(position0.xz,position1.xz) \/ ${RADIUS_OF_DRAW_SUN}.0;
          vNormal = uNormalMatrix * aVertexNormal;
        }`
    }, {
      'name': 'moon-fragment.glsl',
      'code': `
        precision mediump float;

        uniform vec3 uLightDirection;
        varying vec2 vUv;
        varying vec3 vNormal;

        uniform sampler2D uSampler;
        uniform vec3 uSunPos;

        void main(void) {
          // Moon Position - Sun Position
          vec3 LightDirection = uSunPos - vec3(0.0,0.0,0.0);
          LightDirection = normalize(LightDirection);

          float diffuse = max(dot(vNormal, LightDirection), 0.0);
          vec3 ambientLight = vec3(0.05,0.05,0.05);

          // float diffuseLight = 0.7;
          vec3 litTexColor = texture2D(uSampler, vUv).rgb * (ambientLight + diffuse * 1.5);
          gl_FragColor = vec4(litTexColor, 1.0);
        }`
    }, {
      'name': 'moon-vertex.glsl',
      'code': `
        attribute vec3 aVertexPosition;

        attribute vec2 aTexCoord;
        attribute vec3 aVertexNormal;

        uniform mat4 uPMatrix;
        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat3 uNormalMatrix;

        varying vec2 vUv;
        varying vec3 vNormal;
        void main(void) {
          gl_Position = uPMatrix * uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
          vUv = aTexCoord;

          vNormal = uNormalMatrix * aVertexNormal;
        }`
    }, {
      'name': 'atmosphere-fragment.glsl',
      'code': `
        precision mediump float;

        uniform vec3 uLightDirection;
        varying vec3 vNormal;
        varying float vDist;

        void main () {
          float sunAmount = max(dot(vNormal, uLightDirection), 0.1);
          float darkAmount = max(dot(vNormal, -uLightDirection), 0.0);
          float r = 1.0 - sunAmount;
          float g = max(1.0 - sunAmount, 0.8) - darkAmount;
          float b = max(sunAmount, 0.8) - darkAmount;
          float a1 = min(sunAmount, 0.8) * 2.0;
          float a2 = min(pow(darkAmount \/ 1.15, 2.0),0.2);
          float a3 = pow(vDist,2.0) * -1.0 + 1.0;
          float a = min(a1 - a2, a3);
          gl_FragColor    = vec4(vec3(r,g,b), a);
        }
      `
    }, {
      'name': 'atmosphere-vertex.glsl',
      'code': `
        attribute vec3 aVertexPosition;
        attribute vec3 aVertexNormal;

        uniform mat4 uPMatrix;
        uniform mat4 uCamMatrix;
        uniform mat4 uMvMatrix;
        uniform mat3 uNormalMatrix;

        varying vec3 vNormal;
        varying float vDist;

        void main(void) {
          vec4 position1 = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
          vec4 position0 = uCamMatrix * uMvMatrix * vec4(vec3(0.0,0.0,0.0), 1.0);
          gl_Position = uPMatrix * position1;
          vDist = distance(position0.xz,position1.xz) \/ ${settingsManager.atmosphereSize}.0;
          vNormal = normalize( uNormalMatrix * aVertexNormal );
        }
      `
    }, {
      'name': 'dot-fragment.glsl',
      'code': `
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
    `
    }, {
      'name': 'dot-vertex-var.glsl',
      'code': `
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
      `
    }, {
      'name': 'dot-vertex-sun.glsl',
      'code': 'attribute vec3 aPos;\nattribute vec4 aColor;\n\nuniform mat4 uCamMatrix;\nuniform mat4 uMvMatrix;\nuniform mat4 uPMatrix;\n\nvarying vec4 vColor;\n\nvoid main(void) {\n \/\/ gl_PointSize = 16.0;\n  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);\n  gl_PointSize = min(max(320000.0 \/ position.w, 7.5), 12.0) * 1.0;\n  gl_Position = position;\n  vColor = aColor;\n}\n'
    }, {
      'name': 'pick-fragment.glsl',
      'code': 'precision mediump float;\n\nvarying vec3 vColor;\n\nvoid main(void) {\n  gl_FragColor = vec4(vColor, 1.0);\n}'
    }, {
      'name': 'pick-vertex.glsl',
      'code': 'attribute vec3 aPos;\nattribute vec3 aColor;\nattribute float aPickable;\n\nuniform mat4 uCamMatrix;\nuniform mat4 uMvMatrix;\nuniform mat4 uPMatrix;\n\nvarying vec3 vColor;\n\nvoid main(void) {\n  float dotSize = 16.0;\n  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);\n  gl_Position = position;\n  gl_PointSize = dotSize * aPickable;\n  vColor = aColor * aPickable;\n}'
    }, {
      'name': 'path-fragment.glsl',
      'code': 'precision mediump float;\n\nvarying vec4 vColor;\n\nvoid main(void) {\n  gl_FragColor = vColor;\n}'
    }, {
      'name': 'path-vertex.glsl',
      'code': 'attribute vec3 aPos;\n\nuniform mat4 uCamMatrix;\nuniform mat4 uMvMatrix;\nuniform mat4 uPMatrix;\nuniform vec4 uColor;\n\nvarying vec4 vColor;\n\nvoid main(void) {\n  vec4 position = uPMatrix * uCamMatrix *  uMvMatrix * vec4(aPos, 1.0);\n  gl_Position = position;\n  vColor = uColor;\n}\n'
    }];

  shaderLoader.shaderDataLen = shaderLoader.shaderData.length;


  var i = 0;
  shaderLoader.getShaderCode = function (name) {
    for (i = 0; i < shaderLoader.shaderDataLen; i++) {
      if (shaderLoader.shaderData[i].name === name) {
        return shaderLoader.shaderData[i].code;
      }
    }
    return null;
  };

  window.shaderLoader = shaderLoader;
})();
