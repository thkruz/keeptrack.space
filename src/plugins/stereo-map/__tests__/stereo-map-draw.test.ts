/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { StereoMap } from '@app/plugins/stereo-map/stereo-map';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/** A shared 2D context double covering every method/property stereo-map's draw chain touches. */
const makeCtx = () => ({
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  fillRect: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  save: vi.fn(),
  restore: vi.fn(),
  font: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1,
});

const fakeSat = (over: Record<string, unknown> = {}) => ({
  id: 0,
  period: 95,
  position: { x: 7000, y: 0, z: 0 },
  eci: () => ({ position: { x: 7000, y: 0, z: 0 } }),
  ...over,
});

describe('StereoMap draw chain and interactions', () => {
  let plugin: StereoMap;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  let ctx: ReturnType<typeof makeCtx>;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
    settingsManager.mapWidth = 1000;
    settingsManager.mapHeight = 500;
    settingsManager.classificationStr = '';

    plugin = new StereoMap();
    websiteInit(plugin);

    // Secondary-menu inputs are not injected by websiteInit.
    if (!getEl('stereo-map-minutes', true)) {
      document.body.insertAdjacentHTML(
        'beforeend',
        '<input id="stereo-map-minutes" /><input id="stereo-map-orbit-mult" value="1.15" />' +
          '<input id="stereo-map-graticule" type="checkbox" />' +
          '<form id="stereo-map-settings-form"></form>'
      );
    }

    // Shared 2D context on the canvas INSTANCE (other suites reassign the prototype).
    ctx = makeCtx();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p().canvas_ as any).getContext = vi.fn(() => ctx);

    p().isMenuButtonActive = true;
    p().selectSatManager_.selectedSat = 0;

    const catalog = ServiceLocator.getCatalogManager();

    vi.spyOn(catalog, 'getObject').mockReturnValue(fakeSat() as never);
    vi.spyOn(catalog, 'getSat').mockReturnValue(fakeSat() as never);

    const sensorMgr = ServiceLocator.getSensorManager();

    sensorMgr.currentSensors = [{ lon: 10, lat: 20, isSatInFov: () => true }] as never;
    vi.spyOn(sensorMgr, 'isSensorSelected').mockReturnValue(true);

    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date('2026-05-31T00:00:00Z');
    (tm as unknown as { gmst: number }).gmst = 0;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('updateMap', () => {
    it('clears and redraws the full map (earth, ground trace, text)', () => {
      plugin.updateMap();

      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('also draws the graticule when enabled', () => {
      p().isGraticuleEnabled_ = true;

      plugin.updateMap();

      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled(); // graticule labels
    });

    it('does nothing when no satellite is selected', () => {
      p().selectSatManager_.selectedSat = -1;

      plugin.updateMap();

      expect(ctx.clearRect).not.toHaveBeenCalled();
    });

    it('does nothing when the menu is inactive', () => {
      p().isMenuButtonActive = false;

      plugin.updateMap();

      expect(ctx.clearRect).not.toHaveBeenCalled();
    });
  });

  describe('applySettings_', () => {
    it('reads the orbit multiplier and triggers a map redraw', () => {
      const updateSpy = vi.spyOn(plugin, 'updateMap').mockImplementation(() => undefined);

      (getEl('stereo-map-orbit-mult') as HTMLInputElement).value = '2.5';
      (getEl('stereo-map-graticule') as HTMLInputElement).checked = true;

      p().applySettings_();

      expect(p().orbitMultiplier_).toBe(2.5);
      expect(p().isGraticuleEnabled_).toBe(true);
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('onOrbitInputChanged_', () => {
    it('updates the multiplier and schedules a debounced redraw', () => {
      const debounceSpy = vi.spyOn(plugin as never, 'debouncedMapUpdate_' as never).mockImplementation(() => undefined);

      (getEl('stereo-map-orbit-mult') as HTMLInputElement).value = '3';
      p().onOrbitInputChanged_();

      expect(p().orbitMultiplier_).toBe(3);
      expect(debounceSpy).toHaveBeenCalled();
    });

    it('ignores out-of-range values', () => {
      p().orbitMultiplier_ = 1.15;
      (getEl('stereo-map-orbit-mult') as HTMLInputElement).value = '99';

      p().onOrbitInputChanged_();

      expect(p().orbitMultiplier_).toBe(1.15);
    });
  });

  describe('debouncedMapUpdate_', () => {
    it('redraws once the debounce timer fires', () => {
      const updateSpy = vi.spyOn(plugin, 'updateMap').mockImplementation(() => undefined);

      p().debouncedMapUpdate_();
      p().debouncedMapUpdate_(); // second call resets the timer
      vi.advanceTimersByTime(250);

      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCruncherMessage_', () => {
    it('forces a full redraw when an override is pending', () => {
      const updateSpy = vi.spyOn(plugin, 'updateMap').mockImplementation(() => undefined);

      p().isMapUpdateOverride_ = true;
      p().onCruncherMessage_();

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('mapMenuClick_', () => {
    it('jumps the simulation time to the clicked dot timestamp', () => {
      const tm = ServiceLocator.getTimeManager();
      const offsetSpy = vi.spyOn(tm, 'changeStaticOffset').mockImplementation(() => undefined as never);

      p().mapMenuClick_({ target: { dataset: { time: '2026-05-31 12:00:00' } } });

      expect(offsetSpy).toHaveBeenCalled();
    });

    it('is a no-op when the clicked element has no time', () => {
      const tm = ServiceLocator.getTimeManager();
      const offsetSpy = vi.spyOn(tm, 'changeStaticOffset').mockImplementation(() => undefined as never);

      p().mapMenuClick_({ target: { dataset: {} } });

      expect(offsetSpy).not.toHaveBeenCalled();
    });
  });

  describe('onDownload', () => {
    it('exports the canvas as a PNG download', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p().canvas_ as any).toDataURL = vi.fn(() => 'data:image/png;base64,abc');
      const clickSpy = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => undefined);

      plugin.onDownload();

      expect((p().canvas_ as { toDataURL: ReturnType<typeof vi.fn> }).toDataURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('is a no-op when there is no canvas', () => {
      p().canvas_ = null;

      expect(() => plugin.onDownload()).not.toThrow();
    });
  });

  describe('command palette and shortcuts', () => {
    it('exposes toggle and export commands', () => {
      const commands = plugin.getCommandPaletteCommands();
      const toggle = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

      commands.find((c) => c.id === 'StereoMap.toggle')!.callback();

      expect(toggle).toHaveBeenCalled();
      // Export is only available while the menu is open.
      const exportCmd = commands.find((c) => c.id === 'StereoMap.export')!;

      p().isMenuButtonActive = true;
      expect(exportCmd.isAvailable!()).toBe(true);
    });

    it('binds "m" to the bottom-menu toggle', () => {
      const toggle = vi.spyOn(plugin, 'bottomMenuClicked').mockImplementation(() => undefined);

      plugin
        .getKeyboardShortcuts()
        .find((s) => s.key === 'm')!
        .callback();

      expect(toggle).toHaveBeenCalled();
    });
  });

  describe('resize2DMap_', () => {
    it('resizes an open map when the drawer returns to rail mode', async () => {
      const existingDrawer = getEl('plugin-drawer', true);
      const drawer = existingDrawer ?? document.createElement('div');
      const menu = getEl('map-menu')!;

      if (!existingDrawer) {
        drawer.id = 'plugin-drawer';
        document.body.appendChild(drawer);
      }
      menu.style.left = '0px';
      EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
      vi.spyOn(plugin, 'updateMap').mockImplementation(() => undefined);

      try {
        menu.style.left = '60px';
        drawer.classList.add('rail-mode');

        await vi.waitFor(() => {
          expect(60 + p().canvas_.width).toBeLessThanOrEqual(window.innerWidth - 360);
        });
        expect(plugin.updateMap).toHaveBeenCalled();

        // A drawer change while closed must not leave the next opening's inset stale.
        p().isMenuButtonActive = false;
        menu.style.left = '0px';
        drawer.classList.remove('rail-mode');
        await Promise.resolve();
        p().isMenuButtonActive = true;
        plugin.onBottomIconClick();
        expect(p().canvas_.width).toBe(window.innerWidth - 360);

        menu.style.left = '60px';
        drawer.classList.add('rail-mode');
        await vi.waitFor(() => {
          expect(60 + p().canvas_.width).toBeLessThanOrEqual(window.innerWidth - 360);
        });
      } finally {
        p().drawerLayoutObserver_?.disconnect();
        menu.style.removeProperty('left');
        if (!existingDrawer) {
          drawer.remove();
        }
      }
    });

    it.each([
      [1366, 768],
      [1093, 614],
      [911, 512],
    ])('keeps the map between the drawer rail and info box at %ix%i', (width, height) => {
      const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')!;
      const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight')!;
      const menu = getEl('map-menu')!;

      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
      menu.style.left = '60px';

      try {
        p().resize2DMap_();

        expect(Number.parseFloat(menu.style.left) + p().canvas_.width).toBeLessThanOrEqual(width - 360);
        expect(p().canvas_.height).toBe(Math.floor(p().canvas_.width / 2));
        expect(settingsManager.mapWidth).toBe(p().canvas_.width);
      } finally {
        Object.defineProperty(window, 'innerWidth', widthDescriptor);
        Object.defineProperty(window, 'innerHeight', heightDescriptor);
        menu.style.removeProperty('left');
      }
    });

    it('recomputes map dimensions and redraws the earth layer', () => {
      p().resize2DMap_(true);

      expect(settingsManager.mapWidth).toBeGreaterThan(0);
      expect(settingsManager.mapHeight).toBe(settingsManager.mapWidth / 2);
    });
  });

  describe('secondary ground trace', () => {
    it('draws the secondary trace beneath the primary in the blue color family', () => {
      p().selectSatManager_.secondarySatObj = fakeSat({ id: 5 });
      const strokeSpy = vi.spyOn(plugin as never, 'strokeGroundTrace_' as never);

      plugin.updateMap();

      expect(strokeSpy).toHaveBeenCalledTimes(2);
      // Secondary is stroked first (drawn beneath), primary second (on top)
      expect(strokeSpy.mock.calls[0][2]).toBe('#00ffff');
      expect(strokeSpy.mock.calls[0][3]).toBe('#0066ff');
      expect(strokeSpy.mock.calls[1][2]).toBe('#ffff00');
      expect(strokeSpy.mock.calls[1][3]).toBe('#ff0000');
    });

    it('skips the secondary trace when no secondary satellite is selected', () => {
      p().selectSatManager_.secondarySatObj = null;
      const strokeSpy = vi.spyOn(plugin as never, 'strokeGroundTrace_' as never);

      plugin.updateMap();

      expect(strokeSpy).toHaveBeenCalledTimes(1);
      expect(strokeSpy.mock.calls[0][2]).toBe('#ffff00');
    });

    it('skips the secondary trace when it is the same satellite as the primary', () => {
      p().selectSatManager_.secondarySatObj = fakeSat({ id: 0 });
      const strokeSpy = vi.spyOn(plugin as never, 'strokeGroundTrace_' as never);

      plugin.updateMap();

      expect(strokeSpy).toHaveBeenCalledTimes(1);
    });

    it('redraws when the secondary satellite changes while the menu is open', () => {
      const updateSpy = vi.spyOn(plugin, 'updateMap').mockImplementation(() => undefined);

      EventBus.getInstance().emit(EventBusEvent.setSecondarySat, null, -1);

      expect(updateSpy).toHaveBeenCalled();
    });

    it('does not redraw on secondary changes while the menu is closed', () => {
      p().isMenuButtonActive = false;
      const updateSpy = vi.spyOn(plugin, 'updateMap').mockImplementation(() => undefined);

      EventBus.getInstance().emit(EventBusEvent.setSecondarySat, null, -1);

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
  it('renders target identities and UTC epoch into the exported canvas layer', () => {
    p().selectSatManager_.primarySatObj = fakeSat({ name: 'PRIMARY', sccNum: '25544' });
    p().selectSatManager_.secondarySatObj = fakeSat({ id: 5, name: 'SECONDARY', sccNum: '12345' });
    p().drawTargetLegend_();
    expect(ctx.fillText).toHaveBeenCalledWith('PRIMARY (25544)', 18, 58, expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith('SECONDARY (12345)', 18, 98, expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith(expect.stringContaining('UTC'), 18, 150);
  });

  describe('zoom-dependent layout (125-150% browser zoom narrows the map)', () => {
    /** Longitude labels drawn on the top edge (textBaseline 'top' at the time of the call). */
    const topLonLabels = (): { label: string; x: number }[] => {
      const out: { label: string; x: number }[] = [];

      ctx.fillText.mockImplementation((label: string, x: number) => {
        if (ctx.textBaseline === 'top') {
          out.push({ label, x });
        }
      });
      p().drawGraticuleLabels_();

      return out;
    };

    it('picks the finest label step whose spacing clears the widest label', () => {
      // 1000px map: 20 deg = 55.6px, enough for a 40px label + 10px gap
      expect(StereoMap.pickLabelStep(1000 / 360, 40, [20, 40, 60, 120])).toBe(20);
      // 600px map: 20 deg = 33px, 40 deg = 67px
      expect(StereoMap.pickLabelStep(600 / 360, 40, [20, 40, 60, 120])).toBe(40);
      // Nothing fits: fall back to the coarsest step
      expect(StereoMap.pickLabelStep(100 / 360, 40, [20, 40, 60, 120])).toBe(120);
    });

    it('keeps 20 deg longitude labels on a wide map', () => {
      settingsManager.mapWidth = 1200;
      settingsManager.mapHeight = 600;
      ctx.measureText.mockImplementation((text: string) => ({ width: text.length * 7 }));

      const labels = topLonLabels();

      expect(labels.map((l) => l.label)).toContain('20°E');
      expect(labels.map((l) => l.label)).toContain('160°W');
    });

    it('thins longitude labels on a narrow map so neighbours never overlap', () => {
      // The 150% zoom case from QA: the map narrows to ~736px and "160°W140°W..." ran together
      settingsManager.mapWidth = 736;
      settingsManager.mapHeight = 368;
      ctx.measureText.mockImplementation((text: string) => ({ width: text.length * 8 }));

      const labels = topLonLabels();

      expect(labels.length).toBeGreaterThan(3);
      for (let i = 1; i < labels.length; i++) {
        const prev = labels[i - 1];
        const cur = labels[i];
        const clearance = cur.x - prev.x - (cur.label.length * 8) / 2 - (prev.label.length * 8) / 2;

        expect(clearance).toBeGreaterThanOrEqual(8);
      }
      expect(labels.map((l) => l.label)).toContain('0°');
    });

    it('moves the legend off a ground-station icon in the top-left corner', () => {
      settingsManager.mapWidth = 736;
      settingsManager.mapHeight = 368;
      // Socorro, NM: lands right under the default top-left legend on a 736px map
      vi.spyOn(ServiceLocator, 'getSensorManager').mockReturnValue({
        isSensorSelected: () => true,
        currentSensors: [{ lat: 33.817, lon: -106.66 }],
      } as never);
      ctx.measureText.mockImplementation((text: string) => ({ width: text.length * 7 }));
      p().selectSatManager_.primarySatObj = fakeSat({ name: 'PRIMARY', sccNum: '25544' });
      p().selectSatManager_.secondarySatObj = null;

      p().drawTargetLegend_();

      const nameCall = ctx.fillText.mock.calls.find((call: unknown[]) => call[0] === 'PRIMARY (25544)');

      expect(nameCall).toBeDefined();
      expect(nameCall![1] !== 18 || nameCall![2] !== 58).toBe(true);
      // A backing panel keeps the legend readable over the map
      expect(ctx.fillRect).toHaveBeenCalled();
    });
  });

  it.each([
    { from: 179, to: -179, firstEdge: 1000, secondEdge: 0 },
    { from: -179, to: 179, firstEdge: 0, secondEdge: 1000 },
  ])('splits the frozen $from to $to degree dateline segment at its analytic midpoint', ({ from, to, firstEdge, secondEdge }) => {
    settingsManager.mapWidth = 1000;
    // Independent equirectangular oracle: +/-179 are one degree from the edge;
    // their equal distances put the crossing halfway between y=100 and y=200.
    const points = [
      { x: ((from + 180) * 1000) / 360, y: 100, inView: false },
      { x: ((to + 180) * 1000) / 360, y: 200, inView: false },
    ];
    p().strokeGroundTrace_(ctx, points, '#ffff00', '#ff0000', 4);
    expect(ctx.lineTo).toHaveBeenCalledWith(firstEdge, expect.closeTo(150, 8));
    expect(ctx.moveTo).toHaveBeenCalledWith(secondEdge, expect.closeTo(150, 8));
  });

  it('makes trace markers keyboard buttons with identity and exact-time names', () => {
    vi.spyOn(ServiceLocator.getCatalogManager(), 'getSat').mockReturnValue(fakeSat({ name: 'FIXTURE', sccNum: '25544' }) as never);
    p().drawGroundTrace_();
    const marker = getEl('map-look1') as HTMLImageElement;
    expect(marker.getAttribute('role')).toBe('button');
    expect(marker.tabIndex).toBe(0);
    expect(marker.alt).toContain('FIXTURE (25544)');
    expect(marker.alt).toContain(marker.dataset.time);
    const jump = vi.spyOn(plugin as never, 'mapMenuClick_' as never).mockImplementation(() => undefined);
    marker.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    marker.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(jump).toHaveBeenCalledTimes(2);
  });
});
