import { EventMap } from './event-types';

/**
 * Type-safe event bus implementation for the TESSA Engine
 */
export class EventBus {
  private readonly listeners: Map<keyof EventMap, Array<{ callback: (...args: EventMap[]) => void; once: boolean }>> = new Map();

  /**
   * Register an event listener
   * @param eventName Name of the event to listen for
   * @param callback Function to call when the event is emitted
   * @param once Whether the listener should be removed after first invocation
   * @returns A function that removes this listener when called
   */
  on<K extends keyof EventMap>(eventName: K, callback: (...args: EventMap[K]) => void, once = false): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listeners = this.listeners.get(eventName)!;
    const listener = { callback, once } as { callback: (...args: EventMap[]) => void; once: boolean };

    listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(listener);

      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Register a one-time event listener
   * @param eventName Name of the event to listen for
   * @param callback Function to call when the event is emitted
   * @returns A function that removes this listener when called
   */
  once<K extends keyof EventMap>(eventName: K, callback: (...args: EventMap[K]) => void): () => void {
    return this.on(eventName, callback, true);
  }

  /**
   * Emit an event with provided arguments
   * @param eventName Name of the event to emit
   * @param args Arguments to pass to listeners
   * @returns Promise that resolves to whether the event had listeners
   */
  async emit<K extends keyof EventMap>(eventName: K, ...args: EventMap[K]): Promise<boolean> {
    const listeners = this.listeners.get(eventName);

    if (!listeners || listeners.length === 0) {
      return false;
    }

    // Create a copy of the listeners array to safely handle removals during iteration
    const currentListeners = [...listeners];

    // Track which listeners should be removed (once listeners)
    const toRemove: number[] = [];

    // Collect promises from all listeners
    const promises = currentListeners.map((listener, index) => {
      const result = listener.callback(...args);

      if (listener.once) {
        toRemove.push(index);
      }

      return result;
    });

    // Wait for all callbacks to complete (whether sync or async)
    await Promise.all(promises);

    // Remove once listeners in reverse order to avoid index shifting
    if (toRemove.length > 0) {
      for (let i = toRemove.length - 1; i >= 0; i--) {
        listeners.splice(toRemove[i], 1);
      }
    }

    return true;
  }

  /**
   * Remove all listeners for a specific event
   * @param eventName Name of the event to remove listeners for
   * @returns Whether any listeners were removed
   */
  removeAllListeners(eventName: keyof EventMap): boolean {
    return this.listeners.delete(eventName);
  }

  /**
   * Remove a specific listener for an event
   * @param eventName Name of the event
   * @param callback The callback function to remove
   * @returns Whether the listener was found and removed
   */
  removeListener<K extends keyof EventMap>(eventName: K, callback: (...args: EventMap[K]) => void): boolean {
    const listeners = this.listeners.get(eventName);

    if (!listeners) {
      return false;
    }

    const initialLength = listeners.length;

    // Filter out the matching callback
    const filteredListeners = listeners.filter((listener) =>
      // Use any to avoid type checking issues when comparing functions
      listener.callback.toString() !== callback.toString(),
    );

    if (filteredListeners.length === initialLength) {
      return false;
    }

    this.listeners.set(eventName, filteredListeners);

    return true;
  }

  /**
   * Get the number of listeners for an event
   * @param eventName Name of the event
   * @returns Number of listeners for the event
   */
  listenerCount(eventName: keyof EventMap): number {
    const listeners = this.listeners.get(eventName);


    return listeners ? listeners.length : 0;
  }

  /**
   * Check if an event has any listeners
   * @param eventName Name of the event
   * @returns Whether the event has any listeners
   */
  hasListeners(eventName: keyof EventMap): boolean {
    return this.listenerCount(eventName) > 0;
  }

  /**
   * Get a list of all event names with registered listeners
   * @returns Array of event names
   */
  eventNames(): keyof EventMap[] {
    return Array.from(this.listeners.keys()) as unknown as keyof EventMap[];
  }

  /**
   * Remove all listeners from all events
   */
  clear(): void {
    this.listeners.clear();
  }
}
