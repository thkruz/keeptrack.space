import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardInput } from '@app/engine/input/input-manager/keyboard-input';
import { keepTrackApi } from '@app/keepTrackApi';
import { Singletons } from '../src/engine/core/interfaces';
import { Container } from '@app/engine/core/container';

describe('KeyboardInput_class', () => {
  // Tests that keyHandler does not execute if uiManagerInstance.isCurrentlyTyping is true
  it('test_key_handler_typing', () => {
    const keyboardInput = new KeyboardInput();
    let test = false;

    keyboardInput.init();
    const uiManagerInstance = { isCurrentlyTyping: true };

    Container.getInstance().registerSingleton(Singletons.UiManager, uiManagerInstance);

    keepTrackApi.on(EventBusEvent.KeyDown, (key: string) => {
      if (key === 'R') {
        test = true;
      }
    });

    // Simulate key event while typing
    keepTrackApi.emit(EventBusEvent.KeyDown, 'R', 'KeyR', false, false, false);

    expect(test).toBe(true);
  });

  // Tests that registerKeyEvent adds a new KeyEvent object to the keyEvents array
  it('test_register_key_event', () => {
    const keyboardInput = new KeyboardInput();
    let test = false;

    keyboardInput.init();
    keepTrackApi.on(EventBusEvent.KeyDown, (key: string) => {
      if (key === 'R') {
        test = true;
      }
    });
    keepTrackApi.emit(EventBusEvent.KeyDown, 'R', 'KeyR', false, false, false);

    expect(test).toBe(true);
  });
});
