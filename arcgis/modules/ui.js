(function () {
    function createContainer() {
        const el = document.createElement('div');
        el.id = 'arcgis-ui-toggles';
        el.style.position = 'absolute';
        el.style.top = '8px';
        el.style.left = '8px';
        el.style.zIndex = '10';
        el.style.background = 'rgba(0,0,0,0.5)';
        el.style.color = '#ddd';
        el.style.font = '12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        el.style.padding = '8px 10px';
        el.style.borderRadius = '6px';
        el.style.maxWidth = '240px';
        el.style.pointerEvents = 'auto';
        return el;
    }

    function makeCheckbox(id, label, checked) {
        const wrap = document.createElement('label');
        wrap.style.display = 'block';
        wrap.style.cursor = 'pointer';
        wrap.style.margin = '2px 0';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.checked = !!checked;
        cb.style.marginRight = '6px';
        const span = document.createElement('span');
        span.textContent = label;
        wrap.appendChild(cb);
        wrap.appendChild(span);
        return { wrap, cb };
    }

    function createUI(options) {
        const root = options?.root || document.body;
        const sets = options?.sets || [];
        const selected = new Set(options?.selected || []);
        const onChange = typeof options?.onChange === 'function' ? options.onChange : function () { };

        const container = createContainer();
        const title = document.createElement('div');
        title.textContent = 'Datasets';
        title.style.fontWeight = '600';
        title.style.marginBottom = '4px';
        container.appendChild(title);

        const controls = {};
        sets.forEach((name) => {
            const { wrap, cb } = makeCheckbox('ds_' + name, name, selected.has(name));
            cb.addEventListener('change', () => {
                if (cb.checked) selected.add(name); else selected.delete(name);
                onChange(Array.from(selected));
            });
            controls[name] = cb;
            container.appendChild(wrap);
        });

        root.appendChild(container);

        return {
            container,
            showHover(infoHtml, x, y) {
                let tip = document.getElementById('arcgis-ui-tooltip');
                if (!tip) {
                    tip = document.createElement('div');
                    tip.id = 'arcgis-ui-tooltip';
                    tip.style.position = 'fixed';
                    tip.style.zIndex = '11';
                    tip.style.background = 'rgba(0,0,0,0.75)';
                    tip.style.color = '#eee';
                    tip.style.padding = '6px 8px';
                    tip.style.borderRadius = '6px';
                    tip.style.font = '12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
                    tip.style.pointerEvents = 'none';
                    document.body.appendChild(tip);
                }
                tip.innerHTML = infoHtml;
                tip.style.left = (x + 10) + 'px';
                tip.style.top = (y + 10) + 'px';
                tip.style.display = 'block';
            },
            hideHover() {
                const tip = document.getElementById('arcgis-ui-tooltip');
                if (tip) tip.style.display = 'none';
            },
            getSelected() { return Array.from(selected); },
            setSelected(list) {
                selected.clear();
                list.forEach((n) => { if (controls[n]) controls[n].checked = true; selected.add(n); });
                onChange(Array.from(selected));
            }
        };
    }

    window.ArcgisUI = { createUI };
})();


