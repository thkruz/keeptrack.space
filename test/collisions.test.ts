/* eslint-disable dot-notation */
import { getEl } from '@app/engine/utils/get-el';
import { CollisionEvent, Collisions } from '@app/plugins/collisions/collisions';
import { readFileSync } from 'fs';
import { setupDefaultHtml } from './environment/standard-env';
import { standardPluginMenuButtonTests, standardPluginSuite, websiteInit } from './generic-tests';

const socratesFileData = JSON.parse(readFileSync('./public/tle/SOCRATES.json', 'utf8'));

describe('CollisionsPlugin_class', () => {
  let satConstellationsPlugin: Collisions;

  beforeEach(() => {
    setupDefaultHtml();
    satConstellationsPlugin = new Collisions();
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

  standardPluginSuite(Collisions, 'CollisionsPlugin');
  standardPluginMenuButtonTests(Collisions, 'CollisionsPlugin');

  it('should have clickable objects', () => {
    websiteInit(satConstellationsPlugin);
    getEl(`${satConstellationsPlugin.id}-menu`)!.click();
    satConstellationsPlugin['collisionList_'] = [
      {
        ID: 1,
        SAT1: 25544,
        SAT1_NAME: 'ISS (ZARYA)',
        SAT1_STATUS: 'active',
        SAT2: 5,
        SAT2_NAME: 'VANGUARD 1',
        SAT2_STATUS: 'inactive',
        SAT1_AGE_OF_TLE: 1,
        SAT2_AGE_OF_TLE: 2,
        TOCA: '2021-01-01T00:00:00.000Z',
        MIN_RNG: 3,
        DILUTION_THRESHOLD: 4,
        REL_SPEED: 5,
        MAX_PROB: 6,
      } as CollisionEvent,
    ];
    satConstellationsPlugin['eventClicked_'](0);
  });
});
