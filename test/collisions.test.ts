import { getEl } from '@app/lib/get-el';
import { Collissions } from '@app/plugins/collisions/collisions';
import { readFileSync } from 'fs';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

describe('CollissionsPlugin_class', () => {
  let satConstellationsPlugin: Collissions;
  beforeEach(() => {
    setupDefaultHtml();
    satConstellationsPlugin = new Collissions();
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolve({
            ok: true,
            text: () =>
              new Promise((resolve) => {
                // use readFileSync to load SOCRATES.htm
                const socrates = readFileSync('./public/SOCRATES.html', 'utf8');
                resolve(socrates);
              }),
          } as Response);
        })
    );
  });

  standardPluginSuite(Collissions, 'CollissionsPlugin');
  standardPluginMenuButtonTests(Collissions, 'CollissionsPlugin');

  it('should have clickable objects', () => {
    websiteInit(satConstellationsPlugin);
    getEl('socrates-menu').click();
    satConstellationsPlugin.collisionList_ = [
      {
        toca: new Date(),
      } as any,
    ];
    satConstellationsPlugin['eventClicked_'](0);
  });
});
