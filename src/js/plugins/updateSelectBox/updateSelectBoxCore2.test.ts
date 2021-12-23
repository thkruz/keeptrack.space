import { useMockWorkers } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { orbitManager } from '../../orbitManager/orbitManager';
import { missileManager } from '../../plugins/missile/missileManager';
import { satellite } from '../../satMath/satMath';
import { timeManager } from '../../timeManager/timeManager';

useMockWorkers();

keepTrackApi.programs.missileManager = missileManager;
keepTrackApi.programs.satellite = satellite;
keepTrackApi.programs.orbitManager = orbitManager;
keepTrackApi.programs.timeManager = timeManager;
(<any>window).settingsManager = {
  plugins: {
    datetime: {},
  },
};

test(`updateSelectBoxCore Unit Testing`, () => {
  import('../../plugins/updateSelectBox/updateSelectBoxCore')
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
    name: '',
    lat: 0,
    lon: 0,
    alt: 0,
    az: 0,
    el: 0,
    rng: 0,
    inView: true,
  };
  missileManager.getMissileTEARR = jest.fn();
});
