// src/doris/input/KeyboardHandler.ts
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
    window.addEventListener('keydown', this.handleKeyDown.bind(this), {
      passive: false,
      capture: true,
    });
    window.addEventListener('keyup', this.handleKeyUp.bind(this), {
      passive: true,
      capture: true,
    });
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
   * @param deltaTime Time elapsed since last update in milliseconds
   */
  update(deltaTime: number): void {
    if (deltaTime <= 0) {
      // eslint-disable-next-line no-useless-return
      return;
    }
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

    /*
     * Prevent default browser behavior for handled keys
     * Don't prevent default for function keys (F1-F12)
     */
    if (!(/^f\d{1,2}$/iu).test(key)) {
      event.preventDefault();
    }

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

