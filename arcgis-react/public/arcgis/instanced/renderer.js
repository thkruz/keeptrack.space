(function () {
    if (window.ArcgisInstancedRenderer && window.ArcgisInstancedRenderer.__v === 3) return;

    function createProgram(gl, vsSource, fsSource) {
        function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; } return s; }
        const vs = sh(gl.VERTEX_SHADER, vsSource); if (!vs) return null;
        const fs = sh(gl.FRAGMENT_SHADER, fsSource); if (!fs) { gl.deleteShader(vs); return null; }
        const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); gl.deleteProgram(p); gl.deleteShader(vs); gl.deleteShader(fs); return null; }
        gl.deleteShader(vs); gl.deleteShader(fs); return p;
    }

    const VS = `#version 300 es
    layout(location=0) in vec3 aLonLatH; // degrees, degrees, meters
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uBaseSize;
    uniform float uMinSize;
    uniform float uMaxSize;
    uniform float uSizeD0;
    uniform vec3 uCameraECEF;
    uniform int uSelectedId;

    out float vInstanceId;
    out float vIsSelected;

    // WGS84 constants
    const float a = 6378137.0;
    const float e2 = 6.69437999014e-3;

    vec3 wgs84ToECEF(float lonDeg, float latDeg, float h){
        float lon = radians(lonDeg);
        float lat = radians(latDeg);
        float s = sin(lat);
        float N = a / sqrt(1.0 - e2 * s * s);
        float cosLat = cos(lat);
        float cosLon = cos(lon);
        float sinLon = sin(lon);
        float x = (N + h) * cosLat * cosLon;
        float y = (N + h) * cosLat * sinLon;
        float z = (N * (1.0 - e2) + h) * s;
        return vec3(x, y, z);
    }

    void main(){
        vec3 ecef = wgs84ToECEF(aLonLatH.x, aLonLatH.y, aLonLatH.z);
        gl_Position = uProj * uView * vec4(ecef, 1.0);
        
        // Pass instance ID and selection status to fragment shader
        vInstanceId = float(gl_InstanceID);
        vIsSelected = float(gl_InstanceID == uSelectedId ? 1.0 : 0.0);
        
        // Distance-based sizing with larger size for selected satellite and user-created satellites
        float dist = length(ecef - uCameraECEF);
        float size = uBaseSize * (uSizeD0 / (dist + uSizeD0));
        if (gl_InstanceID == uSelectedId) {
            size *= 2.0; // Make selected satellite twice as big
        } else if (float(gl_InstanceID) >= 30000.0) {
            size *= 5.5; // Make user-created satellites 5.5x bigger
        }
        gl_PointSize = clamp(size, uMinSize, uMaxSize);
    }`;

    const FS = `#version 300 es
    precision mediump float;
    in float vInstanceId;
    in float vIsSelected;
    out vec4 outColor;
    void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        float alpha = smoothstep(1.0, 0.8, 1.0 - r2);
        
        // Check if this is the selected satellite
        if (vIsSelected > 0.5) {
            // Selected satellite: green and brighter
            outColor = vec4(0.2, 1.0, 0.2, alpha * 1.2);
        } else if (vInstanceId >= 30000.0) {
            // User-created satellites: bright cyan and larger
            outColor = vec4(0.0, 1.0, 1.0, alpha * 1.5);
        } else {
            // Normal satellite: yellow
            outColor = vec4(1.0, 0.8, 0.1, alpha);
        }
    }`;

    function mulMat4Vec4(m, x, y, z, w) {
        return [
            m[0] * x + m[4] * y + m[8] * z + m[12] * w,
            m[1] * x + m[5] * y + m[9] * z + m[13] * w,
            m[2] * x + m[6] * y + m[10] * z + m[14] * w,
            m[3] * x + m[7] * y + m[11] * z + m[15] * w
        ];
    }

    function mat4Multiply(out, a, b) {
        for (let i = 0; i < 4; i++) {
            const ai0 = a[i], ai1 = a[i + 4], ai2 = a[i + 8], ai3 = a[i + 12];
            out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
            out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
            out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
            out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
        }
        return out;
    }

    function create(gl, options) {
        const DEBUG = (typeof location !== 'undefined' && (location.search || '').includes('debug=1'));
        const isWebGL2 = !!gl.texStorage2D;
        if (!isWebGL2) { console.warn('Instanced renderer requires WebGL2.'); }

        const program = createProgram(gl, VS, FS);
        if (!program) return { updatePositions: function () { }, draw: function () { }, dispose: function () { } };

        const uViewLoc = gl.getUniformLocation(program, 'uView');
        const uProjLoc = gl.getUniformLocation(program, 'uProj');
        const uBaseSizeLoc = gl.getUniformLocation(program, 'uBaseSize');
        const uMinSizeLoc = gl.getUniformLocation(program, 'uMinSize');
        const uMaxSizeLoc = gl.getUniformLocation(program, 'uMaxSize');
        const uSizeD0Loc = gl.getUniformLocation(program, 'uSizeD0');
        const uCameraECEFLoc = gl.getUniformLocation(program, 'uCameraECEF');
        const uSelectedIdLoc = gl.getUniformLocation(program, 'uSelectedId');

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Dummy vbo for base primitive
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0]), gl.STATIC_DRAW);

        // Per-instance buffer: lon/lat/h at location 0
        const instanceBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
        gl.vertexAttribDivisor(0, 1);

        gl.bindVertexArray(null);

        const state = {
            gl: gl,
            program: program,
            vao: vao,
            instanceBuffer: instanceBuffer,
            count: 0,
            visibleCount: 0,
            baseSize: (options && options.baseSize) || 9.0,
            minSize: (options && options.minSize) || 2.5,
            maxSize: (options && options.maxSize) || 14.0,
            sizeD0: (options && options.sizeD0) || 7.0e6,
            selectedId: -1, // -1 means no selection
            disposed: false,
            frontBuffer: null,
            backBuffer: null,
            packedBuffer: null,
        };

        function ensureCapacity(n) {
            const bytes = n * 3 * 4;
            if (!state.frontBuffer || state.frontBuffer.byteLength !== bytes) { state.frontBuffer = new ArrayBuffer(bytes); }
            if (!state.backBuffer || state.backBuffer.byteLength !== bytes) { state.backBuffer = new ArrayBuffer(bytes); }
            if (!state.packedBuffer || state.packedBuffer.byteLength < bytes) { state.packedBuffer = new ArrayBuffer(bytes); }
        }

        function updatePositions(buffer, count) {
            if (state.disposed) return;
            try {
                const n = count | 0; if (n <= 0) { state.count = 0; return; }
                ensureCapacity(n);
                if ((buffer instanceof ArrayBuffer) && buffer.byteLength === state.backBuffer.byteLength) {
                    state.backBuffer = buffer;
                } else {
                    const src = new Float32Array(buffer);
                    const dst = new Float32Array(state.backBuffer);
                    dst.set(src);
                }
                state.count = n;
            } catch (e) { }
        }

        function updatePV(posBuf, velBuf, count) { // map PV → positions (lon/lat/h path)
            return updatePositions(posBuf, count);
        }

        function uploadIfNeeded(params) {
            if (state.count <= 0) return;
            // swap front/back
            const tmp = state.frontBuffer; state.frontBuffer = state.backBuffer; state.backBuffer = tmp;
            const src = new Float32Array(state.frontBuffer);

            // CPU frustum cull using MVP
            let mvp = null;
            if (params && params.viewMatrix && params.projectionMatrix) {
                mvp = new Float32Array(16);
                mat4Multiply(mvp, params.projectionMatrix, params.viewMatrix);
            }
            let write = 0;
            const dst = new Float32Array(state.packedBuffer);
            if (mvp) {
                for (let i = 0; i < state.count; i++) {
                    const j = i * 3;
                    const lon = src[j], lat = src[j + 1], h = src[j + 2];
                    // Convert lon/lat/h → ECEF (same as shader) for culling
                    const latR = lat * Math.PI / 180.0; const lonR = lon * Math.PI / 180.0;
                    const s = Math.sin(latR); const N = 6378137.0 / Math.sqrt(1.0 - 6.69437999014e-3 * s * s);
                    const cosLat = Math.cos(latR); const cosLon = Math.cos(lonR); const sinLon = Math.sin(lonR);
                    const x = (N + h) * cosLat * cosLon; const y = (N + h) * cosLat * sinLon; const z = (N * (1.0 - 6.69437999014e-3) + h) * s;
                    // Draw all initially: skip CPU cull until verified
                    const v = [x, y, z, 1.0];
                    const w = v[3]; if (w <= 0.0) continue;
                    const nx = v[0] / w, ny = v[1] / w, nz = v[2] / w;
                    // if (nx < -1.1 || nx > 1.1 || ny < -1.1 || ny > 1.1 || nz < -1.1 || nz > 1.1) continue;
                    dst[write++] = lon; dst[write++] = lat; dst[write++] = h;
                }
            } else {
                dst.set(src); write = src.length;
            }
            state.visibleCount = Math.floor(write / 3);

            const gl = state.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, state.instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.packedBuffer, 0, state.visibleCount * 3), gl.DYNAMIC_DRAW);
        }

        function draw(params, count) {
            if (state.disposed) return;
            const gl = state.gl;
            if (state.count <= 0) return;

            uploadIfNeeded(params);
            if (state.visibleCount <= 0) {
                return;
            };

            gl.useProgram(state.program);
            gl.bindVertexArray(state.vao);
            if (params && params.viewMatrix && params.projectionMatrix) {
                gl.uniformMatrix4fv(uViewLoc, false, params.viewMatrix);
                gl.uniformMatrix4fv(uProjLoc, false, params.projectionMatrix);
            }
            gl.uniform1f(uBaseSizeLoc, state.baseSize);
            gl.uniform1f(uMinSizeLoc, state.minSize);
            gl.uniform1f(uMaxSizeLoc, state.maxSize);
            gl.uniform1f(uSizeD0Loc, state.sizeD0);
            gl.uniform1i(uSelectedIdLoc, state.selectedId);
            if (params && params.cameraECEF) {
                gl.uniform3fv(uCameraECEFLoc, params.cameraECEF);
            }

            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArraysInstanced(gl.POINTS, 0, 1, state.visibleCount);

            gl.bindVertexArray(null);
        }

        function pick(params) {
            if (state.disposed || state.visibleCount <= 0) {
                return -1;
            }
            if (!params || !params.viewMatrix || !params.projectionMatrix ||
                typeof params.mouseX !== 'number' || typeof params.mouseY !== 'number' ||
                typeof params.viewportWidth !== 'number' || typeof params.viewportHeight !== 'number') {
                return -1;
            }

            const src = new Float32Array(state.frontBuffer);
            const dst = new Float32Array(state.packedBuffer);
            let write = 0;

            // Rebuild visible list for picking
            if (params && params.viewMatrix && params.projectionMatrix) {
                const mvp = new Float32Array(16);
                mat4Multiply(mvp, params.projectionMatrix, params.viewMatrix);

                for (let i = 0; i < state.count; i++) {
                    const j = i * 3;
                    const lon = src[j], lat = src[j + 1], h = src[j + 2];
                    // Convert lon/lat/h → ECEF for culling
                    const latR = lat * Math.PI / 180.0; const lonR = lon * Math.PI / 180.0;
                    const s = Math.sin(latR); const N = 6378137.0 / Math.sqrt(1.0 - 6.69437999014e-3 * s * s);
                    const cosLat = Math.cos(latR); const cosLon = Math.cos(lonR); const sinLon = Math.sin(lonR);
                    const x = (N + h) * cosLat * cosLon; const y = (N + h) * cosLat * sinLon; const z = (N * (1.0 - 6.69437999014e-3) + h) * s;
                    const v = [x, y, z, 1.0];
                    const w = v[3]; if (w <= 0.0) continue;
                    const nx = v[0] / w, ny = v[1] / w, nz = v[2] / w;
                    // Skip frustum culling for picking - we want all visible points
                    dst[write++] = lon; dst[write++] = lat; dst[write++] = h;
                }
            } else {
                dst.set(src); write = src.length;
            }

            const visibleCount = Math.floor(write / 3);
            if (visibleCount <= 0) return -1;

            // Convert mouse coordinates to normalized device coordinates
            const x = (2.0 * params.mouseX) / params.viewportWidth - 1.0;
            const y = 1.0 - (2.0 * params.mouseY) / params.viewportHeight;

            let closestId = -1;
            let closestDist = Infinity;
            const pickRadius = 0.02; // Adjust for sensitivity

            for (let i = 0; i < visibleCount; i++) {
                const j = i * 3;
                const lon = dst[j], lat = dst[j + 1], h = dst[j + 2];

                // Convert to ECEF and project
                const latR = lat * Math.PI / 180.0; const lonR = lon * Math.PI / 180.0;
                const s = Math.sin(latR); const N = 6378137.0 / Math.sqrt(1.0 - 6.69437999014e-3 * s * s);
                const cosLat = Math.cos(latR); const cosLon = Math.cos(lonR); const sinLon = Math.sin(lonR);
                const ecefX = (N + h) * cosLat * cosLon; const ecefY = (N + h) * cosLat * sinLon; const ecefZ = (N * (1.0 - 6.69437999014e-3) + h) * s;

                const mvp = new Float32Array(16);
                mat4Multiply(mvp, params.projectionMatrix, params.viewMatrix);
                const v = mulMat4Vec4(mvp, ecefX, ecefY, ecefZ, 1.0);
                const w = v[3]; if (w <= 0.0) continue;
                const px = v[0] / w, py = v[1] / w;

                const dist = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
                if (dist < pickRadius && dist < closestDist) {
                    closestDist = dist;
                    closestId = i; // Return visible index
                }
            }

            return closestId;
        }

        function dispose() {
            state.disposed = true;
            try { gl.deleteBuffer(state.instanceBuffer); } catch (e) { }
            try { gl.deleteBuffer(vbo); } catch (e) { }
            try { gl.deleteVertexArray(vao); } catch (e) { }
            try { gl.deleteProgram(program); } catch (e) { }
        }

        function updatePV(posBuf, _velBuf, count) {
            // Ignore velocity in this path; positions buffer is lon/lat/h
            return updatePositions(posBuf, count);
        }

        function setSelectedId(id) {
            state.selectedId = id;
        }

        return {
            updatePositions: updatePositions,
            updatePV: updatePV,
            draw: draw,
            pick: pick,
            setSelectedId: setSelectedId,
            dispose: dispose
        };
    }

    window.ArcgisInstancedRenderer = { create: create, __v: 3 };
})(); 