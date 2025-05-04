import { Doris } from '@app/doris/doris';
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

  keepTrackApi.register({
    event: KeepTrackApiEvents.updateSelectBox,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  Doris.getInstance().on(KeepTrackApiEvents.onCruncherReady, () => {
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

  Doris.getInstance().on(KeepTrackApiEvents.bottomMenuClick, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.hideSideMenus, (): void => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.nightToggle, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.orbitManagerInit, () => {
    // Do nothing
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
  Doris.getInstance().emit(KeepTrackApiEvents.onCruncherReady);
  keepTrackApi.runEvent(KeepTrackApiEvents.onCruncherMessage);
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerInit);
  keepTrackApi.runEvent(KeepTrackApiEvents.uiManagerOnReady);
  Doris.getInstance().emit(KeepTrackApiEvents.bottomMenuClick, 'test');
  Doris.getInstance().emit(KeepTrackApiEvents.hideSideMenus);

  Doris.getInstance().emit(KeepTrackApiEvents.orbitManagerInit);
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
