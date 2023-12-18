import { keepTrackApi } from '@app/keepTrackApi';
import { ScreenRecorder } from '@app/plugins/screen-recorder/screen-recorder';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginSuite, websiteInit } from './generic-tests';

describe('ScreenRecorder_class', () => {
  let screenRecorderPlugin: ScreenRecorder;
  beforeEach(() => {
    setupDefaultHtml();
    screenRecorderPlugin = new ScreenRecorder();
  });

  standardPluginSuite(ScreenRecorder, 'ScreenRecorder');
  // standardPluginMenuButtonTests(ScreenRecorder, 'ScreenRecorder');

  // Tests stopping a video
  test(`ScreenRecorder_stop_video`, () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin.streamManagerInstance.isVideoRecording = true;
    screenRecorderPlugin.streamManagerInstance['mediaRecorder_'] = {
      stop: () => {},
    } as any;
    screenRecorderPlugin.streamManagerInstance['stream_'] = {
      getTracks: () => [],
    } as any;
    screenRecorderPlugin.streamManagerInstance.save = () => {};

    expect(() => keepTrackApi.methods.bottomMenuClick(screenRecorderPlugin.bottomIconElementName)).not.toThrow();
  });

  // Tests error handling
  test(`ScreenRecorder_error_checking`, () => {
    websiteInit(screenRecorderPlugin);

    screenRecorderPlugin.streamManagerInstance.start = () => {
      throw new Error('test');
    };

    expect(() => keepTrackApi.methods.bottomMenuClick(screenRecorderPlugin.bottomIconElementName)).not.toThrow();
  });
});
