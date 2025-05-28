import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
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
    keepTrackApi.getCatalogManager().getObject = jest.fn().mockReturnValue(defaultSat);
    keepTrackApi.getCatalogManager().objectCache = Array(50).fill(defaultSat);
    keepTrackApi.containerRoot.innerHTML += '<div id="search-results"></div>';

    settingsManager.timeMachineDelay = <Milliseconds>0;
    keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, timeMachinePlugin.bottomIconElementName);
    jest.advanceTimersByTime(1000);
    expect(timeMachinePlugin.isMenuButtonActive).toBe(true);
    jest.advanceTimersByTime(10000);
  }, 15000);
});
