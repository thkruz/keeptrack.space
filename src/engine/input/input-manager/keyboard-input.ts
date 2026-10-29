import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { isNativeKeyboardTarget } from '@app/engine/input/input-manager/keyboard-native-target';
import { KeyEvent } from '../input-manager';

export class KeyboardInput {
  keyStates = new Map<string, boolean>();
  keyUpEvents = <KeyEvent[]>[];

  private readonly appModifierOwners_ = new Set<string>();
  private readonly nativeKeyOwners_ = new Set<string>();

  private resetKeyStates_ = (): void => {
    this.keyStates.clear();
    this.appModifierOwners_.clear();
    this.nativeKeyOwners_.clear();
  };

  // Observe ownership before a target can stop propagation or remove itself.
  // This observer never cancels events or interferes with modal/help capture handlers.
  private observeNativeKeyDown_ = (event: KeyboardEvent): void => {
    const identity = event.code || event.key;

    if (event.repeat && this.nativeKeyOwners_.has(identity)) {
      return;
    }
    this.nativeKeyOwners_.delete(identity);
    if (event.key === 'Tab' || ((event.key === 'Enter' || event.key === ' ') && isNativeKeyboardTarget(event.target))) {
      this.nativeKeyOwners_.add(identity);
      this.keyStates.set(event.key, false);
    }
  };

  private routeKeyEvent_(event: KeyboardEvent, isDown: boolean): void {
    const identity = event.code || event.key;
    const owned = this.nativeKeyOwners_.has(identity);

    if (!isDown) {
      this.nativeKeyOwners_.delete(identity);
    }
    if (owned || event.key === 'Tab' || ((event.key === 'Enter' || event.key === ' ') && isNativeKeyboardTarget(event.target))) {
      this.keyStates.set(event.key, false);
      return;
    }
    const blocked = (event.target instanceof Element && event.target.classList.contains('keyboard-priority')) || ServiceLocator.getUiManager().isCurrentlyTyping;

    if (blocked) {
      if (!isDown) {
        this.keyStates.set(event.key, false);
        if (this.appModifierOwners_.delete(event.key)) {
          if (event.key === 'Shift') {
            // Typing owns held letter keys now; never synthesize fresh application downs.
            for (let i = 65; i <= 90; i++) {
              this.keyStates.set(String.fromCodePoint(i), false);
              this.keyStates.set(String.fromCodePoint(i).toLowerCase(), false);
            }
          }
          EventBus.getInstance().emit(
            EventBusEvent.KeyUp,
            event.key,
            event.code,
            false,
            this.keyStates.get('Shift') ?? false,
            this.keyStates.get('Control') ?? false,
            event.altKey
          );
        }
      }
      return;
    }
    if (isDown) {
      this.keyDownHandler_(event);
    } else {
      this.keyUpHandler_(event);
    }
  }

  init() {
    if (!settingsManager.isEmbedMode) {
      window.addEventListener('blur', this.resetKeyStates_);
      window.addEventListener('focus', this.resetKeyStates_);
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
          if (!event.data.event || typeof event.data.event.key !== 'string') {
            return;
          }
          if (event.data.type === 'keydown') {
            this.observeNativeKeyDown_(event.data.event as KeyboardEvent);
            this.routeKeyEvent_(event.data.event as KeyboardEvent, true);
          } else if (event.data.type === 'keyup') {
            this.routeKeyEvent_(event.data.event as KeyboardEvent, false);
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

      // Non-cancelling capture preserves ownership even if the target removes itself.
      window.addEventListener('keydown', this.observeNativeKeyDown_, true);
      window.addEventListener('keydown', (event: KeyboardEvent) => this.routeKeyEvent_(event, true));
      window.addEventListener('keyup', (event: KeyboardEvent) => this.routeKeyEvent_(event, false));
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
    const isAltPressed = evt.altKey;

    this.keyStates.set(key, false);
    this.appModifierOwners_.delete(key);

    if (settingsManager.isDisableKeyboard) {
      return;
    }

    /*
     * Prevent default browser behavior for handled keys
     * Don't prevent default for function keys (F1-F12)
     * when Shift is pressed
     */
    if (!/^f\d{1,2}$/iu.test(key) && !evt.shiftKey) {
      evt.preventDefault?.();
    }

    EventBus.getInstance().emit(EventBusEvent.KeyUp, key, code, false, isShiftPressed, isCtrlPressed, isAltPressed);

    if (key === 'Shift') {
      // Loop through all uppercase letters and change them to lowercase when the shift key is released
      for (let i = 97; i <= 122; i++) {
        const lower = String.fromCharCode(i);
        const upper = lower.toUpperCase();

        if (this.keyStates.get(upper)) {
          this.keyStates.set(upper, false);
          this.keyStates.set(lower, true);
          EventBus.getInstance().emit(EventBusEvent.KeyUp, upper, code, false, isShiftPressed, isCtrlPressed, isAltPressed);
          EventBus.getInstance().emit(EventBusEvent.KeyDown, lower, code, false, isShiftPressed, isCtrlPressed, isAltPressed);
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
    const isAltPressed = evt.altKey;

    this.keyStates.set(key, true);

    if (settingsManager.isDisableKeyboard) {
      return;
    }

    /*
     * Prevent default browser behavior for handled keys
     * Don't prevent default for function keys (F1-F12)
     * when Shift is pressed
     */
    if (!/^f\d{1,2}$/iu.test(key) && !evt.shiftKey) {
      evt.preventDefault?.();
    }

    if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
      this.appModifierOwners_.add(key);
    }
    EventBus.getInstance().emit(EventBusEvent.KeyDown, key, code, isRepeat, isShiftPressed, isCtrlPressed, isAltPressed);

    if (key === 'Shift') {
      // Loop through all uppercase letters and change them to lowercase when the shift key is released
      for (let i = 97; i <= 122; i++) {
        const lower = String.fromCharCode(i);
        const upper = lower.toUpperCase();

        if (this.keyStates.get(lower)) {
          this.keyStates.set(lower, false);
          this.keyStates.set(upper, true);
          EventBus.getInstance().emit(EventBusEvent.KeyUp, lower, code, isRepeat, isShiftPressed, isCtrlPressed, isAltPressed);
          EventBus.getInstance().emit(EventBusEvent.KeyDown, upper, code, isRepeat, isShiftPressed, isCtrlPressed, isAltPressed);
        }
      }
    }
  }
}
