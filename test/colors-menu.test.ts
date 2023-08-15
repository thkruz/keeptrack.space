import { keepTrackApi } from '@app/js/keepTrackApi';
import { ColorMenu } from '@app/js/plugins/colors-menu/colors-menu';
import { setupStandardEnvironment } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('ColorMenu_class', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    keepTrackApi.getCatalogManager().satCruncher = {
      addEventListener: () => {},
      postMessage: () => {},
    } as any;
  });

  standardPluginSuite(ColorMenu);
  standardPluginMenuButtonTests(ColorMenu);
  standardPluginRmbTests(ColorMenu);

  it('should work when any side menu element is clicked', () => {
    const menu = new ColorMenu();
    websiteInit(menu);
    // Create a list of elements based on the li elements with data-color attributes
    const elements = <HTMLElement[]>Array.from(document.querySelectorAll('li[data-color]'));
    // Click each element and make sure the menu is closed
    elements.forEach((element) => {
      expect(() => {
        element.click();
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  }, 15000);
});
