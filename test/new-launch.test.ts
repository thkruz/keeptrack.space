import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees } from 'ootk';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('NewLaunch_class', () => {
  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(NewLaunch, 'NewLaunch');
  standardPluginMenuButtonTests(NewLaunch, 'NewLaunch');
});

describe('NewLaunch_form', () => {
  let newLaunchPlugin: NewLaunch;

  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
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
    keepTrackApi.getCatalogManager().getObject = jest.fn().mockReturnValue({ ...defaultSat, isInGroup: true, isSatellite: () => true });
    keepTrackApi.getPlugin(SelectSatManager).selectedSat = defaultSat.id;
    keepTrackApi.getCatalogManager().objectCache = Array(50).fill({ ...defaultSat, isInGroup: true, isSatellite: () => true });
    keepTrackApi.getCatalogManager().isLaunchSiteManagerLoaded = true;
    keepTrackApi.getCatalogManager().launchSites = {
      CAS: {
        name: 'CAS',
        lat: 0 as Degrees,
        lon: 0 as Degrees,
      },
    };

    keepTrackApi.emit(EventBusEvent.selectSatData, defaultSat, defaultSat.id);
    keepTrackApi.emit(EventBusEvent.bottomMenuClick, newLaunchPlugin.bottomIconElementName);

    expect(() => getEl(`${newLaunchPlugin.sideMenuElementName}-submit`)!.click()).not.toThrow();
    jest.advanceTimersByTime(1000);
  });
});
