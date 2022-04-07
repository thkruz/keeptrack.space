import { SatCruncherMessage } from '@app/js/api/keepTrackTypes';
import { defaultSat, keepTrackApiStubs } from '../../api/apiMocks';
import { keepTrackApi } from '../../api/keepTrackApi';
import { KeepTrackPrograms } from '../../api/keepTrackTypes';
import { cruncherDotsManagerInteraction, cruncherExtraData, cruncherExtraUpdate, satCruncherOnMessage } from './cruncherInteractions';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

describe('cruncherExtraData', () => {
  it('should work', () => {
    const m = <SatCruncherMessage>(<unknown>{
      data: {
        extraData: JSON.stringify([defaultSat]),
      },
    });
    expect(() => cruncherExtraData(m)).not.toThrow();
  });

  it('should handle missing information', () => {
    const m = <SatCruncherMessage>(<unknown>{
      data: {
        extraData: JSON.stringify([defaultSat, []]),
      },
    });
    expect(() => cruncherExtraData(m)).not.toThrow();
  });
});

describe('cruncherExtraUpdate', () => {
  it('should work', () => {
    const m = <SatCruncherMessage>(<unknown>{
      data: {
        extraUpdate: true,
        satId: 0,
        extraData: JSON.stringify([defaultSat]),
      },
    });
    expect(() => cruncherExtraUpdate(m)).not.toThrow();
  });
});

describe('cruncherDotsManagerInteraction', () => {
  it('should work', () => {
    const m = {
      data: {
        satPos: [0, 0, 0],
        satVel: [0, 0, 0],
        satInView: [0],
        satInSun: [0],
        sensorMarkerArray: [0],
        satId: 0,
        extraData: JSON.stringify([defaultSat]),
      },
    };
    expect(() => cruncherDotsManagerInteraction(m)).not.toThrow();
  });

  it('should handle missing information', () => {
    let m = <SatCruncherMessage>(<unknown>{
      data: {
        satPos: keepTrackApi.programs.dotsManager.positionData,
        satVel: keepTrackApi.programs.dotsManager.velocityData,
        satInView: keepTrackApi.programs.dotsManager.inViewData,
        satInSun: keepTrackApi.programs.dotsManager.inSunData,
        sensorMarkerArray: [0],
        satId: 0,
        extraData: JSON.stringify([defaultSat]),
      },
    });
    expect(() => cruncherDotsManagerInteraction(m)).not.toThrow();

    delete keepTrackApi.programs.dotsManager.positionData;
    delete keepTrackApi.programs.dotsManager.velocityData;
    delete keepTrackApi.programs.dotsManager.inViewData;
    delete keepTrackApi.programs.dotsManager.inSunData;

    m = {
      data: {
        satPos: [0, 0, 0],
        satVel: [0, 0, 0],
        satInView: [0],
        satInSun: [0],
        sensorMarkerArray: [0],
        satId: 0,
        extraData: JSON.stringify([defaultSat]),
      },
    };
    expect(() => cruncherDotsManagerInteraction(m)).not.toThrow();
  });
});

describe('satCruncherOnMessage', () => {
  it('should work', () => {
    const m = {
      data: {
        satPos: [0, 0, 0],
        satVel: [0, 0, 0],
      },
    };
    expect(() => satCruncherOnMessage(m)).not.toThrow();
  });
});
