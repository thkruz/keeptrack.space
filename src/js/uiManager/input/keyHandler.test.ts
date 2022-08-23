import { keepTrackApiStubs } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { KeepTrackPrograms } from '@app/js/api/keepTrackTypes';
import * as keyHandler from './keyHandler';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

const generateKeyboardEvent = (key: string) => <KeyboardEvent>{ key: key };

// @ponicode
describe('keyHandler.keyHandler', () => {
  test('0', () => {
    document.body.innerHTML = `
      <div id="datetime-text">
        <span id="datetime-text-date">
      </div>
    `;
    let result = () => {
      keyHandler.keyHandler(generateKeyboardEvent('R'));
      keepTrackApi.programs.mainCamera.cameraType.current = 0;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 1;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 2;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 3;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 4;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 5;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 6;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keepTrackApi.programs.mainCamera.cameraType.current = 7;
      keyHandler.keyHandler(generateKeyboardEvent('C'));
      keyHandler.keyHandler(generateKeyboardEvent('F'));
      keyHandler.keyHandler(generateKeyboardEvent('H'));
      keyHandler.keyHandler(generateKeyboardEvent('!'));
      keyHandler.keyHandler(generateKeyboardEvent(','));
      keyHandler.keyHandler(generateKeyboardEvent(','));
      keyHandler.keyHandler(generateKeyboardEvent('.'));
      keyHandler.keyHandler(generateKeyboardEvent('.'));
      keyHandler.keyHandler(generateKeyboardEvent('<'));
      keyHandler.keyHandler(generateKeyboardEvent('<'));
      keyHandler.keyHandler(generateKeyboardEvent('>'));
      keyHandler.keyHandler(generateKeyboardEvent('>'));
      keyHandler.keyHandler(generateKeyboardEvent('0'));
      keyHandler.keyHandler(generateKeyboardEvent('+'));
      keyHandler.keyHandler(generateKeyboardEvent('='));
      keyHandler.keyHandler(generateKeyboardEvent('-'));
      keyHandler.keyHandler(generateKeyboardEvent('_'));
      keyHandler.keyHandler(generateKeyboardEvent('1'));
      keyHandler.keyHandler(generateKeyboardEvent('1'));
    };
    expect(result).not.toThrow();
  });
});
