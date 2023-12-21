import { isThisNode } from '@app/static/isThisNode';
import { expect } from '@jest/globals';
import { SatObject } from '../src/interfaces';
import { KeepTrackApiEvents, keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test(`keepTrackApi Unit Testing`, () => {
  expect(() => {
    keepTrackApi.register({
      event: 'test',
      cbName: 'test',
      cb: () => console.log('test'),
    });
  }).toThrow(Error);

  keepTrackApi.register({
    event: KeepTrackApiEvents.selectSatData,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  expect(() => {
    keepTrackApi.unregister({ event: 'test', cbName: 'test' });
  }).toThrow(Error);

  expect(() => {
    keepTrackApi.unregister({ event: KeepTrackApiEvents.selectSatData, cbName: 'test2' });
  }).toThrow(Error);

  keepTrackApi.unregister({ event: KeepTrackApiEvents.selectSatData, cbName: 'test' });

  keepTrackApi.register({
    event: 'updateSelectBox',
    cbName: 'test',
    cb: (sat: SatObject) => console.log(sat),
  });

  keepTrackApi.register({
    event: 'onCruncherReady',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'onCruncherMessage',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'uiManagerInit',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'uiManagerOnReady',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'bottomMenuClick',
    cbName: 'test',
    cb: (name) => console.log(name),
  });

  keepTrackApi.register({
    event: 'hideSideMenus',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'nightToggle',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'orbitManagerInit',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'drawManagerLoadScene',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'drawOptionalScenery',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateLoop,
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'rmbMenuActions',
    cbName: 'test',
    cb: (str) => console.log(str),
  });

  keepTrackApi.register({
    event: 'updateDateTime',
    cbName: 'test',
    cb: (str) => console.log(str),
  });

  keepTrackApi.register({
    event: 'uiManagerFinal',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: 'rightBtnMenuAdd',
    cbName: 'test',
    cb: () => console.log('test'),
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.selectSatData,
    cbName: 'test',
    cb: (sat, satId) => console.log(`${sat} - ${satId}`),
  });

  keepTrackApi.methods.updateSelectBox('test');
  keepTrackApi.methods.onCruncherReady();
  keepTrackApi.methods.onCruncherMessage();
  keepTrackApi.methods.uiManagerInit();
  keepTrackApi.methods.uiManagerOnReady();
  keepTrackApi.methods.bottomMenuClick('test');
  keepTrackApi.methods.hideSideMenus();

  // let emptyTexture: WebGLTexture;
  // keepTrackApi.methods.nightToggle(keepTrackApi.programs.drawManager.gl, emptyTexture, emptyTexture);
  keepTrackApi.methods.orbitManagerInit();
  keepTrackApi.methods.drawManagerLoadScene();
  keepTrackApi.methods.drawOptionalScenery();
  keepTrackApi.methods.updateLoop();
  keepTrackApi.methods.rmbMenuActions('test');
  keepTrackApi.methods.updateDateTime(new Date());
  keepTrackApi.methods.uiManagerFinal();
  keepTrackApi.methods.rightBtnMenuAdd();
  keepTrackApi.methods.selectSatData(defaultSat, 0);
});

describe(`keepTrackApi.html`, () => {
  test(`keepTrackApi.html Good HTML`, () => {
    expect(() => {
      keepTrackApi.html`<div id="about-menu" class="side-menu-parent start-hidden text-select">`;
    }).not.toThrow(Error);
  });

  test(`keepTrackApi.html Bad HTML`, () => {
    expect(() => keepTrackApi.html(<TemplateStringsArray>(<unknown>'A'))).toThrow(Error);
  });
});

describe('externalApi.isThisJest', () => {
  test('0', () => expect(() => isThisNode()).not.toThrow());
  test('1', () => expect(isThisNode()).toMatchSnapshot());
});
