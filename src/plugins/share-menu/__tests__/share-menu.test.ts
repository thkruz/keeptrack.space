import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { UrlManager } from '@app/engine/input/url-manager';
import { errorManagerInstance } from '@app/engine/utils/errorManager';
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

  it('requests a URL without the time by default and with it once "Include current time" is checked', () => {
    const spy = vi
      .spyOn(UrlManager, 'getShareUrl')
      .mockImplementation((_isMaxData?: boolean, isIncludeTime?: boolean) =>
        isIncludeTime ? 'https://keeptrack.space/?date=2024-08-15T00:00:00.000Z' : 'https://keeptrack.space/?zoom=0.50'
      );
    const checkbox = getEl(ShareMenuPlugin.INCLUDE_TIME_ID) as HTMLInputElement;
    const input = getEl(ShareMenuPlugin.URL_INPUT_ID) as HTMLInputElement;

    expect(checkbox.checked).toBe(false);

    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(spy).toHaveBeenLastCalledWith(true, false);
    expect(input.value).not.toContain('date=');

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenLastCalledWith(true, true);
    expect(input.value).toContain('date=');

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(input.value).not.toContain('date=');
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

describe('ShareMenuPlugin live refresh while open', () => {
  let plugin: ShareMenuPlugin;
  let n = 0;
  let spy: ReturnType<typeof vi.spyOn>;
  const input = () => getEl(ShareMenuPlugin.URL_INPUT_ID) as HTMLInputElement;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ShareMenuPlugin();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    n = 0;
    spy = vi.spyOn(UrlManager, 'getShareUrl').mockImplementation(() => `https://keeptrack.space/?n=${++n}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rebuilds the link on selection, rate and search changes while open', () => {
    plugin.isMenuButtonActive = true;
    plugin.onBottomIconClick();
    expect(input().value).toBe('https://keeptrack.space/?n=1');

    EventBus.getInstance().emit(EventBusEvent.selectSatData, null as never, -1);
    expect(input().value).toBe('https://keeptrack.space/?n=2');

    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 0);
    expect(input().value).toBe('https://keeptrack.space/?n=3');

    EventBus.getInstance().emit(EventBusEvent.searchUpdated, '25544', 1, 1);
    expect(input().value).toBe('https://keeptrack.space/?n=4');
  });

  it('does not rebuild while the menu is closed', () => {
    plugin.isMenuButtonActive = false;

    EventBus.getInstance().emit(EventBusEvent.selectSatData, null as never, -1);
    EventBus.getInstance().emit(EventBusEvent.propRateChanged, 2);
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date());
    vi.advanceTimersByTime(ShareMenuPlugin.TIME_REFRESH_THROTTLE_MS * 2);

    expect(spy).not.toHaveBeenCalled();
  });

  it('throttles sim-time rebuilds to one per window with a trailing rebuild', () => {
    plugin.isMenuButtonActive = true;
    vi.advanceTimersByTime(ShareMenuPlugin.TIME_REFRESH_THROTTLE_MS);

    // First time change rebuilds at once.
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date());
    expect(spy).toHaveBeenCalledTimes(1);

    // A burst inside the window is coalesced into one trailing rebuild.
    for (let i = 0; i < 10; i++) {
      EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date());
      EventBus.getInstance().emit(EventBusEvent.staticOffsetChange, i);
    }
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(ShareMenuPlugin.TIME_REFRESH_THROTTLE_MS);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(input().value).toBe('https://keeptrack.space/?n=2');
  });

  it('drops a pending trailing rebuild when the menu closes', () => {
    plugin.isMenuButtonActive = true;
    vi.advanceTimersByTime(ShareMenuPlugin.TIME_REFRESH_THROTTLE_MS);
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date());
    EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date());

    plugin.isMenuButtonActive = false;
    vi.advanceTimersByTime(ShareMenuPlugin.TIME_REFRESH_THROTTLE_MS);

    expect(spy).toHaveBeenCalledTimes(1);
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

describe('ShareMenuPlugin native share failure', () => {
  let plugin: ShareMenuPlugin;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new ShareMenuPlugin();
    plugin.init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
    vi.spyOn(UrlManager, 'getShareUrl').mockReturnValue('https://keeptrack.space/');
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
    vi.restoreAllMocks();
  });

  const shareWith = async (err: Error) => {
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(err), configurable: true });
    (plugin as unknown as { shareNative_: () => void }).shareNative_();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('logs the translated failure message with the error detail, not the raw locale key', async () => {
    const debugSpy = vi.spyOn(errorManagerInstance, 'debug');

    await shareWith(new Error('boom'));

    expect(debugSpy).toHaveBeenCalledWith('Native share failed: boom');
    expect(debugSpy.mock.calls.flat().join(' ')).not.toContain('errorMsgs');
  });

  it('stays quiet when the user dismisses the share sheet', async () => {
    const debugSpy = vi.spyOn(errorManagerInstance, 'debug');
    const abort = new Error('dismissed');

    abort.name = 'AbortError';
    await shareWith(abort);

    expect(debugSpy).not.toHaveBeenCalled();
  });
});
