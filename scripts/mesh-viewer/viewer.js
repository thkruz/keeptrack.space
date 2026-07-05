/**
 * KeepTrack mesh viewer client.
 *
 * Replicates the engine's mesh pipeline exactly so what you see here predicts
 * what renders in the app:
 * - webgl-obj-loader with the engine's Layout order (POSITION, NORMAL,
 *   AMBIENT, DIFFUSE, UV, SPECULAR, SPECULAR_EXPONENT)
 * - positions scaled x0.05 at load (file units to world km)
 * - Uint32 indices when buffer vertices exceed 65535
 * - the exact mesh-renderer.ts shaders, including vertex-only log depth with
 *   DepthManager's constant, LEQUAL depth, no back-face culling
 */
/* global OBJ, glMatrix */
(() => {
  const { mat3, mat4 } = glMatrix;

  // DepthManager.SATELLITE_FAR = 3e10; LOG_DEPTH_FC = 2 / log2(far + 1)
  const LOG_DEPTH_BUF_FC = 2.0 / Math.log2(3e10 + 1.0);
  // settingsManager.nearZoomLevel: the engine skips mesh drawing beyond this
  const NEAR_ZOOM_LEVEL_KM = 25;
  const FILE_UNIT_TO_KM = 0.05;

  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });

  if (!gl) {
    document.getElementById('error').textContent = 'WebGL2 not available';
    document.getElementById('error').style.display = 'block';

    return;
  }

  // Engine depth setup (DepthManager.setupDepth)
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearDepth(1.0);
  gl.depthMask(true);

  const LOG_DEPTH_GLSL = `
      if (logDepthBufFC > 0.0) {
        float w = clamp(gl_Position.w, 1e-9, 1e20);
        gl_Position.z = (log2(1.0 + w) * logDepthBufFC - 1.0) * w;
      }
  `;

  // Per-fragment logarithmic depth (DepthManager.getLogDepthFragCode). Makes log depth exact
  // across large triangles so sparsely tessellated surfaces no longer z-fight. Requires highp.
  const LOG_DEPTH_FRAG_GLSL = `
      if (logDepthBufFC > 0.0) {
        float wFrag = max(1.0 / gl_FragCoord.w, 1e-9);
        gl_FragDepth = log2(1.0 + wFrag) * logDepthBufFC * 0.5;
      } else {
        gl_FragDepth = gl_FragCoord.z;
      }
  `;

  // Exact copy of mesh-renderer.ts shaders
  const MESH_VERT = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    in vec3 aSpecular;
    in float aSpecularExponent;
    in vec3 aAmbient;
    in vec3 aDiffuse;
    in vec2 aTextureCoord;

    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform vec3 uLightDirection;
    uniform float uInSun;
    uniform float logDepthBufFC;

    out vec2 vTextureCoord;
    out vec3 vTransformedNormal;
    out vec4 vPosition;
    out vec3 vLightDirection;
    out float vInSun;

    out vec3 vAmbient;
    out vec3 vDiffuse;
    out vec3 vSpecular;
    out float vSpecularExponent;

    void main(void) {
      vLightDirection = uLightDirection;
      vAmbient = aAmbient;
      vDiffuse = aDiffuse;
      vSpecular = aSpecular;
      vSpecularExponent = aSpecularExponent;
      vInSun = uInSun;

      vPosition = uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
      gl_Position = uPMatrix * vPosition;
      vTextureCoord = aTextureCoord;
      vTransformedNormal  = uNormalMatrix * aVertexNormal;
      ${LOG_DEPTH_GLSL}
    }
  `;

  const MESH_FRAG = `#version 300 es
    precision highp float;

    in vec3 vLightDirection;
    in float vInSun;
    in vec3 vTransformedNormal;
    in vec2 vTextureCoord;
    in vec4 vPosition;
    in vec3 vAmbient;
    in vec3 vDiffuse;
    in vec3 vSpecular;
    in float vSpecularExponent;

    uniform float logDepthBufFC;

    out vec4 fragColor;

    void main(void) {
      float lightAmt = max(dot(vTransformedNormal, vLightDirection), 0.0);

      vec3 ambientColor = vDiffuse * 0.1;
      vec3 dirColor = vDiffuse * vAmbient * lightAmt * (min(vInSun,1.0) * 0.65);
      vec3 specColor = vSpecular * lightAmt * (min(vInSun,1.0) * 0.65);

      vec3 color = ambientColor + dirColor + specColor;

      fragColor = vec4(color, 1.0);
      ${LOG_DEPTH_FRAG_GLSL}
    }
  `;

  const NORMALS_VERT = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aVertexNormal;
    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform mat3 uNormalMatrix;
    uniform float logDepthBufFC;
    out vec3 vNormal;
    void main(void) {
      gl_Position = uPMatrix * uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
      vNormal = uNormalMatrix * aVertexNormal;
      ${LOG_DEPTH_GLSL}
    }
  `;

  const NORMALS_FRAG = `#version 300 es
    precision highp float;
    uniform float logDepthBufFC;
    in vec3 vNormal;
    out vec4 fragColor;
    void main(void) {
      fragColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);
      ${LOG_DEPTH_FRAG_GLSL}
    }
  `;

  const FLAT_VERT = `#version 300 es
    in vec3 aVertexPosition;
    in vec3 aColor;
    uniform mat4 uPMatrix;
    uniform mat4 uCamMatrix;
    uniform mat4 uMvMatrix;
    uniform float logDepthBufFC;
    out vec3 vColor;
    void main(void) {
      gl_Position = uPMatrix * uCamMatrix * uMvMatrix * vec4(aVertexPosition, 1.0);
      vColor = aColor;
      ${LOG_DEPTH_GLSL}
    }
  `;

  const FLAT_FRAG = `#version 300 es
    precision highp float;
    uniform float logDepthBufFC;
    in vec3 vColor;
    out vec4 fragColor;
    void main(void) {
      fragColor = vec4(vColor, 1.0);
      ${LOG_DEPTH_FRAG_GLSL}
    }
  `;

  const compileProgram = (vertSrc, fragSrc) => {
    const make = (type, src) => {
      const shader = gl.createShader(type);

      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }

      return shader;
    };
    const program = gl.createProgram();

    gl.attachShader(program, make(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(program, make(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }

    return program;
  };

  const meshProgram = compileProgram(MESH_VERT, MESH_FRAG);
  const normalsProgram = compileProgram(NORMALS_VERT, NORMALS_FRAG);
  const flatProgram = compileProgram(FLAT_VERT, FLAT_FRAG);

  // Same attribute-name to layout-key map as mesh-renderer.ts
  const meshAttribs = {
    aVertexPosition: OBJ.Layout.POSITION.key,
    aVertexNormal: OBJ.Layout.NORMAL.key,
    aTextureCoord: OBJ.Layout.UV.key,
    aAmbient: OBJ.Layout.AMBIENT.key,
    aDiffuse: OBJ.Layout.DIFFUSE.key,
    aSpecular: OBJ.Layout.SPECULAR.key,
    aSpecularExponent: OBJ.Layout.SPECULAR_EXPONENT.key,
  };

  const state = {
    meshes: [],
    filtered: [],
    currentName: null,
    model: null,
    mode: 'keeptrack',
    showAxes: true,
    sunAz: 45,
    sunEl: 30,
    inSun: 1,
    loadToken: 0,
    cam: { yaw: 0.7, pitch: 0.4, dist: 1, panX: 0, panY: 0, defaultDist: 1 },
  };

  /**
   * Build GPU buffers exactly like the engine's OBJLoader.parseOBJ.
   */
  const buildModel = (meshName, mesh) => {
    const layout = new OBJ.Layout(
      OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.UV, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT,
    );
    const vertexData = mesh.makeBufferData(layout);
    const positionAttr = layout.attributeMap[OBJ.Layout.POSITION.key];
    // Same as the engine: view over the shared ArrayBuffer, scale in place
    const vertexArray = vertexData instanceof ArrayBuffer ? new Float32Array(vertexData) : vertexData;
    const floatsPerVertex = layout.stride / 4;
    const posOffset = positionAttr.offset / 4;

    for (let i = 0; i < vertexArray.length; i += floatsPerVertex) {
      vertexArray[i + posOffset + 0] *= FILE_UNIT_TO_KM;
      vertexArray[i + posOffset + 1] *= FILE_UNIT_TO_KM;
      vertexArray[i + posOffset + 2] *= FILE_UNIT_TO_KM;
    }

    const vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    const numItems = vertexData.numItems;

    // Raw indices in the engine's material order (also feeds the wireframe)
    const materialIndicesValues = Object.values(mesh.materialIndices);
    const rawIndices = materialIndicesValues.flatMap((mtlIdx) => mesh.indicesPerMaterial[mtlIdx]);
    const useUint32 = numItems > 65535;
    const indexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, useUint32 ? new Uint32Array(rawIndices) : new Uint16Array(rawIndices), gl.STATIC_DRAW);

    // Wireframe: deduped edge list from the triangle indices
    const edgeSet = new Set();
    const edges = [];

    for (let i = 0; i + 2 < rawIndices.length; i += 3) {
      const tri = [rawIndices[i], rawIndices[i + 1], rawIndices[i + 2]];

      for (let e = 0; e < 3; e++) {
        const a = tri[e];
        const b = tri[(e + 1) % 3];
        const key = a < b ? `${a},${b}` : `${b},${a}`;

        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push(a, b);
        }
      }
    }
    const edgeBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, edgeBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(edges), gl.STATIC_DRAW);

    // Bounding box in file units, from the raw OBJ vertex list
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (let i = 0; i + 2 < mesh.vertices.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) {
        const value = mesh.vertices[i + axis];

        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
      }
    }

    return {
      name: meshName,
      mesh,
      layout,
      vertexBuffer,
      indexBuffer,
      indexCount: rawIndices.length,
      useUint32,
      edgeBuffer,
      edgeCount: edges.length,
      vertexCount: numItems,
      bboxMin: min,
      bboxMax: max,
    };
  };

  const disposeModel = (model) => {
    if (!model) {
      return;
    }
    gl.deleteBuffer(model.vertexBuffer);
    gl.deleteBuffer(model.indexBuffer);
    gl.deleteBuffer(model.edgeBuffer);
  };

  // ---------------------------------------------------------------- axes ---
  const axesBuffer = gl.createBuffer();
  let axesVertexCount = 0;
  let axesLength = 1;

  const AXIS_DEFS = [
    { dir: [0, 1, 0], color: [0.25, 0.85, 0.35], label: '+Y zenith' },
    { dir: [0, -1, 0], color: [0.15, 0.45, 0.2], label: '-Y nadir' },
    { dir: [0, 0, -1], color: [0.95, 0.45, 0.3], label: '-Z velocity' },
    { dir: [0, 0, 1], color: [0.5, 0.25, 0.18], label: '+Z anti-velocity' },
    { dir: [1, 0, 0], color: [0.35, 0.55, 0.95], label: '+X cross-track' },
  ];

  const axisLabels = AXIS_DEFS.map((def) => {
    const el = document.createElement('div');

    el.className = 'axis-label';
    el.textContent = def.label;
    el.style.color = `rgb(${def.color.map((c) => Math.round(Math.min(1, c + 0.25) * 255)).join(',')})`;
    document.getElementById('main').appendChild(el);

    return el;
  });

  const rebuildAxes = (model) => {
    const extent = Math.max(
      model.bboxMax[0] - model.bboxMin[0],
      model.bboxMax[1] - model.bboxMin[1],
      model.bboxMax[2] - model.bboxMin[2],
    ) * FILE_UNIT_TO_KM;

    axesLength = Math.max(extent * 0.85, 0.02);
    const verts = [];

    for (const def of AXIS_DEFS) {
      verts.push(0, 0, 0, ...def.color, def.dir[0] * axesLength, def.dir[1] * axesLength, def.dir[2] * axesLength, ...def.color);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    axesVertexCount = verts.length / 6;
  };

  // ------------------------------------------------------------- shading ---
  const sunDirection = () => {
    const az = state.sunAz * Math.PI / 180;
    const el = state.sunEl * Math.PI / 180;

    return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  };

  const identityMv = mat4.create();
  const identityNormal = mat3.create();
  const pMatrix = mat4.create();
  const camMatrix = mat4.create();

  const updateCamera = () => {
    const { yaw, pitch, dist, panX, panY } = state.cam;
    const eye = [
      panX + dist * Math.cos(pitch) * Math.sin(yaw),
      panY + dist * Math.sin(pitch),
      dist * Math.cos(pitch) * Math.cos(yaw),
    ];

    mat4.lookAt(camMatrix, eye, [panX, panY, 0], [0, 1, 0]);
    mat4.perspective(pMatrix, 45 * Math.PI / 180, canvas.width / Math.max(1, canvas.height), 0.001, 1e6);
  };

  const setAttribPointers = (program, model, names) => {
    for (const attrName of names) {
      const loc = gl.getAttribLocation(program, attrName);

      if (loc === -1) {
        continue;
      }
      const attr = model.layout.attributeMap[meshAttribs[attrName]];

      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, attr.size, gl[attr.type], attr.normalized, attr.stride, attr.offset);
    }
  };

  const disableAttribs = (program, names) => {
    for (const attrName of names) {
      const loc = gl.getAttribLocation(program, attrName);

      if (loc !== -1) {
        gl.disableVertexAttribArray(loc);
      }
    }
  };

  const drawModel = () => {
    const model = state.model;

    if (!model) {
      return;
    }

    const indexType = model.useUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

    if (state.mode === 'keeptrack') {
      const names = Object.keys(meshAttribs);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(meshProgram);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProgram, 'uPMatrix'), false, pMatrix);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProgram, 'uCamMatrix'), false, camMatrix);
      gl.uniformMatrix4fv(gl.getUniformLocation(meshProgram, 'uMvMatrix'), false, identityMv);
      gl.uniformMatrix3fv(gl.getUniformLocation(meshProgram, 'uNormalMatrix'), false, identityNormal);
      gl.uniform3fv(gl.getUniformLocation(meshProgram, 'uLightDirection'), sunDirection());
      gl.uniform1f(gl.getUniformLocation(meshProgram, 'uInSun'), state.inSun);
      gl.uniform1f(gl.getUniformLocation(meshProgram, 'logDepthBufFC'), LOG_DEPTH_BUF_FC);
      gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
      setAttribPointers(meshProgram, model, names);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
      gl.drawElements(gl.TRIANGLES, model.indexCount, indexType, 0);
      disableAttribs(meshProgram, names);
      gl.disable(gl.BLEND);
    } else if (state.mode === 'normals') {
      const names = ['aVertexPosition', 'aVertexNormal'];

      gl.useProgram(normalsProgram);
      gl.uniformMatrix4fv(gl.getUniformLocation(normalsProgram, 'uPMatrix'), false, pMatrix);
      gl.uniformMatrix4fv(gl.getUniformLocation(normalsProgram, 'uCamMatrix'), false, camMatrix);
      gl.uniformMatrix4fv(gl.getUniformLocation(normalsProgram, 'uMvMatrix'), false, identityMv);
      gl.uniformMatrix3fv(gl.getUniformLocation(normalsProgram, 'uNormalMatrix'), false, identityNormal);
      gl.uniform1f(gl.getUniformLocation(normalsProgram, 'logDepthBufFC'), LOG_DEPTH_BUF_FC);
      gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
      setAttribPointers(normalsProgram, model, names);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
      gl.drawElements(gl.TRIANGLES, model.indexCount, indexType, 0);
      disableAttribs(normalsProgram, names);
    } else {
      // wireframe
      gl.useProgram(flatProgram);
      gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uPMatrix'), false, pMatrix);
      gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uCamMatrix'), false, camMatrix);
      gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uMvMatrix'), false, identityMv);
      gl.uniform1f(gl.getUniformLocation(flatProgram, 'logDepthBufFC'), LOG_DEPTH_BUF_FC);
      gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
      const posLoc = gl.getAttribLocation(flatProgram, 'aVertexPosition');
      const posAttr = model.layout.attributeMap[OBJ.Layout.POSITION.key];

      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, posAttr.size, gl[posAttr.type], posAttr.normalized, posAttr.stride, posAttr.offset);
      const colorLoc = gl.getAttribLocation(flatProgram, 'aColor');

      gl.disableVertexAttribArray(colorLoc);
      gl.vertexAttrib3f(colorLoc, 0.2, 0.9, 0.6);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.edgeBuffer);
      gl.drawElements(gl.LINES, model.edgeCount, gl.UNSIGNED_INT, 0);
      gl.disableVertexAttribArray(posLoc);
    }
  };

  const drawAxes = () => {
    if (!state.showAxes || !state.model) {
      for (const el of axisLabels) {
        el.style.display = 'none';
      }

      return;
    }
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(flatProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uPMatrix'), false, pMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uCamMatrix'), false, camMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(flatProgram, 'uMvMatrix'), false, identityMv);
    gl.uniform1f(gl.getUniformLocation(flatProgram, 'logDepthBufFC'), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, axesBuffer);
    const posLoc = gl.getAttribLocation(flatProgram, 'aVertexPosition');
    const colorLoc = gl.getAttribLocation(flatProgram, 'aColor');

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.LINES, 0, axesVertexCount);
    gl.disableVertexAttribArray(posLoc);
    gl.disableVertexAttribArray(colorLoc);
    gl.enable(gl.DEPTH_TEST);

    // Project the axis tips to screen space for the HTML labels
    const mvp = mat4.create();

    mat4.multiply(mvp, pMatrix, camMatrix);
    AXIS_DEFS.forEach((def, i) => {
      const tip = [def.dir[0] * axesLength * 1.08, def.dir[1] * axesLength * 1.08, def.dir[2] * axesLength * 1.08, 1];
      const clip = [0, 0, 0, 0];

      for (let row = 0; row < 4; row++) {
        clip[row] = mvp[row] * tip[0] + mvp[4 + row] * tip[1] + mvp[8 + row] * tip[2] + mvp[12 + row] * tip[3];
      }
      const el = axisLabels[i];

      if (clip[3] <= 0) {
        el.style.display = 'none';

        return;
      }
      const x = (clip[0] / clip[3] * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-clip[1] / clip[3] * 0.5 + 0.5) * canvas.clientHeight;

      el.style.display = 'block';
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    });
  };

  const renderFrame = () => {
    const dpr = globalThis.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    updateCamera();
    drawModel();
    drawAxes();
  };

  const render = () => {
    renderFrame();
    requestAnimationFrame(render);
  };

  // Debug hook for automated testing (harmless in normal use)
  globalThis.__viewerDebug = { gl, state, renderFrame };

  // ------------------------------------------------------------------ UI ---
  const fmt = (n, digits = 2) => Number(n).toFixed(digits);

  const updateInfoPanel = (model) => {
    const dims = model.bboxMax.map((v, i) => v - model.bboxMin[i]);
    const table = document.querySelector('#info table');

    document.querySelector('#info .model-name').textContent = model.name;
    table.innerHTML = `
      <tr><td>file units</td><td>${dims.map((d) => fmt(d)).join(' x ')}</td></tr>
      <tr><td>real meters</td><td>${dims.map((d) => fmt(d * 10, 1)).join(' x ')}</td></tr>
      <tr><td>world km</td><td>${dims.map((d) => fmt(d * FILE_UNIT_TO_KM, 3)).join(' x ')}</td></tr>
      <tr><td>vertices</td><td>${model.vertexCount}</td></tr>
      <tr><td>triangles</td><td>${model.indexCount / 3}</td></tr>
    `;
  };

  const updateMaterialsPanel = (model) => {
    const rows = document.getElementById('mat-rows');
    const materials = model.mesh.materialsByIndex ?? {};
    const entries = Object.values(materials);

    if (!entries.length) {
      rows.innerHTML = '<div class="warn">no MTL materials found</div>';

      return;
    }
    rows.innerHTML = entries.map((m) => {
      const kd = m.diffuse ?? [0.8, 0.8, 0.8];
      const ka = m.ambient ?? [1, 1, 1];
      const ks = m.specular ?? [0, 0, 0];
      const rgb = kd.map((c) => Math.round(Math.min(1, c) * 255)).join(',');
      const warnings = [];

      // Playbook rules of thumb: Ka is a diffuse GAIN (0.3-1.0), Ks adds flat gray (<= 0.2)
      if (Math.max(...ka) < 0.3) {
        warnings.push('Ka < 0.3: Ka is a diffuse gain in this engine; the lit side may render darker than intended');
      }
      if (Math.max(...ks) > 0.2) {
        warnings.push('Ks > 0.2: spec is flat additive gray; big Ks washes lit faces toward gray');
      }

      return `<div class="mat">
        <span class="swatch" style="background:rgb(${rgb})"></span>
        <span class="mat-name">${m.name}</span>
        <span class="mat-vals">Ka ${fmt(Math.max(...ka))} Kd ${fmt(Math.max(...kd))} Ks ${fmt(Math.max(...ks))}</span>
        ${warnings.length ? `<span class="warn" title="${warnings.join('\n')}">&#9888;</span>` : ''}
      </div>`;
    }).join('');
  };

  const updateCamPanel = () => {
    document.getElementById('cam-dist').textContent = `cam ${fmt(state.cam.dist, 2)} km`;
    document.getElementById('cam-warn').textContent =
      state.cam.dist >= NEAR_ZOOM_LEVEL_KM ? `beyond nearZoomLevel (${NEAR_ZOOM_LEVEL_KM} km): engine hides the mesh here` : '';
  };

  const showError = (msg) => {
    const el = document.getElementById('error');

    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  };

  const fitCamera = (model) => {
    const extent = Math.max(
      model.bboxMax[0] - model.bboxMin[0],
      model.bboxMax[1] - model.bboxMin[1],
      model.bboxMax[2] - model.bboxMin[2],
    ) * FILE_UNIT_TO_KM;
    const dist = Math.max(extent * 2.2, 0.02);

    state.cam.dist = dist;
    state.cam.defaultDist = dist;
    state.cam.yaw = 0.7;
    state.cam.pitch = 0.4;
    state.cam.panX = 0;
    state.cam.panY = 0;
    updateCamPanel();
  };

  const loadModel = async (name, keepCamera = false) => {
    const token = ++state.loadToken;

    showError('');
    try {
      const meshMap = await OBJ.downloadModels([{
        obj: `/meshes/${name}.obj`,
        mtl: `/meshes/${name}.mtl`,
      }]);

      if (token !== state.loadToken) {
        return; // superseded by a newer selection
      }
      if (!meshMap[name]) {
        throw new Error(`model "${name}" missing from parsed result`);
      }
      disposeModel(state.model);
      state.model = buildModel(name, meshMap[name]);
      state.currentName = name;
      rebuildAxes(state.model);
      if (!keepCamera) {
        fitCamera(state.model);
      }
      updateInfoPanel(state.model);
      updateMaterialsPanel(state.model);
      history.replaceState(null, '', `#${encodeURIComponent(name)}`);
      document.querySelectorAll('#mesh-list li').forEach((li) => {
        li.classList.toggle('active', li.dataset.name === name);
      });
    } catch (err) {
      if (token === state.loadToken) {
        showError(`Failed to load ${name}: ${err.message ?? err}`);
      }
    }
  };

  const renderList = () => {
    const filter = document.getElementById('filter').value.trim().toLowerCase();

    state.filtered = state.meshes.filter((m) => m.name.toLowerCase().includes(filter));
    const list = document.getElementById('mesh-list');

    list.innerHTML = state.filtered.map((m) => {
      const active = m.name === state.currentName ? ' class="active"' : '';

      return `<li${active} data-name="${m.name}" title="${(m.size / 1024).toFixed(1)} KB">${m.name}</li>`;
    }).join('');
  };

  const refreshList = async (autoSelect = false) => {
    const res = await fetch('/api/meshes');

    state.meshes = await res.json();
    renderList();
    if (autoSelect && state.meshes.length) {
      const fromHash = decodeURIComponent(location.hash.slice(1));
      const preferred = state.meshes.find((m) => m.name === fromHash)
        ?? state.meshes.find((m) => m.name === 'rb-cyl-kerolox')
        ?? state.meshes[0];

      loadModel(preferred.name);
    }
  };

  // ---------------------------------------------------------- interaction ---
  document.getElementById('mesh-list').addEventListener('click', (evt) => {
    const li = evt.target.closest('li');

    if (li) {
      loadModel(li.dataset.name);
    }
  });

  document.getElementById('filter').addEventListener('input', renderList);

  document.addEventListener('keydown', (evt) => {
    if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') {
      return;
    }
    if (document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'text') {
      return;
    }
    evt.preventDefault();
    if (!state.filtered.length) {
      return;
    }
    const idx = state.filtered.findIndex((m) => m.name === state.currentName);
    const next = evt.key === 'ArrowDown'
      ? (idx + 1) % state.filtered.length
      : (idx - 1 + state.filtered.length) % state.filtered.length;

    loadModel(state.filtered[next].name);
    document.querySelector(`#mesh-list li[data-name="${state.filtered[next].name}"]`)?.scrollIntoView({ block: 'nearest' });
  });

  let dragging = null;

  canvas.addEventListener('mousedown', (evt) => {
    dragging = { button: evt.button, x: evt.clientX, y: evt.clientY };
    evt.preventDefault();
  });
  canvas.addEventListener('contextmenu', (evt) => evt.preventDefault());
  globalThis.addEventListener('mousemove', (evt) => {
    if (!dragging) {
      return;
    }
    const dx = evt.clientX - dragging.x;
    const dy = evt.clientY - dragging.y;

    dragging.x = evt.clientX;
    dragging.y = evt.clientY;
    if (dragging.button === 0 && !evt.shiftKey) {
      state.cam.yaw -= dx * 0.008;
      state.cam.pitch = Math.min(1.55, Math.max(-1.55, state.cam.pitch + dy * 0.008));
    } else {
      const panScale = state.cam.dist * 0.0018;

      state.cam.panX -= dx * panScale * Math.cos(state.cam.yaw);
      state.cam.panY += dy * panScale;
    }
  });
  globalThis.addEventListener('mouseup', () => {
    dragging = null;
  });
  canvas.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    state.cam.dist *= Math.exp(evt.deltaY * 0.0012);
    state.cam.dist = Math.min(100, Math.max(0.002, state.cam.dist));
    updateCamPanel();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => {
    if (state.model) {
      fitCamera(state.model);
    }
  });

  document.getElementById('mode-seg').addEventListener('click', (evt) => {
    const btn = evt.target.closest('button');

    if (!btn) {
      return;
    }
    state.mode = btn.dataset.mode;
    document.querySelectorAll('#mode-seg button').forEach((b) => b.classList.toggle('active', b === btn));
  });

  document.getElementById('sun-seg').addEventListener('click', (evt) => {
    const btn = evt.target.closest('button');

    if (!btn) {
      return;
    }
    state.inSun = Number(btn.dataset.insun);
    document.querySelectorAll('#sun-seg button').forEach((b) => b.classList.toggle('active', b === btn));
  });

  document.getElementById('sun-az').addEventListener('input', (evt) => {
    state.sunAz = Number(evt.target.value);
    document.getElementById('sun-az-val').textContent = `${state.sunAz}°`;
  });
  document.getElementById('sun-el').addEventListener('input', (evt) => {
    state.sunEl = Number(evt.target.value);
    document.getElementById('sun-el-val').textContent = `${state.sunEl}°`;
  });
  document.getElementById('axes-toggle').addEventListener('change', (evt) => {
    state.showAxes = evt.target.checked;
  });

  /*
   * Graceful WebGL context-loss handling. Headless Chromium with GPU
   * compositing can synthetically lose the first composited context; a real
   * driver reset can too. The selected mesh survives via the URL hash.
   */
  canvas.addEventListener('webglcontextlost', (evt) => {
    evt.preventDefault();
    showError('WebGL context lost, waiting for restore... (reload if this persists)');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    location.reload();
  });

  // -------------------------------------------------------- hot reload -----
  const sse = new EventSource('/api/watch');

  sse.onmessage = (evt) => {
    const { file } = JSON.parse(evt.data);
    const base = file.replace(/\.(?:obj|mtl)$/u, '');

    if (base === state.currentName) {
      loadModel(state.currentName, true);
    }
    if (file.endsWith('.obj')) {
      refreshList();
    }
  };

  // ---------------------------------------------------------------- boot ---
  refreshList(true);
  updateCamPanel();
  requestAnimationFrame(render);
})();
