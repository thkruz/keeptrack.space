import { KeepTrackApiEvents } from '@app/interfaces';
import { isThisNode } from '@app/static/isThisNode';
import { expect } from '@jest/globals';
import { DetailedSatellite } from 'ootk';
import { keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
  expect(() => {
    keepTrackApi.unregister({ event: KeepTrackApiEvents.touchStart, cbName: 'test' });
  }).toThrow(Error);

  keepTrackApi.on({
    event: KeepTrackApiEvents.updateSelectBox,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.onCruncherReady,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.onCruncherMessage,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.uiManagerInit,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.uiManagerOnReady,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.bottomMenuClick,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.hideSideMenus,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.nightToggle,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.orbitManagerInit,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.drawManagerLoadScene,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.drawOptionalScenery,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.updateLoop,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.rmbMenuActions,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.updateDateTime,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.uiManagerFinal,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.rightBtnMenuAdd,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: KeepTrackApiEvents.selectSatData,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.emit(KeepTrackApiEvents.updateSelectBox, 'test' as unknown as DetailedSatellite);
  keepTrackApi.emit(KeepTrackApiEvents.onCruncherReady);
  keepTrackApi.emit(KeepTrackApiEvents.onCruncherMessage);
  keepTrackApi.emit(KeepTrackApiEvents.uiManagerInit);
  keepTrackApi.emit(KeepTrackApiEvents.uiManagerOnReady);
  keepTrackApi.emit(KeepTrackApiEvents.bottomMenuClick, 'test');
  keepTrackApi.emit(KeepTrackApiEvents.hideSideMenus);

  /*
   * let emptyTexture: WebGLTexture;
   * keepTrackApi.runEvent(KeepTrackApiEvents.nightToggle(keepTrackApi.programs.drawManager.gl, emptyTexture, emptyTexture));
   */
  keepTrackApi.emit(KeepTrackApiEvents.orbitManagerInit);
  keepTrackApi.emit(KeepTrackApiEvents.drawManagerLoadScene);
  keepTrackApi.emit(KeepTrackApiEvents.drawOptionalScenery);
  keepTrackApi.emit(KeepTrackApiEvents.updateLoop);
  keepTrackApi.emit(KeepTrackApiEvents.rmbMenuActions, 'test', -1);
  keepTrackApi.emit(KeepTrackApiEvents.updateDateTime, new Date());
  keepTrackApi.emit(KeepTrackApiEvents.uiManagerFinal);
  keepTrackApi.emit(KeepTrackApiEvents.rightBtnMenuAdd);
  keepTrackApi.emit(KeepTrackApiEvents.selectSatData, defaultSat, 0);
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
