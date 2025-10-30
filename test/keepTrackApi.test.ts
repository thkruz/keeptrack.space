import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { html } from '@app/engine/utils/development/formatter';
import { isThisNode } from '@app/engine/utils/isThisNode';
import { expect } from '@jest/globals';
import { DetailedSatellite } from '@ootk/src/main';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
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

  EventBus.getInstance().emit(EventBusEvent.updateSelectBox, 'test' as unknown as DetailedSatellite);
  EventBus.getInstance().emit(EventBusEvent.onCruncherReady);
  EventBus.getInstance().emit(EventBusEvent.onCruncherMessage);
  EventBus.getInstance().emit(EventBusEvent.uiManagerInit);
  EventBus.getInstance().emit(EventBusEvent.uiManagerOnReady);
  EventBus.getInstance().emit(EventBusEvent.bottomMenuClick, 'test');
  EventBus.getInstance().emit(EventBusEvent.hideSideMenus);

  EventBus.getInstance().emit(EventBusEvent.orbitManagerInit);
  EventBus.getInstance().emit(EventBusEvent.drawManagerLoadScene);
  EventBus.getInstance().emit(EventBusEvent.drawOptionalScenery);
  EventBus.getInstance().emit(EventBusEvent.updateLoop);
  EventBus.getInstance().emit(EventBusEvent.rmbMenuActions, 'test', -1);
  EventBus.getInstance().emit(EventBusEvent.updateDateTime, new Date());
  EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);
  EventBus.getInstance().emit(EventBusEvent.rightBtnMenuAdd);
  EventBus.getInstance().emit(EventBusEvent.selectSatData, defaultSat, 0);
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
