import { Tabs } from '@materializecss/materialize';
import { html } from '../utils/development/formatter';

/**
 * Definition for a single tab in a side menu tab bar.
 */
export interface SideMenuTabDef {
  /** Unique ID for the tab panel element (e.g. 'createSat-basic-tab') */
  id: string;
  /** Display label shown on the tab (e.g. 'Basic') */
  label: string;
  /** Inner HTML content for this tab panel */
  content: string;
}

/**
 * Build the Materialize tabs HTML structure for use in side menus.
 *
 * Returns a `<ul class="tabs">` element followed by content `<div>` panels.
 * The first tab is marked as active by default.
 *
 * @param tabsId - The DOM id for the `<ul>` tabs element (e.g. 'createSat-tabs')
 * @param tabs - Array of tab definitions
 */
export function buildSideMenuTabsHtml(tabsId: string, tabs: SideMenuTabDef[]): string {
  const colWidth = Math.floor(12 / tabs.length);

  const tabHeaders = tabs
    .map((tab, i) => {
      const activeClass = i === 0 ? ' class="active"' : '';

      return `<li class="tab col s${colWidth}"><a${activeClass} href="#${tab.id}">${tab.label}</a></li>`;
    })
    .join('\n                ');

  const tabPanels = tabs
    .map((tab) => html`
      <div id="${tab.id}" class="col s12">
        ${tab.content}
      </div>
    `)
    .join('\n');

  return html`
    <div class="row" style="margin-bottom: 1.5rem;">
      <div class="col s12">
        <ul id="${tabsId}" class="tabs">
          ${tabHeaders}
        </ul>
      </div>
    </div>
    ${tabPanels}
  `;
}

/**
 * Initialize Materialize tabs on a given element.
 * Call this in `uiManagerFinal_()` after the DOM is ready.
 *
 * @param tabsId - The DOM id of the `<ul class="tabs">` element
 */
export function initSideMenuTabs(tabsId: string): void {
  const tabsEl = document.querySelector(`#${tabsId}`);

  if (tabsEl) {
    Tabs.init(tabsEl as HTMLElement);

    /*
     * Materialize v2 bug: Tabs._handleTabClick walks parentElement until it finds
     * a `.tab` li and dereferences `tab.classList` without a null check, so a click
     * on the tab bar's whitespace (outside any li) throws. Swallow those clicks in
     * the capture phase on the parent before they reach the Tabs listener.
     */
    tabsEl.parentElement?.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.closest('ul.tabs') && !e.target.closest('li.tab')) {
        e.stopPropagation();
      }
    }, true);
  }
}

/**
 * Update the Materialize tabs indicator position.
 * Must be called after the side menu becomes visible (e.g. in `onBottomIconClick()`),
 * wrapped in a `setTimeout` to ensure layout has completed.
 *
 * @param tabsId - The DOM id of the `<ul class="tabs">` element
 */
export function updateSideMenuTabIndicator(tabsId: string): void {
  setTimeout(() => {
    const tabsEl = document.querySelector(`#${tabsId}`);

    if (tabsEl) {
      const tabsInstance = Tabs.getInstance(tabsEl as HTMLElement);

      if (tabsInstance) {
        tabsInstance.updateTabIndicator();
      }
    }
  }, 0);
}

/**
 * Programmatically switch to a specific tab using the Materialize Tabs API.
 *
 * @param tabsId - The DOM id of the `<ul class="tabs">` element
 * @param tabPanelId - The DOM id of the tab panel to activate (e.g. 'createSat-advanced-tab')
 */
export function selectSideMenuTab(tabsId: string, tabPanelId: string): void {
  const tabsEl = document.querySelector(`#${tabsId}`);

  if (!tabsEl) {
    return;
  }

  const tabsInstance = Tabs.getInstance(tabsEl as HTMLElement);

  if (tabsInstance) {
    tabsInstance.select(tabPanelId);
  }
}

/**
 * Get the currently active tab panel ID.
 *
 * @param tabsId - The DOM id of the `<ul class="tabs">` element
 * @returns The ID of the active tab panel, or null if not found
 */
export function getActiveTabId(tabsId: string): string | null {
  const tabsEl = document.querySelector(`#${tabsId}`);

  if (!tabsEl) {
    return null;
  }

  const activeLink = tabsEl.querySelector('a.active');

  if (!activeLink) {
    return null;
  }

  const href = activeLink.getAttribute('href');

  return href ? href.replace('#', '') : null;
}
