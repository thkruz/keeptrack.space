import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import type { TourStep } from '@app/plugins/onboarding/tour-engine';
import { advanceOnIconClick, advanceWhenMenuOpens, buildTeaserStep, gatedStep, isPluginLocked, isPluginUsable, utilityIconTarget } from '@app/plugins/onboarding/tour-steps';
import { settingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const stubPlugin = (overrides: Partial<KeepTrackPlugin> = {}): KeepTrackPlugin =>
  ({
    id: 'StubPlugin',
    bottomIconElementName: 'stub-menu-icon',
    isMenuButtonActive: false,
    isLoginRequired: false,
    ...overrides,
  }) as unknown as KeepTrackPlugin;

const TEASER_COPY = { featureId: 'stubFeature', title: 'Teaser title', body: 'Teaser body' };

/** Adds a drawer row for the stub plugin (teasers need a visible anchor). */
const addDrawerItem = (elementName = 'stub-menu-icon'): void => {
  const content = document.createElement('div');

  content.id = 'drawer-content';
  content.innerHTML = `<div class="drawer-item" data-plugin-id="${elementName}"></div>`;
  document.body.appendChild(content);
};

/** Adds a pinned utility-footer icon for the stub plugin. */
const addUtilityIcon = (elementName = 'stub-menu-icon'): void => {
  const footer = document.createElement('div');

  footer.id = 'drawer-utility-footer';
  footer.innerHTML = `<div class="drawer-utility-icon" data-plugin-id="${elementName}"></div>`;
  document.body.appendChild(footer);
};

const realStep: TourStep = {
  id: 'real-step',
  kind: 'coachmark',
  title: 'Real title',
  body: 'Real body',
};

describe('tour-steps helpers', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    PluginRegistry.unregisterAllPlugins();
    document.body.classList.remove('user-logged-in');
    settingsManager.isDisableLoginGate = false;
  });

  afterEach(() => {
    PluginRegistry.unregisterAllPlugins();
    KeepTrackPlugin.loginGateOpenModal = null;
    document.body.classList.remove('user-logged-in');
    document.getElementById('drawer-content')?.remove();
    document.getElementById('drawer-utility-footer')?.remove();
    vi.restoreAllMocks();
  });

  describe('advanceWhenMenuOpens', () => {
    it('matches only the plugin icon and verifies the menu really opened', () => {
      const stub = stubPlugin();

      PluginRegistry.addPlugin(stub);

      const config = advanceWhenMenuOpens('StubPlugin');

      expect(config.event).toBe(EventBusEvent.bottomMenuClick);
      expect(config.predicate?.('other-icon')).toBe(false);
      expect(config.predicate?.('stub-menu-icon')).toBe(true);

      expect(config.verify?.()).toBe(false);
      (stub as { isMenuButtonActive: boolean }).isMenuButtonActive = true;
      expect(config.verify?.()).toBe(true);
    });

    it('never matches when the plugin is not loaded', () => {
      const config = advanceWhenMenuOpens('MissingPlugin');

      expect(config.predicate?.('stub-menu-icon')).toBe(false);
      expect(config.verify?.()).toBe(false);
    });
  });

  describe('utility-footer toggles (UTILITY_ONLY plugins, e.g. SensorFov)', () => {
    it('utilityIconTarget finds the pinned footer icon, not a drawer item', () => {
      PluginRegistry.addPlugin(stubPlugin());

      // No footer yet: a step guarded on the icon stays unavailable instead of
      // silently self-skipping through the missing-target path
      expect(utilityIconTarget('StubPlugin')).toBeNull();

      const footer = document.createElement('div');

      footer.id = 'drawer-utility-footer';
      footer.innerHTML = '<div class="drawer-utility-icon" data-plugin-id="stub-menu-icon"></div>';
      document.body.appendChild(footer);

      expect(utilityIconTarget('StubPlugin')).not.toBeNull();
      expect(utilityIconTarget('MissingPlugin')).toBeNull();
      footer.remove();
    });

    it('advanceOnIconClick matches the icon click without a menu-open verify', () => {
      PluginRegistry.addPlugin(stubPlugin());

      const config = advanceOnIconClick('StubPlugin');

      expect(config.event).toBe(EventBusEvent.bottomMenuClick);
      expect(config.predicate?.('stub-menu-icon')).toBe(true);
      expect(config.predicate?.('other-icon')).toBe(false);
      expect(config.verify).toBeUndefined();
    });
  });

  describe('plugin lock helpers', () => {
    it('locked = gated plugin + logged out; unlocked once logged in', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));

      expect(isPluginLocked('StubPlugin')).toBe(true);
      expect(isPluginUsable('StubPlugin')).toBe(false);

      document.body.classList.add('user-logged-in');
      expect(isPluginLocked('StubPlugin')).toBe(false);
      expect(isPluginUsable('StubPlugin')).toBe(true);
    });

    it('a disabled login gate unlocks gated plugins', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      settingsManager.isDisableLoginGate = true;

      expect(isPluginLocked('StubPlugin')).toBe(false);
    });
  });

  describe('teaser steps', () => {
    it('is unavailable in OSS builds (loginGateOpenModal is null)', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      addDrawerItem();
      KeepTrackPlugin.loginGateOpenModal = null;

      const teaser = buildTeaserStep('StubPlugin', TEASER_COPY);

      expect(teaser.isAvailable?.()).toBe(false);
    });

    it('is available for a locked plugin in Pro builds and advances on login', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      addDrawerItem();
      KeepTrackPlugin.loginGateOpenModal = vi.fn();

      const teaser = buildTeaserStep('StubPlugin', TEASER_COPY);

      expect(teaser.isAvailable?.()).toBe(true);
      expect(teaser.placement).toBe('right');
      expect(teaser.advanceOn?.event).toBe(EventBusEvent.userLogin);
      expect(teaser.actionButton).toBeDefined();

      teaser.actionButton?.action();
      expect(KeepTrackPlugin.loginGateOpenModal).toHaveBeenCalled();
    });

    it('anchors to the utility-footer icon for UTILITY_ONLY features', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      addUtilityIcon();
      KeepTrackPlugin.loginGateOpenModal = vi.fn();

      const teaser = buildTeaserStep('StubPlugin', TEASER_COPY);

      expect(teaser.isAvailable?.()).toBe(true);
      expect(teaser.placement).toBe('top');
      expect(teaser.target?.()).not.toBeNull();

      // beforeEnter pins the hover-expanded footer open; afterExit releases it
      teaser.beforeEnter?.();
      expect(document.getElementById('drawer-utility-footer')?.classList.contains('expanded')).toBe(true);
      teaser.afterExit?.('next');
      expect(document.getElementById('drawer-utility-footer')?.classList.contains('expanded')).toBe(false);
    });

    it('is unavailable without any icon anchor (no drawer item, no footer icon)', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      KeepTrackPlugin.loginGateOpenModal = vi.fn();

      const teaser = buildTeaserStep('StubPlugin', TEASER_COPY);

      expect(teaser.isAvailable?.()).toBe(false);
    });

    it('is unavailable once the user is logged in (real step shows instead)', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      addDrawerItem();
      KeepTrackPlugin.loginGateOpenModal = vi.fn();
      document.body.classList.add('user-logged-in');

      const teaser = buildTeaserStep('StubPlugin', TEASER_COPY);

      expect(teaser.isAvailable?.()).toBe(false);
    });
  });

  describe('gatedStep', () => {
    it('returns the real step when the feature is usable', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: false }));

      expect(gatedStep('StubPlugin', realStep, TEASER_COPY).id).toBe('real-step');
    });

    it('returns the teaser when the feature is login-locked', () => {
      PluginRegistry.addPlugin(stubPlugin({ isLoginRequired: true }));
      KeepTrackPlugin.loginGateOpenModal = vi.fn();

      expect(gatedStep('StubPlugin', realStep, TEASER_COPY).id).toBe('teaser-stubFeature');
    });

    it('returns the real step (filtered by its own guards) when the plugin is missing', () => {
      expect(gatedStep('MissingPlugin', realStep, TEASER_COPY).id).toBe('real-step');
    });
  });
});
