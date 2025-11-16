import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { Milliseconds } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { KeepTrack } from '@app/keeptrack';

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
    ServiceLocator.getCatalogManager().getObject = jest.fn().mockReturnValue(defaultSat);
    ServiceLocator.getCatalogManager().objectCache = Array(50).fill(defaultSat);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="search-results"></div>';

    settingsManager.timeMachineDelay = <Milliseconds>0;
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, timeMachinePlugin.bottomIconElementName);
    jest.advanceTimersByTime(1000);
    expect(timeMachinePlugin.isMenuButtonActive).toBe(true);
    jest.advanceTimersByTime(10000);
  }, 15000);
});
