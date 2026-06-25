import { getEl } from '@app/engine/utils/get-el';
import { VideoDirectorPlugin } from '@app/plugins/video-director/video-director';
import { DIRECTION_TOGGLES, getOppositeToDisable, parseSpeed, SPEED_CONFIGS } from '@app/plugins/video-director/video-director-core';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardChangeTests, standardClickTests, standardPluginMenuButtonTests, standardPluginSuite } from '@test/generic-tests';
import { vi } from 'vitest';

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

describe('video-director-core', () => {
  describe('parseSpeed', () => {
    it('falls back to the default for blank or non-numeric input', () => {
      const cfg = { def: 0.5, min: 0, max: 1 };

      expect(parseSpeed('', cfg)).toBe(0.5);
      expect(parseSpeed('abc', cfg)).toBe(0.5);
      expect(parseSpeed(null, cfg)).toBe(0.5);
      expect(parseSpeed(undefined, cfg)).toBe(0.5);
    });

    it('clamps to the configured bounds', () => {
      const cfg = { def: 0.5, min: 0, max: 1 };

      expect(parseSpeed('5', cfg)).toBe(1);
      expect(parseSpeed('-3', cfg)).toBe(0);
    });

    it('passes through valid in-range values', () => {
      expect(parseSpeed('0.25', { def: 0.5, min: 0, max: 1 })).toBe(0.25);
    });
  });

  describe('getOppositeToDisable', () => {
    it('returns the opposite id when a direction is turned on', () => {
      expect(getOppositeToDisable('video-director-rotateL', true)).toBe('video-director-rotateR');
      expect(getOppositeToDisable('video-director-zoomIn', true)).toBe('video-director-zoomOut');
    });

    it('returns null when the toggle is turned off', () => {
      expect(getOppositeToDisable('video-director-rotateL', false)).toBeNull();
    });

    it('returns null for a non-direction element', () => {
      expect(getOppositeToDisable('video-director-rotateSpeed', true)).toBeNull();
    });
  });

  it('pairs every direction toggle with a reciprocal opposite', () => {
    DIRECTION_TOGGLES.forEach((toggle) => {
      const opposite = DIRECTION_TOGGLES.find((t) => t.id === toggle.opposite);

      expect(opposite).toBeDefined();
      expect(opposite!.opposite).toBe(toggle.id);
    });
  });

  it('exposes the three speed configs in order', () => {
    expect(SPEED_CONFIGS.map((c) => c.flag)).toEqual(['autoRotateSpeed', 'autoPanSpeed', 'autoZoomSpeed']);
  });
});

describe('VideoDirectorPlugin form handlers', () => {
  let plugin: VideoDirectorPlugin;

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

  it('throws when the change event is missing', () => {
    expect(() => plugin.triggerFormChange(undefined as unknown as Event)).toThrow();
  });

  it('turns off the opposite direction when one is enabled', () => {
    const rotateL = getEl('video-director-rotateL') as HTMLInputElement;
    const rotateR = getEl('video-director-rotateR') as HTMLInputElement;

    rotateR.checked = true;
    rotateL.checked = true;
    plugin.triggerFormChange({ target: rotateL } as unknown as Event);

    expect(rotateR.checked).toBe(false);
    expect(settingsManager.isAutoRotateL).toBe(true);
    expect(settingsManager.isAutoRotateR).toBe(false);
  });

  it('hides the selected dot and stores the fallback color', () => {
    const selectedColor = getEl('video-director-selectedColor') as HTMLInputElement;

    selectedColor.checked = true;
    plugin.triggerFormChange({ target: selectedColor } as unknown as Event);

    expect(settingsManager.selectedColor).toEqual([0, 0, 0, 0]);
    expect(settingsManager.selectedColorFallback).toEqual([1, 1, 1, 1]);
  });

  it('restores the color when the selected-dot toggle is off', () => {
    const selectedColor = getEl('video-director-selectedColor') as HTMLInputElement;

    selectedColor.checked = false;
    plugin.triggerFormChange({ target: selectedColor } as unknown as Event);

    expect(settingsManager.selectedColor).toEqual(settingsManager.selectedColorFallback);
  });

  it('sanitizes invalid speed input back to the field default (no NaN)', () => {
    const rotateSpeed = getEl('video-director-rotateSpeed') as HTMLInputElement;

    rotateSpeed.value = 'not-a-number';
    plugin.triggerFormChange({ target: rotateSpeed } as unknown as Event);

    expect(settingsManager.autoRotateSpeed).toBe(0.000075);
    expect(Number.isNaN(settingsManager.autoRotateSpeed)).toBe(false);
  });

  it('writes the Black Earth scene flag', () => {
    const blackEarth = getEl('video-director-blackEarth') as HTMLInputElement;

    blackEarth.checked = true;
    plugin.triggerFormChange({ target: blackEarth } as unknown as Event);

    expect(settingsManager.isBlackEarth).toBe(true);
  });

  it('writes the Milky Way scene flag', () => {
    const milkyWay = getEl('video-director-milkyWay') as HTMLInputElement;

    milkyWay.checked = false;
    plugin.triggerFormChange({ target: milkyWay } as unknown as Event);

    expect(settingsManager.isDrawMilkyWay).toBe(false);
  });
});
