import { Degrees } from '@ootk/src/main';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { KeepTrack } from '@app/keeptrack';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { defaultSat } from '@test/environment/apiMocks';
import { getEl } from '@app/engine/utils/get-el';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from '@test/generic-tests';
import { vi } from 'vitest';

describe('NewLaunch', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  standardPluginSuite(NewLaunch, 'NewLaunch');
  standardPluginMenuButtonTests(NewLaunch, 'NewLaunch');
});

describe('NewLaunch_class', () => {
  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(NewLaunch, 'NewLaunch');
  standardPluginMenuButtonTests(NewLaunch, 'NewLaunch');
});

describe('NewLaunch_form', () => {
  let newLaunchPlugin: NewLaunch;

  beforeEach(() => {
    KeepTrack.getInstance().containerRoot.innerHTML = '';
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    newLaunchPlugin = new NewLaunch();
  });

  it('should have a form and buttons', () => {
    websiteInit(newLaunchPlugin);
    expect(getEl(`${newLaunchPlugin.sideMenuElementName}-form`)).toBeDefined();
  });

  it('should have working buttons', () => {
    websiteInit(newLaunchPlugin);
    ServiceLocator.getCatalogManager().getObject = vi.fn().mockReturnValue({ ...defaultSat, isInGroup: true, isSatellite: () => true });
    PluginRegistry.getPlugin(SelectSatManager)!.selectedSat = defaultSat.id;
    ServiceLocator.getCatalogManager().objectCache = Array(50).fill({ ...defaultSat, isInGroup: true, isSatellite: () => true });
    ServiceLocator.getCatalogManager().isLaunchSiteManagerLoaded = true;
    ServiceLocator.getCatalogManager().launchSites = {
      CAS: {
        name: 'CAS',
        lat: 0 as Degrees,
        lon: 0 as Degrees,
      },
    };

    EventBus.getInstance().emit(EventBusEvent.selectSatData, defaultSat, defaultSat.id);
    EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, newLaunchPlugin.bottomIconElementName);

    expect(() => getEl(`${newLaunchPlugin.sideMenuElementName}-submit`)!.click()).not.toThrow();
    vi.advanceTimersByTime(1000);
  });
});
