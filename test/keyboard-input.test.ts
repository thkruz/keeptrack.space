import { Container } from '@app/engine/core/container';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeyboardInput } from '@app/engine/input/input-manager/keyboard-input';
import { Singletons } from '../src/engine/core/interfaces';

describe('KeyboardInput_class', () => {
  // Tests that keyHandler does not execute if uiManagerInstance.isCurrentlyTyping is true
  it('test_key_handler_typing', () => {
    const keyboardInput = new KeyboardInput();
    let test = false;

    keyboardInput.init();
    const uiManagerInstance = { isCurrentlyTyping: true };

    Container.getInstance().registerSingleton(Singletons.UiManager, uiManagerInstance);

    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string) => {
      if (key === 'R') {
        test = true;
      }
    });

    // Simulate key event while typing
    EventBus.getInstance().emit(EventBusEvent.KeyDown, 'R', 'KeyR', false, false, false);

    expect(test).toBe(true);
  });

  // Tests that registerKeyEvent adds a new KeyEvent object to the keyEvents array
  it('test_register_key_event', () => {
    const keyboardInput = new KeyboardInput();
    let test = false;

    keyboardInput.init();
    EventBus.getInstance().on(EventBusEvent.KeyDown, (key: string) => {
      if (key === 'R') {
        test = true;
      }
    });
    EventBus.getInstance().emit(EventBusEvent.KeyDown, 'R', 'KeyR', false, false, false);

    expect(test).toBe(true);
  });
});
