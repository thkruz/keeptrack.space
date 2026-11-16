/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

/**
 * Shared group submenus for the right-click menu.
 *
 * A group is one top-level entry ("Satellite ➤", "More ➤") whose submenu holds
 * the entries of every plugin that names the group in its context menu config.
 * The menu only supports two levels, so a member with its own submenu is
 * flattened into a headed section of the group's submenu.
 *
 * DOM layout of a group submenu:
 *
 *   <div id="rmb-group-<id>-menu" class="right-btn-menu rmb-group-menu">
 *     <div class="rmb-group-entry" data-rmb-member="save-rmb">        single action
 *       <ul class="dropdown-contents"><li id="save-rmb">…</li></ul>
 *     </div>
 *     <div class="rmb-group-entry rmb-group-section" data-rmb-member="dops-rmb">
 *       <ul class="dropdown-contents"><li id="dops-rmb" class="rmb-group-header">…</li></ul>
 *       <div id="dops-rmb-menu" class="rmb-group-sub"><ul>…</ul></div>
 *     </div>
 *   </div>
 */

import { getEl } from '@app/engine/utils/get-el';
import { TranslationKey, t7e } from '@app/locales/keys';
import { ContextMenuGroupId, RmbMenuContext } from '../../core/plugin-capabilities';

export interface ContextMenuGroupDef {
  labelKey: TranslationKey;
  /** Position of the group's entry in the top-level menu (lower first). */
  order: number;
}

/** Engine-defined groups. Plugins reference them by id only. */
export const CONTEXT_MENU_GROUPS: Readonly<Record<ContextMenuGroupId, ContextMenuGroupDef>> = {
  object: { labelKey: 'rightClickMenu.groupObject', order: 2 },
  more: { labelKey: 'rightClickMenu.groupMore', order: 90 },
};

/** Minimal shape of an InputManager right-click registration that groups need. */
export interface ContextMenuGroupableItem {
  elementIdL1: string;
  elementIdL2: string;
  order: number;
  isRmbOnEarth: boolean;
  isRmbOffEarth: boolean;
  isRmbOnSat: boolean;
  isVisible?: (ctx: RmbMenuContext) => boolean;
  /** Group this item belongs to (members) or represents (when isGroup is true). */
  group?: ContextMenuGroupId;
  /** True for the group's own top-level entry. */
  isGroup?: boolean;
}

const L1_CONTAINER_ID = 'right-btn-menu-ul';
const L2_CONTAINER_ID = 'rmb-wrapper';
const ARROW_SUFFIX_REGEX = /\s*➤\s*$/u;

export const contextMenuGroupL1Id = (groupId: ContextMenuGroupId): string => `rmb-group-${groupId}`;
export const contextMenuGroupL2Id = (groupId: ContextMenuGroupId): string => `rmb-group-${groupId}-menu`;

/** True for an item that lives inside a group submenu (not the group entry itself). */
export const isContextMenuGroupMember = (item: ContextMenuGroupableItem): boolean => !!item.group && !item.isGroup;

/**
 * Adds the group's own top-level registration to the InputManager list once.
 * Its visibility is derived from its members in {@link applyContextMenuGroupVisibility}.
 */
export function registerContextMenuGroup(items: ContextMenuGroupableItem[], groupId: ContextMenuGroupId): void {
  if (items.some((item) => item.isGroup && item.group === groupId)) {
    return;
  }

  items.push({
    elementIdL1: contextMenuGroupL1Id(groupId),
    elementIdL2: contextMenuGroupL2Id(groupId),
    order: CONTEXT_MENU_GROUPS[groupId].order,
    isRmbOnEarth: false,
    isRmbOffEarth: false,
    isRmbOnSat: false,
    group: groupId,
    isGroup: true,
  });
}

/** Creates (once) the group's top-level entry in the level 1 list. */
export function ensureContextMenuGroupLevel1(groupId: ContextMenuGroupId): HTMLElement | null {
  const id = contextMenuGroupL1Id(groupId);
  const existing = getEl(id, true);

  if (existing) {
    return existing;
  }

  const container = getEl(L1_CONTAINER_ID, true);

  if (!container) {
    return null;
  }

  const li = document.createElement('li');
  const a = document.createElement('a');

  li.id = id;
  li.className = 'rmb-menu-item rmb-group-item';
  a.href = '#';
  a.textContent = `${t7e(CONTEXT_MENU_GROUPS[groupId].labelKey)} ➤`;
  li.appendChild(a);
  container.appendChild(li);

  return li;
}

/** Creates (once) the group's submenu container. */
export function ensureContextMenuGroupLevel2(groupId: ContextMenuGroupId): HTMLElement | null {
  const id = contextMenuGroupL2Id(groupId);
  const existing = getEl(id, true);

  if (existing) {
    return existing;
  }

  const container = getEl(L2_CONTAINER_ID, true);

  if (!container) {
    return null;
  }

  const div = document.createElement('div');

  div.id = id;
  div.className = 'right-btn-menu rmb-group-menu';
  container.appendChild(div);

  return div;
}

