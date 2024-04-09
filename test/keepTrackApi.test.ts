import { KeepTrackApiEvents } from '@app/interfaces';
import { isThisNode } from '@app/static/isThisNode';
import { expect } from '@jest/globals';
import { SatObject } from '../src/interfaces';
import { keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
  expect(() => {
    keepTrackApi.unregister({ event: KeepTrackApiEvents.touchStart, cbName: 'test' });
  }).toThrow(Error);

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateSelectBox,
    cbName: 'test',
    cb: (sat: SatObject) => console.log(sat),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.onCruncherReady,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.onCruncherMessage,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.uiManagerInit,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.uiManagerOnReady,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.bottomMenuClick,
    cbName: 'test',
    cb: (name) => console.log(name),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.hideSideMenus,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.nightToggle,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.orbitManagerInit,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.drawManagerLoadScene,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.drawOptionalScenery,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateLoop,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.rmbMenuActions,
    cbName: 'test',
    cb: (str) => console.log(str),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateDateTime,
    cbName: 'test',
    cb: (str) => console.log(str),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.uiManagerFinal,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.rightBtnMenuAdd,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.selectSatData,
    cbName: 'test',
    cb: (sat, satId) => console.log(`${sat} - ${satId}`),
  });

  keepTrackApi.runEvent(KeepTrackApiEvents.updateSelectBox, 'test');
  keepTrackApi.runEvent(KeepTrackApiEvents.onCruncherReady);
  keepTrackApi.runEvent(KeepTrackApiEvents.onCruncherMessage);
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerInit);
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerOnReady);
  keepTrackApi.runEvent(KeepTrackApiEvents.bottomMenuClick, 'test');
  keepTrackApi.runEvent(KeepTrackApiEvents.hideSideMenus);

  /*
   * let emptyTexture: WebGLTexture;
   * keepTrackApi.runEvent(KeepTrackApiEvents.nightToggle(keepTrackApi.programs.drawManager.gl, emptyTexture, emptyTexture));
   */
  keepTrackApi.runEvent(KeepTrackApiEvents.orbitManagerInit);
  keepTrackApi.runEvent(KeepTrackApiEvents.drawManagerLoadScene);
  keepTrackApi.runEvent(KeepTrackApiEvents.drawOptionalScenery);
  keepTrackApi.runEvent(KeepTrackApiEvents.updateLoop);
  keepTrackApi.runEvent(KeepTrackApiEvents.rmbMenuActions, 'test', -1);
  keepTrackApi.runEvent(KeepTrackApiEvents.updateDateTime, new Date());
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerFinal);
  keepTrackApi.runEvent(KeepTrackApiEvents.rightBtnMenuAdd);
  keepTrackApi.runEvent(KeepTrackApiEvents.selectSatData, defaultSat, 0);
});

describe('keepTrackApi.html', () => {
  test('keepTrackApi.html Good HTML', () => {
    expect(() => {
      // eslint-disable-next-line no-unused-expressions
      keepTrackApi.html`<div id="about-menu" class="side-menu-parent start-hidden text-select">`;
    }).not.toThrow(Error);
  });

  test('keepTrackApi.html Bad HTML', () => {
    expect(() => keepTrackApi.html(<TemplateStringsArray>(<unknown>'A'))).toThrow(Error);
  });
});

describe('externalApi.isThisJest', () => {
  test('0', () => expect(() => isThisNode()).not.toThrow());
  test('1', () => expect(isThisNode()).toMatchSnapshot());
});
