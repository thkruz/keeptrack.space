/* eslint-disable dot-notation */
import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SatelliteTimeline } from '@app/plugins/timeline-satellite/satellite-timeline';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

// A 2D-context double where every method is a vi.fn and `canvas` reports a size.
const mockCtx = () => new Proxy({} as Record<string, unknown>, {
  get: (_t, prop) => (prop === 'canvas' ? { width: 800, height: 400 } : vi.fn()),
  set: () => true,
});

const NOW = Date.UTC(2026, 4, 31, 12, 0, 0);

const satPass = (sccNum: string, id: number, passes: { start: Date; end: Date }[]) => ({
  satellite: { sccNum, id },
  passes,
});

describe('SatelliteTimeline drawing and canvas interactions', () => {
  let plugin: SatelliteTimeline;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, WatchlistPlugin]);
    plugin = new SatelliteTimeline();
    websiteInit(plugin);

    // jsdom has no 2D context. drawTimeline_ clones the canvas and pulls a context from the
    // clone - a prototype spy does NOT reach cloneNode-created elements, so override cloneNode
    // on the instance to return a canvas whose getContext returns a working mock.
    const clone = document.createElement('canvas');

    clone.getContext = vi.fn(() => mockCtx()) as never;
    p().canvas_.cloneNode = vi.fn(() => clone) as never;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p().canvasStatic_ as any).getContext = vi.fn(() => mockCtx());

    const tm = ServiceLocator.getTimeManager();

    (tm as unknown as { simulationTimeObj: Date }).simulationTimeObj = new Date(NOW);
    p().lengthOfLookAngles_ = 6;
  });

  afterEach(() => vi.restoreAllMocks());

  describe('drawTimeline_', () => {
    it('registers a clickable draw-event for each pass', () => {
      const passes = [satPass('25544', 1, [{ start: new Date(NOW + 60_000), end: new Date(NOW + 360_000) }])];

      p().drawTimeline_(passes);

      const keys = Object.keys(p().drawEvents_);

      expect(keys.length).toBe(1);
      expect(keys[0]).toContain('0-');
    });

    it('draws a no-pass bar with its own draw-event when a satellite has no passes', () => {
      const passes = [satPass('25544', 7, [])];

      p().drawTimeline_(passes);

      const keys = Object.keys(p().drawEvents_);

      expect(keys.some((k) => k.endsWith('-no-passes'))).toBe(true);
    });

    it('handles short / average / long passes without throwing (color tiers)', () => {
      p().lengthOfBadPass_ = 120;
      p().lengthOfAvgPass_ = 240;
      const passes = [
        satPass('A', 1, [{ start: new Date(NOW), end: new Date(NOW + 60_000) }]), // short -> red
        satPass('B', 2, [{ start: new Date(NOW), end: new Date(NOW + 200_000) }]), // avg -> yellow
        satPass('C', 3, [{ start: new Date(NOW), end: new Date(NOW + 600_000) }]), // long -> green
      ];

      expect(() => p().drawTimeline_(passes)).not.toThrow();
      expect(Object.keys(p().drawEvents_).length).toBe(3);
    });
  });

  describe('handleOnMouseMove_', () => {
    it('invokes each registered draw-event and resets the cursor when not hovering', () => {
      p().ctx_ = mockCtx();
      const evtFn = vi.fn(() => false);

      p().drawEvents_ = { k: evtFn };
      p().canvas_.style.cursor = 'pointer';

      p().handleOnMouseMove_({ clientX: 5, clientY: 5 } as never);

      expect(evtFn).toHaveBeenCalled();
      expect(p().canvas_.style.cursor).toBe('default');
    });

    it('keeps the pointer cursor while hovering a pass', () => {
      p().ctx_ = mockCtx();
      p().drawEvents_ = { k: vi.fn(() => true) };
      p().canvas_.style.cursor = 'pointer';

      p().handleOnMouseMove_({ clientX: 5, clientY: 5 } as never);

      expect(p().canvas_.style.cursor).toBe('pointer');
    });
  });

  describe('resizeCanvas_', () => {
    it('resizes the canvas to the window and refreshes the timeline (widescreen)', () => {
      const update = vi.spyOn(plugin, 'updateTimeline').mockImplementation(() => undefined);

      getEl('satellite-timeline-menu')!.style.display = 'block';

      p().resizeCanvas_(true);

      expect(p().canvas_.width).toBe(window.innerWidth);
      expect(update).toHaveBeenCalled();
    });

    it('does nothing when the menu is hidden', () => {
      const update = vi.spyOn(plugin, 'updateTimeline').mockImplementation(() => undefined);

      getEl('satellite-timeline-menu')!.style.display = 'none';

      p().resizeCanvas_();

      expect(update).not.toHaveBeenCalled();
    });
  });
});
