import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { expect } from '@jest/globals';
import { DetailedSatellite } from '@ootk/src/main';
import { keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
  expect(() => {
    keepTrackApi.unregister({ event: EventBusEvent.touchStart, cbName: 'test' });
  }).toThrow(Error);

  EventBus.getInstance().on(EventBusEvent.updateSelectBox, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.onCruncherReady, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.onCruncherMessage, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.uiManagerInit, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.uiManagerOnReady, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.bottomMenuClick, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.hideSideMenus, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.orbitManagerInit, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.drawManagerLoadScene, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.drawOptionalScenery, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.updateLoop, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.rmbMenuActions, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.updateDateTime, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.uiManagerFinal, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.rightBtnMenuAdd, () => {
    // Do nothing
  });

  EventBus.getInstance().on(EventBusEvent.selectSatData, () => {
    // Do nothing
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
