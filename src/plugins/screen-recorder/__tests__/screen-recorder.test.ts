import { ToastMsgType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ScreenRecorder } from '@app/plugins/screen-recorder/screen-recorder';
import { setupDefaultHtml } from '@test/environment/standard-env';
import { standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

/* eslint-disable dot-notation */

describe('ScreenRecorder_class', () => {
  let screenRecorderPlugin: ScreenRecorder;

  beforeEach(() => {
    setupDefaultHtml();
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true, configurable: true });
    screenRecorderPlugin = new ScreenRecorder();
  });

  standardPluginSuite(ScreenRecorder, 'ScreenRecorder');
  // standardPluginMenuButtonTests(ScreenRecorder, 'ScreenRecorder');

  // Tests stopping a video
  test('ScreenRecorder_stop_video', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin['streamManagerInstance_']['state_'] = 'recording';
    screenRecorderPlugin['streamManagerInstance_']['mediaRecorder_'] = {
      stop: () => {
        // Do nothing
      },
    } as unknown as MediaRecorder;
    screenRecorderPlugin['streamManagerInstance_']['stream_'] = {
      getTracks: () => [],
    } as unknown as MediaStream;
    screenRecorderPlugin['streamManagerInstance_'].save = () => false;

    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, screenRecorderPlugin.bottomIconElementName)).not.toThrow();
  });

  // Tests error handling
  test('ScreenRecorder_error_checking', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin['streamManagerInstance_'].start = () => {
      throw new Error('test');
    };

    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, screenRecorderPlugin.bottomIconElementName)).not.toThrow();
  });

  // Tests onStop_ callback
  test('ScreenRecorder_onStop_callback', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin['streamManagerInstance_'].save = vi.fn();
    screenRecorderPlugin.setBottomIconToUnselected = vi.fn();

    screenRecorderPlugin['onStop_']();

    expect(screenRecorderPlugin['streamManagerInstance_'].save).toHaveBeenCalledWith(expect.stringMatching(/^keeptrack-.*\.webm$/u));
    expect(screenRecorderPlugin.setBottomIconToUnselected).toHaveBeenCalled();
  });

  // Tests onError_ callback
  test('ScreenRecorder_onError_callback', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin.setBottomIconToDisabled = vi.fn();
    screenRecorderPlugin.shakeBottomIcon = vi.fn();

    screenRecorderPlugin['onError_']();

    expect(screenRecorderPlugin.isIconDisabled).toBe(true);
    expect(screenRecorderPlugin['streamManagerInstance_'].isVideoRecording).toBe(false);
    expect(screenRecorderPlugin['isCompatibilityIssue_']).toBe(true);
    expect(screenRecorderPlugin.setBottomIconToDisabled).toHaveBeenCalled();
    expect(screenRecorderPlugin.shakeBottomIcon).toHaveBeenCalled();
  });

  // Tests onMinorError_ callback
  test('ScreenRecorder_onMinorError_callback', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin.setBottomIconToUnselected = vi.fn();

    screenRecorderPlugin['onMinorError_']();

    expect(screenRecorderPlugin.setBottomIconToUnselected).toHaveBeenCalled();
  });

  // Tests compatibility issue warning
  test('ScreenRecorder_compatibility_issue_warning', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin['isCompatibilityIssue_'] = true;
    screenRecorderPlugin.shakeBottomIcon = vi.fn();

    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, screenRecorderPlugin.bottomIconElementName);

    expect(screenRecorderPlugin.shakeBottomIcon).toHaveBeenCalled();
  });

  // Tests getRecorderObject
  test('ScreenRecorder_getRecorderObject', () => {
    websiteInit(screenRecorderPlugin);

    const recorder = screenRecorderPlugin.getRecorderObject();

    expect(recorder).toBe(screenRecorderPlugin['streamManagerInstance_']);
  });

  test('shows requesting, recording duration and stopping status, then clears it on idle', () => {
    vi.useFakeTimers();
    websiteInit(screenRecorderPlugin);
    screenRecorderPlugin['onStateChange_']('requesting');
    const status = document.getElementById('screen-recorder-status')!;

    expect(status.hidden).toBe(false);
    expect(status.getAttribute('role')).toBe('status');
    screenRecorderPlugin['onStateChange_']('recording');
    expect(status.textContent).toContain('00:00');
    vi.advanceTimersByTime(61000);
    expect(status.textContent).toContain('01:01');
    screenRecorderPlugin['onStateChange_']('stopping');
    expect(status.textContent).not.toContain('01:01');
    screenRecorderPlugin['onStateChange_']('idle');
    expect(status.hidden).toBe(true);
    expect(status.textContent).toBe('');
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});

/* eslint-disable dot-notation */

describe('ScreenRecorder_class', () => {
  let screenRecorderPlugin: ScreenRecorder;

  beforeEach(() => {
    setupDefaultHtml();
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true, configurable: true });
    screenRecorderPlugin = new ScreenRecorder();
  });

  standardPluginSuite(ScreenRecorder, 'ScreenRecorder');
  // standardPluginMenuButtonTests(ScreenRecorder, 'ScreenRecorder');

  // Tests stopping a video
  test('ScreenRecorder_stop_video', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin['streamManagerInstance_']['state_'] = 'recording';
    screenRecorderPlugin['streamManagerInstance_']['mediaRecorder_'] = {
      stop: () => {
        // Do nothing
      },
    } as unknown as MediaRecorder;
    screenRecorderPlugin['streamManagerInstance_']['stream_'] = {
      getTracks: () => [],
    } as unknown as MediaStream;
    screenRecorderPlugin['streamManagerInstance_'].save = () => false;

    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, screenRecorderPlugin.bottomIconElementName)).not.toThrow();
  });

  // Tests error handling
  test('ScreenRecorder_error_checking', () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin['streamManagerInstance_'].start = () => {
      throw new Error('test');
    };

    expect(() => EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, screenRecorderPlugin.bottomIconElementName)).not.toThrow();
  });
});

describe('ScreenRecorder feedback', () => {
  let plugin: ScreenRecorder;
  let toast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setupDefaultHtml();
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true, configurable: true });
    plugin = new ScreenRecorder();
    websiteInit(plugin);
    toast = vi.fn();
    vi.spyOn(ServiceLocator, 'getUiManager').mockReturnValue({ toast } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a saved recording shows a "Recording saved" toast', () => {
    plugin['streamManagerInstance_'].save = vi.fn(() => true);
    plugin['onStop_']();
    expect(toast).toHaveBeenCalledWith('Recording saved', ToastMsgType.normal);
  });

  test('no saved toast when nothing was saved', () => {
    plugin['streamManagerInstance_'].save = vi.fn(() => false);
    plugin['onStop_']();
    expect(toast).not.toHaveBeenCalled();
  });

  test('each notice shows its localized text, never raw browser text', () => {
    plugin['onNotice_']('cancelled');
    plugin['onNotice_']('tooShort');
    plugin['onNotice_']('notReadable');
    plugin['onNotice_']('failed');
    const texts = toast.mock.calls.map(([text]) => text as string);

    expect(texts.slice(0, 2)).toEqual(['Recording cancelled', 'Recording too short, nothing saved']);
    expect(texts).toHaveLength(4);
    texts.forEach((text) => {
      expect(text).not.toMatch(/^Error:/u);
      expect(text).not.toMatch(/^ScreenRecorder\./u);
    });
  });

  test('stays out of the drawer Recent group', () => {
    expect(plugin.isExcludedFromDrawerRecent).toBe(true);
  });
});
