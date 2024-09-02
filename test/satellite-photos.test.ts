import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { SatellitePhotos } from '@app/plugins/satellite-photos/satellite-photos';
import { setupDefaultHtml, setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SatellitePhotos_class', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let satellitePhotosPlugin: SatellitePhotos;

  // eslint-disable-next-line no-console
  console.debug(satellitePhotosPlugin);

  beforeEach(() => {
    setupDefaultHtml();
    satellitePhotosPlugin = new SatellitePhotos();
  });

  standardPluginSuite(SatellitePhotos, 'SatellitePhotos');
  standardPluginMenuButtonTests(SatellitePhotos, 'SatellitePhotos');
});

describe('SatellitePhotos_test_links', () => {
  const tempSatellitePhotosPlugin = new SatellitePhotos();

  websiteInit(tempSatellitePhotosPlugin);
  const links = Array.from(getEl('sat-photo-menu-content').getElementsByTagName('li')).map((li) => li.id);

  let satellitePhotosPlugin: SatellitePhotos;

  beforeEach(() => {
    setupStandardEnvironment();
    satellitePhotosPlugin = new SatellitePhotos();
    websiteInit(satellitePhotosPlugin);
    keepTrackApi.containerRoot.innerHTML += '<div id="colorbox-div"></div>';
    keepTrackApi.getCatalogManager = jest.fn().mockReturnValue({
      selectSat: jest.fn(),
      getSatFromObjNum: jest.fn().mockReturnValue({
        id: 1,
      }),
    });
  });

  links.forEach((link) => {
    it(`should have a working link to ${link}`, () => {
      expect(getEl(link)).toBeTruthy();
      expect(() => getEl(link).click()).not.toThrow();
    });
  });
});
