(function () {
    if (window.ArcgisInstanced) return;

    function createExternalRenderer(view, options) {
        const DEBUG = (typeof location !== 'undefined' && (location.search || '').includes('debug=1'));
        const state = {
            view: view,
            gl: null,
            renderer: null,
            disposed: false,
            count: 0,
            epochMs: 0,
            // stash updates that arrive before setup()
            lastPosBuf: null,
            lastVelBuf: null,
            lastCount: 0,
            hasStash: false,
            // store last known matrices for picking
            lastViewMatrix: null,
            lastProjectionMatrix: null
        };

        const api = {
            updatePositions: function (buffer, count) { // legacy path
                try {
                    if ((state.disposed || !state.renderer) && buffer instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.lastPosBuf = buffer;
                        state.lastVelBuf = new ArrayBuffer(0);
                        state.lastCount = state.count;
                        state.hasStash = true;
                        return;
                    }
                    if (state.renderer && buffer instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.renderer.updatePV(buffer, new ArrayBuffer(0), state.count); // vel=0
                        try { require(['esri/views/3d/externalRenderers'], function (externalRenderers) { externalRenderers.requestRender(view); }); } catch (e) { }
                    } else if (buffer instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.lastPosBuf = buffer;
                        state.lastVelBuf = new ArrayBuffer(0);
                        state.lastCount = state.count;
                        state.hasStash = true;
                    }
                } catch (e) { if (DEBUG) console.error('updatePositions failed', e); }
            },
            updatePV: function (posBuf, velBuf, count, epochMs) {
                try {
                    if ((state.disposed || !state.renderer) && posBuf instanceof ArrayBuffer && velBuf instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.epochMs = epochMs || 0;
                        state.lastPosBuf = posBuf;
                        state.lastVelBuf = velBuf;
                        state.lastCount = state.count;
                        state.hasStash = true;
                        return;
                    }
                    if (state.renderer && posBuf instanceof ArrayBuffer && velBuf instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.epochMs = epochMs || 0;
                        state.renderer.updatePV(posBuf, velBuf, state.count);
                        try { require(['esri/views/3d/externalRenderers'], function (externalRenderers) { externalRenderers.requestRender(view); }); } catch (e) { }
                    } else if (posBuf instanceof ArrayBuffer && velBuf instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.epochMs = epochMs || 0;
                        state.lastPosBuf = posBuf;
                        state.lastVelBuf = velBuf;
                        state.lastCount = state.count;
                        state.hasStash = true;
                    }
                } catch (e) { if (DEBUG) console.error('updatePV failed', e); }
            },
            pick: function (mouseX, mouseY) {
                if (!state.renderer || state.disposed) {
                    return -1;
                }
                try {
                    // Use stored matrices from last render
                    if (!state.lastViewMatrix || !state.lastProjectionMatrix) {
                        return -1;
                    }

                    const params = {
                        viewMatrix: state.lastViewMatrix,
                        projectionMatrix: state.lastProjectionMatrix,
                        mouseX: mouseX,
                        mouseY: mouseY,
                        viewportWidth: state.view.width || state.view.container.clientWidth || 800,
                        viewportHeight: state.view.height || state.view.container.clientHeight || 600
                    };
                    return state.renderer.pick(params);
                } catch (e) {
                    console.error('pick failed', e);
                    return -1;
                }
            },
            setSelectedId: function (id) {
                if (state.renderer && state.renderer.setSelectedId) {
                    state.renderer.setSelectedId(id);
                    try { require(['esri/views/3d/externalRenderers'], function (externalRenderers) { externalRenderers.requestRender(view); }); } catch (e) { }
                }
            },
            dispose: function () { state.disposed = true; try { state.renderer && state.renderer.dispose && state.renderer.dispose(); } catch (e) { } }
        };

        try {
            require([
                'esri/views/3d/externalRenderers'
            ], function (externalRenderers) {
                const er = {
                    setup: function (context) {
                        state.gl = context.gl;
                        try {
                            state.renderer = window.ArcgisInstancedRenderer && window.ArcgisInstancedRenderer.create(state.gl, options || {});
                            state.disposed = false;
                            if (state.renderer && state.hasStash && state.lastPosBuf) {
                                state.renderer.updatePV(state.lastPosBuf, state.lastVelBuf || new ArrayBuffer(0), state.lastCount);
                                try { require(['esri/views/3d/externalRenderers'], function (externalRenderers) { externalRenderers.requestRender(view); }); } catch (e) { }
                                state.hasStash = false;
                            }
                        } catch (e) { if (DEBUG) console.error('[instanced] setup failed', e); }
                    },
                    render: function (context) {
                        if (!state.renderer) return;
                        try {
                            const cam = context.camera;
                            // Calculate camera ECEF position for distance-based sizing
                            const cameraECEF = cam.position ? [cam.position.x, cam.position.y, cam.position.z] : [0, 0, 0];

                            // Store matrices for picking
                            state.lastViewMatrix = cam.viewMatrix;
                            state.lastProjectionMatrix = cam.projectionMatrix;

                            const params = {
                                viewMatrix: cam.viewMatrix,
                                projectionMatrix: cam.projectionMatrix,
                                worldFromEcef: context.spatialReference ? context.spatialReference.worldMatrix : null,
                                cameraECEF: cameraECEF,
                                nowMs: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
                                epochMs: state.epochMs
                            };
                            state.renderer.draw(params, state.count);
                        } catch (e) { console.log('draw failed: ', e) }
                    },
                    dispose: function () { api.dispose(); }
                };
                externalRenderers.add(view, er);
            });
        } catch (e) { }

        return api;
    }

    window.ArcgisInstanced = {
        create: createExternalRenderer
    };
})(); 