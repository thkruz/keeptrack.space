/* eslint-disable no-undefined */
/*globals
  global
  describe
  test
  jest
  beforeEach
  expect
*/

import { settingsManager } from '@app/js/settingsManager/settingsManager';

const setUrl = (url) => {
  const host = url.split('/')[2] || '';
  let search = url.split('?')[1] || '';
  search = search !== '' ? `?${search}` : '';

  global.window = Object.create(window);
  Object.defineProperty(window, 'location', {
    value: {
      href: url,
      host: host,
      search: search,
    },
    writable: true,
  });
};

describe('settingsManager URL Test', () => {
  let url = '';
  let testCaseNum = 0;

  beforeEach(() => {
    jest.resetModules();
    switch (testCaseNum) {
      case 0:
        url = 'http://keeptrack.space';
        setUrl(url);
        break;
      case 1:
        url = 'http://www.keeptrack.space?draw-less&draw-more&vec&retro&offline&debris&mw&trusat';
        setUrl(url);
        break;
      case 2:
        url = 'http://localhost';
        setUrl(url);
        break;
      case 3:
        url = 'http://thkruz.github.io';
        setUrl(url);
        break;
      case 4:
        url = '';
        setUrl(url);
        break;
      case 5:
        url = 'http://random.com';
        setUrl(url);
        break;
      case 6:
        url = 'http://localhost/embed.html';
        setUrl(url);
        break;
      case 7:
        url = 'http://localhost/index.html?trusat-only';
        setUrl(url);
        break;
      case 8:
        url = 'http://localhost/index.html?radarData&console';
        setUrl(url);
        break;
      case 9:
        url = 'http://localhost/index.html?lowperf&nostars';
        setUrl(url);
        // Make this a iPhone
        navigator.__defineGetter__('userAgent', function () {
          return 'iPhone'; // customized user agent
        });
        break;
      case 10:
        url = 'http://localhost/index.html?hires&cpo&logo&noPropRate';
        setUrl(url);
        break;
      case 11:
        // This is a test of other random functions
        break;
    }
    testCaseNum++;
    setUrl(url);
    import('@app/js/settingsManager/settingsManager.ts');
    settingsManager.init();
  });

  test('http://keeptrack.space', () => {
    expect(settingsManager.installDirectory).toBe('/');
    expect(settingsManager.isOfficialWebsite).toBe(true);
    expect(settingsManager.breakTheLaw).toBe(undefined);
  });

  test('http://www.keeptrack.space', () => {
    expect(settingsManager.installDirectory).toBe('/');
    expect(settingsManager.isOfficialWebsite).toBe(true);
    expect(settingsManager.breakTheLaw).toBe(undefined);
  });

  test('http://localhost', () => {
    // Caused by Node being active
    expect(settingsManager.installDirectory).toBe('http://127.0.0.1:8080/');
  });

  test('http://thkruz.github.io', () => {
    expect(settingsManager.installDirectory).toBe('/keeptrack.space/');
  });

  test('Unknown Host - ""', () => {
    expect(settingsManager.installDirectory).toBe('./');
    expect(settingsManager.offline).toBe(true);
    expect(settingsManager.breakTheLaw).toBe(true);
  });

  test('Unknown Host - http://random.com', () => {
    expect(settingsManager.installDirectory).toBe('/');
  });

  test('embed.html', () => {
    expect(settingsManager.enableHoverOrbits).toBe(true);
    expect(settingsManager.isDrawLess).toBe(true);
    expect(settingsManager.smallImages).toBe(true);
  });

  test('?trusat-only', () => {
    expect(settingsManager.colors.debris).toStrictEqual([0.9, 0.9, 0.9, 1]);
  });

  test('?radarData&console', () => {
    expect(settingsManager.isEnableConsole).toBe(true);
    expect(settingsManager.isEnableRadarData).toBe(true);
  });

  test('?lowperf&nostars', () => {
    expect(settingsManager.lowPerf).toBe(true);
  });

  test('?hires&cpo&logo&noPropRate', () => {
    expect(settingsManager.hiresImages).toBe(true);
  });

  test('Other functions of settingsManager', () => {
    settingsManager.setCurrentColorScheme('test');
    expect(settingsManager.currentColorScheme).toBe('test');

    settingsManager.loadStr('');
    settingsManager.loadStr('math');
    settingsManager.loadStr('science');
    settingsManager.altLoadMsgs = false;
    settingsManager.loadStr('science');
    settingsManager.loadStr('dots');
    settingsManager.loadStr('satIntel');
    settingsManager.loadStr('radarData');
    settingsManager.loadStr('painting');
    settingsManager.loadStr('coloring');
    settingsManager.loadStr('elsets');
    settingsManager.loadStr('easterEgg');

    settingsManager.db.off();
    settingsManager.db.on();
    settingsManager.db.log('test');
    settingsManager.db.log('test', true);
  });

  test('Other SettingsManager Tests', () => {
    window.innerWidth = 100;
    settingsManager.init();
  });
});
