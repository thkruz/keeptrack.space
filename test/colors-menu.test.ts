import { ServiceLocator } from '@app/engine/core/service-locator';
import { KeepTrack } from '@app/keeptrack';
import { ColorMenu } from '@app/plugins/colors-menu/colors-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('ColorMenu_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    ServiceLocator.getCatalogManager().satCruncher = {
      addEventListener: () => {
        // Mock the addEventListener function
      },
      postMessage: () => {
        // Mock the postMessage function
      },
    } as unknown as Worker;
  });

  standardPluginSuite(ColorMenu);
  standardPluginMenuButtonTests(ColorMenu);
  standardPluginRmbTests(ColorMenu);

  it('should work when any side menu element is clicked', () => {
    const menu = new ColorMenu();

    websiteInit(menu);
    // Create a list of elements based on the li elements with data-color attributes
    const elements = Array.from(KeepTrack.getInstance().containerRoot.querySelectorAll<HTMLElement>('li[data-color]'));
    // Click each element and make sure the menu is closed

    elements.forEach((element) => {
      expect(() => {
        element.click();
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  }, 20000); // NOTE: Increase the timeout if there are more items in the menu in the future
});
