import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrackPlugin } from '@app/engine/plugins/base-plugin';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const makePlugin = (n: string): KeepTrackPlugin => {
  class P extends KeepTrackPlugin {
    readonly id = `ExclusiveMenu${n}`;
    dependencies_: string[] = [];
    bottomIconElementName = `excl-${n}-icon`;
    bottomIconLabel = n;
    bottomIconImg = 'icon.png' as unknown as Module;
    sideMenuElementName = `excl-${n}-menu`;
    sideMenuElementHtml = `<div>${n}</div>`;
  }

  return new P();
};

describe('opening a side menu closes the previously open one', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment();
    vi.spyOn(ServiceLocator.getUiManager(), 'hideSideMenus').mockImplementation(() => {
      EventBus.getInstance().emit(EventBusEvent.hideSideMenus);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('leaves only the last of four rapidly opened menus open and clickable', () => {
    const plugins = ['A', 'B', 'C', 'D'].map(makePlugin);

    plugins.forEach((p) => websiteInit(p));
    plugins.forEach((p) => {
      EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, p.bottomIconElementName);
    });
    vi.advanceTimersByTime(400);

    const menus = plugins.map((p) => document.getElementById(p.sideMenuElementName)!);

    menus.slice(0, 3).forEach((m) => {
      expect(m.hasAttribute('inert')).toBe(true);
      expect(m.style.transform).toBe('translateX(-120%)');
    });
    expect(menus[3].hasAttribute('inert')).toBe(false);
    expect(menus[3].style.transform).toBe('translateX(0)');
    expect(plugins.map((p) => p.isMenuButtonActive)).toEqual([false, false, false, true]);
  });
});
