import { getEl } from '@app/lib/get-el';
import { CollissionsPlugin } from '@app/plugins/collisions/collisions';
import { readFileSync } from 'fs';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('CollissionsPlugin_class', () => {
  let satConstellationsPlugin: CollissionsPlugin;
  beforeEach(() => {
    setupDefaultHtml();
    satConstellationsPlugin = new CollissionsPlugin();
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolve({
            ok: true,
            text: () =>
              new Promise((resolve) => {
                // use readFileSync to load SOCRATES.htm
                const socrates = readFileSync('./src/SOCRATES.html', 'utf8');
                resolve(socrates);
              }),
          } as Response);
        })
    );
  });

  standardPluginSuite(CollissionsPlugin, 'CollissionsPlugin');
  standardPluginMenuButtonTests(CollissionsPlugin, 'CollissionsPlugin');

  it('should have clickable objects', () => {
    websiteInit(satConstellationsPlugin);
    getEl('socrates-menu').click();
    satConstellationsPlugin.collisionList = [
      {
        toca: new Date(),
      } as any,
    ];
    satConstellationsPlugin['eventClicked_'](0);
  });
});
