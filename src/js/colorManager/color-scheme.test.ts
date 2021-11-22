import * as colorScheme from '@app/js/colorManager/color-scheme';
import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/externalApi';
keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

// @ponicode
describe('calculateColorBuffers', () => {
  let inst: any;

  beforeEach(() => {
    inst = new colorScheme.ColorScheme(keepTrackApi.programs.drawManager.gl, keepTrackApi.programs.satSet, keepTrackApi.programs.objectManager, () => ({
      color: [0, 0, 0, 1],
    }));
  });

  test('0', async () => {
    await inst.calculateColorBuffers(true);
  });

  test('1', async () => {
    await inst.calculateColorBuffers(false);
  });

  test('2', async () => {
    settingsManager.isFOVBubbleModeOn = true;
    keepTrackApi.programs.satSet.numSats = 2;
    inst.satData = [0, 0, 0];
    inst.selectSat = 0;
    inst.hoverSat = 0;
    inst.isVelocityColorScheme = true;
    inst.isSunlightColorScheme = true;
    await inst.calculateColorBuffers(true);
  });

  test('3', async () => {
    delete inst.satSet;
    await inst.calculateColorBuffers(true);
  });
});
