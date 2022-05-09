import { useMockWorkers } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { orbitManager } from '../../orbitManager/orbitManager';
import { satellite } from '../../satMath/satMath';
import { timeManager } from '../../timeManager/timeManager';
import { missileManager } from '../missile/missileManager';

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
  import('./update-select-box')
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
