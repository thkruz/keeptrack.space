/*globals
  global
  test
  expect
  jest
*/

import { Dots } from '@app/js/drawManager/dots.js';

const glMock = global.mocks.glMock;
document.body.innerHTML = global.docBody;

test(`Dots Unit Testing`, () => {
  const settingsManager = window.settingsManager;
  const dotsManager = new Dots(glMock);
  dotsManager.draw({}, {}, {}, {});
  dotsManager.drawGpuPickingFrameBuffer({}, {}, {});
  settingsManager.cruncherReady = true;
  dotsManager.loaded = true;
  const mainCamera = {
    cameraType: {
      current: 0,
      planetarium: 1,
    },
    camMatrix: [0, 0, 0, 0],
  };
  dotsManager.draw({}, mainCamera, {}, {});
  dotsManager.drawGpuPickingFrameBuffer({}, {}, {});

  mainCamera.cameraType.current = mainCamera.cameraType.Planetarium;
  dotsManager.draw({}, mainCamera, {}, {});

  dotsManager.setupPickingBuffer([0, 1, 2, 3]);

  dotsManager.updateSizeBuffer([0, 1, 2, 3]);
  settingsManager.lastSearchResults = [1, 2];
  dotsManager.updateSizeBuffer([0, 1, 2, 3]);
  dotsManager.starIndex1 = 0;
  dotsManager.starIndex2 = 2;
  dotsManager.updateSizeBuffer([0, 1, 2, 3]);

  glMock.getProgramParameter = jest.fn(() => false);
  expect(() => new Dots(glMock)).toThrow('Could not compile WebGL program. \n\n');

  dotsManager.updatePositionBuffer();
  dotsManager.positionData = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ];
  dotsManager.updatePositionBuffer();
  dotsManager.velocityData = true;
  const timeManager = {
    propRate: 1,
    setDrawDt: jest.fn(),
  };
  dotsManager.updatePositionBuffer(2, 1, timeManager);
  settingsManager.fpsThrottle2 = 0;
  timeManager.dt = 1;
  dotsManager.updatePositionBuffer(2, 1, timeManager);
  settingsManager.minimumDrawDt = 0;
  timeManager.drawDt = 10;
  settingsManager.lowPerf = false;
  settingsManager.maxFieldOfViewMarkers = 1;
  settingsManager.maxRadarData = 1;
  dotsManager.updatePositionBuffer(10, 1, timeManager);

  dotsManager.updatePMvCamMatrix([0, 0, 0, 0], mainCamera);

  expect(true).toBe(true);
});
