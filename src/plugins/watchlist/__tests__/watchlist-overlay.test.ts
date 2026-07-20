import { ServiceLocator } from '@app/engine/core/service-locator';
import { getEl } from '@app/engine/utils/get-el';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { WatchlistPlugin } from '@app/plugins/watchlist/watchlist';
import { WatchlistOverlay } from '@app/plugins/watchlist/watchlist-overlay';
import { defaultSat, defaultSensor } from '@test/environment/apiMocks';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginSmokeSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

const MIN = 60 * 1000;

describe('WatchlistOverlay_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([WatchlistPlugin]);
  });

  standardPluginSmokeSuite(WatchlistOverlay, 'WatchlistOverlay');
});

describe('WatchlistOverlay behavior', () => {
  let plugin: WatchlistOverlay;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;
  const T = WatchlistOverlay as unknown as {
    IMMINENT_MS_: number;
    UPCOMING_MS_: number;
    AWARE_MS_: number;
    DISPLAY_CAP_MS_: number;
    DEPARTED_MS_: number;
  };

  const pass = (sat = defaultSat, offsetMs = 0) => ({ sat, time: new Date(Date.now() + offsetMs) });

  beforeEach(() => {
    setupStandardEnvironment([WatchlistPlugin, SelectSatManager]);
    plugin = new WatchlistOverlay();
    websiteInit(plugin);
    // The overlay content element is created on ui-wrapper; ensure it exists.
    if (!getEl('info-overlay-content', true)) {
      document.body.insertAdjacentHTML('beforeend', '<div id="info-overlay-content"></div>');
    }
    ServiceLocator.getDotsManager().inViewData = new Int8Array(100) as never;
    // openOverlayMenu_ reads currentSensors[0].id synchronously in its guard.
    ServiceLocator.getSensorManager().currentSensors = [defaultSensor] as never;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('classifyTier_', () => {
    it('returns active when in FOV and imminent', () => {
      expect(p().classifyTier_(T.IMMINENT_MS_ - 1, 1)).toBe('wl-tier-active');
    });

    it.each([
      ['imminent', T.IMMINENT_MS_ - 1, 'wl-tier-imminent'],
      ['upcoming', T.IMMINENT_MS_ + 1, 'wl-tier-upcoming'],
      ['aware', T.UPCOMING_MS_ + 1, 'wl-tier-aware'],
      ['background', T.AWARE_MS_ + 1, 'wl-tier-background'],
    ])('classifies a future pass as %s', (_label, delta, expected) => {
      expect(p().classifyTier_(delta, 0)).toBe(expected);
    });

    it('returns null beyond the 60-minute display cap', () => {
      expect(p().classifyTier_(T.DISPLAY_CAP_MS_ + 1, 0)).toBeNull();
    });

    it('classifies a recent past pass as departed and an old one as null', () => {
      expect(p().classifyTier_(-(T.DEPARTED_MS_ - 1), 0)).toBe('wl-tier-departed');
      expect(p().classifyTier_(-(T.DEPARTED_MS_ + 1), 0)).toBeNull();
    });
  });

  describe('formatPassTime_', () => {
    const now = Date.now();

    it('shows a leave-FOV countdown for active passes with an exit time', () => {
      const out = p().formatPassTime_(new Date(now), now, 'wl-tier-active', new Date(now + 90 * 1000));

      expect(out).toContain('T-1:30');
    });

    it('shows an entry countdown for imminent passes', () => {
      const out = p().formatPassTime_(new Date(now + 2 * MIN), now, 'wl-tier-imminent');

      expect(out).toContain('T-2:00');
    });

    it('shows an "ago" suffix for departed passes', () => {
      const out = p().formatPassTime_(new Date(now - 3 * MIN), now, 'wl-tier-departed');

      expect(out).toContain('+3m ago');
    });

    it('shows a plain clock for upcoming passes', () => {
      const out = p().formatPassTime_(new Date(now + 20 * MIN), now, 'wl-tier-upcoming');

      expect(out).toMatch(/\d{1,2}:\d{2}/u);
    });
  });

  describe('per-list color dot', () => {
    it('prefixes entries with a colored dot when the watchlist has a list color', () => {
      vi.spyOn(p().watchlistPlugin_, 'getListColor').mockReturnValue('#2ecc71');
      p().nextPassArray_ = [pass(defaultSat, 2 * MIN)];
      p().isMenuButtonActive = true;

      p().updateNextPassOverlay_(true);

      const html = getEl('info-overlay-content')!.innerHTML;

      expect(html).toContain('wl-list-dot');
      expect(html).toContain('background:#2ecc71');
    });

    it('renders no dot when no list color is set (OSS default)', () => {
      p().nextPassArray_ = [pass(defaultSat, 2 * MIN)];
      p().isMenuButtonActive = true;

      p().updateNextPassOverlay_(true);

      expect(getEl('info-overlay-content')!.innerHTML).not.toContain('wl-list-dot');
    });
  });

  describe('updateNextPassOverlay_', () => {
    it('renders bucketed entries with group headers', () => {
      // Two different tiers so headers are shown.
      p().nextPassArray_ = [pass(defaultSat, 2 * MIN), pass(defaultSat, 20 * MIN)];
      p().isMenuButtonActive = true;

      p().updateNextPassOverlay_(true);

      const html = getEl('info-overlay-content')!.innerHTML;

      expect(html).toContain('wl-entry');
      expect(html).toContain('wl-group-header');
    });

    it('shows a no-passes message when nothing is within the window', () => {
      // A pass far in the future is filtered out (beyond the 60-min cap).
      p().nextPassArray_ = [pass(defaultSat, 5 * 60 * MIN)];
      p().isMenuButtonActive = true;

      p().updateNextPassOverlay_(true);

      expect(getEl('info-overlay-content')!.innerHTML).toContain('No passes within 60 minutes');
    });

    it('returns early when there are no passes and the menu is closed', () => {
      p().nextPassArray_ = [];
      p().isMenuButtonActive = false;

      expect(() => p().updateNextPassOverlay_()).not.toThrow();
    });

    it('rotates departed entries when there are more than the visible cap', () => {
      // 7 recently-departed passes (> DEPARTED_MAX_VISIBLE_ of 5).
      p().nextPassArray_ = Array.from({ length: 7 }, (_, i) => pass(defaultSat, -(i * 1000 + 1000)));
      p().isMenuButtonActive = true;

      p().updateNextPassOverlay_(true);

      // Only 5 of the 7 departed entries render at once (the rest rotate in).
      expect(getEl('info-overlay-content')!.querySelectorAll('.wl-entry').length).toBe(5);
    });
  });

  describe('lifecycle + misc', () => {
    it('computeExitTime_ returns a Date or null and caches the result', () => {
      ServiceLocator.getSensorManager().currentSensors = [defaultSensor] as never;
      const first = p().computeExitTime_(defaultSat, Date.now());
      const cached = p().computeExitTime_(defaultSat, Date.now());

      expect(first === null || first instanceof Date).toBe(true);
      expect(cached).toBe(first);
    });

    it('onWatchlistUpdated_ disables the icon for an empty list', () => {
      const disable = vi.spyOn(plugin, 'setBottomIconToDisabled').mockImplementation(() => undefined);

      p().onWatchlistUpdated_([]);

      expect(disable).toHaveBeenCalled();
    });

    it('getCommandPaletteCommands exposes an open command', () => {
      const cmds = plugin.getCommandPaletteCommands();

      expect(cmds[0].id).toBe('WatchlistOverlay.open');
      expect(() => cmds[0].callback()).not.toThrow();
    });

    it('start/stop recalc timer toggles the interval handle', () => {
      p().startRecalcTimer_();
      expect(p().recalcTimer_).not.toBeNull();

      p().stopRecalcTimer_();
      expect(p().recalcTimer_).toBeNull();
    });

    it('updateLoop runs without throwing', () => {
      expect(() => plugin.updateLoop()).not.toThrow();
    });
  });
});
