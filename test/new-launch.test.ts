import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { NewLaunch } from '@app/plugins/new-launch/new-launch';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { Degrees } from 'ootk';
import { defaultSat } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('NewLaunch_class', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let newLaunchPlugin: NewLaunch;

  // eslint-disable-next-line no-console
  console.debug(newLaunchPlugin);

  beforeEach(() => {
    setupDefaultHtml();
    window.M = {
      AutoInit: () => { },
    } as any;
    newLaunchPlugin = new NewLaunch();
  });

  standardPluginSuite(NewLaunch, 'NewLaunch');
  standardPluginMenuButtonTests(NewLaunch, 'NewLaunch');
});

describe('NewLaunch_form', () => {
  let newLaunchPlugin: NewLaunch;

  beforeEach(() => {
    setupDefaultHtml();
    window.M = {
      AutoInit: () => { },
    } as any;
    newLaunchPlugin = new NewLaunch();
  });

  it('should have a form and buttons', () => {
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

    keepTrackApi.runEvent(KeepTrackApiEvents.selectSatData, defaultSat, defaultSat.id);
    keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuClick, newLaunchPlugin.bottomIconElementName);

    expect(() => getEl(`${newLaunchPlugin.sideMenuElementName}-submit`).click()).not.toThrow();
    jest.advanceTimersByTime(1000);
  });
});
