import { getEl } from '@app/engine/utils/get-el';
import { l } from '../onboarding-t7e';
import type { TourStep } from '../tour-engine';
import {
  collapseUtilityFooter,
  drawerItemTarget,
  expandUtilityFooter,
  findPlugin,
  isPluginUsable,
  isVisible,
  openCommandPalette,
  openDrawer,
  openDrawerAt,
} from '../tour-steps';
import type { ChapterDefinition } from './chapter-types';

/**
 * Chapter 0: Drawer Essentials. Recycles the linear power tour's P1/P5/P6/P7
 * content (drawer groups/rail, command palette, quick toggles, help/settings).
 */
export const essentialsChapter: ChapterDefinition = {
  id: 'essentials',
  title: () => l('chapters.essentials.title'),
  description: () => l('chapters.essentials.description'),
  minutes: 2,
  buildSteps: (): TourStep[] => [
    {
      id: 'e1-drawer-groups',
      kind: 'coachmark',
      title: l('chapters.essentials.steps.drawerGroups.title'),
      body: l('chapters.essentials.steps.drawerGroups.body'),
      beforeEnter: openDrawer,
      target: () => getEl('drawer-content', true),
      placement: 'right',
    },
    {
      id: 'e2-command-palette',
      kind: 'coachmark',
      title: l('chapters.essentials.steps.commandPalette.title'),
      body: l('chapters.essentials.steps.commandPalette.body'),
      isAvailable: () => !!findPlugin('CommandPalettePlugin'),
      beforeEnter: openDrawer,
      target: () => getEl('drawer-search-trigger', true),
      placement: 'right',
      actionButton: {
        label: l('buttons.openIt'),
        action: openCommandPalette,
      },
    },
    {
      id: 'e3-utility',
      kind: 'coachmark',
      title: l('chapters.essentials.steps.utility.title'),
      body: l('chapters.essentials.steps.utility.body'),
      isAvailable: () => {
        const el = getEl('drawer-utility-footer', true);

        return isVisible(el) && el.childElementCount > 0;
      },
      // Pin the hover-expanded footer open so the toggles are actually visible
      beforeEnter: expandUtilityFooter,
      afterExit: collapseUtilityFooter,
      target: () => getEl('drawer-utility-footer', true),
      placement: 'top',
    },
    {
      id: 'e4-help',
      kind: 'coachmark',
      title: l('chapters.essentials.steps.help.title'),
      body: l('chapters.essentials.steps.help.body'),
      isAvailable: () => isPluginUsable('SettingsMenuPlugin'),
      beforeEnter: () => openDrawerAt('SettingsMenuPlugin'),
      target: () => drawerItemTarget('SettingsMenuPlugin'),
      placement: 'right',
    },
  ],
};
