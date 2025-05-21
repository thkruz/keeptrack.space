// src/doris/input/KeyboardHandler.ts
import { EventBus } from '../events/event-bus';
import { InputEvents } from '../events/event-types';

/**
 * Basic keyboard input handler
 */
export class KeyboardHandler {
  private readonly keyStates: Map<string, boolean> = new Map();
  container: HTMLElement;

  constructor(private readonly eventBus: EventBus) {
    // Initialize keyboard event listeners
  }

  /**
   * Initialize keyboard event listeners
   */
  initialize(container: HTMLElement = document.body): void {
    this.container = container;

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
    // Ignore keydown events if the event target is not in the container
    if (!(event.target as HTMLElement)?.contains(this.container as Node)) {
      return;
    }

    const key = event.key; // TODO: Should we handle keyCode as well?
    const isRepeat = this.keyStates.get(key) || false;

    /*
     * Prevent default browser behavior for handled keys
     * Don't prevent default for function keys (F1-F12)
     * when Shift is pressed
     */
    if (!(/^f\d{1,2}$/iu).test(key) && !event.shiftKey) {
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

    if (key === 'Shift') {
      // Loop through all uppercase letters and change them to lowercase when the shift key is released
      for (let i = 97; i <= 122; i++) {
        const lower = String.fromCharCode(i);
        const upper = lower.toUpperCase();

        if (this.keyStates.get(lower)) {
          this.keyStates.set(lower, false);
          this.keyStates.set(upper, true);
          this.eventBus.emit(
            InputEvents.KeyUp,
            event,
            lower,
            event.ctrlKey,
            event.shiftKey,
          );
          this.eventBus.emit(
            InputEvents.KeyDown,
            event,
            upper,
            false,
            event.ctrlKey,
            event.shiftKey,
          );
        }
      }
    }
  }

  getKeysState(): Map<string, boolean> {
    return this.keyStates;
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    // Ignore keydown events if the event target is not in the container
    if (!(event.target as HTMLElement)?.contains(this.container as Node)) {
      return;
    }

    const key = event.key;

    this.keyStates.set(key, false);

    this.eventBus.emit(
      InputEvents.KeyUp,
      event,
      key,
      event.ctrlKey,
      event.shiftKey,
    );

    if (key === 'Shift') {
      // Loop through all uppercase letters and change them to lowercase when the shift key is released
      for (let i = 65; i <= 90; i++) {
        const upper = String.fromCharCode(i);
        const lower = upper.toLowerCase();

        if (this.keyStates.get(upper)) {
          this.keyStates.set(upper, false);
          this.keyStates.set(lower, true);
          this.eventBus.emit(
            InputEvents.KeyUp,
            event,
            upper,
            event.ctrlKey,
            event.shiftKey,
          );
          this.eventBus.emit(
            InputEvents.KeyDown,
            event,
            lower,
            false,
            event.ctrlKey,
            event.shiftKey,
          );
        }
      }
    }
  }
}

