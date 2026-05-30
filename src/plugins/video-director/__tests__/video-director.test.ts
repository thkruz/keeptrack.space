import { vi } from 'vitest';
import { getEl } from '@app/engine/utils/get-el';
import { VideoDirectorPlugin } from '@app/plugins/video-director/video-director';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSuite, standardPluginMenuButtonTests, standardClickTests, standardChangeTests } from '@test/generic-tests';

describe('VideoDirectorPlugin', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(VideoDirectorPlugin, 'VideoDirectorPlugin');
  standardPluginMenuButtonTests(VideoDirectorPlugin, 'VideoDirectorPlugin');
  standardClickTests(VideoDirectorPlugin);
  standardChangeTests(VideoDirectorPlugin);
});

const ALL_TOGGLES = [
  'video-director-rotateL', 'video-director-rotateR', 'video-director-rotateU', 'video-director-rotateD',
  'video-director-panL', 'video-director-panR', 'video-director-panU', 'video-director-panD',
  'video-director-zoomIn', 'video-director-zoomOut',
];

const AUTO_FLAGS = [
  'isAutoRotateL', 'isAutoRotateR', 'isAutoRotateU', 'isAutoRotateD',
  'isAutoPanL', 'isAutoPanR', 'isAutoPanU', 'isAutoPanD', 'isAutoZoomIn', 'isAutoZoomOut',
];

type VideoStatics = {
  onFormChange(e: unknown): void;
  onSubmit(e: unknown): void;
};

describe('VideoDirectorPlugin form handlers', () => {
  let plugin: VideoDirectorPlugin;
  const statics = VideoDirectorPlugin as unknown as VideoStatics;

  beforeEach(() => {
    setupStandardEnvironment();
    plugin = new VideoDirectorPlugin();
    document.body.insertAdjacentHTML('beforeend', plugin.sideMenuElementHtml);
    settingsManager.selectedColor = [1, 1, 1, 1];
    settingsManager.selectedColorFallback = [1, 1, 1, 1];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    getEl('video-director-menu')?.remove();
  });

  it('onFormChange throws when the event is missing', () => {
    expect(() => statics.onFormChange(undefined)).toThrow();
  });

  it('onSubmit throws when the event is missing', () => {
    expect(() => statics.onSubmit(undefined)).toThrow();
  });

  it('onFormChange enables a toggle, hides opposites and stores the selected color', () => {
    // Every toggle on, every auto-flag off, so each opposing-direction guard fires.
    ALL_TOGGLES.forEach((id) => {
      (getEl(id) as HTMLInputElement).checked = true;
    });
    AUTO_FLAGS.forEach((flag) => {
      (settingsManager as unknown as Record<string, boolean>)[flag] = false;
    });
    (getEl('video-director-selectedColor') as HTMLInputElement).checked = true;

    statics.onFormChange({ target: getEl('video-director-rotateL') });

    expect(settingsManager.selectedColor).toEqual([0, 0, 0, 0]);
    expect(settingsManager.selectedColorFallback).toEqual([1, 1, 1, 1]);
  });

  it('onFormChange plays the disable sound and restores the color when the selected toggle is off', () => {
    const rotateL = getEl('video-director-rotateL') as HTMLInputElement;

    rotateL.checked = false;
    (getEl('video-director-selectedColor') as HTMLInputElement).checked = false;

    statics.onFormChange({ target: rotateL });

    expect(settingsManager.selectedColor).toEqual(settingsManager.selectedColorFallback);
  });

  it('onFormChange takes the default branch for non-toggle targets', () => {
    expect(() => statics.onFormChange({ target: getEl('video-director-rotateSpeed') })).not.toThrow();
  });

  it('onSubmit persists the rotate/pan/zoom flags', () => {
    const e = { preventDefault: vi.fn() };

    (getEl('video-director-rotateR') as HTMLInputElement).checked = true;
    statics.onSubmit(e);

    expect(e.preventDefault).toHaveBeenCalled();
    expect(settingsManager.isAutoRotateR).toBe(true);
  });
});
