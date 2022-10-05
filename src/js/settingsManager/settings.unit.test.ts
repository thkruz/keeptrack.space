// /* eslint-disable no-undefined */
// import { keepTrackApiStubs } from '../api/apiMocks';
// import { keepTrackApi } from '../api/keepTrackApi';
// import { KeepTrackPrograms } from '../api/keepTrackTypes';

// keepTrackApi.programs = <KeepTrackPrograms>(<unknown>{ ...keepTrackApi.programs, ...keepTrackApiStubs.programs });

// const setUrl = (url) => {
//   const host = url.split('/')[2] || '';
//   let search = url.split('?')[1] || '';
//   search = search !== '' ? `?${search}` : '';

//   global.window = Object.create(window);
//   Object.defineProperty(window, 'location', {
//     value: {
//       href: url,
//       host,
//       search,
//     },
//     writable: true,
//   });
// };

// describe('settingsManager URL Test', () => {
//   let url = '';
//   let testCaseNum = 0;

//   beforeEach(() => {
//     jest.resetModules();
//     switch (testCaseNum) {
//       case 0:
//         url = 'http://keeptrack.space'; // NOSONAR
//         setUrl(url);
//         break;
//       case 1:
//         url = 'http://www.keeptrack.space?draw-less&draw-more&vec&retro&offline&debris&mw&trusat'; // NOSONAR
//         setUrl(url);
//         break;
//       case 2:
//         url = 'http://localhost'; // NOSONAR
//         setUrl(url);
//         break;
//       case 3:
//         url = 'http://thkruz.github.io'; // NOSONAR
//         setUrl(url);
//         break;
//       case 4:
//         url = '';
//         setUrl(url);
//         break;
//       case 5:
//         url = 'http://random.com'; // NOSONAR
//         setUrl(url);
//         break;
//       case 6:
//         url = 'http://localhost/embed.html'; // NOSONAR
//         setUrl(url);
//         break;
//       case 7:
//         url = 'http://localhost/index.html?trusat-only'; // NOSONAR
//         setUrl(url);
//         break;
//       case 8:
//         url = 'http://localhost/index.html?radarData&console'; // NOSONAR
//         setUrl(url);
//         break;
//       case 9:
//         url = 'http://localhost/index.html?lowperf&nostars'; // NOSONAR
//         setUrl(url);
//         // Make this a iPhone
//         (<any>navigator).__defineGetter__('userAgent', () => 'iPhone');
//         break;
//       case 10:
//         url = 'http://localhost/index.html?hires&cpo&logo&noPropRate'; // NOSONAR
//         setUrl(url);
//         break;
//       case 11:
//         // This is a test of other random functions
//         break;
//       default:
//         break;
//     }
//     testCaseNum++;
//     setUrl(url);
//     // @ts-ignore
//     import('./settings.ts');
//     settingsManager.init();
//   });

//   test('http://keeptrack.space', () => {
//     // NOSONAR
//     expect(settingsManager.installDirectory).toBe('/');
//     expect(settingsManager.isOfficialWebsite).toBe(true);
//     expect(settingsManager.breakTheLaw).toBe(false);
//   });

//   test('http://www.keeptrack.space', () => {
//     // NOSONAR
//     expect(settingsManager.installDirectory).toBe('/');
//     expect(settingsManager.breakTheLaw).toBe(false);
//   });

//   test('http://localhost', () => {
//     // NOSONAR
//     // Caused by Node being active
//     expect(settingsManager.installDirectory).toBe('http://127.0.0.1:8080/');
//   });

//   test('http://thkruz.github.io', () => {
//     // NOSONAR
//     expect(settingsManager.installDirectory).toBe('/keeptrack.space/');
//   });

//   test('Unknown Host - ""', () => {
//     expect(settingsManager.installDirectory).toBe('./');
//     expect(settingsManager.offline).toBe(true);
//     expect(settingsManager.breakTheLaw).toBe(true);
//   });

//   test('Unknown Host - http://random.com', () => {
//     expect(settingsManager.installDirectory).toBe('/');
//   });

//   test('embed.html', () => {
//     expect(settingsManager.enableHoverOrbits).toBe(true);
//     expect(settingsManager.isDrawLess).toBe(true);
//     expect(settingsManager.smallImages).toBe(true);
//   });

//   // These need to be moved
//   test('Other functions of settingsManager', () => {
//     const { uiManager } = keepTrackApi.programs;

//     settingsManager.setCurrentColorScheme('test');
//     expect(settingsManager.currentColorScheme).toBe('test');

//     uiManager.loadStr('');
//     uiManager.loadStr('math');
//     uiManager.loadStr('science');
//     uiManager.loadStr('science');
//     uiManager.loadStr('dots');
//     uiManager.loadStr('satIntel');
//     uiManager.loadStr('radarData');
//     uiManager.loadStr('painting');
//     uiManager.loadStr('coloring');
//     uiManager.loadStr('elsets');
//     uiManager.loadStr('easterEgg');
//   });

//   test('Other SettingsManager Tests', () => {
//     window.innerWidth = 100;
//     settingsManager.init();
//   });
// });

test('0', () => {});
