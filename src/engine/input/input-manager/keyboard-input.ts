import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyEvent } from '../input-manager';

export class KeyboardInput {
  keyStates = new Map<string, boolean>();
  keyUpEvents = <KeyEvent[]>[];

  init() {
    if (!settingsManager.isEmbedMode) {
      window.addEventListener('blur', this.keyStates.clear.bind(this.keyStates));
      window.addEventListener('focus', this.keyStates.clear.bind(this.keyStates));
    }

    if (!settingsManager.disableUI) {
      // Listen for keyboard events on the parent window if in embed mode and inside an iframe
      if (window !== window.parent && settingsManager.isEmbedMode) {
        // Listen for keyboard events sent from the parent via postMessage
        window.addEventListener('message', (event: MessageEvent) => {
          // If event.target's class contains "keyboard-priority", ignore it
          if (event.target instanceof Element && event.target.classList.contains('keyboard-priority')) {
            return;
          }

          // Verify the origin of the received message
          if (event.origin !== window.origin) {
            return;
          }

          if (!event.data || typeof event.data !== 'object') {
            return;
          }
          if (ServiceLocator.getUiManager().isCurrentlyTyping) {
            return;
          }

          if (event.data.type === 'keydown') {
            this.keyDownHandler_(event.data.event as KeyboardEvent);
          } else if (event.data.type === 'keyup') {
            this.keyUpHandler_(event.data.event as KeyboardEvent);
          }
        });
        /**
         * Example code for the parent window to post keyboard events to the iframe.
         * This should be placed in the parent window's code, not here.
         *
         * window.addEventListener('keydown', (e) => {
         *   iframe.contentWindow.postMessage({ type: 'keydown', event: {
         *     key: e.key,
         *     code: e.code,
         *     shiftKey: e.shiftKey,
         *     ctrlKey: e.ctrlKey,
         *     altKey: e.altKey,
         *     metaKey: e.metaKey
         *   } }, '*');
         * });
         * window.addEventListener('keyup', (e) => {
         *   iframe.contentWindow.postMessage({ type: 'keyup', event: {
         *     key: e.key,
         *     code: e.code,
         *     shiftKey: e.shiftKey,
         *     ctrlKey: e.ctrlKey,
         *     altKey: e.altKey,
         *     metaKey: e.metaKey
         *   } }, '*');
         * });
         */
      }

      // Listen for keyboard events on the current window
      window.addEventListener('keydown', (e: Event) => {
        // If event.target's class contains "keyboard-priority", ignore it
        if (e.target instanceof Element && e.target.classList.contains('keyboard-priority')) {
          return;
        }
        if (ServiceLocator.getUiManager().isCurrentlyTyping) {
          return;
        }
        this.keyDownHandler_(<KeyboardEvent>e);
      });
      window.addEventListener('keyup', (e: Event) => {
        // If event.target's class contains "keyboard-priority", ignore it
        if (e.target instanceof Element && e.target.classList.contains('keyboard-priority')) {
          return;
        }
        if (ServiceLocator.getUiManager().isCurrentlyTyping) {
          return;
        }
        this.keyUpHandler_(<KeyboardEvent>e);
      });
    }
  }

  getKeyStates() {
    return Array.from(this.keyStates.entries());
  }

  getKey(key: string) {
    return this.keyStates.get(key);
  }

  private keyUpHandler_(evt: KeyboardEvent) {
    const key = evt.key;
    const code = evt.code;
    const isShiftPressed = this.keyStates.get('Shift') ?? false;
    const isCtrlPressed = this.keyStates.get('Control') ?? false;

    this.keyStates.set(key, false);

    if (settingsManager.isDisableKeyboard) {
      return;
    }

    /*
     * Prevent default browser behavior for handled keys
     * Don't prevent default for function keys (F1-F12)
     * when Shift is pressed
     */
    if (!(/^f\d{1,2}$/iu).test(key) && !evt.shiftKey) {
      evt.preventDefault();
    }

    EventBus.getInstance().emit(EventBusEvent.KeyUp, key, code, false, isShiftPressed, isCtrlPressed);

    if (key === 'Shift') {
      // Loop through all uppercase letters and change them to lowercase when the shift key is released
      for (let i = 97; i <= 122; i++) {
        const lower = String.fromCharCode(i);
        const upper = lower.toUpperCase();

        if (this.keyStates.get(upper)) {
          this.keyStates.set(upper, false);
          this.keyStates.set(lower, true);
          EventBus.getInstance().emit(EventBusEvent.KeyUp, upper, code, false, isShiftPressed, isCtrlPressed);
          EventBus.getInstance().emit(EventBusEvent.KeyDown, lower, code, false, isShiftPressed, isCtrlPressed);
        }
      }
    }
  }

  private keyDownHandler_(evt: KeyboardEvent) {
    const key = evt.key;
    const isRepeat = this.keyStates.get(key) || false;
    const code = evt.code;
    const isShiftPressed = this.keyStates.get('Shift') ?? false;
    const isCtrlPressed = this.keyStates.get('Control') ?? false;

    this.keyStates.set(key, true);

    if (settingsManager.isDisableKeyboard) {
      return;
    }

    /*
     * Prevent default browser behavior for handled keys
     * Don't prevent default for function keys (F1-F12)
     * when Shift is pressed
     */
    if (!(/^f\d{1,2}$/iu).test(key) && !evt.shiftKey) {
      evt.preventDefault();
    }

    EventBus.getInstance().emit(EventBusEvent.KeyDown, key, code, isRepeat, isShiftPressed, isCtrlPressed);

    if (key === 'Shift') {
      // Loop through all uppercase letters and change them to lowercase when the shift key is released
      for (let i = 97; i <= 122; i++) {
        const lower = String.fromCharCode(i);
        const upper = lower.toUpperCase();

        if (this.keyStates.get(lower)) {
          this.keyStates.set(lower, false);
          this.keyStates.set(upper, true);
          EventBus.getInstance().emit(EventBusEvent.KeyUp, lower, code, isRepeat, isShiftPressed, isCtrlPressed);
          EventBus.getInstance().emit(EventBusEvent.KeyDown, upper, code, isRepeat, isShiftPressed, isCtrlPressed);
        }
      }
    }
  }
}
