import { keepTrackApiStubs } from '../../../api/apiMocks';
import { keepTrackApi } from '../../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../../api/keepTrackTypes';
import * as canvasRecorder from './canvas-recorder';
keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('CanvasRecorder.instance', () => {
  let inst: any;
  window.M = {
    toast: jest.fn(),
  };

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
