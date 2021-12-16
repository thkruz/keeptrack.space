import { keepTrackApiStubs } from '../api/apiMocks';
import { keepTrackApi } from '../api/keepTrackApi';
import { KeepTrackPrograms } from '../api/keepTrackTypes';
import { controlSiteManager } from './controlSiteManager';
import * as satLinkManager from './satLinkManager';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// @ponicode
describe('satLinkManager.init', () => {
  test('0', () => {
    const results = () => {
      satLinkManager.init(keepTrackApi.programs.sensorManager, controlSiteManager);
    };

    expect(results).toMatchSnapshot();
  });
});

// @ponicode
describe('satLinkManager.showlinks', () => {
  test('0', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Aehf).then((results) => expect(results).toMatchSnapshot());
  });
  test('1', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Dscs).then((results) => expect(results).toMatchSnapshot());
  });
  test('2', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Wgs).then((results) => expect(results).toMatchSnapshot());
  });
  test('3', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Iridium).then((results) => expect(results).toMatchSnapshot());
  });
  test('4', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Galileo).then((results) => expect(results).toMatchSnapshot());
  });
  test('5', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Starlink).then((results) => expect(results).toMatchSnapshot());
  });
  test('6', () => {
    satLinkManager.showLinks(keepTrackApi.programs.lineManager, keepTrackApi.programs.satSet, satLinkManager.SatConstellationString.Sbirs).then((results) => expect(results).toMatchSnapshot());
  });
});

// @ponicode
describe('satLinkManager.idToSatnum', () => {
  test('0', () => {
    const results = () => {
      satLinkManager.idToSatnum(keepTrackApi.programs.satSet);
    };

    expect(results).toMatchSnapshot();
  });
});
