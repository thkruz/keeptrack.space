import { useMockWorkers } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { orbitManager } from '@app/js/orbitManager/orbitManager';
import { missileManager } from '@app/js/plugins/missile/missileManager';
import { satellite } from '@app/js/satMath/satMath';
import { timeManager } from '@app/js/timeManager/timeManager';

useMockWorkers();

keepTrackApi.programs.missileManager = missileManager;
keepTrackApi.programs.satellite = satellite;
keepTrackApi.programs.orbitManager = orbitManager;
keepTrackApi.programs.timeManager = timeManager;
settingsManager = {
  plugins: {
    datetime: {},
  },
};

test(`updateSelectBoxCore Unit Testing`, () => {
  import('@app/js/plugins/updateSelectBox/updateSelectBoxCore')
    .then((mod) => mod.init())
    .catch((err) => {
      console.debug(err);
    });
  timeManager.init();
  orbitManager.orbitWorker = {
    onmessage: jest.fn(),
  };
  satellite.setTEARR = jest.fn();
  satellite.currentTEARR = {
    lat: 0,
    lon: 0,
    alt: 0,
  };
  missileManager.getMissileTEARR = jest.fn();
});
