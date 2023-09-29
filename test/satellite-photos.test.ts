import { keepTrackApi } from '@app/js/keepTrackApi';
import { SatellitePhotos } from '@app/js/plugins/satellite-photos/satellite-photos';
import { setupDefaultHtml, setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('SatellitePhotos_class', () => {
  let satellitePhotosPlugin: SatellitePhotos;
  beforeEach(() => {
    setupDefaultHtml();
    satellitePhotosPlugin = new SatellitePhotos();
  });

  standardPluginSuite(SatellitePhotos, 'SatellitePhotos');
  standardPluginMenuButtonTests(SatellitePhotos, 'SatellitePhotos');

  expect(() =>
    SatellitePhotos.dscovrLoaded({
      status: 200,
      response: JSON.stringify([
        {
          image: 'https://epic.gsfc.nasa.gov/archive/natural/2015/10/31/png/epic_1b_20151031074859.png',
          identifier: '20151031074859',
          // eslint-disable-next-line camelcase
          centroid_coordinates: {
            lat: 0.0,
            lon: 0.0,
          },
        },
      ]),
    })
  ).not.toThrow();
});

describe('SatellitePhotos_test_links', () => {
  const tempSatellitePhotosPlugin = new SatellitePhotos();
  websiteInit(tempSatellitePhotosPlugin);
  const links = Array.from(document.getElementById('sat-photo-menu-content').getElementsByTagName('li')).map((li) => li.id);

  let satellitePhotosPlugin: SatellitePhotos;
  beforeEach(() => {
    setupStandardEnvironment();
    satellitePhotosPlugin = new SatellitePhotos();
    websiteInit(satellitePhotosPlugin);
    document.body.innerHTML += '<div id="colorbox-div"></div>';
    keepTrackApi.getCatalogManager = jest.fn().mockReturnValue({
      selectSat: jest.fn(),
      getSatFromObjNum: jest.fn().mockReturnValue({
        id: 1,
      }),
    });
  });

  links.forEach((link) => {
    it(`should have a working link to ${link}`, () => {
      expect(document.getElementById(link)).toBeTruthy();
      expect(() => document.getElementById(link).click()).not.toThrow();
    });
  });
});

export const satellitePhotosPlugin = new SatellitePhotos();
