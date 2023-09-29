import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { SatConstellations } from '@app/js/plugins/sat-constellations/sat-constellations';
import { setupDefaultHtml, setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { GroupType } from '@app/js/singletons/object-group';

describe('SatConstellations_class', () => {
  let satConstellationsPlugin: SatConstellations;
  beforeEach(() => {
    setupDefaultHtml();
    window.M = {
      AutoInit: () => {},
    };
    satConstellationsPlugin = new SatConstellations();
  });

  standardPluginSuite(SatConstellations, 'SatConstellations');
  standardPluginMenuButtonTests(SatConstellations, 'SatConstellations');
});

// TODO: This test needs satLinkManager to be initialized in catalogManager to properly
// test the menu items.
describe('SatConstellations_test_all_links', () => {
  let links = [];
  const tempSatConstellationsPlugin = new SatConstellations();
  websiteInit(tempSatConstellationsPlugin);

  getEl('constellation-menu')
    .querySelectorAll('li')
    .forEach((element) => {
      links.push(element);
    });

  let satConstellationsPlugin: SatConstellations;

  beforeEach(() => {
    setupStandardEnvironment();
    window.M = {
      AutoInit: () => {},
    };
    satConstellationsPlugin = new SatConstellations();
    websiteInit(satConstellationsPlugin);

    let groupList = {};
    keepTrackApi.getGroupsManager = () =>
      ({
        createGroup: (_type: GroupType, _listOfSats: number[], name: string) => {
          groupList[name] = {
            objects: [0],
          };
        },
        selectGroup: () => {},
        groupList: groupList,
      } as any);
  });

  links.forEach((element) => {
    test(`SatConstellations_test_${element.dataset.group}`, () => {
      element.click();
    });
  });
});
