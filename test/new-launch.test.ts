import { keepTrackApi } from '@app/js/keepTrackApi';
import { NewLaunch } from '@app/js/plugins/new-launch/new-launch';
import { defaultSat } from './environment/apiMocks';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('NewLaunch_class', () => {
  let newLaunchPlugin: NewLaunch;
  beforeEach(() => {
    setupDefaultHtml();
    window.M = {
      AutoInit: () => {},
    };
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
      AutoInit: () => {},
    };
    newLaunchPlugin = new NewLaunch();
  });

  it('should have a form and buttons', () => {
    expect(document.getElementById(`${newLaunchPlugin.sideMenuElementName}-form`)).toBeDefined();
  });

  it('should have working buttons', () => {
    websiteInit(newLaunchPlugin);
    keepTrackApi.getCatalogManager().getSat = jest.fn().mockReturnValue({ ...defaultSat, isInGroup: true });
    keepTrackApi.getCatalogManager().selectedSat = defaultSat.id;
    keepTrackApi.getCatalogManager().satData = Array(50).fill({ ...defaultSat, isInGroup: true });
    keepTrackApi.getCatalogManager().isLaunchSiteManagerLoaded = true;
    keepTrackApi.getCatalogManager().launchSites = [
      {
        name: 'CAS',
        lat: 0,
        lon: 0,
      } as any,
    ];

    keepTrackApi.methods.selectSatData(defaultSat, defaultSat.id);
    keepTrackApi.methods.bottomMenuClick(newLaunchPlugin.bottomIconElementName);

    expect(() => document.getElementById(`${newLaunchPlugin.sideMenuElementName}-submit`).click()).not.toThrow();
    jest.advanceTimersByTime(1000);
  });
});
