import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees } from 'ootk';
import { defaultSat } from './environment/apiMocks';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('NewLaunch_class', () => {
  let newLaunchPlugin: NewLaunch;

  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
    setupStandardEnvironment([SelectSatManager]);
    newLaunchPlugin = new NewLaunch();
    newLaunchPlugin.init();
  });

  standardPluginSuite(NewLaunch, 'NewLaunch');
  standardPluginMenuButtonTests(NewLaunch, 'NewLaunch');
});

describe('NewLaunch_form', () => {
  let newLaunchPlugin: NewLaunch;

  beforeEach(() => {
    keepTrackApi.containerRoot.innerHTML = '';
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

    keepTrackApi.emit(KeepTrackApiEvents.selectSatData, defaultSat, defaultSat.id);
    keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, newLaunchPlugin.bottomIconElementName);

    expect(() => getEl(`${newLaunchPlugin.sideMenuElementName}-submit`).click()).not.toThrow();
    jest.advanceTimersByTime(1000);
  });
});
