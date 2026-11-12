import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { Screenshot } from '@app/plugins/screenshot/screenshot';
import { setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('Screenshot', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(Screenshot, 'Screenshot');
});

describe('Screenshot_class', () => {
  let screenshotPlugin: Screenshot;

  beforeEach(() => {
    setupDefaultHtml();
    screenshotPlugin = new Screenshot();
  });

  standardPluginSuite(Screenshot, 'Screenshot');
  standardPluginMenuButtonTests(Screenshot, 'Screenshot');
  standardPluginRmbTests(Screenshot, 'Screenshot');

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // test if the screenshot can be taken
  it('should take a screenshot', () => {
    KeepTrack.getInstance().containerRoot.appendChild = vi.fn();
    // Use spyOn (auto-restored in afterEach) so the createElement override doesn't leak to other suites.
    vi.spyOn(document, 'createElement').mockImplementation((() => ({
      click: vi.fn(),
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        fillRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
      })),
      toDataURL: vi.fn(() => 'data:image/png;base64,'),
      parentNode: {
        removeChild: vi.fn(),
      },
    })) as unknown as typeof document.createElement);
    expect(() => screenshotPlugin.takeScreenShot()).not.toThrow();
  });
});

const mockCtx = () =>
  ({
    drawImage: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    textBaseline: '',
    font: '',
    globalAlpha: 1,
    fillStyle: '',
  }) as unknown as CanvasRenderingContext2D;

