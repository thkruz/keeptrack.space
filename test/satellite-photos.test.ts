import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { keepTrackApi } from '@app/keepTrackApi';
import { SatellitePhotos } from '@app/plugins/satellite-photos/satellite-photos';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SatellitePhotos_class', () => {
  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(SatellitePhotos, 'SatellitePhotos');
  standardPluginMenuButtonTests(SatellitePhotos, 'SatellitePhotos');
});

describe('SatellitePhotos_test_links', () => {
  setupStandardEnvironment([SelectSatManager]);
  const tempSatellitePhotosPlugin = new SatellitePhotos();

  websiteInit(tempSatellitePhotosPlugin);
  const links = Array.from(getEl('sat-photo-menu-content')!.getElementsByTagName('li')).map((li) => li.id);

  let satellitePhotosPlugin: SatellitePhotos;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    satellitePhotosPlugin = new SatellitePhotos();
    websiteInit(satellitePhotosPlugin);
    keepTrackApi.containerRoot.innerHTML += '<div id="colorbox-div"></div>';
    ServiceLocator.getCatalogManager = jest.fn().mockReturnValue({
      selectSat: jest.fn(),
      getSatFromObjNum: jest.fn().mockReturnValue({
        id: 1,
      }),
    });
  });

  links.forEach((link) => {
    it(`should have a working link to ${link}`, () => {
      expect(getEl(link)).toBeTruthy();
      expect(() => getEl(link)!.click()).not.toThrow();
    });
  });
});
