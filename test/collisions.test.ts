/* eslint-disable dot-notation */
import { getEl } from '@app/lib/get-el';
import { CollisionEvent, Collissions } from '@app/plugins/collisions/collisions';
import { readFileSync } from 'fs';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

const socratesFileData = JSON.parse(readFileSync('./public/tle/SOCRATES.json', 'utf8'));

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
            json: () =>
              new Promise((resolve) => {
                resolve(socratesFileData);
              }),
          } as Response);
        }),
    );
  });

  standardPluginSuite(Collissions, 'CollissionsPlugin');
  standardPluginMenuButtonTests(Collissions, 'CollissionsPlugin');

  it('should have clickable objects', () => {
    websiteInit(satConstellationsPlugin);
    getEl('collisions-menu').click();
    satConstellationsPlugin['collisionList_'] = [
      {
        toca: '2021-01-01T00:00:00.000Z',
        sat1: '25544',
        sat1Name: 'ISS (ZARYA)',
        sat1Status: 'active',
        sat2: '00005',
        sat2Name: 'VANGUARD 1',
        sat2Status: 'inactive',
        sat1AgeOfTLE: 1,
        sat2AgeOfTLE: 2,
        minRng: 3,
        dilutionThreshold: 4,
        relSpeed: 5,
        maxProb: 6,
      } as CollisionEvent,
    ];
    satConstellationsPlugin['eventClicked_'](0);
  });
});
