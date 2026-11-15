import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { ContextMenuComponent, ContextMenuItemInfo } from '@app/engine/plugins/components/context-menu/context-menu-component';
import {
  addContextMenuGroupLevel1,
  applyContextMenuGroupVisibility,
  CONTEXT_MENU_GROUPS,
  contextMenuGroupL1Id,
  contextMenuGroupL2Id,
  isContextMenuGroupMember,
  registerContextMenuGroup,
} from '@app/engine/plugins/components/context-menu/context-menu-groups';
import { IContextMenuConfig } from '@app/engine/plugins/core/plugin-capabilities';
import { vi } from 'vitest';

vi.mock('@app/engine/core/service-locator', () => ({
  ServiceLocator: {
    getInputManager: vi.fn(),
  },
}));

describe('context menu groups', () => {
  let rmbMenuItems: ContextMenuItemInfo[];

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="rmb-wrapper">
        <div id="right-btn-menu" class="right-btn-menu"><ul id="right-btn-menu-ul"></ul></div>
      </div>
    `;
    (EventBus as unknown as { instance: EventBus | null }).instance = null;
    rmbMenuItems = [];
    // Registration with the real InputManager is not observable through this mock (see the
    // skipped case in context-menu-component.test.ts), so build() mirrors it on rmbMenuItems.
    (ServiceLocator.getInputManager as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
  });

  const build = (config: IContextMenuConfig) => {
    const component = new ContextMenuComponent(config.level1ElementName, config, { onAction: vi.fn() });

    component.init();
    rmbMenuItems.push(component.getMenuItemInfo());
    if (config.group) {
      registerContextMenuGroup(rmbMenuItems, config.group);
    }

    return component;
  };

  const sectionConfig: IContextMenuConfig = {
    level1ElementName: 'sect-rmb',
    level1Html: '<li class="rmb-menu-item" id="sect-rmb"><a href="#">Section &#x27A4;</a></li>',
    level2ElementName: 'sect-rmb-menu',
    level2Html: '<ul class="dropdown-contents"><li id="sect-a-rmb"><a href="#">A</a></li></ul>',
    order: 10,
    group: 'more',
    isVisible: (ctx) => ctx.surface === 'earth',
  };

  const singleConfig: IContextMenuConfig = {
    level1ElementName: 'single-rmb',
    level1Html: '<li class="rmb-menu-item" id="single-rmb"><a href="#">Single</a></li>',
    order: 5,
    group: 'more',
    isVisible: () => true,
  };

  it('registers the group entry once, after its members', () => {
    build(sectionConfig);
    build(singleConfig);

    const groups = rmbMenuItems.filter((item) => item.isGroup);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      elementIdL1: contextMenuGroupL1Id('more'),
      elementIdL2: contextMenuGroupL2Id('more'),
      order: CONTEXT_MENU_GROUPS.more.order,
      group: 'more',
    });
    expect(rmbMenuItems.filter(isContextMenuGroupMember).map((item) => item.elementIdL1)).toEqual(['sect-rmb', 'single-rmb']);
  });

  it('puts members inside the group submenu, sorted by order, not at the top level', () => {
    build(sectionConfig);
    build(singleConfig);
    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuAdd);
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

    const topLevelIds = Array.from(document.getElementById('right-btn-menu-ul')!.children).map((el) => el.id);

    expect(topLevelIds).toEqual([contextMenuGroupL1Id('more')]);
    expect(document.getElementById(contextMenuGroupL1Id('more'))!.textContent).toContain('➤');

    const groupL2 = document.getElementById(contextMenuGroupL2Id('more'))!;
    const entries = Array.from(groupL2.querySelectorAll<HTMLElement>(':scope > .rmb-group-entry'));

    expect(entries.map((entry) => entry.dataset.rmbMember)).toEqual(['single-rmb', 'sect-rmb']);

    // The member with a submenu becomes a headed section; its arrow is dropped.
    const header = document.getElementById('sect-rmb')!;

    expect(header.classList.contains('rmb-group-header')).toBe(true);
    expect(header.textContent).toBe('Section');
    expect(groupL2.contains(document.getElementById('sect-rmb-menu'))).toBe(true);
    expect(groupL2.contains(document.getElementById('sect-a-rmb'))).toBe(true);
    expect(document.getElementById('sect-rmb-menu')!.classList.contains('right-btn-menu')).toBe(false);

    // A single action is a plain row, still clickable by its own id.
    expect(groupL2.contains(document.getElementById('single-rmb'))).toBe(true);
    expect(document.getElementById('single-rmb')!.classList.contains('rmb-group-header')).toBe(false);
  });

  it('shows the group only when a member is visible and hides members that are not', () => {
    build(sectionConfig);
    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuAdd);
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

    const groupL1 = document.getElementById(contextMenuGroupL1Id('more'))!;
    const visibleOn = (surface: 'earth' | 'space') => (item: ContextMenuItemInfo) => item.isVisible!({ surface, targetId: -1, target: null, hasPrimarySelection: false });

    applyContextMenuGroupVisibility(rmbMenuItems, visibleOn('space'));
    expect(groupL1.style.display).toBe('none');
    expect(document.getElementById('sect-rmb')!.style.display).toBe('none');
    expect(document.getElementById('sect-rmb-menu')!.style.display).toBe('none');

    applyContextMenuGroupVisibility(rmbMenuItems, visibleOn('earth'));
    expect(groupL1.style.display).toBe('block');
    expect(document.getElementById('sect-rmb')!.style.display).toBe('block');
    expect(document.getElementById('sect-rmb-menu')!.style.display).toBe('block');
  });

  it('separates a section from the visible rows around it and skips hidden entries', () => {
    build(sectionConfig);
    build(singleConfig);
    EventBus.getInstance().emit(EventBusEvent.rightBtnMenuAdd);
    EventBus.getInstance().emit(EventBusEvent.uiManagerInit);

    const entry = (id: string) => document.querySelector<HTMLElement>(`.rmb-group-entry[data-rmb-member="${id}"]`)!;

    applyContextMenuGroupVisibility(rmbMenuItems, () => true);
    expect(entry('single-rmb').classList.contains('rmb-group-divider')).toBe(false);
    expect(entry('sect-rmb').classList.contains('rmb-group-divider')).toBe(true);

    applyContextMenuGroupVisibility(rmbMenuItems, (item) => item.elementIdL1 === 'sect-rmb');
    expect(entry('single-rmb').style.display).toBe('none');
    expect(entry('sect-rmb').classList.contains('rmb-group-divider')).toBe(false);
  });

  it('accepts a built-in element as a member row', () => {
    document.getElementById('right-btn-menu-ul')!.insertAdjacentHTML('beforeend', '<li id="builtin-rmb"><a href="#">Builtin</a></li>');
    registerContextMenuGroup(rmbMenuItems, 'more');
    addContextMenuGroupLevel1('more', 'builtin-rmb', 1000, document.getElementById('builtin-rmb')!, false);

    expect(document.getElementById(contextMenuGroupL2Id('more'))!.contains(document.getElementById('builtin-rmb'))).toBe(true);
    expect(document.getElementById(contextMenuGroupL1Id('more'))).not.toBeNull();
  });
});
