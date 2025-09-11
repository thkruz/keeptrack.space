(function () {
    if (window.ArcgisInstanced) return;

    function createExternalRenderer(view, options) {
        const state = {
            view: view,
            gl: null,
            renderer: null,
            disposed: false,
            count: 0
        };

        const api = {
            updatePositions: function (buffer, count) {
                if (state.disposed) return;
                try {
                    if (state.renderer && buffer instanceof ArrayBuffer && Number.isFinite(count)) {
                        state.count = count | 0;
                        state.renderer.updatePositions(buffer, state.count);
                        try { require(['esri/views/3d/externalRenderers'], function (externalRenderers) { externalRenderers.requestRender(view); }); } catch (e) { }
                    }
                } catch (e) { }
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
                        try { state.renderer = window.ArcgisInstancedRenderer && window.ArcgisInstancedRenderer.create(state.gl, options || {}); } catch (e) { }
                    },
                    render: function (context) {
                        if (!state.renderer) return;
                        try {
                            const cam = context.camera;
                            const params = {
                                viewMatrix: cam.viewMatrix,
                                projectionMatrix: cam.projectionMatrix,
                                cameraPosition: [cam.eye[0], cam.eye[1], cam.eye[2]]
                            };
                            state.renderer.draw(params, state.count);
                        } catch (e) { }
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