describe('Screenshot behavior', () => {
  let plugin: Screenshot;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priv = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new Screenshot();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (HTMLCanvasElement.prototype as any).toDataURL;
  });

  it('constructor loads logos and tolerates image load errors', () => {
    settingsManager.isShowSecondaryLogo = true;
    const withSecondary = new Screenshot();

    expect(() => withSecondary.logo.onerror?.(new Event('error'))).not.toThrow();
    expect(() => withSecondary.secondaryLogo.onerror?.(new Event('error'))).not.toThrow();
  });

  it('onContextMenuAction takes a 4k shot for the single Save Image item and ignores others', () => {
    const spy = vi.spyOn(plugin, 'saveHiResPhoto').mockImplementation(() => undefined);

    ['save-rmb', 'unknown-rmb'].forEach((id) => {
      plugin.onContextMenuAction(id);
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('4k');
  });

  it('command palette commands trigger hi-res capture', () => {
    const spy = vi.spyOn(plugin, 'saveHiResPhoto').mockImplementation(() => undefined);

    plugin.getCommandPaletteCommands().forEach((c) => {
      c.callback();
    });

    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('saveHiResPhoto sets dimensions per resolution and ignores unknown ones', () => {
    plugin.saveHiResPhoto('hd');
    expect(settingsManager.hiResWidth).toBe(1920);
    plugin.saveHiResPhoto('8k');
    expect(settingsManager.hiResWidth).toBe(7680);
    expect(() => plugin.saveHiResPhoto('weird')).not.toThrow();
  });

  it('addJs queues a screenshot on endOfDraw', () => {
    plugin.addJs();
    const spy = vi.spyOn(plugin, 'takeScreenShot').mockImplementation(() => undefined);

    priv().queuedScreenshot_ = true;
    EventBus.getInstance().emit(EventBusEvent.altCanvasResize);
    EventBus.getInstance().emit(EventBusEvent.endOfDraw);

    expect(spy).toHaveBeenCalled();
  });

  it('watermarkedDataUrl_ warns and returns empty when no 2D context is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const canvas = document.createElement('canvas');

    canvas.width = 100;
    canvas.height = 100;
    ServiceLocator.getRenderer().domElement = canvas;

    expect(priv().watermarkedDataUrl_()).toBe('');
  });

  it('watermarkedDataUrl_ crops to square, draws both logos and classification text', () => {
    // jsdom canvases return null for getContext('2d'); use fake canvases with a mock 2D context.
    const fakeCanvas = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c: any = { width: 0, height: 0, getContext: () => mockCtx(), toDataURL: () => 'data:image/png;base64,AAA' };

      c.parentNode = { removeChild: vi.fn() };

      return c;
    };

    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => (tag === 'canvas' ? fakeCanvas() : {})) as unknown as typeof document.createElement);
    KeepTrack.getInstance().containerRoot.appendChild = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ServiceLocator.getRenderer().domElement = { width: 3840, height: 2160 } as any;
    EventBus.getInstance().methods.screenshotShouldCropSquare = () => true;

    settingsManager.isShowSecondaryLogo = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugin.logo = { width: 100, height: 50 } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugin.secondaryLogo = { width: 100, height: 50 } as any;
    settingsManager.classificationStr = 'Unclassified';

    expect(priv().watermarkedDataUrl_()).toContain('data:');
  });

  it('calculateClassificationText_ returns empty fields when there is no classification', () => {
    settingsManager.classificationStr = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (Screenshot as any).calculateClassificationText_();

    expect(result.classificationstr).toBe('');
    expect(result.classificationColor).toBe('');
  });
  describe('provenance caption', () => {
    const stubSources = (sat: unknown, time: Date, sensor: unknown) => {
      vi.spyOn(PluginRegistry, 'getPlugin').mockReturnValue({ primarySatObj: sat } as never);
      vi.spyOn(ServiceLocator, 'getTimeManager').mockReturnValue({ simulationTimeObj: time } as never);
      vi.spyOn(ServiceLocator, 'getSensorManager').mockReturnValue({ getSensor: () => sensor } as never);
    };

    it('gathers object, UTC time, site and source lines', () => {
      stubSources({ name: 'ISS (ZARYA)', sccNum: '25544', source: 'spacetrack', ageOfElset: () => 3.25 }, new Date('2026-11-04T01:02:03.456Z'), { uiName: 'Eglin' });

      const lines = plugin.gatherCaptionLines_();

      expect(lines).toHaveLength(5);
      expect(lines[0]).toContain('ISS (ZARYA)');
      expect(lines[0]).toContain('25544');
      expect(lines[1]).toContain('2026-11-04T01:02:03');
      expect(lines[1]).not.toContain('.456');
      expect(lines[2]).toContain('Eglin');
      expect(lines[3]).toContain('3.3 d');
      expect(lines[3].toLowerCase()).toContain('computed');
      expect(lines[4]).toContain('Space-Track');
    });

    it('omits object and source lines when nothing is selected, and the site line when no sensor is set', () => {
      stubSources({ id: -1 }, new Date('2026-11-04T00:00:00Z'), null);

      const lines = plugin.gatherCaptionLines_();

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('2026-11-04T00:00:00');
    });

    it('falls back to the raw source value and survives a failing data source', () => {
      stubSources({ name: 'X', sccNum: '1', source: 'mystery' }, new Date('2026-11-04T00:00:00Z'), null);
      expect(plugin.gatherCaptionLines_().some((line) => line.includes('mystery'))).toBe(true);

      vi.spyOn(ServiceLocator, 'getTimeManager').mockImplementation(() => {
        throw new Error('no time manager');
      });
      expect(() => plugin.gatherCaptionLines_()).not.toThrow();
    });

    it('draws a box and one text line per caption line, top-left at the padding', () => {
      const ctx = mockCtx();

      settingsManager.classificationStr = '';
      plugin.drawCaption_(ctx, 3840, 50, ['a', 'b', 'c']);

      expect(ctx.fillRect).toHaveBeenCalledTimes(1);
      expect(ctx.fillText).toHaveBeenCalledTimes(3);
      const [x, y] = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];

      expect(x).toBe(50);
      expect(y).toBe(50);
    });

    it('draws nothing for an empty caption', () => {
      const ctx = mockCtx();

      plugin.drawCaption_(ctx, 3840, 50, []);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('starts below the classification banner and truncates with an ellipsis when too wide', () => {
      const ctx = mockCtx();

      (ctx.measureText as ReturnType<typeof vi.fn>).mockImplementation((text: string) => ({ width: text.length * 10 }));
      settingsManager.classificationStr = 'Unclassified';
      plugin.drawCaption_(ctx, 1000, 50, ['x'.repeat(200)]);

      const [, y, w] = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0];
      // banner is drawn at y=34, so the box must start under it
      expect(y).toBeGreaterThan(34);
      // classification text is 120 wide here: the box stays left of the banner start
      expect(50 + w).toBeLessThanOrEqual(1000 / 2 - 120);
      const drawn = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;

      expect(drawn.endsWith('…')).toBe(true);
      settingsManager.classificationStr = '';
    });

    it('watermarkedDataUrl_ draws the caption before the logos', () => {
      const order: string[] = [];
      const fakeCanvas = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c: any = { width: 0, height: 0, toDataURL: () => 'data:image/png;base64,AAA', parentNode: { removeChild: vi.fn() } };
        const ctx = mockCtx();

        (ctx.drawImage as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('image'));
        (ctx.fillRect as ReturnType<typeof vi.fn>).mockImplementation(() => order.push('caption'));
        c.getContext = () => ctx;

        return c;
      };

      vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => (tag === 'canvas' ? fakeCanvas() : {})) as unknown as typeof document.createElement);
      KeepTrack.getInstance().containerRoot.appendChild = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ServiceLocator.getRenderer().domElement = { width: 400, height: 300 } as any;
      EventBus.getInstance().methods.screenshotShouldCropSquare = () => false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plugin.logo = { width: 100, height: 50 } as any;
      settingsManager.isShowSecondaryLogo = false;
      settingsManager.classificationStr = '';
      vi.spyOn(plugin, 'gatherCaptionLines_').mockReturnValue(['line']);

      expect(priv().watermarkedDataUrl_()).toContain('data:');
      expect(order.indexOf('caption')).toBeGreaterThan(-1);
      expect(order.lastIndexOf('image')).toBeGreaterThan(order.indexOf('caption'));
    });
  });
});
