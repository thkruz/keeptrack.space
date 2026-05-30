import { vi } from 'vitest';
/**
 * @jest-environment jsdom
 */

import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { PluginEventManager } from '@app/engine/plugins/lifecycle/plugin-event-manager';

describe('PluginEventManager', () => {
  let eventBus: EventBus;
  let eventManager: PluginEventManager;

  beforeEach(() => {
    // Reset EventBus singleton
    eventBus = EventBus.getInstance();
    eventBus.unregisterAllEvents();

    eventManager = new PluginEventManager(eventBus);
  });

  afterEach(() => {
    eventManager.unsubscribeAll();
  });

  describe('on', () => {
    it('should register a callback for an event', () => {
      const callback = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback);

      expect(eventManager.subscriptionCount).toBe(1);
      expect(eventManager.hasSubscription(EventBusEvent.bottomMenuClick)).toBe(true);
    });

    it('should invoke the callback when event is emitted', () => {
      const callback = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback);
      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(callback).toHaveBeenCalledWith('test-icon');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple callbacks for the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback1);
      eventManager.on(EventBusEvent.bottomMenuClick, callback2);

      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(eventManager.subscriptionCount).toBe(2);
    });
  });

  describe('off', () => {
    it('should unsubscribe a specific callback', () => {
      const callback = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback);
      expect(eventManager.subscriptionCount).toBe(1);

      eventManager.off(EventBusEvent.bottomMenuClick, callback);
      expect(eventManager.subscriptionCount).toBe(0);
    });

    it('should not invoke the callback after unsubscribing', () => {
      const callback = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback);
      eventManager.off(EventBusEvent.bottomMenuClick, callback);

      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should emit events to the event bus', () => {
      const callback = vi.fn();

      eventBus.on(EventBusEvent.bottomMenuClick, callback);
      eventManager.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(callback).toHaveBeenCalledWith('test-icon');
    });
  });

  describe('unsubscribeAll', () => {
    it('should unsubscribe all registered callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback1);
      eventManager.on(EventBusEvent.hideSideMenus, callback2);

      expect(eventManager.subscriptionCount).toBe(2);

      eventManager.unsubscribeAll();

      expect(eventManager.subscriptionCount).toBe(0);
    });

    it('should not invoke callbacks after unsubscribeAll', () => {
      const callback = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback);
      eventManager.unsubscribeAll();

      eventBus.emit(EventBusEvent.bottomMenuClick, 'test-icon');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('hasSubscription', () => {
    it('should return true when subscription exists', () => {
      eventManager.on(EventBusEvent.bottomMenuClick, vi.fn());

      expect(eventManager.hasSubscription(EventBusEvent.bottomMenuClick)).toBe(true);
    });

    it('should return false when no subscription exists', () => {
      expect(eventManager.hasSubscription(EventBusEvent.bottomMenuClick)).toBe(false);
    });

    it('should return false after unsubscribing', () => {
      const callback = vi.fn();

      eventManager.on(EventBusEvent.bottomMenuClick, callback);
      eventManager.off(EventBusEvent.bottomMenuClick, callback);

      expect(eventManager.hasSubscription(EventBusEvent.bottomMenuClick)).toBe(false);
    });
  });

  describe('subscriptionCount', () => {
    it('should return 0 when no subscriptions', () => {
      expect(eventManager.subscriptionCount).toBe(0);
    });

    it('should return correct count after adding subscriptions', () => {
      eventManager.on(EventBusEvent.bottomMenuClick, vi.fn());
      eventManager.on(EventBusEvent.hideSideMenus, vi.fn());
      eventManager.on(EventBusEvent.uiManagerInit, vi.fn());

      expect(eventManager.subscriptionCount).toBe(3);
    });
  });
});
