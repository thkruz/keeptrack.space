/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { EngineEventMap, EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';

/**
 * Subscription record for tracking event handlers.
 */
interface EventSubscription<T extends EventBusEvent = EventBusEvent> {
  event: T;
  callback: (...args: EngineEventMap[T]) => void;
}

/**
 * Manages event subscriptions for a plugin with automatic cleanup.
 *
 * This class provides a centralized way to manage EventBus subscriptions
 * for a plugin, ensuring all subscriptions are properly tracked and can
 * be cleaned up when the plugin is destroyed.
 *
 * @example
 * ```typescript
 * class MyPlugin extends KeepTrackPlugin {
 *   private events = new PluginEventManager();
 *
 *   init() {
 *     this.events.on(EventBusEvent.selectSatData, (sat, id) => {
 *       console.log('Satellite selected:', id);
 *     });
 *   }
 *
 *   destroy() {
 *     this.events.unsubscribeAll();
 *   }
 * }
 * ```
 */
export class PluginEventManager {
  private subscriptions: EventSubscription[] = [];
  private readonly eventBus: EventBus;

  /**
   * Creates a new PluginEventManager.
   * @param eventBus Optional EventBus instance. Defaults to EventBus.getInstance().
   */
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus ?? EventBus.getInstance();
  }

  /**
   * Register a callback for an event.
   * The callback will be automatically tracked for cleanup.
   *
   * @param event The event to listen for.
   * @param callback The callback to invoke when the event is emitted.
   */
  on<T extends EventBusEvent>(
    event: T,
    callback: (...args: EngineEventMap[T]) => void,
  ): void {
    this.eventBus.on(event, callback);
    this.subscriptions.push({ event, callback: callback as (...args: EngineEventMap[EventBusEvent]) => void });
  }

  /**
   * Register a callback for an event that will only be called once.
   * The callback will be automatically tracked for cleanup.
   *
   * @param event The event to listen for.
   * @param callback The callback to invoke when the event is emitted.
   */
  once<T extends EventBusEvent>(
    event: T,
    callback: (...args: EngineEventMap[T]) => void,
  ): void {
    // Wrap the callback to remove it from our tracking after it's called
    const wrappedCallback = ((...args: EngineEventMap[T]) => {
      callback(...args);
      this.removeSubscription(event, wrappedCallback as (...args: EngineEventMap[EventBusEvent]) => void);
    }) as (...args: EngineEventMap[T]) => void;

    this.eventBus.on(event, wrappedCallback);
    this.subscriptions.push({ event, callback: wrappedCallback as (...args: EngineEventMap[EventBusEvent]) => void });
  }

  /**
   * Unsubscribe a specific callback from an event.
   *
   * @param event The event to unsubscribe from.
   * @param callback The callback to remove.
   */
  off<T extends EventBusEvent>(
    event: T,
    callback: (...args: EngineEventMap[T]) => void,
  ): void {
    this.eventBus.unregister(event, callback);
    this.removeSubscription(event, callback as (...args: EngineEventMap[EventBusEvent]) => void);
  }

  /**
   * Emit an event with the given arguments.
   *
   * @param event The event to emit.
   * @param args The arguments to pass to the event handlers.
   */
  emit<T extends EventBusEvent>(event: T, ...args: EngineEventMap[T]): void {
    this.eventBus.emit(event, ...args);
  }

  /**
   * Unsubscribe all registered callbacks.
   * This should be called when the plugin is destroyed.
   */
  unsubscribeAll(): void {
    for (const subscription of this.subscriptions) {
      try {
        this.eventBus.unregister(
          subscription.event,
          subscription.callback as (...args: EngineEventMap[typeof subscription.event]) => void,
        );
      } catch {
        // Ignore errors during cleanup - the callback may have already been removed
      }
    }
    this.subscriptions = [];
  }

  /**
   * Get the number of active subscriptions.
   */
  get subscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * Check if there are any active subscriptions for a specific event.
   *
   * @param event The event to check.
   */
  hasSubscription(event: EventBusEvent): boolean {
    return this.subscriptions.some((sub) => sub.event === event);
  }

  /**
   * Remove a subscription from the tracking list.
   */
  private removeSubscription(
    event: EventBusEvent,
    callback: (...args: EngineEventMap[EventBusEvent]) => void,
  ): void {
    const index = this.subscriptions.findIndex(
      (sub) => sub.event === event && sub.callback === callback,
    );

    if (index !== -1) {
      this.subscriptions.splice(index, 1);
    }
  }
}
