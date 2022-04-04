/* eslint-disable no-undefined */
import { useMockWorkers } from '@app/js/api/apiMocks';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { searchBox } from '@app/js/uiManager/searchBox';
import { defaultSat, keepTrackApiStubs } from '../api/apiMocks';
import { KeepTrackPrograms, SatObject } from '../api/keepTrackTypes';

keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

useMockWorkers();

test(`Basic Functions of Search Box`, () => {
  const { satSet } = keepTrackApi.programs;
  // Setup a unit test enviornment that doesn't worry about other modules
  keepTrackApi.programs.satSet.satData[0] = <SatObject>{
    static: true,
  };
  keepTrackApi.programs.satSet.satData[1] = defaultSat;
  keepTrackApi.programs.satSet.satData[2] = defaultSat;
  keepTrackApi.programs.satSet.satData[3] = <SatObject>(<unknown>{
    C: 'ANALSAT',
    active: false,
  });
  keepTrackApi.programs.satSet.satData[4] = <SatObject>{
    active: false,
  };
  keepTrackApi.programs.satSet.satData[5] = <SatObject>{
    country: 'US',
    launchSite: 'AFETR',
    launchVehicle: 'U',
    name: 'VANGUARD 1',
    type: 1,
    rcs: '0.1220',
    sccNum: '00005',
    TLE1: '1     5U 58002B   21107.45725112 -.00000113  00000-0 -16194-3 0  9999',
    TLE2: '2     5  34.2637  11.6832 1848228 280.4329  59.4145 10.84843191238363',
    active: true,
    apogee: 3845.1282721399293,
    argPe: 4.894477435916007,
    eccentricity: 0.1848228,
    id: 0,
    inclination: 0.5980143789155811,
    intlDes: '1958-002B',
    meanMotion: 10.843102290386977,
    perigee: 657.8610581463026,
    period: 132.80332154356245,
    raan: 0.2039103071690015,
    semiMajorAxis: 8622.494665143116,
    semiMinorAxis: 8473.945136538932,
    velocity: <any>{},
  };
  keepTrackApi.programs.satSet.satData[6] = <SatObject>{
    missile: true,
    active: false,
  };
  keepTrackApi.programs.satSet.satData[7] = <SatObject>{
    marker: true,
  };

  document.body.innerHTML += '<div id="search-results"></div>';
  document.body.innerHTML += '<div id="search"></div>';

  // Run Tests
  expect(searchBox.isResultBoxOpen()).toBe(false);
  expect(searchBox.getLastResultGroup()).toBe(undefined);
  expect(searchBox.getCurrentSearch()).toBe('');
  expect(searchBox.isHovering(false)).toBe(false);
  expect(searchBox.isHovering()).toBe(false);
  expect(searchBox.isHovering(true)).toBe(true);

  expect(searchBox.fillResultBox([{ ...defaultSat, ...{ satId: 0 } }], satSet)).toBe(undefined);

  expect(searchBox.doSearch('', false)).toStrictEqual([]);
  expect(searchBox.doSearch('25', false)).toStrictEqual([]);
  expect(searchBox.doSearch('39208', false)).toStrictEqual([]);
  expect(searchBox.doSearch('39208', true)).toStrictEqual([]);
  expect(searchBox.doSearch('VANGUARD', true)).toStrictEqual([5]);
  expect(searchBox.getCurrentSearch()).toBe('VANGUARD');

  expect(searchBox.setHoverSat(39208)).toBe(39208);
  expect(searchBox.getHoverSat()).toBe(39208);

  expect(searchBox.doArraySearch([5, 5])).toBe('00005,00005');

  let resultsA = satSet.satData;
  let resultsB = [];
  resultsB[0] = resultsA[5];
  resultsB[0].satId = 5;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);

  resultsB[0] = resultsA[5];
  keepTrackApi.programs.satSet.satData[5].missile = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
  keepTrackApi.programs.satSet.satData[5].missile = false;

  resultsB[0] = resultsA[5];
  resultsB[0].isON = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);

  resultsB[0] = resultsA[5];
  resultsB[0].isON = true;
  keepTrackApi.programs.satSet.satData[5].missile = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
  keepTrackApi.programs.satSet.satData[5].missile = false;

  resultsB[0] = resultsA[5];
  // eslint-disable-next-line camelcase
  resultsB[0].isSccNum = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
  // eslint-disable-next-line camelcase
  resultsB[0].isSccNum = false;

  resultsB[0] = resultsA[5];
  resultsB[0].isIntlDes = true;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);

  resultsB[0].patlen = false;
  expect(searchBox.fillResultBox(resultsB, satSet)).toBe(undefined);
});
