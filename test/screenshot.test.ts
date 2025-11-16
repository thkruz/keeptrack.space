import { Screenshot } from '@app/plugins/screenshot/screenshot';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginRmbTests, standardPluginSuite } from './generic-tests';
import { KeepTrack } from '@app/keeptrack';

describe('Screenshot_class', () => {
  let screenshotPlugin: Screenshot;

  beforeEach(() => {
    setupDefaultHtml();
    screenshotPlugin = new Screenshot();
  });

  standardPluginSuite(Screenshot, 'Screenshot');
  standardPluginMenuButtonTests(Screenshot, 'Screenshot');
  standardPluginRmbTests(Screenshot, 'Screenshot');

  // test if the screenshot can be taken
  it('should take a screenshot', () => {
    KeepTrack.getInstance().containerRoot.appendChild = jest.fn();
    document.createElement = jest.fn(() => ({
      click: jest.fn(),
      getContext: jest.fn(() => ({
        drawImage: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 0 })),
      })),
      toDataURL: jest.fn(() => 'data:image/png;base64,'),
      parentNode: {
        removeChild: jest.fn(),
      },
    })) as unknown as typeof document.createElement;
    expect(() => screenshotPlugin.takeScreenShot()).not.toThrow();
  });
});
