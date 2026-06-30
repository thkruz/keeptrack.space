import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { getEl } from '@app/engine/utils/get-el';
import { ShareMenuPlugin } from '@app/plugins/share-menu/share-menu';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

describe('ShareMenuPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(ShareMenuPlugin, 'ShareMenuPlugin');
  standardPluginMenuButtonTests(ShareMenuPlugin, 'ShareMenuPlugin');
});

describe('ShareMenuPlugin methods', () => {
  let plugin: ShareMenuPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ShareMenuPlugin();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the bottom icon config and a command palette command', () => {
    vi.spyOn(UrlManager, 'getShareUrl').mockReturnValue('https://keeptrack.space/');
    expect(plugin.getBottomIconConfig().elementName).toBe('share-menu-bottom-icon');
    expect(plugin.getSideMenuConfig().elementName).toBe('share-menu');
    expect(plugin.getCommandPaletteCommands()[0].id).toBe('ShareMenuPlugin.open');
    expect(() => plugin.getCommandPaletteCommands()[0].callback()).not.toThrow();
  });

  it('populates the URL field from UrlManager.getShareUrl when opened', () => {
    const spy = vi.spyOn(UrlManager, 'getShareUrl').mockReturnValue('https://keeptrack.space/?zoom=0.50');

    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();

    const input = getEl(ShareMenuPlugin.URL_INPUT_ID) as HTMLInputElement;

    expect(spy).toHaveBeenCalled();
    expect(input.value).toBe('https://keeptrack.space/?zoom=0.50');
  });

  it('does not refresh the URL field when the menu is being closed', () => {
    const spy = vi.spyOn(UrlManager, 'getShareUrl').mockReturnValue('https://keeptrack.space/?zoom=0.50');

    plugin.isMenuButtonActive = false;
    plugin.onBottomIconClick();

    expect(spy).not.toHaveBeenCalled();
  });

  it('copies the link to the clipboard when the copy button is clicked', async () => {
    vi.spyOn(UrlManager, 'getShareUrl').mockReturnValue('https://keeptrack.space/?zoom=0.50');
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const input = getEl(ShareMenuPlugin.URL_INPUT_ID) as HTMLInputElement;

    input.value = 'https://keeptrack.space/?zoom=0.50';
    getEl(ShareMenuPlugin.COPY_BTN_ID)?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('https://keeptrack.space/?zoom=0.50');
  });

  it('keeps the native share button hidden when Web Share is unavailable', () => {
    // setupStandardEnvironment runs in jsdom, which has no navigator.share.
    const nativeBtn = getEl(ShareMenuPlugin.NATIVE_BTN_ID);

    expect(nativeBtn?.classList.contains('start-hidden')).toBe(true);
  });

  it('reveals the native share button when Web Share is available', () => {
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockResolvedValue(undefined), configurable: true });

    // Re-run the final wiring with navigator.share present.
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    const nativeBtn = getEl(ShareMenuPlugin.NATIVE_BTN_ID);

    expect(nativeBtn?.classList.contains('start-hidden')).toBe(false);

    // Clean up so other suites see jsdom's default (no Web Share).
    Reflect.deleteProperty(navigator, 'share');
  });

  it('bridges bottomIconCallback to onBottomIconClick', () => {
    const spy = vi.spyOn(plugin, 'onBottomIconClick');

    plugin.bottomIconCallback();
    expect(spy).toHaveBeenCalled();
  });
});

describe('ShareMenuPlugin clipboard failure', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toasts a caution when the clipboard write fails', async () => {
    const plugin = new ShareMenuPlugin();

    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    vi.spyOn(UrlManager, 'getShareUrl').mockReturnValue('https://keeptrack.space/');
    const toastSpy = vi.spyOn(ServiceLocator.getUiManager(), 'toast');
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));

    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    getEl(ShareMenuPlugin.COPY_BTN_ID)?.dispatchEvent(new MouseEvent('click'));
    await Promise.resolve();
    await Promise.resolve();

    expect(toastSpy).toHaveBeenCalled();
  });
});