/** Finds or creates the member's entry, keeping entries sorted by order. */
function getEntry_(groupId: ContextMenuGroupId, memberId: string, order: number): HTMLElement | null {
  const groupL2 = ensureContextMenuGroupLevel2(groupId);

  if (!groupL2) {
    return null;
  }

  const entries = Array.from(groupL2.querySelectorAll<HTMLElement>(':scope > .rmb-group-entry'));
  const existing = entries.find((entry) => entry.dataset.rmbMember === memberId);

  if (existing) {
    return existing;
  }

  const entry = document.createElement('div');

  entry.className = 'rmb-group-entry';
  entry.dataset.rmbMember = memberId;
  entry.dataset.rmbOrder = String(order);

  const next = entries.find((other) => Number(other.dataset.rmbOrder) > order);

  groupL2.insertBefore(entry, next ?? null);

  return entry;
}

/**
 * Places a member's level 1 element inside the group submenu. A member with its
 * own submenu (isHeader) is shown as a section heading without the arrow.
 */
export function addContextMenuGroupLevel1(groupId: ContextMenuGroupId, memberId: string, order: number, el: HTMLElement, isHeader: boolean): void {
  ensureContextMenuGroupLevel1(groupId);
  const entry = getEntry_(groupId, memberId, order);

  if (!entry) {
    return;
  }

  if (isHeader) {
    el.classList.add('rmb-group-header');
    const label = el.querySelector('a') ?? el;

    label.textContent = (label.textContent ?? '').replace(ARROW_SUFFIX_REGEX, '');
  } else {
    // Style the row like the other submenu rows instead of a top-level entry.
    el.classList.remove('rmb-menu-item');
  }

  const ul = document.createElement('ul');

  ul.className = 'dropdown-contents';
  ul.appendChild(el);
  entry.insertBefore(ul, entry.firstChild);
}

/** Places a member's level 2 element inside the group submenu, under its heading. */
export function addContextMenuGroupLevel2(groupId: ContextMenuGroupId, memberId: string, order: number, el: HTMLElement): void {
  const entry = getEntry_(groupId, memberId, order);

  if (!entry) {
    return;
  }

  el.classList.remove('right-btn-menu');
  el.classList.add('rmb-group-sub');
  entry.classList.add('rmb-group-section');
  entry.appendChild(el);
}

const setDisplay_ = (id: string, isShown: boolean): void => {
  const el = id ? getEl(id, true) : null;

  if (el) {
    el.style.display = isShown ? 'block' : 'none';
  }
};

/**
 * Shows or hides group members and their groups for one menu open.
 * A group's entry is shown only when at least one of its members is visible.
 *
 * @param items every InputManager registration
 * @param isItemVisible visibility of a single (non-group) item for this open
 */
export function applyContextMenuGroupVisibility(items: ContextMenuGroupableItem[], isItemVisible: (item: ContextMenuGroupableItem) => boolean): void {
  const visibleGroups = new Set<ContextMenuGroupId>();

  items.filter(isContextMenuGroupMember).forEach((item) => {
    const isShown = isItemVisible(item);

    setDisplay_(item.elementIdL1, isShown);
    setDisplay_(item.elementIdL2, isShown);
    if (isShown && item.group) {
      visibleGroups.add(item.group);
    }
  });

  items
    .filter((item) => item.isGroup && item.group)
    .forEach((item) => {
      const isShown = visibleGroups.has(item.group!);

      setDisplay_(item.elementIdL1, isShown);
      if (isShown) {
        markGroupEntries_(item.group!);
      }
    });
}

/**
 * Hides empty entries and puts a divider between a section and its visible neighbours,
 * so a row that follows a section never reads as part of it.
 */
function markGroupEntries_(groupId: ContextMenuGroupId): void {
  const groupL2 = getEl(contextMenuGroupL2Id(groupId), true);

  if (!groupL2) {
    return;
  }

  let previous: HTMLElement | null = null;

  groupL2.querySelectorAll<HTMLElement>(':scope > .rmb-group-entry').forEach((entry) => {
    const l1 = entry.querySelector<HTMLElement>(':scope > ul > li');
    const isShown = !!l1 && l1.style.display !== 'none';

    entry.style.display = isShown ? '' : 'none';
    entry.classList.remove('rmb-group-divider');
    if (!isShown) {
      return;
    }
    if (previous && (previous.classList.contains('rmb-group-section') || entry.classList.contains('rmb-group-section'))) {
      entry.classList.add('rmb-group-divider');
    }
    previous = entry;
  });
}
