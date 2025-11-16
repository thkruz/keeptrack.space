import { GroupsManager } from '@app/app/data/groups-manager';
import { GroupType } from '@app/app/data/object-group';
import { PluginRegistry } from '@app/engine/core/plugin-registry';
import { getEl } from '@app/engine/utils/get-el';
import { SatConstellations } from '@app/plugins/sat-constellations/sat-constellations';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';
import { ServiceLocator } from '@app/engine/core/service-locator';

describe('SatConstellations_class', () => {
  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
  });

  standardPluginSuite(SatConstellations);
  standardPluginMenuButtonTests(SatConstellations);
});

/*
 * TODO: This test needs satLinkManager to be initialized in catalogManager to properly
 * test the menu items.
 */
describe('SatConstellations_test_all_links', () => {
  const links = [] as HTMLElement[];
  const selectSatManager = new SelectSatManager();

  selectSatManager.init();
  const tempSatConstellationsPlugin = new SatConstellations();

  websiteInit(tempSatConstellationsPlugin);

  getEl('constellation-menu')!
    .querySelectorAll('li')
    .forEach((element) => {
      links.push(element);
    });

  let satConstellationsPlugin: SatConstellations;

  beforeEach(() => {
    PluginRegistry.unregisterAllPlugins();
    setupStandardEnvironment([SelectSatManager]);
    window.M = {
      AutoInit: () => {
        // Do nothing
      },
    } as unknown as typeof window.M;
    satConstellationsPlugin = new SatConstellations();
    websiteInit(satConstellationsPlugin);

    const groupList = {};

    ServiceLocator.getGroupsManager = () =>
      ({
        createGroup: (_type: GroupType, _listOfSats: number[], name: string) => {
          groupList[name] = {
            objects: [0],
          };
        },
        selectGroup: () => {
          // Do nothing
        },
        groupList,
      }) as unknown as GroupsManager;
  });

  links.forEach((element) => {
    test(`SatConstellations_test_${element.dataset.group}`, () => {
      SatConstellations.groupSelected = jest.fn();
      element.click();
    });
  });
});
