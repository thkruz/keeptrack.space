import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import * as keyHandler from './keyHandler';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('keyHandler.keyHandler', () => {
  test('0', () => {
    document.body.innerHTML = `
      <div id="datetime-text">
        <span id="datetime-text-date">
      </div>
    `;
    let result = () => {
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'R' });
      keepTrackApi.programs.mainCamera.cameraType.current = 0;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 1;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 2;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 3;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 4;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 5;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 6;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keepTrackApi.programs.mainCamera.cameraType.current = 7;
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'C' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'F' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: 'H' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '!' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: ',' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: ',' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '.' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '.' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '<' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '<' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '>' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '>' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '0' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '+' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '=' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '-' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '_' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '1' });
      keyHandler.keyHandler(<KeyboardEvent>{ key: '1' });
    };
    expect(result).not.toThrow();
  });
});
