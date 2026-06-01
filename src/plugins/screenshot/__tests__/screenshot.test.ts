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

const mockCtx = () => ({
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
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

  it('rmbCallback maps each resolution and ignores unknown ids', () => {
    const spy = vi.spyOn(plugin, 'saveHiResPhoto').mockImplementation(() => undefined);

    ['save-hd-rmb', 'save-4k-rmb', 'save-8k-rmb', 'unknown-rmb'].forEach((id) => plugin.rmbCallback(id));

    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('command palette commands trigger hi-res capture', () => {
    const spy = vi.spyOn(plugin, 'saveHiResPhoto').mockImplementation(() => undefined);

    plugin.getCommandPaletteCommands().forEach((c) => c.callback());

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

    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => (tag === 'canvas' ? fakeCanvas() : ({})))as unknown as typeof document.createElement);
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
});
