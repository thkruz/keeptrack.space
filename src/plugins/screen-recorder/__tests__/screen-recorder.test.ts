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

    screenRecorderPlugin['streamManagerInstance_'].isVideoRecording = true;
    screenRecorderPlugin['streamManagerInstance_']['mediaRecorder_'] = {
      stop: () => {
        // Do nothing
      },
    } as unknown as MediaRecorder;
    screenRecorderPlugin['streamManagerInstance_']['stream_'] = {
      getTracks: () => [],
    } as unknown as MediaStream;
    screenRecorderPlugin['streamManagerInstance_'].save = () => {
      // Do nothing
    };

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

    expect(screenRecorderPlugin['streamManagerInstance_'].save).toHaveBeenCalledWith(ScreenRecorder.FILE_NAME);
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

    screenRecorderPlugin['streamManagerInstance_'].isVideoRecording = true;
    screenRecorderPlugin['streamManagerInstance_']['mediaRecorder_'] = {
      stop: () => {
        // Do nothing
      },
    } as unknown as MediaRecorder;
    screenRecorderPlugin['streamManagerInstance_']['stream_'] = {
      getTracks: () => [],
    } as unknown as MediaStream;
    screenRecorderPlugin['streamManagerInstance_'].save = () => {
      // Do nothing
    };

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
