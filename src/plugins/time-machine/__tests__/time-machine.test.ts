import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { Milliseconds } from '@ootk/src/main';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { TimeMachine } from '@app/plugins/time-machine/time-machine';
import { defaultSat } from '@test/environment/apiMocks';
import { setupDefaultHtml, setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('TimeMachine', () => {
  beforeEach(() => {
    setupStandardEnvironment();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(TimeMachine, 'TimeMachine');
});

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
    vi.useFakeTimers();
    websiteInit(timeMachinePlugin);
    ServiceLocator.getCatalogManager().getObject = vi.fn().mockReturnValue(defaultSat);
    ServiceLocator.getCatalogManager().objectCache = Array(50).fill(defaultSat);
    KeepTrack.getInstance().containerRoot.innerHTML += '<div id="search-results"></div>';

    settingsManager.timeMachineDelay = <Milliseconds>0;
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, timeMachinePlugin.bottomIconElementName);
    vi.advanceTimersByTime(1000);
    expect(timeMachinePlugin.isMenuButtonActive).toBe(true);
    vi.advanceTimersByTime(10000);
    // Restore fake timers to avoid leaking real timers to other test files
    vi.useFakeTimers();
  }, 15000);
});
