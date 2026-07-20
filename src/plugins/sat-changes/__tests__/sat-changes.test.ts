import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import * as dragUtils from '@app/engine/utils/click-and-drag';
import { getEl } from '@app/engine/utils/get-el';
import * as slideUtils from '@app/engine/utils/slide';
import { bottomMenuClick, getSatChngJson, hideSideMenus, init, satChng, uiManagerInit } from '@app/plugins/sat-changes/sat-changes';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { vi } from 'vitest';

const sampleJson = () => [{ year: 21, day: 100.5, SCC: 25544, inc: 51.6, meanmo: 0.001 }];

describe('sat-changes', () => {
  beforeEach(() => {
    setupStandardEnvironment();
    document.body.insertAdjacentHTML('beforeend', '<div id="left-menus"></div><div id="bottom-icons"></div><input id="anal-sat"/>');
    vi.spyOn(slideUtils, 'slideInRight').mockImplementation(() => undefined);
    vi.spyOn(slideUtils, 'slideOutLeft').mockImplementation(() => undefined);
    vi.spyOn(dragUtils, 'clickAndDragWidth').mockImplementation(() => null);
    ServiceLocator.getCatalogManager().sccNum2Sat = vi.fn(() => ({ meanMotion: 15.5 })) as never;
    // uiManagerInit builds satChng-menu, satChng-table and menu-satChng used by the rest.
    uiManagerInit();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty table when given no JSON (node guard)', () => {
    expect(getSatChngJson(null)).toStrictEqual({ resp: null, satChngTable: [] });
  });

  it('uiManagerInit creates the side menu and bottom icon', () => {
    expect(getEl('satChng-menu', true)).not.toBeNull();
    expect(getEl('menu-satChng', true)).not.toBeNull();
  });

  it('init registers the event handlers and they run', () => {
    expect(() => init()).not.toThrow();
    expect(() => EventBus.getInstance().emit(EventBusEvent.uiManagerFinal)).not.toThrow();
  });

  it('getSatChngJson builds a table from change records', () => {
    const result = getSatChngJson(sampleJson());

    expect(result.satChngTable).toHaveLength(1);
    expect(getEl('satChng-table')!.innerHTML).toContain('25544');
  });

  it('getSatChngJson skips decayed satellites (null lookup)', () => {
    ServiceLocator.getCatalogManager().sccNum2Sat = vi.fn(() => null) as never;

    expect(() => getSatChngJson(sampleJson())).not.toThrow();
  });

  it('satChng throws for a non-number row', () => {
    // @ts-expect-error intentionally passing a bad type
    expect(() => satChng('x')).toThrow();
  });

  it('satChng throws for a non-existent row', () => {
    expect(() => satChng(99)).toThrow();
  });

  it('satChng(-1) fetches the change data the first time', () => {
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })) as never;

    expect(() => satChng(-1)).not.toThrow();
  });

  it('satChng searches for a selected row', () => {
    const doSearch = vi.fn();

    ServiceLocator.getUiManager().doSearch = doSearch;

    // testOverride seeds the module table so the row exists.
    satChng(0, sampleJson() as never);

    expect(doSearch).toHaveBeenCalledWith('25544');
    expect((getEl('anal-sat') as HTMLInputElement).value).toBe('25544');
  });

  it('hideSideMenus slides the menu out and deselects the icon', () => {
    expect(() => hideSideMenus()).not.toThrow();
    expect(slideUtils.slideOutLeft).toHaveBeenCalled();
  });

  it('bottomMenuClick opens the menu, then closes it on a second click', () => {
    const ui = ServiceLocator.getUiManager();

    ui.hideSideMenus = vi.fn();

    bottomMenuClick('menu-satChng');
    expect(slideUtils.slideInRight).toHaveBeenCalled();

    bottomMenuClick('menu-satChng');
    expect(ui.hideSideMenus).toHaveBeenCalled();
  });

  it('bottomMenuClick closes search in mobile mode', () => {
    const ui = ServiceLocator.getUiManager();

    ui.hideSideMenus = vi.fn();
    ui.searchManager.closeSearch = vi.fn();
    settingsManager.isMobileModeEnabled = true;

    bottomMenuClick('menu-satChng');

    expect(ui.searchManager.closeSearch).toHaveBeenCalled();
    settingsManager.isMobileModeEnabled = false;
  });

  it('bottomMenuClick ignores other icons', () => {
    expect(() => bottomMenuClick('some-other-icon')).not.toThrow();
  });

  it('uiManagerFinal wires a row-click handler that ignores non-object clicks', () => {
    init();
    EventBus.getInstance().emit(EventBusEvent.uiManagerFinal);

    const menu = getEl('satChng-menu')!;

    menu.setAttribute('hiddenrow', '0');
    menu.insertAdjacentHTML('beforeend', '<div class="satChng-object" id="row-cell">x</div>');

    // A click whose target is not a .satChng-object returns early.
    expect(() => menu.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    // A click on the object row reaches satChng(); its internal throw is swallowed by the listener.
    expect(() => getEl('row-cell')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
  });

  it('satChng returns when the selected row has no SCC', () => {
    expect(() => satChng(0, [{ year: 21, day: 100.5, SCC: 0, inc: 51.6, meanmo: 0.001 }] as never)).not.toThrow();
  });
});
