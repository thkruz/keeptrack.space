/*globals
  global
  test
  expect
  jest
*/

import { Dots } from '@app/js/drawManager/dots.js';
import { settingsManager } from '@app/js/settingsManager/settingsManager.ts';

const glMock = global.mocks.glMock;
document.body.innerHTML = global.docBody;

test(`Dots Unit Testing`, () => {
  window.settingsManager = settingsManager;
  const dotManager = new Dots(glMock);
  dotManager.draw({}, {}, {}, {});
  dotManager.drawGpuPickingFrameBuffer({}, {}, {});
  settingsManager.cruncherReady = true;
  dotManager.loaded = true;
  const cameraManager = {
    cameraType: {
      current: 0,
      planetarium: 1,
    },
    camMatrix: [0, 0, 0, 0],
  };
  dotManager.draw({}, cameraManager, {}, {});
  dotManager.drawGpuPickingFrameBuffer({}, {}, {});

  cameraManager.cameraType.current = cameraManager.cameraType.planetarium;
  dotManager.draw({}, cameraManager, {}, {});

  dotManager.setupPickingBuffer([0, 1, 2, 3]);

  dotManager.updateSizeBuffer([0, 1, 2, 3]);
  settingsManager.lastSearchResults = [1, 2];
  dotManager.updateSizeBuffer([0, 1, 2, 3]);
  dotManager.starIndex1 = 0;
  dotManager.starIndex2 = 2;
  dotManager.updateSizeBuffer([0, 1, 2, 3]);

  glMock.getProgramParameter = jest.fn(() => false);
  expect(() => new Dots(glMock)).toThrow('Could not compile WebGL program. \n\n');

  dotManager.updatePositionBuffer();
  dotManager.positionData = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  ];
  dotManager.updatePositionBuffer();
  dotManager.velocityData = true;
  const timeManager = {
    propRate: 1,
    setDrawDt: jest.fn(),
  };
  dotManager.updatePositionBuffer(2, 1, timeManager);
  settingsManager.fpsThrottle2 = 0;
  timeManager.dt = 1;
  dotManager.updatePositionBuffer(2, 1, timeManager);
  settingsManager.minimumDrawDt = 0;
  timeManager.drawDt = 10;
  settingsManager.lowPerf = false;
  settingsManager.maxFieldOfViewMarkers = 1;
  settingsManager.maxRadarData = 1;
  dotManager.updatePositionBuffer(10, 1, timeManager);

  dotManager.updatePMvCamMatrix([0, 0, 0, 0], cameraManager);

  expect(true).toBe(true);
});
