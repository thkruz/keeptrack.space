import { keepTrackApi } from '@app/js/keepTrackApi';
import { TimeMachine } from '@app/js/plugins/time-machine/time-machine';
import { Milliseconds } from 'ootk';
import { defaultSat } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('TimeMachine_class', () => {
  let timeMachinePlugin: TimeMachine;
  beforeEach(() => {
    setupDefaultHtml();
    timeMachinePlugin = new TimeMachine();
  });

  standardPluginSuite(TimeMachine, 'TimeMachine');
  standardPluginMenuButtonTests(TimeMachine, 'TimeMachine');

  // test the full animation
  it('should animate the time machine', () => {
    websiteInit(timeMachinePlugin);
    keepTrackApi.getCatalogManager().getSat = jest.fn().mockReturnValue({ ...defaultSat, isInGroup: true });
    keepTrackApi.getCatalogManager().satData = Array(50).fill({ ...defaultSat, isInGroup: true });
    document.body.innerHTML += '<div id="search-results"></div>';

    settingsManager.timeMachineDelay = <Milliseconds>0;
    keepTrackApi.methods.bottomMenuClick(timeMachinePlugin.bottomIconElementName);
    jest.advanceTimersByTime(1000);
    expect(timeMachinePlugin.isMenuButtonActive).toBe(true);
    jest.advanceTimersByTime(10000);
  }, 15000);
});
