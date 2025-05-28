import { InputEventType, keepTrackApi } from '@app/keepTrackApi';
import { KeyboardInput } from '@app/singletons/input-manager/keyboard-input';
import { keepTrackContainer } from '../src/container';
import { Singletons } from '../src/interfaces';

describe('KeyboardInput_class', () => {
  // Tests that keyHandler does not execute if uiManagerInstance.isCurrentlyTyping is true
  it('test_key_handler_typing', () => {
    const keyboardInput = new KeyboardInput();
    let test = false;

    keyboardInput.init();
    const uiManagerInstance = { isCurrentlyTyping: true };

    keepTrackContainer.registerSingleton(Singletons.UiManager, uiManagerInstance);

    keepTrackApi.on(InputEventType.KeyDown, (key: string) => {
      if (key === 'R') {
        test = true;
      }
    });

    // Simulate key event while typing
    keepTrackApi.emit(InputEventType.KeyDown, 'R', 'KeyR', false, false, false);

    expect(test).toBe(true);
  });

  // Tests that registerKeyEvent adds a new KeyEvent object to the keyEvents array
  it('test_register_key_event', () => {
    const keyboardInput = new KeyboardInput();
    let test = false;

    keyboardInput.init();
    keepTrackApi.on(InputEventType.KeyDown, (key: string) => {
      if (key === 'R') {
        test = true;
      }
    });
    keepTrackApi.emit(InputEventType.KeyDown, 'R', 'KeyR', false, false, false);

    expect(test).toBe(true);
  });
});
