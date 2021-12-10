import { keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import * as canvasRecorder from './CanvasRecorder';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('CanvasRecorder.instance', () => {
  let inst: any;

  beforeEach(() => {
    inst = new canvasRecorder.CanvasRecorder(1024);
  });

  test('0', async () => {
    await inst.start();
  });

  test('1', async () => {
    try {
      await inst.stop();
    } catch {
      // do nothing
    }
  });

  test('2', async () => {
    window.URL.createObjectURL = jest.fn();
    await inst.save();
  });

  test('3', async () => {
    await inst.checkIfRecording();
  });

  test('4', async () => {
    await inst.setIsRecording(true);
  });
});
