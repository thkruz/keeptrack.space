import { KeepTrackApiEvents } from '@app/interfaces';
import { isThisNode } from '@app/static/isThisNode';
import { Tessa } from '@app/tessa/tessa';
import { expect } from '@jest/globals';
import { DetailedSatellite } from 'ootk';
import { keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
  expect(() => {
    keepTrackApi.unregister({ event: KeepTrackApiEvents.touchStart, cbName: 'test' });
  }).toThrow(Error);

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateSelectBox,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  Tessa.getInstance().on(KeepTrackApiEvents.onCruncherReady, () => {
    // Do nothing
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.onCruncherMessage,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.uiManagerInit,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.uiManagerOnReady,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  Tessa.getInstance().on(KeepTrackApiEvents.bottomMenuClick, () => {
    // Do nothing
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.hideSideMenus,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.nightToggle,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.orbitManagerInit,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.drawManagerLoadScene,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.drawOptionalScenery,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateLoop,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.rmbMenuActions,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateDateTime,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.uiManagerFinal,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.rightBtnMenuAdd,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.register({
    event: KeepTrackApiEvents.selectSatData,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.runEvent(KeepTrackApiEvents.updateSelectBox, 'test' as unknown as DetailedSatellite);
  Tessa.getInstance().emit(KeepTrackApiEvents.onCruncherReady);
  keepTrackApi.runEvent(KeepTrackApiEvents.onCruncherMessage);
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerInit);
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerOnReady);
  Tessa.getInstance().emit(KeepTrackApiEvents.bottomMenuClick, 'test');
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
    expect(() => keepTrackApi.html`<div id="about-menu" class="side-menu-parent start-hidden text-select">`).not.toThrow(Error);
  });

  test('keepTrackApi.html Bad HTML', () => {
    expect(() => keepTrackApi.html(<TemplateStringsArray>(<unknown>'A'))).toThrow(Error);
  });
});

describe('externalApi.isThisJest', () => {
  test('0', () => expect(() => isThisNode()).not.toThrow());
  test('1', () => expect(isThisNode()).toMatchSnapshot());
});
