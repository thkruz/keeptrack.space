(function () {
    if (window.ArcgisInstancedRenderer && window.ArcgisInstancedRenderer.__v === 4) return;

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
    layout(location=1) in float aVisibility;
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform float uBaseSize;
    uniform float uMinSize;
    uniform float uMaxSize;
    uniform float uSizeD0;
    uniform vec3 uCameraECEF;
    uniform int uSelectedId;
    uniform vec3 uHighlightColor;
    uniform int uHighlightedId;
    uniform int uHideNonHighlighted;

    out float vInstanceId;
    out float vIsSelected;
    out float vIsHighlighted;
    out float vVisibility;

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
        vIsHighlighted = float(gl_InstanceID == uHighlightedId ? 1.0 : 0.0);
        vVisibility = aVisibility;
        
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
    in float vIsHighlighted;
    in float vVisibility;
    uniform vec3 uHighlightColor;
    uniform int uHideNonHighlighted;
    out vec4 outColor;
    void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        float alpha = smoothstep(1.0, 0.8, 1.0 - r2);
        
        // Hide non-visible objects when filtering is active
        if (uHideNonHighlighted == 1 && vVisibility < 0.5) {
            discard;
        }

        vec4 baseColor;
        float alphaMultiplier = 1.0;
        bool hideMode = (uHideNonHighlighted == 1);

        if (vIsSelected > 0.5) {
            // Selected satellite: green and brighter
            baseColor = vec4(0.2, 1.0, 0.2, 1.0);
            alphaMultiplier = 1.2;
        } else if (vIsHighlighted > 0.5) {
            // Highlighted satellite: use highlight color
            baseColor = vec4(uHighlightColor, 1.0);
            alphaMultiplier = 1.3;
        } else if (hideMode && vVisibility > 0.5) {
            // When filtering is active, color visible satellites with highlight color
            baseColor = vec4(uHighlightColor, 1.0);
            alphaMultiplier = 1.1;
        } else if (vInstanceId >= 30000.0) {
            // User-created satellites: bright cyan and larger
            baseColor = vec4(0.0, 1.0, 1.0, 1.0);
            alphaMultiplier = 1.5;
        } else {
            // Normal satellite: yellow
            baseColor = vec4(1.0, 0.8, 0.1, 1.0);
        }
        
        outColor = vec4(baseColor.rgb, baseColor.a * alpha * alphaMultiplier);
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
        const uHighlightedIdLoc = gl.getUniformLocation(program, 'uHighlightedId');
        const uHighlightColorLoc = gl.getUniformLocation(program, 'uHighlightColor');
        const uHideNonHighlightedLoc = gl.getUniformLocation(program, 'uHideNonHighlighted');


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

        // Per-instance visibility buffer at location 1
        const visibilityBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, visibilityBuffer);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 4, 0);
        gl.vertexAttribDivisor(1, 1);

        gl.bindVertexArray(null);

        const state = {
            gl: gl,
            program: program,
            vao: vao,
            instanceBuffer: instanceBuffer,
            visibilityBuffer: visibilityBuffer,
            count: 0,
            visibleCount: 0,
            baseSize: (options && options.baseSize) || 9.0,
            minSize: (options && options.minSize) || 2.5,
            maxSize: (options && options.maxSize) || 14.0,
            sizeD0: (options && options.sizeD0) || 7.0e6,
            selectedId: -1, // -1 means no selection
            highlightedId: -1, // -1 means no highlight
            highlightColor: [1.0, 0.5, 0.0], // Default highlight color (orange)
            hideNonHighlighted: false, // Whether to hide non-highlighted objects
            disposed: false,
            frontBuffer: null,
            backBuffer: null,
            packedBuffer: null,
            visibility: null,
            visibilityPacked: null,
            positionsECEF: null,
            velocitiesECEF: null,
            lastViewMatrix: null,
            lastProjectionMatrix: null
        };

        function ensureCapacity(n) {
            const bytes = n * 3 * 4;
            if (!state.frontBuffer || state.frontBuffer.byteLength !== bytes) { state.frontBuffer = new ArrayBuffer(bytes); }
            if (!state.backBuffer || state.backBuffer.byteLength !== bytes) { state.backBuffer = new ArrayBuffer(bytes); }
            if (!state.packedBuffer || state.packedBuffer.byteLength < bytes) { state.packedBuffer = new ArrayBuffer(bytes); }
            const visLen = Math.max(n, state.visibility ? state.visibility.length : 0);
            if (!state.visibility || state.visibility.length !== visLen) {
                const vis = new Float32Array(visLen);
                vis.fill(1);
                if (state.visibility) {
                    vis.set(state.visibility.subarray(0, Math.min(state.visibility.length, visLen)));
                }
                state.visibility = vis;
            }
            if (!state.visibilityPacked || state.visibilityPacked.length !== visLen) {
                state.visibilityPacked = new Float32Array(visLen);
            }
        }

        function updatePositions(buffer, count) {
            if (state.disposed) return;
            try {
                const n = count | 0; if (n <= 0) { state.count = 0; return; }
                ensureCapacity(n);
                const src = new Float32Array(buffer);
                const dst = new Float32Array(state.backBuffer);
                dst.set(src.subarray(0, n * 3));
                state.count = n;
            } catch (e) { }
        }

        function updatePV(posBuf, velBuf, count) { // map PV → positions (lon/lat/h path)
            if (state.disposed) {
                return;
            }
            state.positionsECEF = posBuf instanceof Float32Array ? posBuf : new Float32Array(posBuf);
            state.velocitiesECEF = velBuf instanceof Float32Array ? velBuf : new Float32Array(velBuf);
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
            const dst = new Float32Array(state.packedBuffer);
            const visSrc = state.visibility;
            const visDst = state.visibilityPacked;
            const visible = Math.min(state.count, visDst.length);
            dst.set(src.subarray(0, visible * 3));
            if (visSrc) {
                visDst.set(visSrc.subarray(0, visible));
            } else {
                visDst.fill(1, 0, visible);
            }
            state.visibleCount = visible;

            const gl = state.gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, state.instanceBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(state.packedBuffer, 0, state.visibleCount * 3), gl.DYNAMIC_DRAW);
            if (state.visibilityBuffer && state.visibilityPacked) {
                gl.bindBuffer(gl.ARRAY_BUFFER, state.visibilityBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, state.visibilityPacked.subarray(0, state.visibleCount), gl.DYNAMIC_DRAW);
            }
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
                state.lastViewMatrix = params.viewMatrix.slice ? params.viewMatrix.slice() : new Float32Array(params.viewMatrix);
                state.lastProjectionMatrix = params.projectionMatrix.slice ? params.projectionMatrix.slice() : new Float32Array(params.projectionMatrix);
            }
            gl.uniform1f(uBaseSizeLoc, state.baseSize);
            gl.uniform1f(uMinSizeLoc, state.minSize);
            gl.uniform1f(uMaxSizeLoc, state.maxSize);
            gl.uniform1f(uSizeD0Loc, state.sizeD0);
            gl.uniform1i(uSelectedIdLoc, state.selectedId || -1);
            gl.uniform1i(uHighlightedIdLoc, state.highlightedId || -1);
            gl.uniform3fv(uHighlightColorLoc, new Float32Array(state.highlightColor));
            gl.uniform1i(uHideNonHighlightedLoc, state.hideNonHighlighted ? 1 : 0);

            if (DEBUG) {
                console.log('Renderer state:', {
                    selectedId: state.selectedId,
                    highlightedId: state.highlightedId,
                    hideNonHighlighted: state.hideNonHighlighted
                });
            }

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
            const visSrc = state.visibility || state.visibilityPacked;
            const visibleCount = Math.min(state.count, visSrc.length);
            if (visibleCount <= 0) return -1;

            // Convert mouse coordinates to normalized device coordinates
            const x = (2.0 * params.mouseX) / params.viewportWidth - 1.0;
            const y = 1.0 - (2.0 * params.mouseY) / params.viewportHeight;

            let closestId = -1;
            let closestDist = Infinity;
            const pickRadius = 0.02; // Adjust for sensitivity

            for (let i = 0; i < visibleCount; i++) {
                if (visSrc[i] < 0.5) {
                    continue;
                }
                const j = i * 3;
                const lon = src[j], lat = src[j + 1], h = src[j + 2];

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
            try { gl.deleteBuffer(state.visibilityBuffer); } catch (e) { }
        }

        function updatePV(posBuf, _velBuf, count) {
            // Ignore velocity in this path; positions buffer is lon/lat/h
            return updatePositions(posBuf, count);
        }

        function setSelectedId(id) {
            state.selectedId = id;
        }

        function setHighlightedSatellite(id, color, hideOthers) {
            state.highlightedId = id !== null && id !== undefined ? id : -1;
            if (typeof hideOthers === 'boolean') {
                state.hideNonHighlighted = hideOthers && id !== null && id !== -1;
            }
            if (color) {
                state.highlightColor = color;
            }
            if (DEBUG) {
                console.log('setHighlightedSatellite:', { id, color, hideOthers, state: { highlightedId: state.highlightedId, hideNonHighlighted: state.hideNonHighlighted } });
            }
        }

        function setVisibleSatellites(ids, color) {
            if (!state.visibility || !Array.isArray(ids)) {
                return;
            }

            const vis = state.visibility;
            vis.fill(0);
            let applied = 0;
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                if (typeof id === 'number' && id >= 0 && id < vis.length) {
                    vis[id] = 1;
                    applied++;
                }
            }

            if (applied > 0) {
                state.hideNonHighlighted = true;
                if (color) {
                    state.highlightColor = color;
                }
            } else {
                resetVisibility();
            }

            if (DEBUG) {
                console.log('setVisibleSatellites:', { ids, applied, state: { hideNonHighlighted: state.hideNonHighlighted } });
            }
        }

        function getSelectedId() {
            return state.selectedId;
        }

        function setSearchBox(dimensions) {
            state.searchBoxDimensions = dimensions;
        }

        function resetVisibility() {
            if (!state.visibility) {
                return;
            }
            state.visibility.fill(1);
            state.hideNonHighlighted = false;
            if (DEBUG) {
                console.log('resetVisibility');
            }
        }

        function getPositionSnapshot() {
            const count = state.visibleCount;
            const positions = new Float32Array(count * 3);
            const velocities = new Float32Array(count * 3);

            const posSrc = new Float32Array(state.frontBuffer);

            const positionsECEF = state.positionsECEF;
            const velocitiesECEF = state.velocitiesECEF;

            let write = 0;
            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                let lon = posSrc[idx];
                let lat = posSrc[idx + 1];
                let h = posSrc[idx + 2];

                if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(h)) {
                    lon = 0;
                    lat = 0;
                    h = 0;
                }

                positions[write++] = lon;
                positions[write++] = lat;
                positions[write++] = h;
            }

            if (positionsECEF && velocitiesECEF) {
                velocities.set(velocitiesECEF.subarray(0, count * 3));
            }

            return { count, positions, velocities };
        }


        return {
            updatePositions,
            updatePV,
            draw,
            pick,
            setSelectedId,
            setHighlightedSatellite,
            setVisibleSatellites,
            resetVisibility,
            getSelectedId,
            setSearchBox,
            getPositionSnapshot,
            dispose
        };
    }

    window.ArcgisInstancedRenderer = { create: create, __v: 4 };
})(); 