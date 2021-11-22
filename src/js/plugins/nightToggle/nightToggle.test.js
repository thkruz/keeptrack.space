import { init } from './nightToggle';
import { keepTrackApi } from '@app/js/api/externalApi';
import { keepTrackApiStubs } from '@app/js/api/apiMocks';

keepTrackApi.programs = { ...keepTrackApi.programs, ...keepTrackApiStubs.programs };

describe('nightToggle', () => {
  it('should be initialized', () => {
    init();
  });
  it('should add the bottom menu icon', () => {
    keepTrackApi.methods.uiManagerInit();
  });
  it('should respond when bottom icon clicked', () => {
    keepTrackApi.methods.bottomMenuClick('menu-day-night');
    keepTrackApi.programs.settingsManager.isDayNightToggle = true;
    keepTrackApi.methods.bottomMenuClick('menu-day-night');
    keepTrackApi.methods.bottomMenuClick('NOTmenu-day-night');
  });
  it('should alter the earth texture', () => {
    const gl = {
      bindTexture: () => jest.fn(),
    };
    keepTrackApi.programs.settingsManager.isDayNightToggle = false;
    keepTrackApi.methods.nightToggle(gl);
    keepTrackApi.programs.settingsManager.isDayNightToggle = true;
    keepTrackApi.methods.nightToggle(gl);
  });
});
