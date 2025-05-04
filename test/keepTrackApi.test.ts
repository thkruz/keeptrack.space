import { Doris } from '@app/doris/doris';
import { CoreEngineEvents } from '@app/doris/events/event-types';
import { KeepTrackApiEvents } from '@app/interfaces';
import { isThisNode } from '@app/static/isThisNode';
import { expect } from '@jest/globals';
import { DetailedSatellite } from 'ootk';
import { keepTrackApi } from '../src/keepTrackApi';
import { defaultSat } from './environment/apiMocks';

test('keepTrackApi Unit Testing', () => {
  expect(() => {
    Doris.getInstance().removeAllListeners(KeepTrackApiEvents.touchStart);
  }).toThrow(Error);

  Doris.getInstance().on(KeepTrackApiEvents.updateSelectBox, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.onCruncherReady, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.onCruncherMessage, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.HtmlInitialize, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.BeforeHtmlInitialize, () => {
    // Do nothing
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

  Doris.getInstance().on(CoreEngineEvents.Update, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.rmbMenuActions, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.updateDateTime, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.AfterHtmlInitialize, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.rightBtnMenuAdd, () => {
    // Do nothing
  });

  Doris.getInstance().on(KeepTrackApiEvents.selectSatData, (): void => {
    // Do nothing
  });

  Doris.getInstance().emit(KeepTrackApiEvents.updateSelectBox, 'test' as unknown as DetailedSatellite);
  Doris.getInstance().emit(KeepTrackApiEvents.onCruncherReady);
  Doris.getInstance().emit(KeepTrackApiEvents.onCruncherMessage);
  Doris.getInstance().emit(KeepTrackApiEvents.HtmlInitialize);
  Doris.getInstance().emit(KeepTrackApiEvents.BeforeHtmlInitialize);
  Doris.getInstance().emit(KeepTrackApiEvents.bottomMenuClick, 'test');
  Doris.getInstance().emit(KeepTrackApiEvents.hideSideMenus);

  Doris.getInstance().emit(KeepTrackApiEvents.orbitManagerInit);
  Doris.getInstance().emit(CoreEngineEvents.Update, 0);
  Doris.getInstance().emit(KeepTrackApiEvents.rmbMenuActions, 'test', -1);
  Doris.getInstance().emit(KeepTrackApiEvents.updateDateTime, new Date());
  Doris.getInstance().emit(KeepTrackApiEvents.AfterHtmlInitialize);
  Doris.getInstance().emit(KeepTrackApiEvents.rightBtnMenuAdd);
  Doris.getInstance().emit(KeepTrackApiEvents.selectSatData, defaultSat, 0);
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
