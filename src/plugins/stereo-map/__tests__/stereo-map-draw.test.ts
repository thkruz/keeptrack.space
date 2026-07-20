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
});
