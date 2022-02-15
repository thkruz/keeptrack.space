import { keepTrackApiStubs, useMockWorkers } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';

useMockWorkers();

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

const settingsManager = {
  plugins: {
    datetime: {},
  },
};

test(`satelliteView Unit Testing`, () => {
  import('@app/js/plugins/satelliteView/satelliteView')
    .then((mod) => {
      mod.init();
      keepTrackApi.methods.uiManagerInit();
      keepTrackApi.methods.bottomMenuClick('menu-fake');
      keepTrackApi.methods.bottomMenuClick('menu-satview');
      keepTrackApi.methods.bottomMenuClick('menu-satview');

      keepTrackApi.programs.objectManager.selectedSat = 0;
      keepTrackApi.methods.bottomMenuClick('menu-satview');

      settingsManager.plugins.topMenu = true;
      keepTrackApi.methods.bottomMenuClick('menu-satview');
    })
    .catch((err) => {
      console.debug(err);
    });
});
