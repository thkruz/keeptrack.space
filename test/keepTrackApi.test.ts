import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { expect } from '@jest/globals';
import { DetailedSatellite } from 'ootk';
import { keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
  expect(() => {
    keepTrackApi.unregister({ event: EventBusEvent.touchStart, cbName: 'test' });
  }).toThrow(Error);

  keepTrackApi.on({
    event: EventBusEvent.updateSelectBox,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.onCruncherReady,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.onCruncherMessage,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.uiManagerInit,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.uiManagerOnReady,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.bottomMenuClick,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.hideSideMenus,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.nightToggle,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.orbitManagerInit,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.drawManagerLoadScene,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.drawOptionalScenery,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.updateLoop,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.rmbMenuActions,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.updateDateTime,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.uiManagerFinal,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.rightBtnMenuAdd,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.on({
    event: EventBusEvent.selectSatData,
    cbName: 'test',
    cb: () => {
      // Do nothing
    },
  });

  keepTrackApi.emit(EventBusEvent.updateSelectBox, 'test' as unknown as DetailedSatellite);
  keepTrackApi.emit(EventBusEvent.onCruncherReady);
  keepTrackApi.emit(EventBusEvent.onCruncherMessage);
  keepTrackApi.emit(EventBusEvent.uiManagerInit);
  keepTrackApi.emit(EventBusEvent.uiManagerOnReady);
  keepTrackApi.emit(EventBusEvent.bottomMenuClick, 'test');
  keepTrackApi.emit(EventBusEvent.hideSideMenus);

  /*
   * let emptyTexture: WebGLTexture;
   * keepTrackApi.runEvent(KeepTrackApiEvents.nightToggle(keepTrackApi.programs.drawManager.gl, emptyTexture, emptyTexture));
   */
  keepTrackApi.emit(EventBusEvent.orbitManagerInit);
  keepTrackApi.emit(EventBusEvent.drawManagerLoadScene);
  keepTrackApi.emit(EventBusEvent.drawOptionalScenery);
  keepTrackApi.emit(EventBusEvent.updateLoop);
  keepTrackApi.emit(EventBusEvent.rmbMenuActions, 'test', -1);
  keepTrackApi.emit(EventBusEvent.updateDateTime, new Date());
  keepTrackApi.emit(EventBusEvent.uiManagerFinal);
  keepTrackApi.emit(EventBusEvent.rightBtnMenuAdd);
  keepTrackApi.emit(EventBusEvent.selectSatData, defaultSat, 0);
});

describe('html', () => {
  test('html Good HTML', () => {
    expect(() => html`<div id="about-menu" class="side-menu-parent start-hidden text-select">`).not.toThrow(Error);
  });

  test('html Bad HTML', () => {
    expect(() => html(<TemplateStringsArray>(<unknown>'A'))).toThrow(Error);
  });
});

describe('externalApi.isThisJest', () => {
  test('0', () => expect(() => isThisNode()).not.toThrow());
  test('1', () => expect(isThisNode()).toMatchSnapshot());
});
