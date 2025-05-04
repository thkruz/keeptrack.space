// src/tessa/input/KeyboardHandler.ts
import { EventBus } from '../events/event-bus';
import { InputEvents } from '../events/event-types';

/**
 * Basic keyboard input handler
 */
export class KeyboardHandler {
  private readonly keyStates: Map<string, boolean> = new Map();

  constructor(private readonly eventBus: EventBus) {
    // Initialize keyboard event listeners
  }

  /**
   * Initialize keyboard event listeners
   */
  initialize(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Check if a key is currently pressed
   * @param key Key to check
   * @returns Whether the key is pressed
   */
  isKeyDown(key: string): boolean {
    return this.keyStates.get(key) || false;
  }

  /**
   * Update method called each frame - can be used for key repeat logic
   */
  update(): void {
    /*
     * In a more complete implementation, this would handle key repeats
     * and other time-based input features
     */
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const isRepeat = this.keyStates.get(key) || false;

    this.keyStates.set(key, true);

    this.eventBus.emit(
      InputEvents.KeyDown,
      event,
      key,
      isRepeat,
      event.ctrlKey,
      event.shiftKey,
    );
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    this.keyStates.set(key, false);

    this.eventBus.emit(
      InputEvents.KeyUp,
      event,
      key,
      event.ctrlKey,
      event.shiftKey,
    );
  }
}

