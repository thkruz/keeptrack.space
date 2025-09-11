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
    uniform float uPointSize;
    uniform vec3 uCameraECEF;
    // WGS84 constants (approx) and spherical radius for occlusion
    const float a = 6378137.0; // equatorial radius in meters
    const float e2 = 6.69437999014e-3; // eccentricity squared
    const float R = 6371000.0; // spherical radius for occlusion test
    
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

    bool occludedByEarth(vec3 cam, vec3 p){
        vec3 v = p - cam;
        float A = dot(v, v);
        float B = 2.0 * dot(cam, v);
        float C = dot(cam, cam) - R*R;
        float D = B*B - 4.0*A*C;
        if (D < 0.0) return false;
        float sqrtD = sqrt(max(D, 0.0));
        float inv2A = 0.5 / A;
        float t0 = (-B - sqrtD) * inv2A;
        float t1 = (-B + sqrtD) * inv2A;
        return (t0 > 0.0 && t0 < 1.0) || (t1 > 0.0 && t1 < 1.0);
    }

    void main(){
        vec3 ecef = wgs84ToECEF(aLonLatH.x, aLonLatH.y, aLonLatH.z);
        if (occludedByEarth(uCameraECEF, ecef)) { gl_Position = vec4(0.0); gl_PointSize = 0.0; return; }
        gl_Position = uProj * uView * vec4(ecef, 1.0);
        gl_PointSize = uPointSize;
    }`;

    const FS = `#version 300 es
    precision mediump float;
    out vec4 outColor;
    void main(){
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(c, c);
        if (r2 > 1.0) discard;
        float alpha = smoothstep(1.0, 0.8, 1.0 - r2);
        outColor = vec4(1.0, 0.8, 0.1, alpha);
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
        const isWebGL2 = !!gl.texStorage2D;
        if (!isWebGL2) { console.warn('Instanced renderer requires WebGL2.'); }

        const program = createProgram(gl, VS, FS);
        if (!program) return { updatePositions: function () { }, draw: function () { }, dispose: function () { } };

        const uViewLoc = gl.getUniformLocation(program, 'uView');
        const uProjLoc = gl.getUniformLocation(program, 'uProj');
        const uPointSizeLoc = gl.getUniformLocation(program, 'uPointSize');
        const uCameraLoc = gl.getUniformLocation(program, 'uCameraECEF');

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0]), gl.STATIC_DRAW);

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
            pointSize: (options && options.pointSize) || 4.0,
            disposed: false,
            frontBuffer: null,
            backBuffer: null,
            packedBuffer: null
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
                    // ECEF conversion on CPU for culling; matches shader math
                    const latR = lat * Math.PI / 180.0; const lonR = lon * Math.PI / 180.0;
                    const s = Math.sin(latR); const N = 6378137.0 / Math.sqrt(1.0 - 6.69437999014e-3 * s * s);
                    const cosLat = Math.cos(latR); const cosLon = Math.cos(lonR); const sinLon = Math.sin(lonR);
                    const x = (N + h) * cosLat * cosLon; const y = (N + h) * cosLat * sinLon; const z = (N * (1.0 - 6.69437999014e-3) + h) * s;
                    const v = mulMat4Vec4(mvp, x, y, z, 1.0);
                    const w = v[3]; if (w <= 0.0) continue;
                    const nx = v[0] / w, ny = v[1] / w, nz = v[2] / w;
                    if (nx < -1.1 || nx > 1.1 || ny < -1.1 || ny > 1.1 || nz < -1.1 || nz > 1.1) continue;
                    dst[write++] = lon; dst[write++] = lat; dst[write++] = h;
                }
            } else {
                // No matrices: upload all
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

            if (state.visibleCount <= 0) return;

            gl.useProgram(state.program);
            gl.bindVertexArray(state.vao);

            if (params && params.viewMatrix && params.projectionMatrix) {
                gl.uniformMatrix4fv(uViewLoc, false, params.viewMatrix);
                gl.uniformMatrix4fv(uProjLoc, false, params.projectionMatrix);
            }
            if (params && params.cameraPosition && params.cameraPosition.length === 3) {
                gl.uniform3fv(uCameraLoc, new Float32Array(params.cameraPosition));
            }
            gl.uniform1f(uPointSizeLoc, state.pointSize);

            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.enable(gl.BLEND);
            gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

            gl.drawArraysInstanced(gl.POINTS, 0, 1, state.visibleCount);

            gl.bindVertexArray(null);
        }

        function dispose() {
            state.disposed = true;
            try { gl.deleteBuffer(state.instanceBuffer); } catch (e) { }
            try { gl.deleteBuffer(vbo); } catch (e) { }
            try { gl.deleteVertexArray(vao); } catch (e) { }
            try { gl.deleteProgram(program); } catch (e) { }
        }

        return {
            updatePositions: updatePositions,
            draw: draw,
            dispose: dispose
        };
    }

    window.ArcgisInstancedRenderer = { create: create, __v: 3 };
})(); 